/**
 * @file auth.ts
 * @module middleware/auth
 * @description
 * JWT authentication middleware for tenant-protected routes.
 * Reads Bearer token from Authorization header, verifies with JWT_SECRET,
 * attaches req.tenantId and req.tenantEmail to the request object.
 *
 * USAGE: router.get('/protected', authenticateTenant, handler)
 * BYPASS: Routes without this middleware are public (auth endpoints, health checks)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'xeno-dev-secret-change-in-prod';

export function authenticateTenant(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { tenantId: string; email: string };
    req.tenantId = decoded.tenantId;
    req.tenantEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
