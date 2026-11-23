-- Defense-in-depth guards for real-user interaction tables.
-- Requires 001_foundation.sql. Safe in a single migration transaction.
-- These triggers do NOT replace per-request Core API authorisation.
BEGIN;
CREATE FUNCTION enforce_active_match() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='active' AND (
    NOT EXISTS(SELECT 1 FROM users u WHERE u.id=NEW.lower_user_id AND u.status='active')
    OR NOT EXISTS(SELECT 1 FROM users u WHERE u.id=NEW.higher_user_id AND u.status='active')
    OR EXISTS(SELECT 1 FROM blocks b WHERE
      (b.blocker_user_id=NEW.lower_user_id AND b.blocked_user_id=NEW.higher_user_id)
      OR (b.blocker_user_id=NEW.higher_user_id AND b.blocked_user_id=NEW.lower_user_id))
 ) THEN RAISE EXCEPTION 'MATCH_NOT_ELIGIBLE' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER match_requires_active_unblocked_users
 BEFORE INSERT OR UPDATE OF status,lower_user_id,higher_user_id ON matches
 FOR EACH ROW EXECUTE FUNCTION enforce_active_match();

CREATE FUNCTION enforce_message_authorization() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE m matches%ROWTYPE;
BEGIN
 -- Lock match row so an overlapping block cannot commit between check and insert.
 SELECT mt.* INTO m FROM conversations c
 JOIN matches mt ON mt.id=c.match_id
 WHERE c.id=NEW.conversation_id FOR UPDATE OF mt;
 IF NOT FOUND OR m.status<>'active' OR
   NEW.sender_user_id NOT IN(m.lower_user_id,m.higher_user_id)
   OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.sender_user_id AND status='active')
   OR EXISTS(SELECT 1 FROM blocks b WHERE
    (b.blocker_user_id=m.lower_user_id AND b.blocked_user_id=m.higher_user_id)
    OR (b.blocker_user_id=m.higher_user_id AND b.blocked_user_id=m.lower_user_id))
 THEN RAISE EXCEPTION 'MESSAGE_NOT_AUTHORIZED' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_requires_active_match
 BEFORE INSERT ON messages
 FOR EACH ROW EXECUTE FUNCTION enforce_message_authorization();

CREATE FUNCTION enforce_photo_grant() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE photo_owner uuid; photo_status varchar(16);
BEGIN
 -- Revocations must always be allowed, including when a block just occurred.
 IF NEW.revoked_at IS NOT NULL THEN RETURN NEW; END IF;
 SELECT p.user_id,p.moderation_status INTO photo_owner,photo_status
 FROM profile_photos p WHERE p.id=NEW.photo_id FOR SHARE;
 IF photo_owner IS NULL OR photo_owner<>NEW.owner_user_id OR photo_status<>'approved'
  OR NOT EXISTS(SELECT 1 FROM matches m WHERE m.status='active'
      AND m.lower_user_id=LEAST(NEW.owner_user_id,NEW.viewer_user_id)
      AND m.higher_user_id=GREATEST(NEW.owner_user_id,NEW.viewer_user_id))
  OR EXISTS(SELECT 1 FROM blocks b WHERE
      (b.blocker_user_id=NEW.owner_user_id AND b.blocked_user_id=NEW.viewer_user_id)
      OR (b.blocker_user_id=NEW.viewer_user_id AND b.blocked_user_id=NEW.owner_user_id))
 THEN RAISE EXCEPTION 'PHOTO_GRANT_NOT_AUTHORIZED' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER private_photo_grant_requires_match
 BEFORE INSERT OR UPDATE OF photo_id,owner_user_id,viewer_user_id,revoked_at ON photo_grants
 FOR EACH ROW EXECUTE FUNCTION enforce_photo_grant();

COMMIT;
