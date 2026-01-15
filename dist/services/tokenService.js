"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTokens = getUserTokens;
exports.canUserAnalyze = canUserAnalyze;
exports.deductTokenForAnalysis = deductTokenForAnalysis;
exports.grantTokens = grantTokens;
exports.upgradeToPro = upgradeToPro;
exports.downgradeFromPro = downgradeFromPro;
exports.initializeTokensForNewUser = initializeTokensForNewUser;
exports.getTimeUntilDailyReset = getTimeUntilDailyReset;
exports.getTokenPercentage = getTokenPercentage;
exports.getTokenStatusColor = getTokenStatusColor;
const prismaClient_1 = require("../prismaClient");
function shouldResetDailyTokens(lastResetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(lastResetDate);
    lastReset.setHours(0, 0, 0, 0);
    return today.getTime() > lastReset.getTime();
}
async function getUserTokens(userId) {
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (shouldResetDailyTokens(user.tokenLastResetDate)) {
        const updated = await prismaClient_1.prisma.user.update({
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
async function canUserAnalyze(userId) {
    const user = await getUserTokens(userId);
    if (user.isPro) {
        return { canAnalyze: true };
    }
    if (user.tokensTotal > 0) {
        return { canAnalyze: true };
    }
    if (user.tokensUsedToday >= 3) {
        return {
            canAnalyze: false,
            reason: 'Daily free analyses limit reached. Upgrade to Pro or wait until tomorrow.',
        };
    }
    return { canAnalyze: true };
}
async function deductTokenForAnalysis(userId) {
    const user = await getUserTokens(userId);
    if (user.isPro) {
        return { success: true, tokensRemaining: -1, isPro: true };
    }
    if (user.tokensTotal > 0) {
        const updated = await prismaClient_1.prisma.user.update({
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
    const updated = await prismaClient_1.prisma.user.update({
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
async function grantTokens(userId, amount) {
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const updated = await prismaClient_1.prisma.user.update({
        where: { id: userId },
        data: {
            tokensTotal: user.tokensTotal + amount,
        },
    });
    return { tokensTotal: updated.tokensTotal };
}
async function upgradeToPro(userId) {
    const updated = await prismaClient_1.prisma.user.update({
        where: { id: userId },
        data: {
            isPro: true,
        },
    });
    return { success: true, isPro: updated.isPro };
}
async function downgradeFromPro(userId) {
    const updated = await prismaClient_1.prisma.user.update({
        where: { id: userId },
        data: {
            isPro: false,
        },
    });
    return { success: true, isPro: updated.isPro };
}
async function initializeTokensForNewUser(userId) {
    const updated = await prismaClient_1.prisma.user.update({
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
function getTimeUntilDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
}
function getTokenPercentage(used, total) {
    if (total === 0)
        return 0;
    return (used / total) * 100;
}
function getTokenStatusColor(remaining, total) {
    if (total === 0)
        return 'red';
    const percentage = (remaining / total) * 100;
    if (percentage > 50)
        return 'green';
    if (percentage > 25)
        return 'yellow';
    return 'red';
}
//# sourceMappingURL=tokenService.js.map