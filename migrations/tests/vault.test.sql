-- Executed in a separate disposable Vault database in CI.
BEGIN;
INSERT INTO disclosure_subjects(id,core_user_id) VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001');
INSERT INTO health_disclosures(id,subject_id,disclosure_type,ciphertext,encrypted_data_key,key_reference)
 VALUES ('00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000101','synthetic',
 decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),'sandbox-key-reference');
DO $$
DECLARE got int;
BEGIN
 SELECT count(*) INTO got FROM vault_read_disclosure(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000002',gen_random_uuid());
 IF got<>0 THEN RAISE EXCEPTION 'DISCLOSURE_WAS_PUBLIC'; END IF;
END $$;
INSERT INTO disclosure_grants(subject_id,viewer_user_id,purpose,expires_at)
 VALUES('00000000-0000-4000-8000-000000000101',
 '00000000-0000-4000-8000-000000000002','match_disclosure',now()+interval '1 hour');
DO $$
DECLARE got int;
BEGIN
 SELECT count(*) INTO got FROM vault_read_disclosure(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000002',gen_random_uuid());
 IF got<>1 THEN RAISE EXCEPTION 'ACTIVE_GRANT_FAILED'; END IF;
 PERFORM vault_revoke_grant('00000000-0000-4000-8000-000000000101',
 '00000000-0000-4000-8000-000000000002',gen_random_uuid());
 SELECT count(*) INTO got FROM vault_read_disclosure(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000002',gen_random_uuid());
 IF got<>0 THEN RAISE EXCEPTION 'REVOKED_GRANT_STILL_VISIBLE'; END IF;
 IF (SELECT count(*) FROM sensitive_access_audit)<>3 THEN RAISE EXCEPTION 'ACCESS_AUDIT_NOT_COMPLETE'; END IF;
 IF (SELECT policy_version FROM disclosure_subjects LIMIT 1)<>2 THEN RAISE EXCEPTION 'POLICY_VERSION_NOT_CHANGED'; END IF;
 BEGIN
  DELETE FROM sensitive_access_audit;
  RAISE EXCEPTION 'VAULT_AUDIT_CAN_BE_DELETED';
 EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
 END;
END $$;
ROLLBACK;
