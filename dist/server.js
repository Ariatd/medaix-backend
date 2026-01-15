"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
const upload_1 = __importDefault(require("./routes/upload"));
const methodology_1 = __importDefault(require("./routes/methodology"));
const projects_1 = __importDefault(require("./routes/projects"));
const analyses_1 = __importDefault(require("./routes/analyses"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
dotenv_1.default.config();
const prismaClient_1 = require("./prismaClient");
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'medaix-backend' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
        ...(process.env.NODE_ENV !== 'production' ? [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.simple()
            })
        ] : [])
    ],
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use((0, compression_1.default)());
app.use('/api/upload', upload_1.default);
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use((0, morgan_1.default)('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));
app.use(requestLogger_1.requestLogger);
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/methodology', methodology_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/analyses', analyses_1.default);
app.get('/api/dashboard', async (req, res) => {
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
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', api: true, timestamp: new Date().toISOString() });
});
app.use(errorHandler_1.errorHandler);
const server = app.listen(PORT, () => {
    console.log(`🚀 MedAIx Backend Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map