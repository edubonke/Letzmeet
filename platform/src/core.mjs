import http from 'node:http';
import { audit, assertId, assertKeys, bodyFrom, decrypt, encrypt, error, newToken, passwordHash, passwordVerify, requiredString, respond, sign, stableEqual, uuid } from './common.mjs';

const reportCategories = new Set(['harassment','threats','stalking','blackmail','non_consensual_disclosure','impersonation','financial_scam','sexual_coercion','suspected_minor','hate_speech','unwanted_explicit_content','offline_incident']);
const urgent = new Set(['threats','stalking','blackmail','non_consensual_disclosure','sexual_coercion','suspected_minor','offline_incident']);
const metros = new Set(['Johannesburg','Pretoria','Soweto','Midrand','Other Gauteng']);
const locales = new Set(['en','zu','xh']);

export async function drainOutbox(store,vault,logger=()=>{}) {
  for(const event of store.pending()) {
    try {
      if(event.event==='REVOKE_PAIR') await vault('revoke-pair',{a:event.actor,b:event.target});
      store.finish(event.id); audit(logger,'OUTBOX_DELIVERED','allowed');
    } catch { audit(logger,'OUTBOX_DELIVERY','denied',{code:'RETRY_REQUIRED'}); }
  }
}

export function createCoreServer({store,vault,messageKey,paymentSecret,logger=console.log,sandbox=true}) {
  if(!sandbox)throw new Error('PRODUCTION_ADAPTERS_NOT_APPROVED');
  if(!Buffer.isBuffer(messageKey)||messageKey.length!==32 || typeof paymentSecret!=='string'||paymentSecret.length<32)throw new Error('SECRETS_REQUIRED');
  const attempts=new Map();
  const limit=(req) => {
    const key=req.socket.remoteAddress||'unknown'; const now=Date.now();const obj=attempts.get(key)||{start:now,n:0};
    if(now-obj.start>60_000){obj.start=now;obj.n=0;}
    obj.n++;attempts.set(key,obj);if(obj.n>120)throw error(429,'RATE_LIMITED');
  };
  async function user(req) {
    const bearer=req.headers.authorization;
    if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9_-]{30,}$/.test(bearer))throw error(401,'AUTH_REQUIRED');
    const u=store.sessionUser(bearer.slice(7));
    if(!u||u.status!=='active')throw error(401,'SESSION_EXPIRED');
    return u.id;
  }
  const server=http.createServer(async(req,res)=>{
    const started=Date.now();let route='unknown',status=500;
    try {
      limit(req);
      const url=new URL(req.url,'http://localhost');route=url.pathname;
      if(req.method==='GET'&&route==='/healthz'){status=200;return respond(res,status,{status:'ok',mode:'sandbox'});}
      if(route.startsWith('/v1/payments/')&&route==='/v1/payments/webhook'&&req.method==='POST') {
        const {raw,data}=await bodyFrom(req,4096);
        const signature=req.headers['x-sandbox-signature'];
        const timestamp=Number(req.headers['x-sandbox-timestamp']);
        if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()-timestamp)>30_000||!stableEqual(signature,sign(paymentSecret,timestamp,raw)))throw error(401,'INVALID_WEBHOOK_SIGNATURE');
        assertKeys(data,['id','userId','type','plan','expiresAt']);
        const eventId=requiredString(data.id,128);const id=assertId(data.userId);
        if(data.type!=='sandbox.subscription.activated'||data.plan!=='plus'||!store.userById(id)||
          typeof data.expiresAt!=='string'||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now()) throw error(400,'INVALID_PAYMENT_EVENT');
        const processed=store.grantPlan(id,'plus',data.expiresAt,eventId);
        status=200;return respond(res,status,{processed});
      }
      if(req.method==='POST'&&route==='/v1/auth/register') {
        const {data}=await bodyFrom(req);
        assertKeys(data,['email','password','ageConfirmed','locale']);
        const email=requiredString(data.email,180).toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || data.ageConfirmed!==true || !locales.has(data.locale))throw error(400,'INVALID_REGISTRATION');
        if(store.userByEmail(email))throw error(409,'ACCOUNT_EXISTS');
        const id=store.createUser({email,passwordHash:passwordHash(data.password),locale:data.locale});
        const token=newToken();store.createSession(id,token);
        status=201;return respond(res,status,{userId:id,token,expiresInSeconds:3600,notice:'SANDBOX_ONLY_UNVERIFIED_AGE'});
      }
      if(req.method==='POST'&&route==='/v1/auth/login') {
        const {data}=await bodyFrom(req);assertKeys(data,['email','password']);
        const email=requiredString(data.email,180).toLowerCase();const found=store.userByEmail(email);
        if(!found||found.status!=='active'||!passwordVerify(data.password,found.password_hash))throw error(401,'INVALID_CREDENTIALS');
        const token=newToken();store.createSession(found.id,token);status=200;
        return respond(res,status,{userId:found.id,token,expiresInSeconds:3600});
      }
      if(!route.startsWith('/v1/'))throw error(404,'NOT_FOUND');
      const actor=await user(req);
      if(req.method==='GET'&&route==='/v1/me'){status=200;return respond(res,status,{id:actor,profile:store.profile(actor),entitlement:store.entitlement(actor)});}
      if(req.method==='POST'&&route==='/v1/profile'){
        const {data}=await bodyFrom(req);assertKeys(data,['displayName','bio','metro','relationshipIntent']);
        const displayName=requiredString(data.displayName,60),bio=typeof data.bio==='string'&&data.bio.length<=500?data.bio:'',
          metro=requiredString(data.metro,40),relationshipIntent=requiredString(data.relationshipIntent,80);
        if(!metros.has(metro))throw error(400,'INVALID_METRO');
        store.upsertProfile(actor,{displayName,bio,metro,relationshipIntent});status=200;return respond(res,status,{saved:true});
      }
      if(req.method==='GET'&&route==='/v1/discover'){status=200;return respond(res,status,{profiles:store.discover(actor)});}
      if(req.method==='POST'&&route==='/v1/likes'){
        const {data}=await bodyFrom(req);assertKeys(data,['targetUserId']);const outcome=store.createLike(actor,assertId(data.targetUserId));
        status=200;return respond(res,status,outcome);
      }
      if(req.method==='GET'&&route==='/v1/matches'){status=200;return respond(res,status,{matches:store.matches(actor)});}
      const msg=route.match(/^\/v1\/matches\/([a-f0-9-]{36})\/messages$/i);
      if(msg&&(req.method==='POST'||req.method==='GET')){
        const matchId=assertId(msg[1]);if(!store.matchFor(actor,matchId))throw error(403,'MATCH_REQUIRED');
        if(req.method==='POST'){
          const {data}=await bodyFrom(req);assertKeys(data,['text']);const text=requiredString(data.text,1500);
          const id=store.addMessage(actor,matchId,encrypt(messageKey,text,matchId));status=201;return respond(res,status,{messageId:id});
        }
        const list=store.messages(matchId).map(m=>({id:m.id,senderId:m.sender,text:decrypt(messageKey,m.ciphertext,matchId),sentAt:m.sentAt}));
        status=200;return respond(res,status,{messages:list});
      }
      if(req.method==='POST'&&route==='/v1/blocks'){
        const {data}=await bodyFrom(req);assertKeys(data,['targetUserId']);store.block(actor,assertId(data.targetUserId));
        await drainOutbox(store,vault,logger);
        status=200;return respond(res,status,{blocked:true});
      }
      if(req.method==='POST'&&route==='/v1/reports'){
        const {data}=await bodyFrom(req);assertKeys(data,['targetUserId','category']);
        const target=assertId(data.targetUserId);if(!store.userById(target)||actor===target||!reportCategories.has(data.category))throw error(400,'INVALID_REPORT');
        const id=store.reports(actor,target,data.category,urgent.has(data.category)?'p1':'standard');
        status=201;return respond(res,status,{reportId:id,acknowledgement:'PENDING_HUMAN_MODERATION'});
      }
      if(req.method==='POST'&&route==='/v1/disclosures') {
        const {data}=await bodyFrom(req);assertKeys(data,['text']);requiredString(data.text,1000);
        const result=await vault('put',{owner:actor,text:data.text});status=200;return respond(res,status,{version:result.version});
      }
      if(req.method==='POST'&&route==='/v1/disclosures/grants') {
        const {data}=await bodyFrom(req);assertKeys(data,['viewerUserId']);const viewer=assertId(data.viewerUserId);
        if(!store.activeMatch(actor,viewer)||store.blocked(actor,viewer))throw error(403,'MATCH_REQUIRED');
        const result=await vault('grant',{owner:actor,viewer});status=200;return respond(res,status,result);
      }
      const view=route.match(/^\/v1\/disclosures\/([a-f0-9-]{36})$/i);
      if(req.method==='GET'&&view){const owner=assertId(view[1]);
        if(!store.activeMatch(actor,owner)||store.blocked(actor,owner))throw error(403,'MATCH_REQUIRED');
        const result=await vault('read',{owner,viewer:actor});status=200;return respond(res,status,result);
      }
      if(req.method==='POST'&&route==='/v1/disclosures/revoke') {
        const {data}=await bodyFrom(req);assertKeys(data,['viewerUserId']);const r=await vault('revoke',{owner:actor,viewer:assertId(data.viewerUserId)});
        status=200;return respond(res,status,r);
      }
      if(req.method==='GET'&&route==='/v1/subscriptions/me'){status=200;return respond(res,status,{entitlement:store.entitlement(actor)});}
      if(req.method==='POST'&&route==='/v1/subscriptions/checkout'){
        // Never pretend to charge a card or grant premium access. Provider-hosted live billing is blocked.
        const {data}=await bodyFrom(req);assertKeys(data,['plan']);if(data.plan!=='plus')throw error(400,'INVALID_PLAN');
        status=501;return respond(res,status,{error:'LIVE_PAYMENT_PROVIDER_NOT_CONFIGURED',sandboxWebhookOnly:true});
      }
      throw error(404,'NOT_FOUND');
    } catch(e){status=e.status||500;respond(res,status,{error:e.code||'INTERNAL_ERROR'});}
    finally {audit(logger,'API_REQUEST',status<400?'allowed':'denied',{route:route.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi,':id'),status,elapsedMs:Date.now()-started});}
  });
  return server;
}
