"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const tokenService_1 = require("../services/tokenService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/tokens', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User ID not found in token', 400);
    }
    const tokenStatus = await (0, tokenService_1.getUserTokens)(userId);
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
router.get('/can-analyze', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User ID not found in token', 400);
    }
    const result = await (0, tokenService_1.canUserAnalyze)(userId);
    res.json({
        success: true,
        data: result,
    });
}));
router.post('/grant-tokens', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { amount } = req.body;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User ID not found in token', 400);
    }
    if (!amount || amount < 1) {
        throw (0, errorHandler_1.createError)('Amount must be at least 1', 400);
    }
    const result = await (0, tokenService_1.grantTokens)(userId, amount);
    res.json({
        success: true,
        message: `Granted ${amount} tokens`,
        data: result,
    });
}));
router.post('/upgrade-pro', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User ID not found in token', 400);
    }
    const result = await (0, tokenService_1.upgradeToPro)(userId);
    res.json({
        success: true,
        message: 'Upgraded to Pro',
        data: result,
    });
}));
exports.default = router;
//# sourceMappingURL=user.js.map