-- Executed in a disposable Postgres database by CI only.
BEGIN;
INSERT INTO users(id,auth_subject,status,age_verified_at,terms_version,terms_accepted_at,locale)
 VALUES ('00000000-0000-4000-8000-000000000001','synthetic-1','active',now(),'v1',now(),'en'),
 ('00000000-0000-4000-8000-000000000002','synthetic-2','active',now(),'v1',now(),'zu');
DO $$ BEGIN
 BEGIN
  INSERT INTO users(auth_subject,status,terms_version,terms_accepted_at,locale)
  VALUES('unverified','active','v1',now(),'en');
  RAISE EXCEPTION 'UNVERIFIED_ACTIVE_USER_INSERT_SUCCEEDED';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
INSERT INTO likes(actor_user_id,target_user_id)
 VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
INSERT INTO matches(lower_user_id,higher_user_id)
 VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
INSERT INTO blocks(blocker_user_id,blocked_user_id)
 VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
DO $$ BEGIN
 IF (SELECT count(*) FROM likes) <> 0 THEN RAISE EXCEPTION 'LIKES_NOT_REVOKED'; END IF;
 IF (SELECT status FROM matches LIMIT 1) <> 'blocked' THEN RAISE EXCEPTION 'MATCH_NOT_BLOCKED'; END IF;
 IF (SELECT count(*) FROM outbox WHERE event_code='REVOKE_PAIR') <> 1 THEN RAISE EXCEPTION 'OUTBOX_MISSING'; END IF;
 BEGIN
  INSERT INTO likes(actor_user_id,target_user_id)
  VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'BLOCKED_LIKE_WAS_ALLOWED';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  UPDATE core_audit_events SET decision='denied';
  RAISE EXCEPTION 'CORE_AUDIT_CAN_BE_MODIFIED';
 EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
 END;
END $$;
ROLLBACK;
