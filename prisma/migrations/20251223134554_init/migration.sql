-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'researcher', 'analyst', 'student');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'active', 'completed', 'on_hold', 'cancelled');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'review_required');

-- CreateEnum
CREATE TYPE "MethodologyType" AS ENUM ('multidisciplinary_engineering', 'human_centered_design', 'design_thinking', 'agile_research', 'scientific_method', 'case_study', 'action_research');

-- CreateEnum
CREATE TYPE "KnowledgeIntegrationType" AS ENUM ('cross_reference', 'synthesis', 'comparison', 'validation', 'innovation');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'researcher',
    "institution" TEXT,
    "department" TEXT,
    "specialization" TEXT[],
    "orcidId" TEXT,
    "googleScholarId" TEXT,
    "linkedinUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "memberSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_disciplines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentDisciplineId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "keywords" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onet_occupations" (
    "id" TEXT NOT NULL,
    "onetCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subdomain" TEXT,
    "tasks" TEXT[],
    "skills" TEXT[],
    "knowledgeAreas" TEXT[],
    "abilities" TEXT[],
    "educationLevel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onet_occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planning',
    "principalInvestigatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fundingSource" TEXT,
    "fundingAmount" DECIMAL(65,30),
    "institutions" TEXT[],
    "methodologyType" "MethodologyType" NOT NULL,
    "researchQuestions" TEXT[],
    "objectives" TEXT[],
    "hypotheses" TEXT[],
    "ethicalApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "ethicalApprovalStatus" TEXT,
    "dataClassification" TEXT NOT NULL DEFAULT 'public',
    "collaborationLevel" TEXT NOT NULL DEFAULT 'individual',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_disciplines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "primaryDiscipline" BOOLEAN NOT NULL DEFAULT false,
    "contributionLevel" TEXT NOT NULL DEFAULT 'moderate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_occupations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "occupationId" TEXT NOT NULL,
    "relevanceLevel" TEXT NOT NULL DEFAULT 'moderate',
    "roleDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "methodology_steps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodologyType" "MethodologyType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "estimatedDurationHours" INTEGER,
    "requiredResources" TEXT[],
    "deliverables" TEXT[],
    "successCriteria" TEXT[],
    "dependencies" TEXT[],
    "templateData" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "methodology_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_methodology_steps" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "methodologyStepId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "deliverablesUploaded" TEXT[],
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_methodology_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_images" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "imageType" TEXT,
    "imageConfidence" DECIMAL(65,30),
    "width" INTEGER,
    "height" INTEGER,
    "colorDepth" INTEGER,
    "hasMetadata" BOOLEAN NOT NULL DEFAULT false,
    "dicomMetadata" JSONB,
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "tags" TEXT[],
    "description" TEXT,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" TEXT NOT NULL DEFAULT 'restricted',
    "anonymized" BOOLEAN NOT NULL DEFAULT false,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "imageId" TEXT,
    "analystId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "confidenceScore" DECIMAL(65,30),
    "processingTimeSeconds" INTEGER,
    "algorithmVersion" TEXT,
    "modelUsed" TEXT,
    "findings" JSONB,
    "recommendations" JSONB,
    "differentialDiagnosis" JSONB,
    "severityAssessment" JSONB,
    "regionsOfInterest" JSONB,
    "qualityMetrics" JSONB,
    "errorMessage" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_integrations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceDisciplineId" TEXT NOT NULL,
    "targetDisciplineId" TEXT NOT NULL,
    "integrationType" "KnowledgeIntegrationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceKnowledge" TEXT,
    "targetApplication" TEXT,
    "integrationMethod" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'pending',
    "validationNotes" TEXT,
    "noveltyScore" DECIMAL(65,30),
    "impactPotential" TEXT,
    "implementationFeasibility" TEXT,
    "references" TEXT[],
    "supportingEvidence" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_collaborators" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "contributionDescription" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "project_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "academic_disciplines_code_key" ON "academic_disciplines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "onet_occupations_onetCode_key" ON "onet_occupations"("onetCode");

-- CreateIndex
CREATE UNIQUE INDEX "project_disciplines_projectId_disciplineId_key" ON "project_disciplines"("projectId", "disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "project_occupations_projectId_occupationId_key" ON "project_occupations"("projectId", "occupationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_methodology_steps_projectId_methodologyStepId_key" ON "project_methodology_steps"("projectId", "methodologyStepId");

-- CreateIndex
CREATE UNIQUE INDEX "project_collaborators_projectId_userId_key" ON "project_collaborators"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "academic_disciplines" ADD CONSTRAINT "academic_disciplines_parentDisciplineId_fkey" FOREIGN KEY ("parentDisciplineId") REFERENCES "academic_disciplines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_projects" ADD CONSTRAINT "research_projects_principalInvestigatorId_fkey" FOREIGN KEY ("principalInvestigatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_disciplines" ADD CONSTRAINT "project_disciplines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_disciplines" ADD CONSTRAINT "project_disciplines_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "academic_disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_occupations" ADD CONSTRAINT "project_occupations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_occupations" ADD CONSTRAINT "project_occupations_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "onet_occupations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_methodology_steps" ADD CONSTRAINT "project_methodology_steps_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_methodology_steps" ADD CONSTRAINT "project_methodology_steps_methodologyStepId_fkey" FOREIGN KEY ("methodologyStepId") REFERENCES "methodology_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_methodology_steps" ADD CONSTRAINT "project_methodology_steps_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_analyses" ADD CONSTRAINT "research_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_analyses" ADD CONSTRAINT "research_analyses_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "uploaded_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_analyses" ADD CONSTRAINT "research_analyses_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_analyses" ADD CONSTRAINT "research_analyses_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_analyses" ADD CONSTRAINT "research_analyses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_integrations" ADD CONSTRAINT "knowledge_integrations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_integrations" ADD CONSTRAINT "knowledge_integrations_sourceDisciplineId_fkey" FOREIGN KEY ("sourceDisciplineId") REFERENCES "academic_disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_integrations" ADD CONSTRAINT "knowledge_integrations_targetDisciplineId_fkey" FOREIGN KEY ("targetDisciplineId") REFERENCES "academic_disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_integrations" ADD CONSTRAINT "knowledge_integrations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
