import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient instance for the application to avoid
// circular imports and multiple connections in dev tooling.
export const prisma = new PrismaClient();

export default prisma;
