-- Letzmeet Core PostgreSQL migration 001 (PostgreSQL 16). NOT a production deployment.
-- Apply only to a dedicated CORE database with a distinct service role/credentials.
-- No health disclosures, raw identity documents or payment card records belong here.
BEGIN;

CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_subject varchar(128) NOT NULL UNIQUE,
 status varchar(24) NOT NULL DEFAULT 'onboarding'
   CHECK(status IN('onboarding','active','suspended','banned','deletion_pending','deleted')),
 age_verified_at timestamptz,
 terms_version varchar(32) NOT NULL,
 terms_accepted_at timestamptz NOT NULL,
 locale varchar(2) NOT NULL CHECK(locale IN('en','zu','xh')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 -- An unverified user cannot become active simply by setting a status field.
 CONSTRAINT active_requires_age_verification CHECK(status <> 'active' OR age_verified_at IS NOT NULL)
);
CREATE INDEX users_status_idx ON users(status);

CREATE TABLE profiles (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 display_name varchar(60) NOT NULL,
 biography varchar(1000),
 gender_identity varchar(64),
 pronouns varchar(64),
 orientation varchar(64),
 relationship_intent varchar(64),
 gender_visibility varchar(16) NOT NULL DEFAULT 'private' CHECK(gender_visibility IN('private','matches','public')),
 pronouns_visibility varchar(16) NOT NULL DEFAULT 'private' CHECK(pronouns_visibility IN('private','matches','public')),
 orientation_visibility varchar(16) NOT NULL DEFAULT 'private' CHECK(orientation_visibility IN('private','matches','public')),
 intent_visibility varchar(16) NOT NULL DEFAULT 'public' CHECK(intent_visibility IN('private','matches','public')),
 metro_area_code varchar(32),
 discovery_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN profiles.metro_area_code IS 'Broad area only. Exact coordinates must not be stored.';
CREATE INDEX profiles_discovery_idx ON profiles(updated_at DESC) WHERE discovery_enabled=true;

CREATE TABLE profile_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 object_key varchar(512) NOT NULL UNIQUE,
 visibility varchar(16) NOT NULL CHECK(visibility IN('public','matches','approved')),
 moderation_status varchar(16) NOT NULL DEFAULT 'pending'
   CHECK(moderation_status IN('pending','approved','rejected','quarantined')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE photo_grants (
 photo_id uuid NOT NULL REFERENCES profile_photos(id),
 owner_user_id uuid NOT NULL REFERENCES users(id),
 viewer_user_id uuid NOT NULL REFERENCES users(id),
 granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 PRIMARY KEY(photo_id,viewer_user_id),
 CHECK(owner_user_id<>viewer_user_id)
);

CREATE TABLE blocks (
 blocker_user_id uuid NOT NULL REFERENCES users(id),
 blocked_user_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_user_id, blocked_user_id),
 CHECK(blocker_user_id<>blocked_user_id)
);
CREATE INDEX blocks_reverse_idx ON blocks(blocked_user_id, blocker_user_id);

CREATE TABLE likes (
 actor_user_id uuid NOT NULL REFERENCES users(id),
 target_user_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_user_id,target_user_id),
 CHECK(actor_user_id<>target_user_id)
);
CREATE TABLE matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lower_user_id uuid NOT NULL REFERENCES users(id),
 higher_user_id uuid NOT NULL REFERENCES users(id),
 status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN('active','blocked','unmatched')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lower_user_id,higher_user_id),
 CHECK(lower_user_id<higher_user_id)
);
CREATE TABLE conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 match_id uuid NOT NULL UNIQUE REFERENCES matches(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES conversations(id),
 sender_user_id uuid NOT NULL REFERENCES users(id),
 ciphertext bytea NOT NULL CHECK(octet_length(ciphertext)>16),
 encrypted_data_key bytea NOT NULL,
 key_reference varchar(256) NOT NULL,
 client_message_id uuid NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 deleted_at timestamptz,
 UNIQUE(sender_user_id,client_message_id)
);
CREATE INDEX messages_conversation_cursor_idx ON messages(conversation_id,sent_at DESC,id DESC);

CREATE TABLE reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_user_id uuid NOT NULL REFERENCES users(id),
 reported_user_id uuid NOT NULL REFERENCES users(id),
 category varchar(40) NOT NULL CHECK(category IN
   ('harassment','threats','stalking','blackmail','non_consensual_disclosure',
    'impersonation','financial_scam','sexual_coercion','suspected_minor',
    'hate_speech','unwanted_explicit_content','offline_incident')),
 priority varchar(16) NOT NULL CHECK(priority IN('priority_one','high','standard')),
 status varchar(24) NOT NULL DEFAULT 'submitted'
   CHECK(status IN('submitted','acknowledged','investigating','actioned','closed','appealed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(reporter_user_id<>reported_user_id)
);
CREATE INDEX reports_queue_idx ON reports(priority,created_at) WHERE status IN('submitted','acknowledged','investigating');

CREATE TABLE subscription_entitlements (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 provider varchar(24) NOT NULL,
 provider_reference varchar(256) NOT NULL UNIQUE,
 plan varchar(32) NOT NULL,
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_provider_events (
 provider varchar(24) NOT NULL,
 event_id varchar(256) NOT NULL,
 event_type varchar(64) NOT NULL,
 occurred_at timestamptz NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,event_id)
);

CREATE TABLE outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_code varchar(40) NOT NULL CHECK(event_code IN
   ('MATCH_CREATED','BLOCK_CREATED','REVOKE_PAIR','MESSAGE_CREATED','ACCOUNT_DELETE_REQUESTED')),
 actor_user_id uuid NOT NULL REFERENCES users(id),
 target_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 retry_count integer NOT NULL DEFAULT 0 CHECK(retry_count>=0)
);
CREATE INDEX outbox_pending_idx ON outbox(created_at,id) WHERE delivered_at IS NULL;
COMMENT ON TABLE outbox IS 'No arbitrary JSON payloads: event identifiers and actor references only.';

CREATE TABLE core_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid REFERENCES users(id),
 event_code varchar(64) NOT NULL,
 object_type varchar(32) NOT NULL,
 decision varchar(16) NOT NULL CHECK(decision IN('allowed','denied')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX core_audit_by_time_idx ON core_audit_events(occurred_at);

CREATE FUNCTION deny_core_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'CORE_AUDIT_IMMUTABLE' USING ERRCODE='55000';
END $$;
CREATE TRIGGER core_audit_append_only
BEFORE UPDATE OR DELETE ON core_audit_events
FOR EACH ROW EXECUTE FUNCTION deny_core_audit_mutation();

CREATE FUNCTION core_reject_blocked_like() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM blocks
  WHERE (blocker_user_id=NEW.actor_user_id AND blocked_user_id=NEW.target_user_id)
     OR (blocker_user_id=NEW.target_user_id AND blocked_user_id=NEW.actor_user_id)
 ) THEN
  RAISE EXCEPTION 'BLOCKED_PAIR' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reject_blocked_like BEFORE INSERT OR UPDATE ON likes
FOR EACH ROW EXECUTE FUNCTION core_reject_blocked_like();

CREATE FUNCTION core_apply_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- These changes and the outbox event commit or roll back as one transaction.
 DELETE FROM likes
  WHERE (actor_user_id=NEW.blocker_user_id AND target_user_id=NEW.blocked_user_id)
     OR (actor_user_id=NEW.blocked_user_id AND target_user_id=NEW.blocker_user_id);
 UPDATE matches SET status='blocked'
  WHERE (lower_user_id=LEAST(NEW.blocker_user_id,NEW.blocked_user_id)
     AND higher_user_id=GREATEST(NEW.blocker_user_id,NEW.blocked_user_id));
 UPDATE photo_grants SET revoked_at=now()
  WHERE revoked_at IS NULL AND
    ((owner_user_id=NEW.blocker_user_id AND viewer_user_id=NEW.blocked_user_id)
     OR (owner_user_id=NEW.blocked_user_id AND viewer_user_id=NEW.blocker_user_id));
 INSERT INTO outbox(event_code,actor_user_id,target_user_id)
   VALUES('REVOKE_PAIR',NEW.blocker_user_id,NEW.blocked_user_id);
 INSERT INTO core_audit_events(actor_user_id,event_code,object_type,decision)
   VALUES(NEW.blocker_user_id,'BLOCK_CREATED','block','allowed');
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_block_after_insert AFTER INSERT ON blocks
FOR EACH ROW EXECUTE FUNCTION core_apply_block();

COMMIT;
