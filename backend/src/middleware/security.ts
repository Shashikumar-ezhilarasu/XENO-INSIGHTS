import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// UUID validation regex (matches standard UUID v4)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dynamic Rate Limiter for sensitive AI segment route.
 * Restricts to 5 prompt evaluations per minute (relaxed during testing).
 */
export const aiSegmentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  message: { error: 'Too many requests. Limit is 5 prompt evaluations per minute on this route.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // completely skip during tests
});

/**
 * Dynamic Rate Limiter for campaign execution sends.
 * Restricts to 10 sends per minute (relaxed during testing).
 */
export const campaignSendRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: { error: 'Too many requests. Limit is 10 campaign triggers per minute on this route.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // completely skip during tests
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

  const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED'];
  if (!validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  if (errorMsg !== undefined && errorMsg !== null && (typeof errorMsg !== 'string' || errorMsg.length > 1000)) {
    return res.status(400).json({ error: 'errorMsg must be a string and cannot exceed 1000 characters.' });
  }

  next();
}
