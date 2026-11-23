-- Letzmeet Privacy Vault PostgreSQL migration 001. Run only in a SEPARATE database.
-- Do not use the Core API DB credentials or grant the Core DB role direct table access.
-- Runtime roles must be provisioned separately with least privileges and private networking.
BEGIN;
CREATE TABLE disclosure_subjects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 core_user_id uuid NOT NULL UNIQUE,
 policy_version bigint NOT NULL DEFAULT 1 CHECK(policy_version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE health_disclosures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject_id uuid NOT NULL REFERENCES disclosure_subjects(id),
 disclosure_type varchar(40) NOT NULL,
 ciphertext bytea NOT NULL CHECK(octet_length(ciphertext)>16),
 encrypted_data_key bytea NOT NULL CHECK(octet_length(encrypted_data_key)>0),
 key_reference varchar(256) NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE INDEX health_disclosures_active_idx ON health_disclosures(subject_id) WHERE active;
CREATE TABLE disclosure_grants (
 subject_id uuid NOT NULL REFERENCES disclosure_subjects(id),
 viewer_user_id uuid NOT NULL,
 purpose varchar(40) NOT NULL CHECK(purpose IN('match_disclosure')),
 granted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 PRIMARY KEY(subject_id,viewer_user_id,purpose),
 CHECK(expires_at>granted_at)
);
CREATE INDEX disclosure_grants_active_idx ON disclosure_grants(subject_id,viewer_user_id)
 WHERE revoked_at IS NULL;
CREATE TABLE sensitive_access_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject_id uuid NOT NULL REFERENCES disclosure_subjects(id),
 viewer_user_id uuid,
 request_id uuid NOT NULL,
 purpose varchar(64) NOT NULL,
 decision varchar(16) NOT NULL CHECK(decision IN('allowed','denied')),
 policy_version bigint NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sensitive_access_audit_recent_idx ON sensitive_access_audit(occurred_at,id);
CREATE TABLE disclosure_policy_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject_id uuid NOT NULL REFERENCES disclosure_subjects(id),
 event_code varchar(32) NOT NULL CHECK(event_code IN('GRANT_REVOKED','ALL_GRANTS_REVOKED')),
 request_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION forbid_vault_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'VAULT_AUDIT_IMMUTABLE' USING ERRCODE='55000';
END $$;
CREATE TRIGGER vault_access_audit_immutable BEFORE UPDATE OR DELETE ON sensitive_access_audit
FOR EACH ROW EXECUTE FUNCTION forbid_vault_audit_mutation();
CREATE TRIGGER vault_policy_audit_immutable BEFORE UPDATE OR DELETE ON disclosure_policy_audit
FOR EACH ROW EXECUTE FUNCTION forbid_vault_audit_mutation();

-- A single audited read path. No general staff-facing route or direct SELECT privileges
-- should be given to ordinary runtime roles; role grants are separate from this migration.
CREATE FUNCTION vault_read_disclosure(
 p_subject uuid, p_viewer uuid, p_request uuid
) RETURNS TABLE(disclosure_id uuid,ciphertext bytea,encrypted_data_key bytea,key_reference varchar(256))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE v_version bigint; v_allowed boolean;
BEGIN
 SELECT ds.policy_version INTO v_version
 FROM public.disclosure_subjects ds WHERE ds.id=p_subject;
 IF v_version IS NULL THEN
  RETURN;
 END IF;
 SELECT EXISTS(
  SELECT 1 FROM public.disclosure_grants g
  WHERE g.subject_id=p_subject AND g.viewer_user_id=p_viewer
    AND g.purpose='match_disclosure' AND g.revoked_at IS NULL
    AND g.expires_at>now()
 ) INTO v_allowed;
 INSERT INTO public.sensitive_access_audit(subject_id,viewer_user_id,request_id,purpose,decision,policy_version)
 VALUES(p_subject,p_viewer,p_request,'match_disclosure',
        CASE WHEN v_allowed THEN 'allowed' ELSE 'denied' END,v_version);
 IF NOT v_allowed THEN RETURN; END IF;
 RETURN QUERY SELECT d.id,d.ciphertext,d.encrypted_data_key,d.key_reference
 FROM public.health_disclosures d
 WHERE d.subject_id=p_subject AND d.active;
END $$;

CREATE FUNCTION vault_revoke_grant(
 p_subject uuid,p_viewer uuid,p_request uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.disclosure_grants
 SET revoked_at=now()
 WHERE subject_id=p_subject AND viewer_user_id=p_viewer AND revoked_at IS NULL;
 UPDATE public.disclosure_subjects SET policy_version=policy_version+1 WHERE id=p_subject;
 INSERT INTO public.disclosure_policy_audit(subject_id,event_code,request_id)
 VALUES(p_subject,'GRANT_REVOKED',p_request);
END $$;

CREATE FUNCTION vault_revoke_pair(
 p_actor uuid,p_target uuid,p_request uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.disclosure_grants g SET revoked_at=now()
 FROM public.disclosure_subjects ds
 WHERE g.subject_id=ds.id AND g.revoked_at IS NULL
   AND ((ds.core_user_id=p_actor AND g.viewer_user_id=p_target)
     OR (ds.core_user_id=p_target AND g.viewer_user_id=p_actor));
 UPDATE public.disclosure_subjects ds SET policy_version=policy_version+1
 WHERE ds.core_user_id IN(p_actor,p_target);
 INSERT INTO public.disclosure_policy_audit(subject_id,event_code,request_id)
 SELECT ds.id,'ALL_GRANTS_REVOKED',p_request
 FROM public.disclosure_subjects ds WHERE ds.core_user_id IN(p_actor,p_target);
END $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; revoke it until a dedicated
-- production Vault role can be provisioned and explicitly granted access.
REVOKE ALL ON FUNCTION vault_read_disclosure(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault_revoke_grant(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault_revoke_pair(uuid,uuid,uuid) FROM PUBLIC;

COMMIT;
