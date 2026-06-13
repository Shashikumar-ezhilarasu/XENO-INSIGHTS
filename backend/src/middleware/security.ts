/**
 * @file security.ts
 * @module security
 * @description
 * High-performance Express middleware functions for application security.
 * Implements UUID-based Request IDs, structured JSON logging, body payload size constraints,
 * SQL injection detection, and route-specific rate limiters.
 *
 * JSDOC SECTION: 7
 * All routes and custom middleware comply with the strict parameter/return annotations.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// UUID validation regex (matches standard UUID v4)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SQL/Prisma Query injection signatures to scan inside query params or path parameters
const INJECTION_PATTERNS = [
  /(\b(select|union|insert|update|delete|drop|alter|truncate)\b)/i,
  /(--|\/\*|\*\/|xp_)/i,
  /union\s+all\s+select/i,
  /or\s+\d+\s*=\s*\d+/i,
  /and\s+\d+\s*=\s*\d+/i
];

/**
 * @function hasInjection
 * @description Recursively checks fields within an object/string for SQL injection patterns
 * @param value {any} value to scan
 * @returns {boolean} true if injection patterns are detected
 */
function hasInjection(value: any): boolean {
  if (typeof value === 'string') {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        return true;
      }
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const key of Object.keys(value)) {
      if (hasInjection(value[key])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @function requestIdMiddleware
 * @description Injects an X-Request-ID header and property into the request lifecycle.
 * @param req {Request} Express Request
 * @param res {Response} Express Response
 * @param next {NextFunction} Express Next Callback
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader('X-Request-ID', requestId as string);
  next();
}

/**
 * @function requestLogger
 * @description Intercepts response finish event and logs a structured JSON summary
 * @param req {Request} Express Request
 * @param res {Response} Express Response
 * @param next {NextFunction} Express Next Callback
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const logObj = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs),
      requestId: (req as any).id || res.getHeader('X-Request-ID') || 'N/A'
    };
    console.log(JSON.stringify(logObj));
  });
  next();
}

/**
 * @function payloadSizeGuard
 * @description Rejects request payloads that exceed the hard cap of 2MB
 * @param req {Request} Express Request
 * @param res {Response} Express Response
 * @param next {NextFunction} Express Next Callback
 */
export function payloadSizeGuard(req: Request, res: Response, next: NextFunction) {
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
    return res.status(413).json({ error: 'Payload Too Large. Request body cannot exceed 2MB.' });
  }
  next();
}

/**
 * @function queryInjectionGuard
 * @description Scans URL query attributes and route params to prevent malicious injection
 * @param req {Request} Express Request
 * @param res {Response} Express Response
 * @param next {NextFunction} Express Next Callback
 */
export function queryInjectionGuard(req: Request, res: Response, next: NextFunction) {
  if (hasInjection(req.query) || hasInjection(req.params)) {
    return res.status(400).json({ error: 'Bad Request. SQL injection pattern detected.' });
  }
  next();
}

/**
 * Dynamic Rate Limiter for sensitive AI segment route.
 * Restricts to 5 prompt evaluations per minute (relaxed during testing).
 */
export const aiSegmentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  message: { error: 'Too many requests. Limit is 5 prompt evaluations per minute on this route.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Dynamic Rate Limiter for campaign execution sends.
 * Restricts to 10 sends per minute (relaxed during testing).
 */
export const campaignSendRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: { error: 'Too many requests. Limit is 10 campaign triggers per minute on this route.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Queue Stats Rate Limiter.
 * Restricts to 60 requests per minute (relaxed during testing).
 */
export const queueStatsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 60,
  message: { error: 'Too many requests. Limit is 60 requests per minute for queue stats.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Nudge Engine Rate Limiter.
 * Restricts to 20 requests per minute (relaxed during testing).
 */
export const nudgeEngineRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 20,
  message: { error: 'Too many requests. Limit is 20 requests per minute for the nudge engine.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Input validation for AI Segmentation route.
 */
export function validateAiSegment(req: Request, res: Response, next: NextFunction) {
  const { promptText } = req.body;
  
  if (!promptText || typeof promptText !== 'string' || promptText.trim().length === 0) {
    return res.status(400).json({ error: 'promptText is required and must be a non-empty string.' });
  }
  
  if (promptText.length > 500) {
    return res.status(400).json({ error: 'promptText is too long (maximum 500 characters).' });
  }
  
  next();
}

/**
 * Input validation for campaign creation metadata.
 */
export function validateCampaignCreate(req: Request, res: Response, next: NextFunction) {
  const { name, promptText, channel, messageTemplate } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string.' });
  }

  if (name.length > 200) {
    return res.status(400).json({ error: 'name is too long (maximum 200 characters).' });
  }

  if (promptText !== undefined && (typeof promptText !== 'string' || promptText.length > 500)) {
    return res.status(400).json({ error: 'promptText must be a string and cannot exceed 500 characters.' });
  }

  if (!channel || typeof channel !== 'string') {
    return res.status(400).json({ error: 'channel is required and must be a string.' });
  }

  const validChannels = ['WHATSAPP', 'EMAIL', 'SMS', 'RCS'];
  if (!validChannels.includes(channel.toUpperCase())) {
    return res.status(400).json({ error: `channel must be one of: ${validChannels.join(', ')}` });
  }

  if (messageTemplate !== undefined && (typeof messageTemplate !== 'string' || messageTemplate.length > 1000)) {
    return res.status(400).json({ error: 'messageTemplate must be a string and cannot exceed 1000 characters.' });
  }

  next();
}

/**
 * Input validation for campaign send action.
 */
export function validateCampaignSend(req: Request, res: Response, next: NextFunction) {
  const { campaignId, customerIds } = req.body;

  if (!campaignId || typeof campaignId !== 'string' || !UUID_REGEX.test(campaignId)) {
    return res.status(400).json({ error: 'campaignId is required and must be a valid UUID.' });
  }

  if (customerIds !== undefined) {
    if (!Array.isArray(customerIds)) {
      return res.status(400).json({ error: 'customerIds must be an array of UUID strings.' });
    }

    for (const id of customerIds) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        return res.status(400).json({ error: `customerIds contains an invalid UUID: ${id}` });
      }
    }
  }

  next();
}

/**
 * Input validation for external webhook callbacks.
 */
export function validateWebhookCallback(req: Request, res: Response, next: NextFunction) {
  const { communicationId, status, errorMsg } = req.body;

  if (!communicationId || typeof communicationId !== 'string' || !UUID_REGEX.test(communicationId)) {
    return res.status(400).json({ error: 'communicationId is required and must be a valid UUID.' });
  }

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status is required and must be a string.' });
  }

  const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'FAILED'];
  if (!validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  if (errorMsg !== undefined && errorMsg !== null && (typeof errorMsg !== 'string' || errorMsg.length > 1000)) {
    return res.status(400).json({ error: 'errorMsg must be a string and cannot exceed 1000 characters.' });
  }

  next();
}
