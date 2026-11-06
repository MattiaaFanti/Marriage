/* Group RSVP API. Exact names or a single unambiguous 3+ letter suggestion.
   Never return a list of partial-match guests from the public endpoint. */
import { ensureGuestMetadata } from "./guest-metadata.js";
const textEncoder = new TextEncoder();
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const error = (message,status=400)=>json({error:message},status);
const now = ()=>Math.floor(Date.now()/1000);
const b64 = bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const digest = async value=>b64(new Uint8Array(await crypto.subtle.digest("SHA-256",textEncoder.encode(value))));
const equal = (a,b)=>{
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;
};
const nameKey = input=>String(input??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en-US").trim().replace(/\s+/g," ");
const validKey = value=>value.length>=3&&value.length<=100&&/^[a-z]+(?:[ '-][a-z]+)*$/.test(value);
/* Opaque 256-bit temporary RSVP session stored in the existing D1
   admin_sessions table. It is not an admin login or a guest password.
   Neither a hardcoded secret nor a Cloudflare variable is necessary. */
async function createToken(groupId,env){
  const until=now()+3600;
  const nonce=b64(crypto.getRandomValues(new Uint8Array(32)));
  const token=groupId+"."+until+"."+nonce;
  await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)")
    .bind(await digest(token),until).run();
  return token;
}
async function validateToken(token,env){
  if(typeof token!=="string"||!/^[1-9]\d{0,9}\.\d{10}\.[A-Za-z0-9_-]{43}$/.test(token))return null;
  const [groupIdText,untilText]=token.split(".");
  const groupId=Number(groupIdText),until=Number(untilText);
  if(!Number.isSafeInteger(groupId)||until<now()||until>now()+3600)return null;
  const stored=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash=?")
    .bind(await digest(token)).first();
  return Number(stored?.expires_at)===until?groupId:null;
}
async function parseBody(req){
  const raw=await req.text();
  if(raw.length>12000)return null;
  try{return JSON.parse(raw||"{}")}catch{return null}
}
const publicMember=m=>({id:m.id,name:m.display_name,role:m.role,status:m.rsvp_status});
async function membersOf(groupId,env){
  return (await env.DB.prepare("SELECT id,display_name,role,rsvp_status,updated_at FROM rsvp_members WHERE group_id=? ORDER BY id").bind(groupId).all()).results;
}
async function throttle(req,env,scope="guestlookup",limit=25){
  const ip=req.headers.get("CF-Connecting-IP")||"unknown";
  const ipHash=await digest(ip+"|wedding-"+scope);
  const windowStart=Math.floor(now()/900)*900;
  await env.DB.prepare(
    "INSERT INTO rsvp_lookup_limiter(ip_hash,window_start,attempts) VALUES(?,?,1) "+
    "ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start"
  ).bind(ipHash,windowStart).run();
  const record=await env.DB.prepare("SELECT attempts FROM rsvp_lookup_limiter WHERE ip_hash=?").bind(ipHash).first();
  return Number(record?.attempts||0)<=limit;
}

/* Return up to TWO candidate rows solely to determine uniqueness;
   the public response contains at most ONE, otherwise no names.
   Only the start of a name or a word (such as a surname) can match. */
async function candidates(q,env){
  const prefix=q+"%";
  const wordPrefix="% "+q+"%";
  const rows=await env.DB.prepare(
    "SELECT DISTINCT m.id,m.group_id,m.display_name,m.role FROM rsvp_members m "+
    "LEFT JOIN rsvp_aliases a ON a.member_id=m.id "+
    "WHERE a.alias LIKE ? OR LOWER(m.display_name) LIKE ? OR LOWER(m.display_name) LIKE ? "+
    "ORDER BY m.display_name COLLATE NOCASE LIMIT 2"
  ).bind(prefix,prefix,wordPrefix).all();
  return rows.results||[];
}
async function suggest(req,env){
  const body=await parseBody(req),q=nameKey(body?.query);
  if(!validKey(q))return json({suggestions:[],needs_more_letters:false});
  if(!await throttle(req,env,"suggestions",60))
    return error("Too many searches. Try again later.",429);
  await ensureGuestMetadata(env);
  const hits=await candidates(q,env);
  // Ambiguous input must never display an arbitrary name from the list.
  if(hits.length!==1)return json({suggestions:[],needs_more_letters:hits.length>1});
  const m=hits[0];
  return json({suggestions:[{id:m.id,name:m.display_name,role:m.role||""}],needs_more_letters:false});
}

async function lookup(req,env){
  await ensureGuestMetadata(env);
  const body=await parseBody(req),name=nameKey(body?.name);
  if(!validKey(name))return error("Enter your first name, surname or full name (at least 3 letters).");
  if(!await throttle(req,env))return error("Too many searches. Please try again later.",429);
  let found=[];
  if(Number.isSafeInteger(body?.member_id)&&body.member_id>0){
    // The autocomplete item is only accepted for the displayed full name.
    const selected=await env.DB.prepare(
      "SELECT group_id,display_name FROM rsvp_members WHERE id=?"
    ).bind(body.member_id).first();
    if(selected&&nameKey(selected.display_name)===name)found=[{group_id:selected.group_id}];
  }else{
    found=(await env.DB.prepare(
      "SELECT DISTINCT m.group_id FROM rsvp_aliases a JOIN rsvp_members m ON m.id=a.member_id WHERE a.alias=? LIMIT 2"
    ).bind(name).all()).results;
    if(!found.length){
      const matches=await candidates(name,env);
      if(matches.length===1)found=[{group_id:matches[0].group_id}];
      if(matches.length>1)return error("Several guests match. Please type more letters.",409);
    }
  }
  if(!found.length)return error("Invitation not found. Check the spelling of your name.",404);
  if(found.length!==1)return error("Several invitations match. Please enter your full name.",409);
  const groupId=found[0].group_id;
  const people=await membersOf(groupId,env);
  if(!people.length)return error("Invitation not found.",404);
  return json({household_token:await createToken(groupId,env),members:people.map(publicMember)});
}
async function submit(req,env){
  const body=await parseBody(req);
  const groupId=await validateToken(body?.household_token,env);
  if(!groupId)return error("This invitation session has expired. Search your name again.",403);
  const members=await membersOf(groupId,env);
  if(!members.length)return error("Invitation not found.",404);
  if(!Array.isArray(body?.answers)||body.answers.length!==members.length)return error("You must answer for every person in your group.");
  const answers=new Map();
  for(const a of body.answers){
    if(!a||!Number.isInteger(a.id)||answers.has(a.id)||!["attending","not_attending"].includes(a.status))
      return error("Select Attend or Not attend for every person.");
    answers.set(a.id,a.status);
  }
  if(members.some(m=>!answers.has(Number(m.id))))return error("You must answer for every person in your group.");
  const at=new Date().toISOString(),statements=[];
  for(const m of members){
    const status=answers.get(Number(m.id));
    statements.push(env.DB.prepare("UPDATE rsvp_members SET rsvp_status=?,updated_at=? WHERE id=? AND group_id=?").bind(status,at,m.id,groupId));
    statements.push(env.DB.prepare("INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) VALUES(?,?,?,'guest',?)").bind(m.id,m.rsvp_status,status,at));
  }
  await env.DB.batch(statements);
  return json({ok:true,updated:members.length});
}
async function overview(env){
  await ensureGuestMetadata(env);
  const groups=(await env.DB.prepare("SELECT id,group_code FROM rsvp_groups ORDER BY id").all()).results;
  const people=(await env.DB.prepare("SELECT m.id,m.group_id,m.display_name,m.role,m.rsvp_status,m.updated_at FROM rsvp_members m ORDER BY m.group_id,m.id").all()).results;
  const summary={groups:groups.length,invited:people.length,pending:0,attending:0,not_attending:0};
  for(const p of people)summary[p.rsvp_status]++;
  return {groups:groups.map(g=>({...g,members:people.filter(p=>p.group_id===g.id)})),summary};
}
async function adminPatch(req,env,id){
  const b=await parseBody(req);
  if(!["pending","attending","not_attending"].includes(b?.status))return error("Invalid RSVP status.");
  const member=await env.DB.prepare("SELECT * FROM rsvp_members WHERE id=?").bind(id).first();
  if(!member)return error("Guest not found.",404);
  // Reset to Pending also removes the visible Last updated timestamp.
  // Preserve the separate audit-event history.
  if(member.rsvp_status===b.status){
    if(b.status==="pending"&&member.updated_at!==null){
      await env.DB.prepare("UPDATE rsvp_members SET updated_at=NULL WHERE id=?").bind(id).run();
    }
    return json({ok:true,unchanged:true});
  }
  const at=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE rsvp_members SET rsvp_status=?,updated_at=? WHERE id=?")
      .bind(b.status,b.status==="pending"?null:at,id),
    env.DB.prepare("INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) VALUES(?,?,?,'admin',?)")
      .bind(id,member.rsvp_status,b.status,at)
  ]);
  return json({ok:true,status:b.status});
}
async function resetAll(req,env){
  const body=await parseBody(req);
  if(body?.confirm!=="RESET ALL RSVP")return error("Confirmation required.",400);
  const count=await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM rsvp_members WHERE rsvp_status!='pending'"
  ).first();
  const stale=await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM rsvp_members WHERE rsvp_status!='pending' OR updated_at IS NOT NULL"
  ).first();
  if(!Number(stale?.total||0))return json({ok:true,updated:0});
  const at=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) SELECT id,rsvp_status,'pending','admin',? FROM rsvp_members WHERE rsvp_status!='pending'").bind(at),
    env.DB.prepare("UPDATE rsvp_members SET rsvp_status='pending',updated_at=NULL WHERE rsvp_status!='pending' OR updated_at IS NOT NULL")
  ]);
  return json({ok:true,updated:Number(count?.total||0)});
}

/* Read-only timeline: all guest submissions and manual changes, newest first.
   Pagination uses the monotonic event ID to avoid duplicates across refreshes. */
async function eventHistory(req,env){
  await ensureGuestMetadata(env);
  const url=new URL(req.url);
  const limitRaw=Number(url.searchParams.get("limit")||30);
  const limit=Number.isInteger(limitRaw)?Math.min(60,Math.max(1,limitRaw)):30;
  const beforeRaw=url.searchParams.get("before");
  const before=beforeRaw&&/^[1-9]\d*$/.test(beforeRaw)?Number(beforeRaw):null;
  const sql="SELECT e.id,e.member_id,e.previous_status,e.status,e.source,e.received_at,"+
    "m.display_name,m.role,g.group_code "+
    "FROM rsvp_member_events e "+
    "JOIN rsvp_members m ON m.id=e.member_id "+
    "JOIN rsvp_groups g ON g.id=m.group_id "+
    (before?"WHERE e.status IN ('attending','not_attending') AND e.id<? ":"WHERE e.status IN ('attending','not_attending') ")+
    "ORDER BY e.id DESC LIMIT ?";
  const rows=(await (before?env.DB.prepare(sql).bind(before,limit+1):env.DB.prepare(sql).bind(limit+1)).all()).results;
  const hasMore=rows.length>limit;
  const records=rows.slice(0,limit);
  return json({events:records,next_before:hasMore?records[records.length-1].id:null});
}


/* Erase the history without changing RSVP decisions, updated_at or groups.
   The operation is destructive and intentionally requires an explicit payload. */
async function resetEventHistory(req,env){
  const body=await parseBody(req);
  if(body?.confirm!=="RESET EVENT HISTORY")return error("Confirmation required.",400);
  const result=await env.DB.prepare("DELETE FROM rsvp_member_events").run();
  return json({ok:true,deleted:Number(result.meta?.changes||0)});
}

function csvCell(v){
  let s=String(v??"");
  if(/^[\t\r\n =+\-@]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
async function exportCsv(env){
  const rows=(await env.DB.prepare("SELECT g.group_code,m.display_name,m.role,m.rsvp_status,m.updated_at FROM rsvp_members m JOIN rsvp_groups g ON g.id=m.group_id ORDER BY g.id,m.id").all()).results;
  const cols=["group_code","display_name","role","rsvp_status","updated_at"];
  const text="\uFEFF"+[cols.join(","),...rows.map(row=>cols.map(k=>csvCell(row[k])).join(","))].join("\r\n");
  return new Response(text,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="wedding-group-rsvp.csv"',"Cache-Control":"no-store"}});
}
/* Public, passwordless RSVP dashboard by owner request. Admin status changes
   are explicitly unauthenticated; do not expose extra operations. */
export async function groupedRoutes(req,env){
  const path=new URL(req.url).pathname,method=req.method;
  if(path==="/api/household/suggest"&&method==="POST")return suggest(req,env);
  if(path==="/api/household/lookup"&&method==="POST")return lookup(req,env);
  if(path==="/api/household/confirm"&&method==="POST")return submit(req,env);
  if(path==="/api/admin/households"&&method==="GET")return json(await overview(env));
  if(path==="/api/admin/households/events"&&method==="GET")return eventHistory(req,env);
  if(path==="/api/admin/households/events/reset"&&method==="POST")return resetEventHistory(req,env);
  if(path==="/api/admin/households/export.csv"&&method==="GET")return exportCsv(env);
  if(path==="/api/admin/households/reset"&&method==="POST")return resetAll(req,env);
  const memberPath=path.match(/^\/api\/admin\/households\/member\/(\d+)$/);
  if(memberPath&&method==="PATCH")return adminPatch(req,env,Number(memberPath[1]));
  if(path.startsWith("/api/admin/"))return error("Unknown admin endpoint.",404);
  return null;
}
