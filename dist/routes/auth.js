"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const mockUsers = [
    {
        id: 'user-123',
        email: 'researcher@medaix.edu',
        name: 'Dr. Sarah Johnson',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        role: 'researcher',
        institution: 'MedAIx University',
        department: 'Biomedical Engineering',
        specialization: ['Computer Engineering', 'Psychology'],
        isVerified: true,
        memberSince: new Date('2024-01-01'),
        lastActive: new Date(),
        avatar: 'https://ui-avatars.com/api/?name=Dr+Sarah+Johnson&background=0066CC&color=fff'
    }
];
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, errorHandler_1.createError)('Email and password are required', 400);
    }
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
        throw (0, errorHandler_1.createError)('Invalid credentials', 401);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, errorHandler_1.createError)('Invalid credentials', 401);
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({
        success: true,
        data: {
            user: userWithoutPassword,
            token,
            expiresIn: '24h'
        }
    });
}));
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name, role = 'researcher', institution, department, specialization } = req.body;
    if (!email || !password || !name) {
        throw (0, errorHandler_1.createError)('Email, password, and name are required', 400);
    }
    if (password.length < 6) {
        throw (0, errorHandler_1.createError)('Password must be at least 6 characters', 400);
    }
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
        throw (0, errorHandler_1.createError)('User already exists with this email', 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const newUser = {
        id: `user-${Date.now()}`,
        email,
        password: hashedPassword,
        name,
        role,
        institution: institution || null,
        department: department || null,
        specialization: specialization || [],
        isVerified: false,
        memberSince: new Date(),
        lastActive: new Date(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0066CC&color=fff`
    };
    mockUsers.push(newUser);
    const token = jsonwebtoken_1.default.sign({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
        success: true,
        data: {
            user: userWithoutPassword,
            token,
            expiresIn: '24h'
        }
    });
}));
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = mockUsers[0];
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404);
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({
        success: true,
        data: {
            user: userWithoutPassword
        }
    });
}));
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User ID is required', 400);
    }
    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404);
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.json({
        success: true,
        data: {
            token,
            expiresIn: '24h'
        }
    });
}));
router.post('/logout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map