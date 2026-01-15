import { Request, Response } from 'express';

export const requestLogger = (req: Request, res: Response, next: Function) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
  });

  next();
};
