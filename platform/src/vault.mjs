import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { audit, assertId, assertKeys, bodyFrom, decrypt, encrypt, error, respond, sign, stableEqual, requiredString } from './common.mjs';

const internalRoutes = new Set(['/internal/disclosures/put','/internal/disclosures/grant','/internal/disclosures/read','/internal/disclosures/revoke','/internal/disclosures/revoke-pair']);
export function createVaultServer({store,key,secret,logger = console.log,clock = () => Date.now()}) {
  if (!Buffer.isBuffer(key) || key.length !== 32 || typeof secret !== 'string' || secret.length < 32) throw new Error('VAULT_KEYS_REQUIRED');
  return http.createServer(async(req,res)=>{
    let requestId='';
    try {
      if(req.method==='GET' && req.url==='/healthz') return respond(res,200,{status:'ok',service:'vault'});
      if(req.method!=='POST' || !internalRoutes.has(req.url)) throw error(404,'NOT_FOUND');
      const {raw,data}=await bodyFrom(req,4096);
      const timestamp=Number(req.headers['x-internal-timestamp']);
      const nonce=req.headers['x-internal-nonce'];
      const signature=req.headers['x-internal-signature'];
      if(!Number.isSafeInteger(timestamp) || Math.abs(clock()-timestamp)>30_000 ||
        typeof nonce!=='string' || !/^[a-f0-9-]{36}$/.test(nonce) ||
        !stableEqual(signature,sign(secret,`${timestamp}:${nonce}`,raw)) || !store.consumeNonce(nonce)) throw error(401,'INTERNAL_AUTH_FAILED');
      requestId=nonce;
      if(req.url==='/internal/disclosures/put') {
        assertKeys(data,['owner','text']);const owner=assertId(data.owner);const text=requiredString(data.text,1000);
        const version=store.store(owner,encrypt(key,text,owner));
        audit(logger,'DISCLOSURE_WRITTEN','allowed',{requestId});return respond(res,200,{version});
      }
      if(req.url==='/internal/disclosures/grant') {
        assertKeys(data,['owner','viewer']);const owner=assertId(data.owner),viewer=assertId(data.viewer);
        if(owner===viewer) throw error(400,'INVALID_VIEWER');
        store.grant(owner,viewer,new Date(clock()+7*24*3600_000).toISOString());
        audit(logger,'DISCLOSURE_GRANTED','allowed',{requestId});return respond(res,200,{granted:true});
      }
      if(req.url==='/internal/disclosures/read') {
        assertKeys(data,['owner','viewer']);const owner=assertId(data.owner),viewer=assertId(data.viewer);
        const r=store.read(owner,viewer);
        audit(logger,'DISCLOSURE_ACCESS',r.cipher?'allowed':'denied',{requestId});
        return respond(res,200,r.cipher?{visible:true,text:decrypt(key,r.cipher,owner),version:r.version}:{visible:false,version:r.version});
      }
      if(req.url==='/internal/disclosures/revoke') {
        assertKeys(data,['owner','viewer']);store.revoke(assertId(data.owner),assertId(data.viewer));
        audit(logger,'DISCLOSURE_REVOKED','allowed',{requestId});return respond(res,200,{revoked:true});
      }
      assertKeys(data,['a','b']);store.revokePair(assertId(data.a),assertId(data.b));
      audit(logger,'DISCLOSURE_PAIR_REVOKED','allowed',{requestId});respond(res,200,{revoked:true});
    } catch(e) {
      audit(logger,'VAULT_REQUEST','denied',{requestId,code:e.code||'INTERNAL_ERROR'});
      respond(res,e.status||500,{error:e.code||'INTERNAL_ERROR'});
    }
  });
}

export function createVaultClient({url,secret}) {
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw new Error('SANDBOX_VAULT_MUST_BE_LOOPBACK');
  if(typeof secret!=='string'||secret.length<32)throw new Error('INTERNAL_SECRET_TOO_SHORT');
  return async function request(action, payload) {
    const raw=JSON.stringify(payload), timestamp=Date.now(), nonce=randomUUID();
    const result=await fetch(`${url}/internal/disclosures/${action}`,{
      method:'POST',headers:{'content-type':'application/json','x-internal-timestamp':String(timestamp),
        'x-internal-nonce':nonce,'x-internal-signature':sign(secret,`${timestamp}:${nonce}`,raw)},
      body:raw,signal:AbortSignal.timeout(5000)
    });
    const response=await result.json();
    if(!result.ok)throw error(result.status,response.error||'VAULT_UNAVAILABLE');
    return response;
  };
}
