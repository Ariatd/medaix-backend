import express, { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Mock projects data
const mockProjects = [
  {
    id: 'project-1',
    title: 'AI-Enhanced Medical Image Analysis',
    description: 'Development of integrated system combining computer vision and psychology for improved medical imaging',
    status: 'active',
    principalInvestigatorId: 'user-123',
    methodologyType: 'multidisciplinary_engineering',
    institutions: ['MedAIx University', 'Medical Research Institute'],
    tags: ['artificial intelligence', 'medical imaging', 'multidisciplinary'],
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-12-15'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// @route   GET /api/projects
// @desc    Get research projects
// @access  Private
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    status, 
    methodologyType, 
    userId, 
    page = 1, 
    limit = 20,
    search 
  } = req.query;

  let filteredProjects = [...mockProjects];

  // Apply filters
  if (status) {
    filteredProjects = filteredProjects.filter(p => p.status === status);
  }

  if (methodologyType) {
    filteredProjects = filteredProjects.filter(p => p.methodologyType === methodologyType);
  }

  if (userId) {
    filteredProjects = filteredProjects.filter(p => p.principalInvestigatorId === userId);
  }

  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredProjects = filteredProjects.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm)
    );
  }

  // Pagination
  const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
  const endIndex = startIndex + parseInt(limit as string);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      projects: paginatedProjects,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filteredProjects.length,
        pages: Math.ceil(filteredProjects.length / parseInt(limit as string))
      }
    }
  });
}));

// @route   POST /api/projects
// @desc    Create new research project
// @access  Private
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    methodologyType,
    principalInvestigatorId,
    startDate,
    endDate,
    institutions,
    tags,
    researchQuestions,
    objectives,
    hypotheses
  } = req.body;

  if (!title || !methodologyType || !principalInvestigatorId) {
    throw createError('Title, methodology type, and principal investigator are required', 400);
  }

  const newProject = {
    id: `project-${Date.now()}`,
    title,
    description: description || null,
    status: 'planning' as const,
    principalInvestigatorId,
    methodologyType,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    institutions: institutions || [],
    tags: tags || [],
    researchQuestions: researchQuestions || [],
    objectives: objectives || [],
    hypotheses: hypotheses || [],
    isPublic: false,
    collaborationLevel: 'individual',
    dataClassification: 'restricted',
    ethicalApprovalRequired: false,
    ethicalApprovalStatus: null,
    fundingSource: null,
    fundingAmount: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // In production, save to database
  mockProjects.push(newProject);

  res.status(201).json({
    success: true,
    data: {
      project: newProject
    }
  });
}));

// @route   GET /api/projects/:id
// @desc    Get specific project
// @access  Private
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = mockProjects.find(p => p.id === id);

  if (!project) {
    throw createError('Project not found', 404);
  }

  res.json({
    success: true,
    data: {
      project
    }
  });
}));

// @route   PATCH /api/projects/:id
// @desc    Update project
// @access  Private
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const projectIndex = mockProjects.findIndex(p => p.id === id);

  if (projectIndex === -1) {
    throw createError('Project not found', 404);
  }

  // Update project
  mockProjects[projectIndex] = {
    ...mockProjects[projectIndex],
    ...updates,
    updatedAt: new Date()
  };

  res.json({
    success: true,
    data: {
      project: mockProjects[projectIndex]
    }
  });
}));

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const projectIndex = mockProjects.findIndex(p => p.id === id);

  if (projectIndex === -1) {
    throw createError('Project not found', 404);
  }

  // In production, also delete associated data (images, analyses, etc.)
  mockProjects.splice(projectIndex, 1);

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
}));

// @route   GET /api/projects/:id/statistics
// @desc    Get project statistics
// @access  Private
router.get('/:id/statistics', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Mock statistics
  const statistics = {
    totalImages: 15,
    completedAnalyses: 12,
    pendingAnalyses: 3,
    successRate: 85.7,
    avgConfidence: 87.3,
    methodologyProgress: {
      totalSteps: 5,
      completedSteps: 2,
      inProgressSteps: 1,
      overallProgress: 60
    },
    teamMembers: 3,
    collaborationScore: 78.5,
    lastActivity: new Date(),
    dataClassification: 'restricted'
  };

  res.json({
    success: true,
    data: {
      statistics
    }
  });
}));

export default router;
