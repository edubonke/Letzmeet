import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { CoreStore, VaultStore } from '../src/store.mjs';
import { createCoreServer, drainOutbox } from '../src/core.mjs';
import { createVaultServer, createVaultClient } from '../src/vault.mjs';
import { sign, encrypt, decrypt } from '../src/common.mjs';

async function setUp(t) {
  const logs=[];const logger=m=>logs.push(m);const key=randomBytes(32),messages=randomBytes(32);
  const secret=randomBytes(40).toString('hex'),paymentSecret=randomBytes(40).toString('hex');
  const vs=new VaultStore(),cs=new CoreStore();
  const vaultServer=createVaultServer({store:vs,key,secret,logger});
  await new Promise(resolve=>vaultServer.listen(0,'127.0.0.1',resolve));
  const vault=createVaultClient({url:`http://127.0.0.1:${vaultServer.address().port}`,secret});
  const coreServer=createCoreServer({store:cs,vault,messageKey:messages,paymentSecret,logger});
  await new Promise(resolve=>coreServer.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await Promise.all([new Promise(r=>coreServer.close(r)),new Promise(r=>vaultServer.close(r))]);cs.close();vs.close();});
  const base=`http://127.0.0.1:${coreServer.address().port}`;
  const call=async(route,{method='GET',token,body,headers={}}={})=>{
    const resp=await fetch(base+route,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    return {code:resp.status,data:await resp.json()};
  };
  const register=async(email)=>{
    const response=await call('/v1/auth/register',{method:'POST',body:{email,password:'GoodPassword#2026',ageConfirmed:true,locale:'en'}});
    assert.equal(response.code,201);
    return response.data;
  };
  return {call,register,cs,vs,vault,logs,paymentSecret,base,vaultBase:`http://127.0.0.1:${vaultServer.address().port}`,internalSecret:secret};
}

test('registration, consent gate, discovery, mutual match, encrypted private chat and immediate block',async t=>{
  const {call,register,cs,vs,logs}=await setUp(t);
  const bad=await call('/v1/auth/register',{method:'POST',body:{email:'bad@example.com',password:'GoodPassword#2026',ageConfirmed:false,locale:'en'}});
  assert.equal(bad.code,400);
  const a=await register('alpha@example.test'), b=await register('bravo@example.test');
  for(const [u,name] of [[a,'Alpha'],[b,'Bravo']]){
    const r=await call('/v1/profile',{method:'POST',token:u.token,body:{displayName:name,bio:'coffee',metro:'Johannesburg',relationshipIntent:'Friendship'}});
    assert.equal(r.code,200);
  }
  const discovery=await call('/v1/discover',{token:a.token});
  assert.equal(discovery.data.profiles.length,1);
  assert.equal(discovery.data.profiles[0].id,b.userId);
  let res=await call('/v1/likes',{method:'POST',token:a.token,body:{targetUserId:b.userId}});
  assert.equal(res.data.matched,false);
  res=await call('/v1/likes',{method:'POST',token:b.token,body:{targetUserId:a.userId}});
  assert.equal(res.data.matched,true);const matchId=res.data.matchId;
  const secret='synthetic secret not allowed in logs';
  assert.equal((await call('/v1/messages',{token:a.token})).code,404);
  assert.equal((await call(`/v1/matches/${matchId}/messages`,{method:'POST',token:a.token,body:{text:secret}})).code,201);
  const message=cs.messages(matchId)[0];assert.equal(message.ciphertext.includes(secret),false);
  assert.equal((await call(`/v1/matches/${matchId}/messages`,{token:b.token})).data.messages[0].text,secret);
  // Vault is separate: read without an explicit owner-to-viewer grant stays denied.
  assert.equal((await call('/v1/disclosures',{method:'POST',token:a.token,body:{text:'SYNTHETIC HEALTH DISCLOSURE'}})).code,200);
  const path=`/v1/disclosures/${a.userId}`;
  assert.equal((await call(path,{token:b.token})).data.visible,false);
  assert.equal((await call('/v1/disclosures/grants',{method:'POST',token:a.token,body:{viewerUserId:b.userId}})).code,200);
  assert.equal((await call(path,{token:b.token})).data.text,'SYNTHETIC HEALTH DISCLOSURE');
  assert.equal((await call('/v1/disclosures/revoke',{method:'POST',token:a.token,body:{viewerUserId:b.userId}})).code,200);
  assert.equal((await call(path,{token:b.token})).data.visible,false);
  assert.ok(vs.auditCount()>=3);
  // Regrant then block, revoking all access immediately.
  await call('/v1/disclosures/grants',{method:'POST',token:a.token,body:{viewerUserId:b.userId}});
  const blocked=await call('/v1/blocks',{method:'POST',token:b.token,body:{targetUserId:a.userId}});
  assert.equal(blocked.code,200);
  assert.equal((await call(`/v1/matches/${matchId}/messages`,{token:a.token})).code,403);
  assert.equal((await call(path,{token:b.token})).code,403);
  assert.equal((await call('/v1/likes',{method:'POST',token:a.token,body:{targetUserId:b.userId}})).code,403);
  assert.equal(cs.pending().length,0);
  assert.equal(vs.read(a.userId,b.userId).cipher,null);
  const output=logs.join('\n');
  for(const sensitive of [secret,'SYNTHETIC HEALTH DISCLOSURE','alpha@example.test','GoodPassword#2026'])assert.equal(output.includes(sensitive),false);
});

test('payment webhook must be correctly signed, is idempotent, and no fake checkout grants premium',async t=>{
  const {call,register,paymentSecret}=await setUp(t);const a=await register('billing@example.test');
  const checkout=await call('/v1/subscriptions/checkout',{method:'POST',token:a.token,body:{plan:'plus'}});
  assert.equal(checkout.code,501);
  assert.equal((await call('/v1/subscriptions/me',{token:a.token})).data.entitlement.plan,'free');
  const event={id:randomUUID(),userId:a.userId,type:'sandbox.subscription.activated',plan:'plus',expiresAt:new Date(Date.now()+7*86400000).toISOString()};
  const ts=Date.now(), raw=JSON.stringify(event),headers={'x-sandbox-timestamp':String(ts),'x-sandbox-signature':sign(paymentSecret,ts,raw)};
  assert.equal((await call('/v1/payments/webhook',{method:'POST',body:event})).code,401);
  assert.equal((await call('/v1/payments/webhook',{method:'POST',body:event,headers})).data.processed,true);
  assert.equal((await call('/v1/payments/webhook',{method:'POST',body:event,headers})).data.processed,false);
  assert.equal((await call('/v1/subscriptions/me',{token:a.token})).data.entitlement.plan,'plus');
});

test('report categories are constrained; privileged secrets are authenticated; fail closed under vault outage',async t=>{
  const {call,register,cs,vault}=await setUp(t);
  const a=await register('usera@example.test'),b=await register('userb@example.test');
  assert.equal((await call('/v1/reports',{method:'POST',token:a.token,body:{targetUserId:b.userId,category:'suspected_minor'}})).code,201);
  assert.equal(cs.one('SELECT priority FROM reports LIMIT 1').priority,'p1');
  assert.equal((await call('/v1/reports',{method:'POST',token:a.token,body:{targetUserId:b.userId,category:'random'}})).code,400);
  assert.equal((await call('/v1/disclosures',{method:'POST',token:a.token,body:{text:'test data only',unknown:'x'}})).code,400);
  assert.equal((await call('/v1/discover')).code,401);
  cs.block(a.userId,b.userId);
  // Even if vault is temporarily offline, the core block has already taken effect.
  assert.equal(cs.blocked(a.userId,b.userId),true);
  assert.equal(cs.pending().length,1);
  await drainOutbox(cs,async()=>{throw new Error('provider temporarily unavailable');});
  assert.equal(cs.pending().length,1);
  await drainOutbox(cs,vault);
  assert.equal(cs.pending().length,0);
});

test('AES-GCM ciphertext is non-plaintext, authenticated and bound to owner context',()=>{
  const key=randomBytes(32);const value=encrypt(key,'only synthetic data','user-1');
  assert.equal(decrypt(key,value,'user-1'),'only synthetic data');
  assert.throws(()=>decrypt(key,value,'user-2'));
});


test('vault rejects missing signatures and internal nonce replay',async t=>{
  const {vaultBase,internalSecret}=await setUp(t);
  const payload={owner:randomUUID(),viewer:randomUUID()};const raw=JSON.stringify(payload);
  const noAuth=await fetch(vaultBase+'/internal/disclosures/read',{method:'POST',headers:{'content-type':'application/json'},body:raw});
  assert.equal(noAuth.status,401);
  const timestamp=Date.now(),nonce=randomUUID();
  const headers={'content-type':'application/json','x-internal-timestamp':String(timestamp),'x-internal-nonce':nonce,
    'x-internal-signature':sign(internalSecret,`${timestamp}:${nonce}`,raw)};
  const first=await fetch(vaultBase+'/internal/disclosures/read',{method:'POST',headers,body:raw});
  assert.equal(first.status,200);
  const second=await fetch(vaultBase+'/internal/disclosures/read',{method:'POST',headers,body:raw});
  assert.equal(second.status,401);
});
