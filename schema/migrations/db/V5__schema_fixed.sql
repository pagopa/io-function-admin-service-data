ALTER TABLE "${schemaName}".services
  ADD COLUMN "organizationName" character varying,
  ADD COLUMN "serviceId" character varying,
  ADD COLUMN "serviceMetadata_scope" character varying,
  ADD COLUMN "serviceMetadata_description" character varying,
  ADD COLUMN "quality" smallint,
  ADD COLUMN "departmentName" character varying,
  ADD COLUMN "maxAllowedPaymentAmount" integer,
  ADD COLUMN "serviceMetadata_address" character varying,
  ADD COLUMN "serviceMetadata_appAndroid" character varying,
  ADD COLUMN "serviceMetadata_appIos" character varying,
  ADD COLUMN "serviceMetadata_cta" character varying,
  ADD COLUMN "serviceMetadata_email" character varying,
  ADD COLUMN "serviceMetadata_phone" character varying,
  ADD COLUMN "serviceMetadata_category" character varying,
  ADD COLUMN "serviceMetadata_pec" character varying,
  ADD COLUMN "serviceMetadata_privacyUrl" character varying,
  ADD COLUMN "serviceMetadata_supportUrl" character varying,
  ADD COLUMN "serviceMetadata_tokenName" character varying,
  ADD COLUMN "serviceMetadata_tosUrl" character varying,
  ADD COLUMN "serviceMetadata_webUrl" character varying,
  ADD COLUMN "serviceMetadata_customSpecialFlow" character varying;

-- to reach better performance for our query we decide to define an index on isVisible field to facilitate the retrieving only visible documents
CREATE INDEX "isVisible_index" ON "${schemaName}".services ("isVisible");