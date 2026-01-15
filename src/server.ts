import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';

// Import routes
import uploadRoutes from './routes/upload';
import methodologyRoutes from './routes/methodology';
import projectRoutes from './routes/projects';
import analysisRoutes from './routes/analyses';
import authRoutes from './routes/auth';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'medaix-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ],
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// --- KRİTİK DÜZELTME BURADA ---
// Önce resim yükleme rotasını tanımlıyoruz ki JSON parser resim dosyasına dokunmasın!
app.use('/api/upload', uploadRoutes);

// Diğer tüm rotalar için JSON desteğini şimdi açıyoruz
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// ------------------------------

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging & Request Management
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));
app.use(requestLogger);

// API routes (Upload hariç diğerleri)
app.use('/api/auth', authRoutes);
app.use('/api/methodology', methodologyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analyses', analysisRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling (En sonda olmalı)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 MedAIx Backend Server running on port ${PORT}`);
});

export default app;