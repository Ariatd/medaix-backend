import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Mock methodology steps data - in production, this would come from database
const mockMethodologySteps = [
  {
    id: uuidv4(),
    name: 'Problem Definition and Scope Analysis',
    description: 'Clearly define the engineering problem and establish multidisciplinary scope',
    methodologyType: 'multidisciplinary_engineering',
    stepOrder: 1,
    estimatedDurationHours: 8,
    requiredResources: ['Subject matter experts', 'Project charter template', 'Literature review tools'],
    deliverables: ['Problem statement document', 'Scope definition', 'Stakeholder requirements'],
    successCriteria: ['Clear problem statement', 'Defined boundaries', 'Stakeholder alignment'],
    dependencies: [],
    templateData: {
      templates: ['problem_charter', 'stakeholder_analysis'],
      tools: ['literature_review']
    },
    isActive: true,
    createdAt: new Date()
  },
  {
    id: uuidv4(),
    name: 'Domain Knowledge Integration',
    description: 'Gather and integrate knowledge from relevant engineering disciplines',
    methodologyType: 'multidisciplinary_engineering',
    stepOrder: 2,
    estimatedDurationHours: 12,
    requiredResources: ['Discipline experts', 'Technical databases', 'Academic papers'],
    deliverables: ['Domain knowledge synthesis', 'Cross-disciplinary connections', 'Knowledge gaps analysis'],
    successCriteria: ['Comprehensive domain coverage', 'Identified connections', 'Gap analysis'],
    dependencies: [],
    templateData: {
      templates: ['knowledge_integration', 'discipline_matrix'],
      references: ['academic_papers', 'industry_standards']
    },
    isActive: true,
    createdAt: new Date()
  },
  {
    id: uuidv4(),
    name: 'Empathize: Understanding Users',
    description: 'Deep understanding of user needs, behaviors, and motivations',
    methodologyType: 'human_centered_design',
    stepOrder: 1,
    estimatedDurationHours: 12,
    requiredResources: ['User research tools', 'Interview guides', 'Observation protocols'],
    deliverables: ['User personas', 'Journey maps', 'Empathy maps', 'User insights'],
    successCriteria: ['Rich user understanding', 'Clear user needs', 'Behavioral insights'],
    dependencies: [],
    templateData: {
      methods: ['interviews', 'observations', 'surveys'],
      tools: ['persona_template', 'journey_map']
    },
    isActive: true,
    createdAt: new Date()
  }
];

// @route   GET /api/methodology/steps
// @desc    Get all methodology steps
// @access  Private
router.get('/steps', asyncHandler(async (req: Request, res: Response) => {
  const { methodologyType, activeOnly = true } = req.query;

  let filteredSteps = [...mockMethodologySteps];

  if (methodologyType) {
    filteredSteps = filteredSteps.filter(step => step.methodologyType === methodologyType);
  }

  if (activeOnly === 'true') {
    filteredSteps = filteredSteps.filter(step => step.isActive);
  }

  // Group by methodology type
  const groupedSteps = filteredSteps.reduce((acc, step) => {
    const type = step.methodologyType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(step);
    return acc;
  }, {} as Record<string, typeof mockMethodologySteps>);

  // Sort steps by order within each methodology type
  Object.keys(groupedSteps).forEach(type => {
    groupedSteps[type].sort((a, b) => a.stepOrder - b.stepOrder);
  });

  res.json({
    success: true,
    data: {
      methodologySteps: groupedSteps,
      total: filteredSteps.length,
      methodologies: Object.keys(groupedSteps).length
    }
  });
}));

// @route   GET /api/methodology/steps/:id
// @desc    Get specific methodology step
// @access  Private
router.get('/steps/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const step = mockMethodologySteps.find(s => s.id === id);

  if (!step) {
    throw createError('Methodology step not found', 404);
  }

  res.json({
    success: true,
    data: {
      methodologyStep: step
    }
  });
}));

// @route   GET /api/methodology/types
// @desc    Get available methodology types
// @access  Private
router.get('/types', asyncHandler(async (req: Request, res: Response) => {
  const methodologyTypes = [
    {
      type: 'multidisciplinary_engineering',
      name: 'Multidisciplinary Engineering Analysis',
      description: 'Systematic approach combining multiple engineering disciplines for complex problem solving',
      stepsCount: mockMethodologySteps.filter(s => s.methodologyType === 'multidisciplinary_engineering').length
    },
    {
      type: 'human_centered_design',
      name: 'Human-Centered Design',
      description: 'Design process that focuses on user needs, behaviors, and experiences throughout development',
      stepsCount: mockMethodologySteps.filter(s => s.methodologyType === 'human_centered_design').length
    },
    {
      type: 'design_thinking',
      name: 'Design Thinking',
      description: 'Creative problem-solving approach emphasizing human-centered innovation',
      stepsCount: mockMethodologySteps.filter(s => s.methodologyType === 'design_thinking').length
    },
    {
      type: 'agile_research',
      name: 'Agile Research',
      description: 'Iterative research methodology adapting to changing requirements and insights',
      stepsCount: mockMethodologySteps.filter(s => s.methodologyType === 'agile_research').length
    },
    {
      type: 'scientific_method',
      name: 'Scientific Method',
      description: 'Systematic approach to scientific inquiry and experimentation',
      stepsCount: mockMethodologySteps.filter(s => s.methodologyType === 'scientific_method').length
    }
  ];

  res.json({
    success: true,
    data: {
      methodologyTypes
    }
  });
}));

// @route   POST /api/methodology/projects/:projectId/steps
// @desc    Assign methodology steps to a project
// @access  Private
router.post('/projects/:projectId/steps', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { stepIds, assignedTo, customizations } = req.body;

  if (!stepIds || !Array.isArray(stepIds)) {
    throw createError('Step IDs array is required', 400);
  }

  const projectSteps = stepIds.map(stepId => {
    const step = mockMethodologySteps.find(s => s.id === stepId);
    if (!step) {
      throw createError(`Methodology step ${stepId} not found`, 404);
    }

    return {
      id: uuidv4(),
      projectId,
      methodologyStepId: stepId,
      assignedToId: assignedTo || null,
      status: 'pending',
      actualStartDate: null,
      actualEndDate: null,
      notes: customizations?.notes || null,
      deliverablesUploaded: [],
      completionPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      step: step // Include step details for response
    };
  });

  res.status(201).json({
    success: true,
    data: {
      projectSteps,
      message: `Assigned ${projectSteps.length} methodology steps to project`
    }
  });
}));

// @route   PATCH /api/methodology/projects/:projectId/steps/:stepId
// @desc    Update project methodology step status
// @access  Private
router.patch('/projects/:projectId/steps/:stepId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId, stepId } = req.params;
  const { 
    status, 
    assignedTo, 
    notes, 
    completionPercentage, 
    actualStartDate, 
    actualEndDate,
    deliverablesUploaded 
  } = req.body;

  // Mock update - in production, update database
  const updatedStep = {
    id: stepId,
    projectId,
    methodologyStepId: 'step-123',
    assignedToId: assignedTo || null,
    status: status || 'pending',
    actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
    actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
    notes: notes || null,
    deliverablesUploaded: deliverablesUploaded || [],
    completionPercentage: completionPercentage || 0,
    updatedAt: new Date()
  };

  res.json({
    success: true,
    data: {
      projectStep: updatedStep,
      message: 'Project methodology step updated successfully'
    }
  });
}));

// @route   GET /api/methodology/projects/:projectId/steps
// @desc    Get methodology steps assigned to a project
// @access  Private
router.get('/projects/:projectId/steps', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { status } = req.query;

  // Mock data - in production, query database
  const mockProjectSteps = [
    {
      id: uuidv4(),
      projectId,
      methodologyStepId: mockMethodologySteps[0].id,
      status: 'in_progress',
      completionPercentage: 60,
      actualStartDate: new Date(),
      notes: 'Making good progress on problem definition',
      createdAt: new Date(),
      step: mockMethodologySteps[0]
    },
    {
      id: uuidv4(),
      projectId,
      methodologyStepId: mockMethodologySteps[1].id,
      status: 'pending',
      completionPercentage: 0,
      notes: null,
      createdAt: new Date(),
      step: mockMethodologySteps[1]
    }
  ];

  let filteredSteps = mockProjectSteps;
  if (status) {
    filteredSteps = mockProjectSteps.filter(step => step.status === status);
  }

  // Calculate overall progress
  const totalSteps = filteredSteps.length;
  const completedSteps = filteredSteps.filter(step => step.status === 'completed').length;
  const inProgressSteps = filteredSteps.filter(step => step.status === 'in_progress').length;
  const overallProgress = totalSteps > 0 
    ? Math.round(filteredSteps.reduce((sum, step) => sum + step.completionPercentage, 0) / totalSteps)
    : 0;

  res.json({
    success: true,
    data: {
      projectSteps: filteredSteps,
      summary: {
        total: totalSteps,
        completed: completedSteps,
        inProgress: inProgressSteps,
        pending: totalSteps - completedSteps - inProgressSteps,
        overallProgress
      }
    }
  });
}));

export default router;
