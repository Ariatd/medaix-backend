"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prismaClient_1 = require("../prismaClient");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const analyses = await prismaClient_1.prisma.researchAnalysis.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                image: {
                    select: { id: true, fileName: true, originalFileName: true, imageType: true }
                }
            }
        });
        const formattedAnalyses = analyses.map(a => ({
            id: a.id,
            fileName: a.image?.originalFileName || a.image?.fileName || 'Unknown',
            status: a.status,
            confidenceScore: a.confidenceScore ? Number(a.confidenceScore) / 100 : null,
            createdAt: a.createdAt.toISOString(),
            uploadedAt: a.createdAt.toISOString(),
            imageType: a.image?.imageType || null,
            uploadedById: a.analystId
        }));
        res.json({ analyses: formattedAnalyses });
    }
    catch (error) {
        console.error('Failed to fetch analyses:', error);
        res.status(500).json({ error: 'Failed to fetch analyses' });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const allAnalyses = await prismaClient_1.prisma.researchAnalysis.findMany({
            orderBy: { createdAt: 'desc' },
            include: { image: { select: { id: true, fileName: true, originalFileName: true, imageType: true } } }
        });
        const totalAnalyses = allAnalyses.length;
        const completedAnalyses = allAnalyses.filter(a => a.status === 'completed');
        const successRate = totalAnalyses > 0
            ? Math.round((completedAnalyses.length / totalAnalyses) * 100)
            : 0;
        const recentAnalyses = allAnalyses.slice(0, 3).map(a => ({
            id: a.id,
            fileName: a.image?.originalFileName || a.image?.fileName || 'Unknown',
            status: a.status,
            confidenceScore: a.confidenceScore ? Number(a.confidenceScore) / 100 : null,
            createdAt: a.createdAt.toISOString(),
            uploadedAt: a.createdAt.toISOString(),
            imageType: a.image?.imageType || null
        }));
        res.json({
            totalAnalyses,
            successRate,
            recentAnalyses
        });
    }
    catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        res.status(500).json({
            totalAnalyses: 0,
            successRate: 0,
            recentAnalyses: [],
            error: 'Failed to fetch dashboard data'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        let analysis = await prismaClient_1.prisma.researchAnalysis.findUnique({
            where: { id: req.params.id },
            include: { image: true }
        });
        if (!analysis) {
            analysis = await prismaClient_1.prisma.researchAnalysis.findFirst({
                where: { imageId: req.params.id },
                include: { image: true }
            });
        }
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        return res.json({
            id: analysis.id,
            status: analysis.status,
            confidenceScore: analysis.confidenceScore ? Number(analysis.confidenceScore) / 100 : null,
            image: analysis.image ? {
                id: analysis.image.id,
                fileName: analysis.image.fileName,
                imageType: analysis.image.imageType
            } : undefined,
            findings: analysis.findings,
            recommendations: analysis.recommendations,
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt
        });
    }
    catch (error) {
        console.error('Failed to fetch analysis:', error);
        return res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});
exports.default = router;
//# sourceMappingURL=analyses.js.map