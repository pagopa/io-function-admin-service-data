CREATE OR REPLACE FUNCTION "${schemaName}".set_current_timestamp_on_updateAt()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updateAt" = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_servicedata_updateAt_with_current_timestamp BEFORE UPDATE
    ON "${schemaName}".services FOR EACH ROW EXECUTE PROCEDURE
    "${schemaName}".set_current_timestamp_on_updateAt();
