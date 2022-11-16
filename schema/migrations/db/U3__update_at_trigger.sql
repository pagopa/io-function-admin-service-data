DROP TRIGGER IF EXISTS update_servicedata_updateAt_with_current_timestamp ON "${schemaName}".services CASCADE;

DROP FUNCTION IF EXISTS "${schemaName}".set_current_timestamp_on_updateAt();
