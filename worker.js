import { adminPage } from "./admin.js";
import { adminGroupsPage } from "./admin-groups.js";
import { groupedRoutes } from "./group-api.js";
export { RSVPUpdates } from "./rsvp-live.js";
const enc = new TextEncoder();
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const fail = (message,status=400) => json({error:message},status);
const now = () => Math.floor(Date.now()/1000);
const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const hash = async (value) => b64(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))));
const equal = (a,b) => {if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
const hmacKey = async env => crypto.subtle.importKey("raw",enc.encode(env.INVITE_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
const sign = async (id,env) => String(id)+"."+b64(new Uint8Array(await crypto.subtle.sign("HMAC",await hmacKey(env),enc.encode(String(id)))));
async function checkInvitation(token,env){
  if(typeof token!=="string"||!/^[1-9]\d{0,9}\.[A-Za-z0-9_-]{43}$/.test(token))return null;
  const id=Number(token.split(".")[0]);
  return equal(token,await sign(id,env))?id:null;
}
async function getJson(req){
  const raw=await req.text();
  if(raw.length>12000)throw Error("Request body too large");
  try{return JSON.parse(raw||"{}");}catch{return null;}
}
const safeText = (s,max=150) => String(s??"").trim().slice(0,max);
const publicGuest = g => ({display_name:g.display_name,seats:g.seats,rsvp_status:g.rsvp_status,guest_count:g.guest_count,email:g.email,message:g.message});
async function authorized(req,env){
  const header=req.headers.get("Authorization")||"";
  const match=header.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
  if(!match)return false;
  const item=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash=?").bind(await hash(match[1])).first();
  return !!item&&Number(item.expires_at)>now();
}
function cors(origin,env){
  const allowed=String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  return origin&&allowed.includes(origin)?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS","Access-Control-Allow-Headers":"Authorization,Content-Type","Access-Control-Max-Age":"600"}:{};
}
function decorate(response,headers){
  const h=new Headers(response.headers);
  for(const [k,v] of Object.entries(headers))h.set(k,v);
  h.set("X-Content-Type-Options","nosniff");h.set("Referrer-Policy","no-referrer");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
async function route(req,env,ctx){
  const u=new URL(req.url),path=u.pathname,method=req.method;
  if(method==="GET"&&path==="/api/health")return json({ok:true});
  const grouped=await groupedRoutes(req,env,ctx);
  if(grouped)return grouped;
  if(path==="/api/invite"||path==="/api/rsvp")return fail("Use the group RSVP service.",404);
  if(method==="GET"&&path==="/api/invite"){
    const id=await checkInvitation(u.searchParams.get("token"),env);
    if(!id)return fail("Invalid invitation code.",404);
    const guest=await env.DB.prepare("SELECT * FROM guests WHERE id=? AND excluded=0").bind(id).first();
    return guest?json({guest:publicGuest(guest)}):fail("Invitation not found.",404);
  }
  if(method==="POST"&&path==="/api/rsvp"){
    const b=await getJson(req);if(!b)return fail("Invalid request body.");
    const id=await checkInvitation(b.token,env);
    if(!id)return fail("Invitation code is invalid.",403);
    const guest=await env.DB.prepare("SELECT * FROM guests WHERE id=? AND excluded=0").bind(id).first();
    if(!guest)return fail("Invitation was not found.",404);
    if(!["attending","not_attending"].includes(b.status))return fail("Select Attending or Not attending.");
    const seats=b.status==="attending"?Number(b.guest_count):0;
    if(!Number.isInteger(seats)||seats<0||seats>Number(guest.seats)||(b.status==="attending"&&seats<1))return fail("Invalid number of seats.");
    const email=safeText(b.email,180),message=safeText(b.message,500);
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("Invalid email address.");
    const at=new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE guests SET rsvp_status=?,guest_count=?,email=?,message=?,updated_at=? WHERE id=?").bind(b.status,seats,email,message,at,id),
      env.DB.prepare("INSERT INTO rsvp_events(guest_id,previous_status,status,guest_count,received_at) VALUES(?,?,?,?,?)").bind(id,guest.rsvp_status,b.status,seats,at)
    ]);
    return json({ok:true,status:b.status,guest_count:seats});
  }
  if(method==="POST"&&path==="/api/admin/login"){
    const ip=req.headers.get("CF-Connecting-IP")||"unknown";
    const ipHash=await hash(ip+env.INVITE_SECRET);
    const current=now(),attempt=await env.DB.prepare("SELECT count,first_at FROM login_attempts WHERE ip_hash=?").bind(ipHash).first();
    if(attempt&&Number(attempt.count)>=7&&current-Number(attempt.first_at)<900)return fail("Too many attempts. Try again later.",429);
    const b=await getJson(req);
    if(!b)return fail("Invalid request body.");
    const valid=equal(await hash(String(b.password||"")),await hash(env.ADMIN_PASSWORD));
    if(!valid){
      if(!attempt||current-Number(attempt.first_at)>=900)
        await env.DB.prepare("INSERT INTO login_attempts(ip_hash,count,first_at) VALUES(?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET count=1,first_at=excluded.first_at").bind(ipHash,current).run();
      else await env.DB.prepare("UPDATE login_attempts SET count=count+1 WHERE ip_hash=?").bind(ipHash).run();
      return fail("Incorrect password.",401);
    }
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash=?").bind(ipHash).run();
    const token=b64(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)").bind(await hash(token),current+8*3600).run();
    return json({token,expires_at:current+8*3600});
  }
  if(path.startsWith("/api/admin/")){
    if(!await authorized(req,env))return fail("Admin login required.",401);
    if(method==="POST"&&path==="/api/admin/logout"){
      const token=req.headers.get("Authorization").slice(7);
      await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await hash(token)).run();
      return json({ok:true});
    }
    if(method==="GET"&&path==="/api/admin/overview"){
      const guests=(await env.DB.prepare("SELECT * FROM guests ORDER BY category,display_name").all()).results;
      const available=guests.filter(g=>!g.excluded);
      const summary={
        invited:available.length,
        pending:available.filter(g=>g.rsvp_status==="pending").length,
        attending:available.filter(g=>g.rsvp_status==="attending").length,
        not_attending:available.filter(g=>g.rsvp_status==="not_attending").length,
        seats_confirmed:available.reduce((sum,g)=>sum+Number(g.guest_count||0),0),
        expected_absence:available.filter(g=>g.expected_absence).length,
        buffer_planned:24
      };
      const withLinks=await Promise.all(guests.map(async g=>({...g,invite_token:g.excluded?"":await sign(g.id,env)})));
      return json({summary,guests:withLinks,site_url:env.PUBLIC_SITE_URL||""});
    }
    if(method==="POST"&&path==="/api/admin/guest"){
      const b=await getJson(req);if(!b)return fail("Invalid request body.");
      const display_name=safeText(b.display_name,140),category=safeText(b.category||"Main",80);
      const seats=Number(b.seats||1);
      if(!display_name||!category||!Number.isInteger(seats)||seats<1||seats>20)return fail("A name, category and valid seat count are required.");
      const res=await env.DB.prepare("INSERT INTO guests(display_name,category,seats,expected_absence,tentative,proxy,internal_note,excluded) VALUES(?,?,?,?,?,?,?,?)")
        .bind(display_name,category,seats,b.expected_absence?1:0,b.tentative?1:0,safeText(b.proxy,150),safeText(b.internal_note,500),b.excluded?1:0).run();
      return json({ok:true,id:res.meta.last_row_id},201);
    }
    const guestPath=path.match(/^\/api\/admin\/guest\/(\d+)$/);
    if(guestPath&&method==="PATCH"){
      const id=Number(guestPath[1]),current=await env.DB.prepare("SELECT * FROM guests WHERE id=?").bind(id).first();
      if(!current)return fail("Guest not found.",404);
      const body=await getJson(req);if(!body)return fail("Invalid body.");
      const fields=["display_name","category","seats","expected_absence","tentative","proxy","internal_note","excluded","rsvp_status","guest_count","email","message"];
      const vals={};
      for(const field of fields)if(Object.prototype.hasOwnProperty.call(body,field))vals[field]=body[field];
      if(!Object.keys(vals).length)return fail("Nothing to update.");
      if("display_name" in vals){vals.display_name=safeText(vals.display_name,140);if(!vals.display_name)return fail("Guest name required.");}
      if("category" in vals){vals.category=safeText(vals.category,80);if(!vals.category)return fail("Category required.");}
      if("seats" in vals){vals.seats=Number(vals.seats);if(!Number.isInteger(vals.seats)||vals.seats<1||vals.seats>20)return fail("Invalid seats.");}
      if("rsvp_status" in vals&&!["pending","attending","not_attending"].includes(vals.rsvp_status))return fail("Invalid RSVP status.");
      if("guest_count" in vals){vals.guest_count=Number(vals.guest_count);if(!Number.isInteger(vals.guest_count)||vals.guest_count<0||vals.guest_count>Number(vals.seats??current.seats))return fail("Invalid confirmed guests.");}
      for(const key of ["expected_absence","tentative","excluded"])if(key in vals)vals[key]=vals[key]?1:0;
      for(const key of ["proxy","internal_note","email","message"])if(key in vals)vals[key]=safeText(vals[key],key==="message"?500:200);
      if(["pending","not_attending"].includes(vals.rsvp_status))vals.guest_count=0;
      if(vals.rsvp_status==="attending"&&!Object.prototype.hasOwnProperty.call(vals,"guest_count")&&current.guest_count===0)vals.guest_count=1;
      if(Number(vals.guest_count??current.guest_count)>Number(vals.seats??current.seats))return fail("Confirmed count exceeds reserved seats.");
      vals.updated_at=new Date().toISOString();
      const keys=Object.keys(vals),sets=keys.map(key=>key+"=?").join(",");
      await env.DB.prepare("UPDATE guests SET "+sets+" WHERE id=?").bind(...keys.map(k=>vals[k]),id).run();
      return json({ok:true});
    }
    if(guestPath&&method==="DELETE"){
      await env.DB.prepare("DELETE FROM guests WHERE id=?").bind(Number(guestPath[1])).run();return json({ok:true});
    }
    if(method==="GET"&&path==="/api/admin/export.csv"){
      const rows=(await env.DB.prepare("SELECT * FROM guests ORDER BY category,display_name").all()).results;
      const cols=["id","display_name","category","seats","rsvp_status","guest_count","expected_absence","tentative","proxy","internal_note","email","message","updated_at","excluded"];
      const csvCell=value=>{
        let s=String(value??"");
        if(/^[\t\r\n =+\-@]/.test(s))s="'"+s;
        return '"'+s.replace(/"/g,'""')+'"';
      };
      const csv=[cols.join(","),...rows.map(g=>cols.map(k=>csvCell(g[k])).join(","))].join("\r\n");
      return new Response("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="wedding-rsvp.csv"',"Cache-Control":"no-store"}});
    }
    return fail("Admin endpoint not found.",404);
  }
  return fail("Not found.",404);
}
export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(["/admin","/admin/","/admin/legacy","/admin/legacy/"].includes(url.pathname)){
      return new Response(adminGroupsPage,{headers:{
        "Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
        "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",
        "Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' wss://"+url.host+"; base-uri 'none'; frame-ancestors 'none'"
      }});
    }
    if(["/admin/ita","/admin/ita/"].includes(url.pathname)){
      return Response.redirect(url.origin+"/admin",302);
    }
    if(!env.DB)return fail("Cloudflare D1 database binding is not configured.",503);
    // WebSocket upgrade responses must be forwarded unchanged. Wrapping a
    // status-101 response in the normal JSON/CORS decorator would break it.
    if(url.pathname==="/api/admin/households/live"&&req.method==="GET"){
      if(req.headers.get("Upgrade")?.toLowerCase()!=="websocket")
        return fail("WebSocket upgrade required.",426);
      if(!env.RSVP_LIVE)return fail("Live updates are not configured.",503);
      const room=env.RSVP_LIVE.get(env.RSVP_LIVE.idFromName("wedding-rsvp-dashboard"));
      return room.fetch(req);
    }
    if(url.pathname==="/"&&req.method==="GET")return Response.redirect(env.PUBLIC_SITE_URL||"https://mattiaafanti.github.io/Marriage/",302);
    const origin=req.headers.get("Origin"),headers=cors(origin,env);
    if(origin&&origin!==url.origin&&!Object.keys(headers).length)return fail("Origin not allowed.",403);
    if(req.method==="OPTIONS")return decorate(new Response(null,{status:204}),headers);
    try{return decorate(await route(req,env,ctx),headers);}
    catch(err){console.error("Wedding API failed",{method:req.method,path:url.pathname,error:err?.stack||err?.message||String(err)});return decorate(fail("Unable to complete the request.",500),headers);}
  }
};