-- Database-level authorisation checks. Run ONLY in a disposable Core CI database.
BEGIN;
INSERT INTO users(id,auth_subject,status,age_verified_at,terms_version,terms_accepted_at,locale)
 VALUES ('00000000-0000-4000-8000-000000000001','synthetic-1','active',now(),'v1',now(),'en'),
 ('00000000-0000-4000-8000-000000000002','synthetic-2','active',now(),'v1',now(),'zu'),
 ('00000000-0000-4000-8000-000000000003','synthetic-3','active',now(),'v1',now(),'xh');
INSERT INTO matches(id,lower_user_id,higher_user_id)
 VALUES('00000000-0000-4000-8000-000000000030',
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
INSERT INTO conversations(id,match_id)
 VALUES('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000030');
INSERT INTO messages(conversation_id,sender_user_id,ciphertext,encrypted_data_key,key_reference,client_message_id)
 VALUES('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000001',
 decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),'synthetic',gen_random_uuid());
DO $$ BEGIN
 BEGIN
  INSERT INTO messages(conversation_id,sender_user_id,ciphertext,encrypted_data_key,key_reference,client_message_id)
  VALUES('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000003',
  decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),'synthetic',gen_random_uuid());
  RAISE EXCEPTION 'UNMATCHED_MEMBER_SENT_MESSAGE';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO profile_photos(id,user_id,object_key,visibility,moderation_status)
 VALUES('00000000-0000-4000-8000-000000000050',
 '00000000-0000-4000-8000-000000000001','synthetic-object-key','approved','approved');
INSERT INTO photo_grants(photo_id,owner_user_id,viewer_user_id)
 VALUES('00000000-0000-4000-8000-000000000050',
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
DO $$ BEGIN
 BEGIN
  INSERT INTO photo_grants(photo_id,owner_user_id,viewer_user_id)
  VALUES('00000000-0000-4000-8000-000000000050',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'UNMATCHED_PRIVATE_PHOTO_ACCESS';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO blocks(blocker_user_id,blocked_user_id)
 VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF (SELECT status FROM matches WHERE id='00000000-0000-4000-8000-000000000030') <> 'blocked'
  THEN RAISE EXCEPTION 'BLOCK_DID_NOT_END_MATCH'; END IF;
 IF (SELECT count(*) FROM photo_grants WHERE revoked_at IS NOT NULL) <> 1
  THEN RAISE EXCEPTION 'BLOCK_DID_NOT_REVOKE_PHOTO'; END IF;
 BEGIN
  INSERT INTO messages(conversation_id,sender_user_id,ciphertext,encrypted_data_key,key_reference,client_message_id)
  VALUES('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000001',
  decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),'synthetic',gen_random_uuid());
  RAISE EXCEPTION 'BLOCKED_MEMBER_SENT_MESSAGE';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO matches(lower_user_id,higher_user_id)
  VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'BLOCKED_PAIR_CREATED_MATCH';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
