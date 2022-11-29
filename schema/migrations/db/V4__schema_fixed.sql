ALTER TABLE "${schemaName}".services DROP CONSTRAINT "migrations_pkey";
ALTER TABLE "${schemaName}".services ADD CONSTRAINT "servicedata_pkey" PRIMARY KEY ("id");