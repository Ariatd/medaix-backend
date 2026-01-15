import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Mock users data - in production, this would be in the database
const mockUsers = [
  {
    id: 'user-123',
    email: 'researcher@medaix.edu',
    name: 'Dr. Sarah Johnson',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password' hashed
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

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  // Find user by email
  const user = mockUsers.find(u => u.email === email);

  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError('Invalid credentials', 401);
  }

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  // Remove password from response
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

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const {
    email,
    password,
    name,
    role = 'researcher',
    institution,
    department,
    specialization
  } = req.body;

  if (!email || !password || !name) {
    throw createError('Email, password, and name are required', 400);
  }

  if (password.length < 6) {
    throw createError('Password must be at least 6 characters', 400);
  }

  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
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

  // In production, save to database
  mockUsers.push(newUser);

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: newUser.id, 
      email: newUser.email, 
      role: newUser.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  // Remove password from response
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

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // In production, extract user ID from JWT token
  // For now, return mock user
  const user = mockUsers[0];
  
  if (!user) {
    throw createError('User not found', 404);
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    }
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  // In production, extract user ID from current token and generate new token
  const { userId } = req.body;

  if (!userId) {
    throw createError('User ID is required', 400);
  }

  const user = mockUsers.find(u => u.id === userId);

  if (!user) {
    throw createError('User not found', 404);
  }

  // Generate new JWT token
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: {
      token,
      expiresIn: '24h'
    }
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

export default router;
