ALTER TABLE "${schemaName}".services
  ADD COLUMN "organizationName" character varying,
  ADD COLUMN "serviceId" character varying,
  ADD COLUMN "serviceMetadataScope" character varying,
  ADD COLUMN "serviceMetadataDescription" character varying,
  ADD COLUMN "quality" smallint,
  ADD COLUMN "departmentName" character varying,
  ADD COLUMN "maxAllowedPaymentAmount" integer,
  ADD COLUMN "serviceMetadataAddress" character varying,
  ADD COLUMN "serviceMetadataAppAndroid" character varying,
  ADD COLUMN "serviceMetadataAppIos" character varying,
  ADD COLUMN "serviceMetadataCta" character varying,
  ADD COLUMN "serviceMetadataEmail" character varying,
  ADD COLUMN "serviceMetadataPhone" character varying,
  ADD COLUMN "serviceMetadataCategory" character varying,
  ADD COLUMN "serviceMetadataPec" character varying,
  ADD COLUMN "serviceMetadataPrivacyUrl" character varying,
  ADD COLUMN "serviceMetadataSupportUrl" character varying,
  ADD COLUMN "serviceMetadataTokenName" character varying,
  ADD COLUMN "serviceMetadataTosUrl" character varying,
  ADD COLUMN "serviceMetadataWebUrl" character varying,
  ADD COLUMN "serviceMetadataCustomSpecialFlow" character varying;

-- to reach better performance for our query we decide to define an index on isVisible field to facilitate the retrieving only visible documents
CREATE INDEX "isVisible_index" ON "${schemaName}".services USING hash ("isVisible")
WHERE "isVisible" is true;