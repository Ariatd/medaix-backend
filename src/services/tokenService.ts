/**
 * Token Service for MedAIx
 * Handles server-side token management with database persistence
 */

import { prisma } from '../prismaClient';
import type { User } from '@prisma/client';

/**
 * Check if daily tokens need to be reset (new day)
 */
function shouldResetDailyTokens(lastResetDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastReset = new Date(lastResetDate);
  lastReset.setHours(0, 0, 0, 0);
  
  return today.getTime() > lastReset.getTime();
}

/**
 * Get user's current token status
 * Automatically resets daily token counter if needed
 */
export async function getUserTokens(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if we need to reset daily token counter
  if (shouldResetDailyTokens(user.tokenLastResetDate)) {
    // Reset daily counter for new day
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        tokensUsedToday: 0,
        tokenLastResetDate: new Date(),
      },
    });
    return updated;
  }

  return user;
}

/**
 * Check if user can perform analysis
 * Returns false if:
 * - User has 0 tokens AND has used 3 free daily analyses
 */
export async function canUserAnalyze(userId: string): Promise<{ canAnalyze: boolean; reason?: string }> {
  const user = await getUserTokens(userId);

  // Pro users can always analyze
  if (user.isPro) {
    return { canAnalyze: true };
  }

  // Check if user has bonus tokens
  if (user.tokensTotal > 0) {
    return { canAnalyze: true };
  }

  // If no bonus tokens, check daily free analyses (max 3)
  if (user.tokensUsedToday >= 3) {
    return {
      canAnalyze: false,
      reason: 'Daily free analyses limit reached. Upgrade to Pro or wait until tomorrow.',
    };
  }

  // User can use free daily analysis
  return { canAnalyze: true };
}

/**
 * Deduct token or daily usage after successful analysis
 * - If user has bonus tokens: deduct 1 token
 * - If user has 0 tokens: increment daily usage
 * - Pro users: no deduction
 */
export async function deductTokenForAnalysis(userId: string) {
  const user = await getUserTokens(userId);

  if (user.isPro) {
    // Pro users don't use tokens
    return { success: true, tokensRemaining: -1, isPro: true };
  }

  if (user.tokensTotal > 0) {
    // Deduct from bonus tokens
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        tokensTotal: user.tokensTotal - 1,
      },
    });
    return {
      success: true,
      tokensRemaining: updated.tokensTotal,
      isPro: false,
      deducted: 'token',
    };
  }

  // Increment daily free usage
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      tokensUsedToday: user.tokensUsedToday + 1,
    },
  });
  return {
    success: true,
    tokensRemaining: updated.tokensTotal,
    dailyUsed: updated.tokensUsedToday,
    isPro: false,
    deducted: 'daily',
  };
}

/**
 * Grant bonus tokens to user (e.g., for signup or premium upgrade)
 */
export async function grantTokens(userId: string, amount: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      tokensTotal: user.tokensTotal + amount,
    },
  });

  return { tokensTotal: updated.tokensTotal };
}

/**
 * Upgrade user to Pro
 */
export async function upgradeToPro(userId: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isPro: true,
    },
  });

  return { success: true, isPro: updated.isPro };
}

/**
 * Downgrade user from Pro
 */
export async function downgradeFromPro(userId: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isPro: false,
    },
  });

  return { success: true, isPro: updated.isPro };
}

/**
 * Initialize tokens for new user (15 free tokens)
 */
export async function initializeTokensForNewUser(userId: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      tokensTotal: 15,
      tokensUsedToday: 0,
      tokenLastResetDate: new Date(),
    },
  });

  return {
    tokensTotal: updated.tokensTotal,
    tokensUsedToday: updated.tokensUsedToday,
  };
}

/**
 * Get time until daily reset (in milliseconds)
 */
export function getTimeUntilDailyReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tomorrow.getTime() - now.getTime();
}

/**
 * Get token percentage for UI display
 */
export function getTokenPercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return (used / total) * 100;
}

/**
 * Get status color based on token percentage
 */
export function getTokenStatusColor(remaining: number, total: number): string {
  if (total === 0) return 'red';
  const percentage = (remaining / total) * 100;
  if (percentage > 50) return 'green';
  if (percentage > 25) return 'yellow';
  return 'red';
}
