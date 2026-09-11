-- Migration: phase2_access_and_queue
BEGIN;

-- Migrate UserRole enum safely
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
CREATE TYPE "UserRole_new" AS ENUM ('CITIZEN', 'CHW', 'DOCTOR', 'FACILITY_ADMIN', 'DISTRICT_OFFICER', 'SUPER_ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE 
    WHEN "role"::text = 'FRONTLINE_WORKER' THEN 'CHW'::"UserRole_new"
    WHEN "role"::text = 'DISTRICT_ADMIN' THEN 'DISTRICT_OFFICER'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END
);

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CITIZEN';

-- DropForeignKey
ALTER TABLE "QueueToken" DROP CONSTRAINT IF EXISTS "QueueToken_appointmentId_fkey";

-- Clean old synthetic queue tokens prior to column alter
DELETE FROM "QueueToken";

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "department" TEXT NOT NULL DEFAULT 'GENERAL_MEDICINE',
ADD COLUMN IF NOT EXISTS "serviceDate" TEXT;

-- AlterTable Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "catchmentCode" TEXT,
ADD COLUMN IF NOT EXISTS "registeredAtFacilityId" UUID,
ADD COLUMN IF NOT EXISTS "registeredByUserId" UUID;

-- AlterTable QueueToken
ALTER TABLE "QueueToken" DROP COLUMN IF EXISTS "tokenNumber",
ADD COLUMN IF NOT EXISTS "consultationStartedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "displayNumber" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "patientId" UUID NOT NULL,
ADD COLUMN IF NOT EXISTS "serviceDate" TEXT NOT NULL DEFAULT '2026-09-11',
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'APPOINTMENT',
ADD COLUMN IF NOT EXISTS "tokenPrefix" TEXT NOT NULL DEFAULT 'GM',
ADD COLUMN IF NOT EXISTS "tokenSequence" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "appointmentId" DROP NOT NULL,
ALTER COLUMN "department" SET DEFAULT 'GENERAL_MEDICINE',
DROP COLUMN IF EXISTS "priority",
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 10;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable FacilityMembership
CREATE TABLE IF NOT EXISTS "FacilityMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "membershipRole" TEXT NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable CHWAssignment
CREATE TABLE IF NOT EXISTS "CHWAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "facilityId" UUID,
    "catchmentCode" TEXT,
    "pincode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CHWAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable DistrictAssignment
CREATE TABLE IF NOT EXISTS "DistrictAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "districtCode" TEXT NOT NULL DEFAULT 'MUMBAI_SUBURBAN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable AppointmentSlot
CREATE TABLE IF NOT EXISTS "AppointmentSlot" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'GENERAL_MEDICINE',
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable QueueCounter
CREATE TABLE IF NOT EXISTS "QueueCounter" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "serviceDate" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'GENERAL_MEDICINE',
    "lastIssuedNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueCounter_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "FacilityMembership_userId_idx" ON "FacilityMembership"("userId");
CREATE INDEX IF NOT EXISTS "FacilityMembership_facilityId_idx" ON "FacilityMembership"("facilityId");
CREATE UNIQUE INDEX IF NOT EXISTS "FacilityMembership_userId_facilityId_key" ON "FacilityMembership"("userId", "facilityId");

CREATE INDEX IF NOT EXISTS "CHWAssignment_userId_idx" ON "CHWAssignment"("userId");
CREATE INDEX IF NOT EXISTS "CHWAssignment_facilityId_idx" ON "CHWAssignment"("facilityId");
CREATE INDEX IF NOT EXISTS "CHWAssignment_catchmentCode_idx" ON "CHWAssignment"("catchmentCode");

CREATE INDEX IF NOT EXISTS "DistrictAssignment_userId_idx" ON "DistrictAssignment"("userId");
CREATE INDEX IF NOT EXISTS "DistrictAssignment_districtCode_idx" ON "DistrictAssignment"("districtCode");

CREATE INDEX IF NOT EXISTS "AppointmentSlot_facilityId_date_idx" ON "AppointmentSlot"("facilityId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentSlot_facilityId_department_date_startTime_endTim_key" ON "AppointmentSlot"("facilityId", "department", "date", "startTime", "endTime");

CREATE INDEX IF NOT EXISTS "QueueCounter_facilityId_serviceDate_idx" ON "QueueCounter"("facilityId", "serviceDate");
CREATE UNIQUE INDEX IF NOT EXISTS "QueueCounter_facilityId_serviceDate_department_key" ON "QueueCounter"("facilityId", "serviceDate", "department");

CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Patient_registeredByUserId_idx" ON "Patient"("registeredByUserId");
CREATE INDEX IF NOT EXISTS "Patient_registeredAtFacilityId_idx" ON "Patient"("registeredAtFacilityId");

CREATE INDEX IF NOT EXISTS "QueueToken_facilityId_serviceDate_department_status_idx" ON "QueueToken"("facilityId", "serviceDate", "department", "status");
CREATE INDEX IF NOT EXISTS "QueueToken_patientId_serviceDate_idx" ON "QueueToken"("patientId", "serviceDate");
CREATE UNIQUE INDEX IF NOT EXISTS "QueueToken_facilityId_serviceDate_department_tokenSequence_key" ON "QueueToken"("facilityId", "serviceDate", "department", "tokenSequence");
CREATE UNIQUE INDEX IF NOT EXISTS "QueueToken_facilityId_serviceDate_department_displayNumber_key" ON "QueueToken"("facilityId", "serviceDate", "department", "displayNumber");

-- Foreign Keys
ALTER TABLE "FacilityMembership" ADD CONSTRAINT "FacilityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacilityMembership" ADD CONSTRAINT "FacilityMembership_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CHWAssignment" ADD CONSTRAINT "CHWAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CHWAssignment" ADD CONSTRAINT "CHWAssignment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DistrictAssignment" ADD CONSTRAINT "DistrictAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_registeredAtFacilityId_fkey" FOREIGN KEY ("registeredAtFacilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QueueCounter" ADD CONSTRAINT "QueueCounter_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
