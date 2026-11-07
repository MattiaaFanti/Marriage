/* Group RSVP API. Exact lookup and all matching guest suggestions from 3 letters.
   The user explicitly opted for showing every matching person in autocomplete. */
import { ensureGuestMetadata } from "./guest-metadata.js";
import { notifyRSVPUpdate } from "./rsvp-live.js";
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
// Legacy group email choices remain only as a migration source. New email
// choices are per-person, so one attendee's address cannot overwrite another.
async function ensureEmailChoices(env){
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS rsvp_confirmation_choices ("+
    "group_id INTEGER PRIMARY KEY,choice TEXT NOT NULL CHECK(choice IN ('NO','EMAIL')),"+
    "email TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL)"
  ).run();
}
let memberEmailsReady=false,memberEmailsRunning=null;
async function ensureMemberEmailChoices(env){
  if(memberEmailsReady)return;
  if(memberEmailsRunning)return memberEmailsRunning;
  memberEmailsRunning=(async()=>{
    await ensureEmailChoices(env);
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS rsvp_member_email_clears ("+
      "member_id INTEGER PRIMARY KEY,cleared_at TEXT NOT NULL)"
    ).run();
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS rsvp_member_email_choices ("+
      "member_id INTEGER PRIMARY KEY REFERENCES rsvp_members(id) ON DELETE CASCADE,"+
      "choice TEXT NOT NULL CHECK(choice IN ('NO','EMAIL')),"+
      "email TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL)"
    ).run();
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS rsvp_data_migrations ("+
      "name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)"
    ).run();
    const version="wedding-member-emails-isolated-2026-11-07-v1";
    const done=await env.DB.prepare(
      "SELECT name FROM rsvp_data_migrations WHERE name=?"
    ).bind(version).first();
    if(!done){
      // Copy old addresses only to guests who were already attending when
      // the original group-wide email was sent and were not manually cleared.
      await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO rsvp_member_email_choices(member_id,choice,email,updated_at) "+
          "SELECT m.id,c.choice,c.email,c.updated_at FROM rsvp_members m "+
          "JOIN rsvp_confirmation_choices c ON c.group_id=m.group_id "+
          "LEFT JOIN rsvp_member_email_clears x ON x.member_id=m.id "+
          "WHERE m.rsvp_status!='pending' AND (c.choice='NO' OR "+
          "(c.choice='EMAIL' AND m.rsvp_status='attending' AND c.email!='')) "+
          "AND (x.member_id IS NULL OR x.cleared_at < c.updated_at)"
        ),
        env.DB.prepare(
          "INSERT OR IGNORE INTO rsvp_data_migrations(name,applied_at) VALUES(?,?)"
        ).bind(version,new Date().toISOString())
      ]);
    }
    memberEmailsReady=true;
  })().finally(()=>{memberEmailsRunning=null});
  return memberEmailsRunning;
}
async function memberEmailRecords(env,groupId){
  await ensureMemberEmailChoices(env);
  return (await env.DB.prepare(
    "SELECT m.id,m.group_id,m.display_name,m.role,m.rsvp_status,m.updated_at,"+
    "COALESCE(c.choice,'') AS email_choice FROM rsvp_members m "+
    "LEFT JOIN rsvp_member_email_choices c ON c.member_id=m.id "+
    "WHERE m.group_id=? ORDER BY m.id"
  ).bind(groupId).all()).results||[];
}
function emailTargets(members){
  return members.filter(m=>m.rsvp_status==='attending'&&m.email_choice!=='EMAIL');
}
async function saveMemberEmailChoices(env,members,choice,email=''){
  await ensureMemberEmailChoices(env);
  if(!members.length)return;
  const at=new Date().toISOString();
  await env.DB.batch(members.map(m=>env.DB.prepare(
    "INSERT INTO rsvp_member_email_choices(member_id,choice,email,updated_at) "+
    "SELECT id,?,?,? FROM rsvp_members WHERE id=? AND group_id=? "+
    "AND rsvp_status='attending' AND COALESCE(updated_at,'')=COALESCE(?,'') "+
    "ON CONFLICT(member_id) DO UPDATE SET choice=excluded.choice,"+
    "email=excluded.email,updated_at=excluded.updated_at "+
    "WHERE rsvp_member_email_choices.choice!='EMAIL'"
  ).bind(choice,email,at,m.id,m.group_id,m.updated_at)));
  await notifyRSVPUpdate(env,"guests");
}
async function skipConfirmationEmail(req,env){
  const body=await parseBody(req);
  const groupId=await validateToken(body?.household_token,env);
  if(!groupId)return error('Your invitation session has expired. Search your name again.',403);
  const members=await memberEmailRecords(env,groupId);
  if(!members.length||members.some(m=>m.rsvp_status==='pending'))
    return error('Please confirm all guests before skipping the email.',409);
  const targets=emailTargets(members);
  await saveMemberEmailChoices(env,targets,'NO');
  return json({ok:true,choice:'NO'});
}
const publicMember=m=>({id:m.id,name:m.display_name,role:m.role,status:m.rsvp_status});
async function membersOf(groupId,env){
  return (await env.DB.prepare("SELECT id,group_id,display_name,role,rsvp_status,updated_at FROM rsvp_members WHERE group_id=? ORDER BY id").bind(groupId).all()).results;
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

/* Return all distinct matching guest names. Matching starts at the beginning
   of a first name or another name component such as the surname.
   No names are shown for input shorter than three characters. */
async function candidates(q,env){
  const prefix=q+"%";
  const wordPrefix="% "+q+"%";
  const rows=await env.DB.prepare(
    "SELECT DISTINCT m.id,m.group_id,m.display_name,m.role,"+
    "(SELECT COUNT(*) FROM rsvp_members seat WHERE seat.group_id=m.group_id) AS seat_count FROM rsvp_members m "+
    "LEFT JOIN rsvp_aliases a ON a.member_id=m.id "+
    "WHERE a.alias LIKE ? OR LOWER(m.display_name) LIKE ? OR LOWER(m.display_name) LIKE ? "+
    "ORDER BY m.display_name COLLATE NOCASE"
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
  // Show all matches; clicking one sends its precise member_id to lookup.
  return json({suggestions:hits.map(m=>({
    id:m.id,name:m.display_name,role:m.role||"",seat_count:Number(m.seat_count)||1
  }))});
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
      if(matches.length>1)return error("Several guests match. Please choose your name from the suggestions.",409);
    }
  }
  if(!found.length)return error("Invitation not found. Check the spelling of your name.",404);
  if(found.length!==1)return error("Several invitations match. Please enter your full name.",409);
  const groupId=found[0].group_id;
  const people=await membersOf(groupId,env);
  if(!people.length)return error("Invitation not found.",404);
  return json({household_token:await createToken(groupId,env),members:people.map(publicMember)});
}
/* Send an RSVP confirmation through the free Gmail Apps Script integration.
   The wedding website renders a lossless PNG; Gmail embeds it inline. */
async function sendConfirmationEmail(req,env,ctx){
  const handlingStartedAt=Date.now();
  const declared=Number(req.headers.get("content-length")||0);
  if(declared>9800000)return error("Confirmation image is too large.",413);
  const raw=await req.text();
  if(raw.length>9800000)return error("Confirmation image is too large.",413);
  let body;
  try{body=JSON.parse(raw)}catch{return error("Invalid confirmation request.");}
  const groupId=await validateToken(body?.household_token,env);
  if(!groupId)return error("Your invitation session expired. Search your name again.",403);
  const email=typeof body?.email==="string"?body.email.trim():"";
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return error("Enter a valid e-mail address.");
  const members=await memberEmailRecords(env,groupId);
  if(members.some(m=>m.rsvp_status==='pending'))return error('Confirm all guest responses first.',409);
  const targets=emailTargets(members);
  if(!targets.length)
    return error("The attending guests have already received confirmation.",409);
  const clientNames=body?.attending_names,clientIds=body?.attending_member_ids;
  if(!Array.isArray(clientNames)||!Array.isArray(clientIds)||
    clientNames.length!==targets.length||clientIds.length!==targets.length||
    !targets.every((member,i)=>clientNames[i]===member.display_name&&
      Number(clientIds[i])===Number(member.id)))
    return error("The guests awaiting email have changed. Reopen your invitation.",409);
  const image=typeof body?.image_data_url==="string"?body.image_data_url:"";
  const match=/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if(!match||match[1].length>9500000||match[1].length<1000||match[1].length%4!==0)
    return error("The confirmation image is invalid or too large.",400);
  try{
    const sample=atob(match[1]);
    if(sample.length<500||sample.length>7125000||
      sample.charCodeAt(0)!==137||sample.charCodeAt(1)!==80||
      sample.charCodeAt(2)!==78||sample.charCodeAt(3)!==71||
      sample.charCodeAt(4)!==13||sample.charCodeAt(5)!==10||
      sample.charCodeAt(6)!==26||sample.charCodeAt(7)!==10)
      return error("The confirmation PNG image is corrupted.",400);
  }catch{return error("The confirmation PNG image is corrupted.",400);}
  if(!ctx||typeof ctx.waitUntil!=="function")
    return error("Background email delivery is temporarily unavailable.",503);
  if(!env.GMAIL_SCRIPT_URL||!env.GMAIL_SCRIPT_TOKEN){
    return error("Gmail confirmation is not configured yet. Please contact the couple.",503);
  }
  let scriptURL;
  try{scriptURL=new URL(env.GMAIL_SCRIPT_URL);}catch{return error('Invalid Gmail mailer URL.',503);}
  if(scriptURL.protocol!=='https:'||scriptURL.hostname!=='script.google.com'||
     !/^\/macros\/s\/[^/]+\/exec$/.test(scriptURL.pathname))
    return error('Invalid Gmail mailer URL.',503);
  if(!await throttle(req,env,"confirmation-mail",5))
    return error("Too many confirmation requests. Please try again later.",429);
  // Only store a one-way hash of the recipient; never persist the address.
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS rsvp_confirmation_deliveries ("+
    "group_id INTEGER NOT NULL,email_hash TEXT NOT NULL,created_at INTEGER NOT NULL,"+
    "PRIMARY KEY(group_id,email_hash))"
  ).run();
  await ensureEmailChoices(env);
  // A different guest in this same invitation may use the same email
  // address, or may supply a distinct one. Deduplicate each recipient set.
  const emailHash=await digest(groupId+"|"+targets.map(m=>m.id).join(",")+"|"+email.toLowerCase());
  const at=now();
  await env.DB.prepare(
    "DELETE FROM rsvp_confirmation_deliveries WHERE created_at<?"
  ).bind(at-86400).run();
  const pending=await env.DB.prepare(
    "SELECT created_at FROM rsvp_confirmation_deliveries WHERE group_id=? AND email_hash=?"
  ).bind(groupId,emailHash).first();
  // Old interrupted requests may leave an orphaned limiter row. After 45s,
  // permit a new attempt; do not mistake the row for a completed delivery.
  if(pending){
    if(at-Number(pending.created_at)<45)
      return json({ok:true,queued:true,already_queued:true},202);
    await env.DB.prepare(
      "DELETE FROM rsvp_confirmation_deliveries WHERE group_id=? AND email_hash=?"
    ).bind(groupId,emailHash).run();
  }
  const count=await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM rsvp_confirmation_deliveries WHERE group_id=? AND created_at>=?"
  ).bind(groupId,at-86400).first();
  if(Number(count?.n||0)>=4)
    return error("The confirmation e-mail limit for this invitation has been reached.",429);
  const claimed=await env.DB.prepare(
    "INSERT OR IGNORE INTO rsvp_confirmation_deliveries(group_id,email_hash,created_at) VALUES(?,?,?)"
  ).bind(groupId,emailHash,at).run();
  if(!Number(claimed.meta?.changes))
    return json({ok:true,queued:true,already_queued:true},202);

  // The request belongs to the Cloudflare Worker. Its lifetime no longer
  // depends on a browser window, page navigation, or dismissal of the modal.
  const deliver=(async()=>{
    const gmailStartedAt=Date.now();
    try{
      const response=await fetch(env.GMAIL_SCRIPT_URL,{
        method:"POST",
        headers:{"Content-Type":"text/plain; charset=utf-8"},
        body:JSON.stringify({
          token:env.GMAIL_SCRIPT_TOKEN,
          to:email,
          image_base64:match[1],
          subject:"Save the date! - Your Wedding Confirmation"
        }),
        redirect:"follow"
      });
      const details=await response.json().catch(()=>({}));
      if(!response.ok||details.ok!==true)
        throw Error("Gmail did not accept the wedding confirmation.");
      // Record this address ONLY for members included in this delivery.
      // Existing confirmation addresses for others are never overwritten.
      await saveMemberEmailChoices(env,targets,"EMAIL",email);
      console.log("[Wedding RSVP] Gmail accepted delivery",{
        group_id:groupId,
        gmail_request_ms:Date.now()-gmailStartedAt,
        since_worker_request_ms:Date.now()-handlingStartedAt
      });
    }catch(err){
      console.error("[Wedding RSVP] Background Gmail delivery failed",{
        group_id:groupId,
        gmail_request_ms:Date.now()-gmailStartedAt,
        since_worker_request_ms:Date.now()-handlingStartedAt,
        error:err?.message||String(err)
      });
      await env.DB.prepare(
        "DELETE FROM rsvp_confirmation_deliveries WHERE group_id=? AND email_hash=?"
      ).bind(groupId,emailHash).run().catch(()=>{});
    }
  })();
  ctx.waitUntil(deliver);
  console.log("[Wedding RSVP] Email accepted for background delivery",{
    group_id:groupId,
    worker_setup_ms:Date.now()-handlingStartedAt,
    png_kb:Math.round(match[1].length*3/4/1024)
  });
  return json({ok:true,queued:true},202);
}

async function submit(req,env){
  const body=await parseBody(req);
  const groupId=await validateToken(body?.household_token,env);
  if(!groupId)return error("This invitation session has expired. Search your name again.",403);
  const members=await membersOf(groupId,env);
  if(!members.length)return error("Invitation not found.",404);
  if(!Array.isArray(body?.answers)||body.answers.length!==members.length)
    return error("You must answer for every person in your group.");
  const answers=new Map();
  for(const a of body.answers){
    if(!a||!Number.isInteger(a.id)||answers.has(a.id)||
       !["attending","not_attending"].includes(a.status))
      return error("Select Attending or Not Attending for every person.");
    answers.set(a.id,a.status);
  }
  if(members.some(m=>!answers.has(Number(m.id))))
    return error("You must answer for every person in your group.");
  await ensureMemberEmailChoices(env);
  const at=new Date().toISOString(),statements=[];
  const anyAttending=[...answers.values()].some(status=>status==='attending');
  // IMPORTANT: never delete another person's existing confirmation when
  // a different person changes their RSVP. Only changed members lose their
  // old email; those who remain Attending keep their exact address.
  for(const m of members){
    const status=answers.get(Number(m.id));
    if(status!==m.rsvp_status){
      statements.push(env.DB.prepare(
        "DELETE FROM rsvp_member_email_choices WHERE member_id=?"
      ).bind(m.id));
    }
    statements.push(env.DB.prepare(
      "UPDATE rsvp_members SET rsvp_status=?,updated_at=? WHERE id=? AND group_id=?"
    ).bind(status,at,m.id,groupId));
    statements.push(env.DB.prepare(
      "INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) "+
      "VALUES(?,?,?,'guest',?)"
    ).bind(m.id,m.rsvp_status,status,at));
    if(!anyAttending){
      statements.push(env.DB.prepare(
        "INSERT INTO rsvp_member_email_choices(member_id,choice,email,updated_at) "+
        "VALUES(?,'NO','',?) ON CONFLICT(member_id) DO UPDATE SET "+
        "choice='NO',email='',updated_at=excluded.updated_at"
      ).bind(m.id,at));
    }
  }
  await env.DB.batch(statements);
  const after=await memberEmailRecords(env,groupId);
  await notifyRSVPUpdate(env,"all");
  return json({
    ok:true,updated:members.length,
    email_targets:emailTargets(after).map(m=>Number(m.id))
  });
}
async function overview(env){
  await ensureGuestMetadata(env);
  const groups=(await env.DB.prepare(
    "SELECT id,group_code FROM rsvp_groups "+
    "ORDER BY CASE "+
      "WHEN id=(SELECT group_id FROM rsvp_members WHERE display_name='Mattia Fanti' LIMIT 1) THEN 0 "+
      "WHEN group_code='initial-butch-alexis-2026' THEN 1 "+
      "WHEN group_code='initial-raphiel-rose-ann-2026' THEN 2 "+
      "WHEN group_code='family-assunta-jessica-andrea-2026' THEN 3 "+
      "ELSE 4 END,id"
  ).all()).results;
  await ensureEmailChoices(env);
  await ensureMemberEmailClears(env);
  const people=(await env.DB.prepare(
    "SELECT m.id,m.group_id,m.display_name,m.role,m.rsvp_status,m.updated_at,"+
    "COALESCE(c.choice,'') AS email_choice,"+
    "CASE WHEN m.rsvp_status='pending' THEN '' "+
    "WHEN cleared.member_id IS NOT NULL AND ("+
    "c.updated_at IS NULL OR cleared.cleared_at >= c.updated_at) THEN '' "+
    "WHEN c.choice='NO' THEN 'NO' "+
    "WHEN c.choice='EMAIL' THEN c.email ELSE '' END AS email "+
    "FROM rsvp_members m "+
    "LEFT JOIN rsvp_confirmation_choices c ON c.group_id=m.group_id "+
    "LEFT JOIN rsvp_member_email_clears cleared ON cleared.member_id=m.id "+
    "ORDER BY m.group_id,m.id"
  ).all()).results;
  // These seven guests attend virtually when they choose Attending. They
  // must not inflate the in-person Attending total; Pending and Not Attending
  // are counted normally regardless of guest name.
  const virtualGuests=new Set([
    "Maria Assunta Morisco","Jessica Fanti","Andrea Lilliu",
    "Rita Morisco","Mario Buccola","Patrizia Fanti","Angelo Mallus"
  ]);
  const summary={
    groups:groups.length,invited:people.length,
    pending:0,attending:0,virtually_attending:0,not_attending:0
  };
  for(const p of people){
    if(p.rsvp_status==="attending"&&virtualGuests.has(p.display_name)){
      summary.virtually_attending++;
    }else if(Object.hasOwn(summary,p.rsvp_status)){
      summary[p.rsvp_status]++;
    }
  }
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
  await ensureEmailChoices(env);
  await ensureMemberEmailClears(env);
  const at=new Date().toISOString();
  await env.DB.batch([
    // Clearing a person's email is persistent across Pending -> Attending
    // and only affects this member, never their group mates.
    env.DB.prepare(
      "INSERT INTO rsvp_member_email_clears(member_id,cleared_at) VALUES(?,?) "+
      "ON CONFLICT(member_id) DO UPDATE SET cleared_at=excluded.cleared_at"
    ).bind(id,at),
    env.DB.prepare(
      "DELETE FROM rsvp_confirmation_choices WHERE group_id=? AND NOT EXISTS ("+
      "SELECT 1 FROM rsvp_members WHERE group_id=? AND id<>? AND rsvp_status='attending') AND ?!='attending'"
    ).bind(member.group_id,member.group_id,id,b.status),
    env.DB.prepare("UPDATE rsvp_members SET rsvp_status=?,updated_at=? WHERE id=?")
      .bind(b.status,b.status==="pending"?null:at,id),
    env.DB.prepare("INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) VALUES(?,?,?,'admin',?)")
      .bind(id,member.rsvp_status,b.status,at),
    // Only when everyone in the group is Not Attending: record NO for the
    // confirmation email. Never erase an address while anyone still attends.
    env.DB.prepare(
      "INSERT INTO rsvp_confirmation_choices(group_id,choice,email,updated_at) "+
      "SELECT ?,'NO','',? WHERE ?='not_attending' AND NOT EXISTS ("+
      "SELECT 1 FROM rsvp_members WHERE group_id=? AND id<>? AND rsvp_status!='not_attending') "+
      "ON CONFLICT(group_id) DO UPDATE SET choice='NO',email='',updated_at=excluded.updated_at"
    ).bind(member.group_id,at,b.status,member.group_id,id)
  ]);
  await notifyRSVPUpdate(env,"all");
  return json({ok:true,status:b.status});
}
async function resetAll(req,env){
  const body=await parseBody(req);
  if(body?.confirm!=="RESET ALL RSVP")return error("Confirmation required.",400);
  const count=await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM rsvp_members WHERE rsvp_status!='pending'"
  ).first();
  await ensureEmailChoices(env);
  await ensureMemberEmailClears(env);
  const stale=await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM rsvp_members WHERE rsvp_status!='pending' OR updated_at IS NOT NULL"
  ).first();
  const choices=await env.DB.prepare("SELECT COUNT(*) AS total FROM rsvp_confirmation_choices").first();
  const memberClears=await env.DB.prepare("SELECT COUNT(*) AS total FROM rsvp_member_email_clears").first();
  if(!Number(stale?.total||0)&&!Number(choices?.total||0)&&!Number(memberClears?.total||0))return json({ok:true,updated:0});
  const at=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO rsvp_member_events(member_id,previous_status,status,source,received_at) SELECT id,rsvp_status,'pending','admin',? FROM rsvp_members WHERE rsvp_status!='pending'").bind(at),
    env.DB.prepare("UPDATE rsvp_members SET rsvp_status='pending',updated_at=NULL WHERE rsvp_status!='pending' OR updated_at IS NOT NULL"),
    env.DB.prepare("DELETE FROM rsvp_confirmation_choices"),
    env.DB.prepare("DELETE FROM rsvp_member_email_clears")
  ]);
  await notifyRSVPUpdate(env,"all");
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
  await notifyRSVPUpdate(env,"history");
  return json({ok:true,deleted:Number(result.meta?.changes||0)});
}

function csvCell(v){
  let s=String(v??"");
  if(/^[\t\r\n =+\-@]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
async function exportCsv(env){
  await ensureEmailChoices(env);
  const rows=(await env.DB.prepare(
    "SELECT g.group_code,m.display_name,m.role,m.rsvp_status,m.updated_at,"+
    "CASE WHEN m.rsvp_status='pending' THEN '' ELSE COALESCE(c.choice,'') END AS email_choice "+
    "FROM rsvp_members m JOIN rsvp_groups g ON g.id=m.group_id "+
    "LEFT JOIN rsvp_confirmation_choices c ON c.group_id=g.id ORDER BY g.id,m.id"
  ).all()).results;
  const cols=["group_code","display_name","role","rsvp_status","email_choice","updated_at"];
  const text="\uFEFF"+[cols.join(","),...rows.map(row=>cols.map(k=>csvCell(row[k])).join(","))].join("\r\n");
  return new Response(text,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="wedding-group-rsvp.csv"',"Cache-Control":"no-store"}});
}
/* Public, passwordless RSVP dashboard by owner request. Admin status changes
   are explicitly unauthenticated; do not expose extra operations. */
export async function groupedRoutes(req,env,ctx){
  const path=new URL(req.url).pathname,method=req.method;
  if(path==="/api/household/suggest"&&method==="POST")return suggest(req,env);
  if(path==="/api/household/lookup"&&method==="POST")return lookup(req,env);
  if(path==="/api/household/confirm"&&method==="POST")return submit(req,env);
  if(path==="/api/household/send-confirmation-email"&&method==="POST")return sendConfirmationEmail(req,env,ctx);
  if(path==="/api/household/skip-confirmation-email"&&method==="POST")return skipConfirmationEmail(req,env);
  if(path==="/api/admin/households"&&method==="GET")return json(await overview(env));
  if(path==="/api/admin/households/events"&&method==="GET")return eventHistory(req,env);
  if(path==="/api/admin/households/events/reset"&&method==="POST")return resetEventHistory(req,env);
  if(path==="/api/admin/households/export.csv"&&method==="GET")return exportCsv(env);
  if(path==="/api/admin/households/reset"&&method==="POST")return resetAll(req,env);
  const memberPath=path.match(/^\/api\/admin\/households\/member\/(\d+)$/);
  if(memberPath&&method==="PATCH")return adminPatch(req,env,Number(memberPath[1]));
  // The legacy worker provides the shared admin password/session endpoints.
  if((path==="/api/admin/login"||path==="/api/admin/logout")&&
      (method==="POST"))return null;
  if(path.startsWith("/api/admin/"))return error("Unknown admin endpoint.",404);
  return null;
}
