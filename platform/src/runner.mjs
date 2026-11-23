// Explicitly local and synthetic only. No public bind, no production launch switch.
import { CoreStore, VaultStore } from './store.mjs';
import { createCoreServer, drainOutbox } from './core.mjs';
import { createVaultServer, createVaultClient } from './vault.mjs';
import { keyFromBase64 } from './common.mjs';

if(process.env.LETZMEET_SANDBOX!=='1')throw new Error('SANDBOX_ONLY: set LETZMEET_SANDBOX=1 and use synthetic test accounts only');
const service=process.argv[2];
const secret=process.env.LETZMEET_INTERNAL_HMAC_SECRET;
const paymentSecret=process.env.LETZMEET_SANDBOX_PAYMENT_HMAC_SECRET;
if(!secret||secret.length<32)throw new Error('Missing LETZMEET_INTERNAL_HMAC_SECRET');
if(service==='vault'){
  const store=new VaultStore(process.env.VAULT_DB_PATH||'./vault-local.sqlite');
  const key=keyFromBase64(process.env.LETZMEET_VAULT_KEY,'VAULT_KEY');
  createVaultServer({store,key,secret}).listen(4182,'127.0.0.1',()=>console.log('Local synthetic-data vault: http://127.0.0.1:4182'));
}else if(service==='core'){
  const store=new CoreStore(process.env.CORE_DB_PATH||'./core-local.sqlite');
  const messageKey=keyFromBase64(process.env.LETZMEET_MESSAGES_KEY,'MESSAGES_KEY');
  if(!paymentSecret||paymentSecret.length<32)throw new Error('Missing sandbox payment secret');
  const vault=createVaultClient({url:'http://127.0.0.1:4182',secret});
  createCoreServer({store,vault,messageKey,paymentSecret}).listen(4181,'127.0.0.1',()=>console.log('Local synthetic-data API: http://127.0.0.1:4181'));
  setInterval(()=>drainOutbox(store,vault).catch(()=>{}),10_000).unref();
}else throw new Error('Usage: node src/runner.mjs core|vault');
