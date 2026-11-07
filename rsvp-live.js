/* One hibernatable WebSocket room for instant RSVP dashboard changes.
   No guest data is transported here: messages only ask clients to refetch
   the existing read-only overview/history endpoints from D1. */
export class RSVPUpdates {
  constructor(ctx,env){
    this.ctx=ctx;
    this.env=env;
  }
  async fetch(request){
    const url=new URL(request.url);
    if(request.headers.get("Upgrade")?.toLowerCase()==="websocket"){
      const pair=new WebSocketPair();
      const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      return new Response(null,{status:101,webSocket:client});
    }
    if(request.method==="POST"&&url.pathname==="/notify"){
      const kind=await request.text();
      const payload=JSON.stringify({type:"rsvp-update",scope:
        kind==="history"?"history":kind==="guests"?"guests":"all"});
      for(const socket of this.ctx.getWebSockets()){
        try{socket.send(payload);}catch(error){
          console.error("RSVP WebSocket broadcast failed",error?.message||String(error));
          try{socket.close(1011,"Delivery interrupted");}catch(_){}
        }
      }
      return new Response(null,{status:204});
    }
    return new Response("Not found",{status:404});
  }
}

export async function notifyRSVPUpdate(env,scope="all"){
  if(!env.RSVP_LIVE)return;
  try{
    const id=env.RSVP_LIVE.idFromName("wedding-rsvp-dashboard");
    const stub=env.RSVP_LIVE.get(id);
    const result=await stub.fetch("https://live.internal/notify",{
      method:"POST",body:scope
    });
    if(!result.ok)console.error("RSVP live notification failed",result.status);
  }catch(err){
    // Failure to push a dashboard notification never rolls back RSVP data.
    console.error("RSVP live notification unavailable",err?.message||String(err));
  }
}
