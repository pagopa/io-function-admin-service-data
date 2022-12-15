ALTER TABLE "${schemaName}".services
  ADD COLUMN "organizationName" character varying,
  ADD COLUMN "serviceId" character varying,
  ADD COLUMN "scope" character varying,
  ADD COLUMN "description" character varying,
  ADD COLUMN "quality" smallint,
  ADD COLUMN "departmentName" character varying,
  ADD COLUMN "maxAllowedPaymentAmount" integer,
  ADD COLUMN "serviceMetadata" json;

-- to reach better performance for our query we decide to define an index on isVisible field to facilitate the retrieving only visible documents
CREATE INDEX "isVisible_index" ON "${schemaName}".services USING hash ("isVisible")
WHERE "isVisible" is true;