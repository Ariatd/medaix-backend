/**
 * User Routes for MedAIx
 * Handles user-related endpoints (tokens, profile, etc.)
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getUserTokens,
  canUserAnalyze,
  grantTokens,
  upgradeToPro,
} from '../services/tokenService';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * GET /api/user/tokens
 * @desc    Get current user's token balance
 * @access  Private (requires JWT token)
 */
router.get('/tokens', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    throw createError('User ID not found in token', 400);
  }

  const tokenStatus = await getUserTokens(userId);

  res.json({
    success: true,
    data: {
      tokensTotal: tokenStatus.tokensTotal ?? 0,
      tokensUsedToday: tokenStatus.tokensUsedToday ?? 0,
      isPro: tokenStatus.isPro ?? false,
      tokenLastResetDate: tokenStatus.tokenLastResetDate,
    },
  });
}));

/**
 * GET /api/user/can-analyze
 * @desc    Check if user can perform analysis
 * @access  Private (requires JWT token)
 */
router.get('/can-analyze', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    throw createError('User ID not found in token', 400);
  }

  const result = await canUserAnalyze(userId);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * POST /api/user/grant-tokens
 * @desc    Grant bonus tokens to user (admin only)
 * @access  Private (admin only)
 */
router.post(
  '/grant-tokens',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    const { amount } = req.body;

    if (!userId) {
      throw createError('User ID not found in token', 400);
    }

    if (!amount || amount < 1) {
      throw createError('Amount must be at least 1', 400);
    }

    const result = await grantTokens(userId, amount);

    res.json({
      success: true,
      message: `Granted ${amount} tokens`,
      data: result,
    });
  })
);

/**
 * POST /api/user/upgrade-pro
 * @desc    Upgrade user to Pro (payment processing in real app)
 * @access  Private
 */
router.post(
  '/upgrade-pro',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      throw createError('User ID not found in token', 400);
    }

    const result = await upgradeToPro(userId);

    res.json({
      success: true,
      message: 'Upgraded to Pro',
      data: result,
    });
  })
);

export default router;
