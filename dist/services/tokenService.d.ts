export declare function getUserTokens(userId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    email: string;
    avatar: string | null;
    role: import(".prisma/client").$Enums.UserRole;
    institution: string | null;
    department: string | null;
    specialization: string[];
    orcidId: string | null;
    googleScholarId: string | null;
    linkedinUrl: string | null;
    isVerified: boolean;
    preferences: import("@prisma/client/runtime/library").JsonValue;
    memberSince: Date;
    lastActive: Date;
    tokensTotal: number;
    tokensUsedToday: number;
    tokenLastResetDate: Date;
    isPro: boolean;
}>;
export declare function canUserAnalyze(userId: string): Promise<{
    canAnalyze: boolean;
    reason?: string;
}>;
export declare function deductTokenForAnalysis(userId: string): Promise<{
    success: boolean;
    tokensRemaining: number;
    isPro: boolean;
    deducted?: undefined;
    dailyUsed?: undefined;
} | {
    success: boolean;
    tokensRemaining: number;
    isPro: boolean;
    deducted: string;
    dailyUsed?: undefined;
} | {
    success: boolean;
    tokensRemaining: number;
    dailyUsed: number;
    isPro: boolean;
    deducted: string;
}>;
export declare function grantTokens(userId: string, amount: number): Promise<{
    tokensTotal: number;
}>;
export declare function upgradeToPro(userId: string): Promise<{
    success: boolean;
    isPro: boolean;
}>;
export declare function downgradeFromPro(userId: string): Promise<{
    success: boolean;
    isPro: boolean;
}>;
export declare function initializeTokensForNewUser(userId: string): Promise<{
    tokensTotal: number;
    tokensUsedToday: number;
}>;
export declare function getTimeUntilDailyReset(): number;
export declare function getTokenPercentage(used: number, total: number): number;
export declare function getTokenStatusColor(remaining: number, total: number): string;
//# sourceMappingURL=tokenService.d.ts.map