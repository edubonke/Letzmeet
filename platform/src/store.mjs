import { DatabaseSync } from 'node:sqlite';
import { uuid, hash, error, nowIso } from './common.mjs';

function open(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  return db;
}
export class CoreStore {
  constructor(path = ':memory:') {
    this.db = open(path);
    this.db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('en','zu','xh')), self_certified_adult INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','deletion_pending','deleted')), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id), display_name TEXT NOT NULL, bio TEXT NOT NULL,
  metro TEXT NOT NULL, relationship_intent TEXT NOT NULL, discovery_enabled INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS likes(actor TEXT NOT NULL REFERENCES users(id), target TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, PRIMARY KEY(actor,target), CHECK(actor != target));
CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, a TEXT NOT NULL REFERENCES users(id), b TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked','unmatched')), created_at TEXT NOT NULL,
  UNIQUE(a,b), CHECK(a < b));
CREATE TABLE IF NOT EXISTS blocks(actor TEXT NOT NULL REFERENCES users(id), target TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, PRIMARY KEY(actor,target), CHECK(actor != target));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id), sender TEXT NOT NULL REFERENCES users(id),
  ciphertext TEXT NOT NULL, sent_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, reporter TEXT NOT NULL REFERENCES users(id), subject TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, event TEXT NOT NULL, actor TEXT NOT NULL, target TEXT NOT NULL, handled_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entitlements(user_id TEXT PRIMARY KEY REFERENCES users(id), plan TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY, actor TEXT, event TEXT NOT NULL, object_type TEXT NOT NULL, outcome TEXT NOT NULL, at TEXT NOT NULL);
`);
  }
  run(sql, ...p) { return this.db.prepare(sql).run(...p); }
  one(sql, ...p) { return this.db.prepare(sql).get(...p); }
  all(sql, ...p) { return this.db.prepare(sql).all(...p); }
  tx(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const x=fn(); this.db.exec('COMMIT'); return x; } catch(e) { this.db.exec('ROLLBACK'); throw e; } }
  event(actor,event,objectType,outcome) { this.run('INSERT INTO audit_events VALUES (?,?,?,?,?,?)',uuid(),actor,event,objectType,outcome,nowIso()); }
  createUser({email,passwordHash,locale}) { const id=uuid(); this.run('INSERT INTO users VALUES(?,?,?,?,?,?,?)',id,email,passwordHash,locale,1,'active',nowIso()); this.event(id,'ACCOUNT_CREATED','account','allowed'); return id; }
  userByEmail(email) { return this.one('SELECT * FROM users WHERE email=?',email); }
  userById(id) { return this.one('SELECT * FROM users WHERE id=?',id); }
  createSession(userId,token) { this.run('INSERT INTO sessions VALUES(?,?,?,NULL)',hash(token),userId,new Date(Date.now()+60*60*1000).toISOString()); }
  sessionUser(token) { return this.one(`SELECT u.id,u.status FROM sessions s JOIN users u ON u.id=s.user_id
   WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`,hash(token),nowIso()); }
  upsertProfile(id,p) { this.run(`INSERT INTO profiles VALUES(?,?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET
  display_name=excluded.display_name,bio=excluded.bio,metro=excluded.metro,
  relationship_intent=excluded.relationship_intent,updated_at=excluded.updated_at`,id,p.displayName,p.bio,p.metro,p.relationshipIntent,nowIso()); }
  profile(id) { return this.one('SELECT display_name AS displayName,bio,metro,relationship_intent AS relationshipIntent FROM profiles WHERE user_id=?',id); }
  discover(id) { return this.all(`SELECT p.user_id AS id, p.display_name AS displayName, p.bio, p.metro,
  p.relationship_intent AS relationshipIntent FROM profiles p JOIN users u ON u.id=p.user_id
  WHERE p.user_id<>? AND p.discovery_enabled=1 AND u.status='active'
  AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.actor=? AND b.target=p.user_id) OR (b.actor=p.user_id AND b.target=?))
  ORDER BY p.updated_at DESC LIMIT 50`,id,id,id); }
  blocked(a,b) { return !!this.one('SELECT 1 FROM blocks WHERE (actor=? AND target=?) OR (actor=? AND target=?)',a,b,b,a); }
  activeMatch(a,b) { const [lo,hi]=[a,b].sort(); return this.one(`SELECT id FROM matches WHERE a=? AND b=? AND status='active'`,lo,hi); }
  createLike(a,b) { return this.tx(() => {
    if(a===b || this.blocked(a,b) || !this.userById(b) || this.userById(b).status!=='active') throw error(403,'NOT_ELIGIBLE');
    this.run('INSERT OR IGNORE INTO likes VALUES(?,?,?)',a,b,nowIso());
    if (!this.one('SELECT 1 FROM likes WHERE actor=? AND target=?',b,a)) return { matched:false };
    const [lo,hi]=[a,b].sort(); let match=this.one('SELECT id,status FROM matches WHERE a=? AND b=?',lo,hi);
    if (!match) { const id=uuid(); this.run('INSERT INTO matches VALUES(?,?,?,?,?)',id,lo,hi,'active',nowIso()); match={id,status:'active'}; }
    if (match.status!=='active') return {matched:false};
    this.event(a,'MATCH_CREATED','match','allowed'); return { matched:true, matchId:match.id };
  }); }
  matches(id) { return this.all(`SELECT m.id, CASE WHEN m.a=? THEN m.b ELSE m.a END AS otherUserId,
   p.display_name AS otherDisplayName FROM matches m JOIN profiles p
   ON p.user_id=CASE WHEN m.a=? THEN m.b ELSE m.a END
   WHERE (m.a=? OR m.b=?) AND m.status='active'`,id,id,id,id); }
  matchFor(id,matchId) { const m=this.one('SELECT * FROM matches WHERE id=? AND status=\'active\'',matchId);
    return m && (m.a===id || m.b===id) && !this.blocked(m.a,m.b) ? m : null; }
  addMessage(id,matchId,ciphertext) { const messageId=uuid(); this.run('INSERT INTO messages VALUES(?,?,?,?,?)',messageId,matchId,id,ciphertext,nowIso()); return messageId; }
  messages(matchId) { return this.all('SELECT id,sender,ciphertext,sent_at AS sentAt FROM messages WHERE match_id=? ORDER BY sent_at,id LIMIT 100',matchId); }
  block(a,b) { return this.tx(() => {
    if(a===b || !this.userById(b)) throw error(400,'INVALID_TARGET');
    this.run('INSERT OR IGNORE INTO blocks VALUES(?,?,?)',a,b,nowIso());
    const [lo,hi]=[a,b].sort(); this.run('UPDATE matches SET status=\'blocked\' WHERE a=? AND b=?',lo,hi);
    this.run('DELETE FROM likes WHERE (actor=? AND target=?) OR (actor=? AND target=?)',a,b,b,a);
    this.run('INSERT INTO outbox VALUES(?,?,?,?,NULL,?)',uuid(),'REVOKE_PAIR',a,b,nowIso());
    this.event(a,'BLOCK_CREATED','block','allowed');
  }); }
  reports(id,target,category,priority) { const reportId=uuid(); this.run('INSERT INTO reports VALUES(?,?,?,?,?,?,?)',reportId,id,target,category,priority,'new',nowIso()); this.event(id,'REPORT_CREATED','report','allowed'); return reportId; }
  pending() { return this.all('SELECT * FROM outbox WHERE handled_at IS NULL ORDER BY created_at LIMIT 50'); }
  finish(id) { this.run('UPDATE outbox SET handled_at=? WHERE id=?',nowIso(),id); }
  grantPlan(userId,plan,expiresAt,eventId) { return this.tx(() => {
    if(this.one('SELECT 1 FROM payment_events WHERE id=?',eventId)) return false;
    this.run('INSERT INTO payment_events VALUES(?,?,?)',eventId,'paid',nowIso());
    this.run('INSERT INTO entitlements VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,expires_at=excluded.expires_at',userId,plan,expiresAt);
    this.event(userId,'ENTITLEMENT_CHANGED','subscription','allowed'); return true;
  }); }
  entitlement(id) { const row=this.one('SELECT plan,expires_at AS expiresAt FROM entitlements WHERE user_id=?',id);
    return row && row.expiresAt>nowIso()?row:{plan:'free',expiresAt:null}; }
  close() {this.db.close();}
}

export class VaultStore {
  constructor(path = ':memory:') { this.db=open(path); this.db.exec(`
CREATE TABLE IF NOT EXISTS disclosures(owner TEXT PRIMARY KEY, cipher TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS grants(owner TEXT NOT NULL, viewer TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT,
 PRIMARY KEY(owner,viewer));
CREATE TABLE IF NOT EXISTS sensitive_audit(id TEXT PRIMARY KEY,owner TEXT NOT NULL,viewer TEXT, purpose TEXT NOT NULL,
 decision TEXT NOT NULL,version INTEGER NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_nonces(nonce TEXT PRIMARY KEY, created_at TEXT NOT NULL);
`); }
  run(sql,...p){return this.db.prepare(sql).run(...p);} one(sql,...p){return this.db.prepare(sql).get(...p);}
  tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const o=fn();this.db.exec('COMMIT');return o;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  consumeNonce(nonce) { try { this.run('INSERT INTO request_nonces VALUES(?,?)',nonce,nowIso());return true; } catch {return false;} }
  store(owner,cipher){return this.tx(()=>{const row=this.one('SELECT version FROM disclosures WHERE owner=?',owner);const ver=(row?.version??0)+1;
    this.run('INSERT INTO disclosures VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET cipher=excluded.cipher,version=excluded.version,updated_at=excluded.updated_at',owner,cipher,ver,nowIso());
    this.run('UPDATE grants SET revoked_at=? WHERE owner=? AND revoked_at IS NULL',nowIso(),owner); return ver; });}
  grant(owner,viewer,expires){ this.run('INSERT INTO grants VALUES(?,?,?,NULL) ON CONFLICT(owner,viewer) DO UPDATE SET expires_at=excluded.expires_at,revoked_at=NULL',owner,viewer,expires); }
  revoke(owner,viewer){this.run('UPDATE grants SET revoked_at=? WHERE owner=? AND viewer=?',nowIso(),owner,viewer);this.run('UPDATE disclosures SET version=version+1 WHERE owner=?',owner);}
  revokePair(a,b){this.revoke(a,b);this.revoke(b,a);}
  read(owner,viewer){const d=this.one('SELECT cipher,version FROM disclosures WHERE owner=?',owner);const g=this.one('SELECT 1 FROM grants WHERE owner=? AND viewer=? AND revoked_at IS NULL AND expires_at>?',owner,viewer,nowIso());
    const allowed=!!(d&&g);this.run('INSERT INTO sensitive_audit VALUES(?,?,?,?,?,?,?)',uuid(),owner,viewer,'consented_match_disclosure',allowed?'allowed':'denied',d?.version??0,nowIso());
    return allowed?{cipher:d.cipher,version:d.version}:{cipher:null,version:d?.version??0};}
  auditCount(){return this.one('SELECT COUNT(*) AS n FROM sensitive_audit').n;}
  close(){this.db.close();}
}
