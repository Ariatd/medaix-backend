"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
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
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, methodologyType, userId, page = 1, limit = 20, search } = req.query;
    let filteredProjects = [...mockProjects];
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
        const searchTerm = search.toLowerCase();
        filteredProjects = filteredProjects.filter(p => p.title.toLowerCase().includes(searchTerm) ||
            p.description?.toLowerCase().includes(searchTerm));
    }
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    res.json({
        success: true,
        data: {
            projects: paginatedProjects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredProjects.length,
                pages: Math.ceil(filteredProjects.length / parseInt(limit))
            }
        }
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title, description, methodologyType, principalInvestigatorId, startDate, endDate, institutions, tags, researchQuestions, objectives, hypotheses } = req.body;
    if (!title || !methodologyType || !principalInvestigatorId) {
        throw (0, errorHandler_1.createError)('Title, methodology type, and principal investigator are required', 400);
    }
    const newProject = {
        id: `project-${Date.now()}`,
        title,
        description: description || null,
        status: 'planning',
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
    mockProjects.push(newProject);
    res.status(201).json({
        success: true,
        data: {
            project: newProject
        }
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const project = mockProjects.find(p => p.id === id);
    if (!project) {
        throw (0, errorHandler_1.createError)('Project not found', 404);
    }
    res.json({
        success: true,
        data: {
            project
        }
    });
}));
router.patch('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const projectIndex = mockProjects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
        throw (0, errorHandler_1.createError)('Project not found', 404);
    }
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
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const projectIndex = mockProjects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
        throw (0, errorHandler_1.createError)('Project not found', 404);
    }
    mockProjects.splice(projectIndex, 1);
    res.json({
        success: true,
        message: 'Project deleted successfully'
    });
}));
router.get('/:id/statistics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
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
exports.default = router;
//# sourceMappingURL=projects.js.map