-- Restore the original investment APIs without creating a second audit ledger.
-- The old code inserts/selects public.audit_logs; platform.audit_log stays authoritative.
-- migrate:step
CREATE OR REPLACE VIEW public.audit_logs AS
SELECT id,
       actor AS user_id,
       action,
       target_type AS entity_type,
       target_id AS entity_id,
       detail ->> 'changes' AS changes,
       detail ->> 'created_by' AS created_by,
       detail ->> 'ip_address' AS ip_address,
       occurred_at AS created_at
FROM platform.audit_log;

-- migrate:step
CREATE OR REPLACE FUNCTION public.write_legacy_audit_log()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE saved_id bigint;
DECLARE saved_at timestamptz;
BEGIN
  INSERT INTO platform.audit_log (actor, action, target_type, target_id, detail)
  VALUES (
    NEW.user_id, NEW.action, NEW.entity_type, NEW.entity_id,
    jsonb_strip_nulls(jsonb_build_object(
      'changes', NEW.changes,
      'created_by', NEW.created_by,
      'ip_address', NEW.ip_address
    ))
  )
  RETURNING id, occurred_at INTO saved_id, saved_at;
  NEW.id := saved_id;
  NEW.created_at := saved_at;
  RETURN NEW;
END;
$$;

-- migrate:step
DROP TRIGGER IF EXISTS audit_logs_write ON public.audit_logs;
-- migrate:step
CREATE TRIGGER audit_logs_write
INSTEAD OF INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.write_legacy_audit_log();
