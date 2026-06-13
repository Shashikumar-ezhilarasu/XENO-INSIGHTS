/**
 * @file tenant.ts
 * @module routes/tenant
 * @description
 * Tenant account management endpoints. All routes protected by authenticateTenant.
 *
 * ENDPOINTS:
 * GET    /api/tenant/profile          — Full profile + preferences + limits
 * PUT    /api/tenant/profile          — Update brandName, language, timezone, currency, logoUrl
 * PUT    /api/tenant/preferences      — Update any preference field
 * PUT    /api/tenant/notifications    — Update notification settings
 * GET    /api/tenant/limits           — Campaign count, AI call count vs limits
 * POST   /api/tenant/ai-log          — Log an AI call (called from frontend trackedAiFetch)
 * GET    /api/tenant/ai-logs         — Paginated AI usage history (for AI Marketplace logs tab)
 * GET    /api/tenant/team            — List all team members
 * POST   /api/tenant/team            — Invite new team member
 * PUT    /api/tenant/team/:id        — Update role or name
 * DELETE /api/tenant/team/:id        — Remove team member
 */

import { Router } from 'express';
import { prismaT } from '../config/prismaT';
import { authenticateTenant } from '../middleware/auth';

const router = Router();
router.use(authenticateTenant);

// GET /api/tenant/profile
router.get('/profile', async (req: any, res) => {
  const tenant = await prismaT.tenantAccount.findUnique({
    where: { id: req.tenantId },
    include: { preferences: true, notificationSettings: true },
  });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const { passwordHash, ...safe } = tenant;
  res.json({ data: safe });
});

// PUT /api/tenant/profile
router.put('/profile', async (req: any, res) => {
  const { brandName, language, timezone, currency, logoUrl } = req.body;
  try {
    const updated = await prismaT.tenantAccount.update({
      where: { id: req.tenantId },
      data: { brandName, language, timezone, currency, logoUrl },
    });
    const { passwordHash, ...safe } = updated;
    res.json({ data: safe });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/tenant/preferences
router.put('/preferences', async (req: any, res) => {
  try {
    const updated = await prismaT.tenantPreferences.update({
      where: { tenantId: req.tenantId },
      data: req.body,
    });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// PUT /api/tenant/notifications
router.put('/notifications', async (req: any, res) => {
  try {
    const updated = await prismaT.notificationSettings.update({
      where: { tenantId: req.tenantId },
      data: req.body,
    });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// GET /api/tenant/limits
router.get('/limits', async (req: any, res) => {
  const tenant = await prismaT.tenantAccount.findUnique({
    where: { id: req.tenantId },
    select: { campaignLimit: true, campaignsCreated: true, aiCallLimit: true, aiCallsUsed: true },
  });
  res.json({ data: tenant });
});

// POST /api/tenant/ai-log
router.post('/ai-log', async (req: any, res) => {
  const tenant = await prismaT.tenantAccount.findUnique({ where: { id: req.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  if (tenant.aiCallsUsed >= tenant.aiCallLimit) {
    return res.status(429).json({ error: 'AI call limit reached', limit: tenant.aiCallLimit, used: tenant.aiCallsUsed });
  }

  const { endpoint, promptExcerpt, tokensIn, tokensOut, totalTokens, latencyMs, status } = req.body;

  try {
    const [log] = await prismaT.$transaction([
      prismaT.aiUsageLog.create({
        data: {
          tenantId: req.tenantId,
          endpoint,
          promptExcerpt,
          tokensIn,
          tokensOut,
          totalTokens,
          latencyMs,
          status,
        },
      }),
      prismaT.tenantAccount.update({
        where: { id: req.tenantId },
        data: { aiCallsUsed: { increment: 1 } },
      }),
    ]);
    res.json({ data: log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log AI usage' });
  }
});

// GET /api/tenant/ai-logs
router.get('/ai-logs', async (req: any, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const logs = await prismaT.aiUsageLog.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI logs' });
  }
});

// GET /api/tenant/team
router.get('/team', async (req: any, res) => {
  try {
    const team = await prismaT.teamMember.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { invitedAt: 'desc' },
    });
    res.json({ data: team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// POST /api/tenant/team
router.post('/team', async (req: any, res) => {
  const { name, email, role } = req.body;
  try {
    const member = await prismaT.teamMember.create({
      data: { tenantId: req.tenantId, name, email, role },
    });
    res.json({ data: member });
  } catch (error) {
    res.status(409).json({ error: 'Member already exists or validation failed' });
  }
});

// PUT /api/tenant/team/:id
router.put('/team/:id', async (req: any, res) => {
  const { name, role } = req.body;
  try {
    const member = await prismaT.teamMember.update({
      where: { id: req.params.id, tenantId: req.tenantId },
      data: { name, role },
    });
    res.json({ data: member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/tenant/team/:id
router.delete('/team/:id', async (req: any, res) => {
  try {
    await prismaT.teamMember.delete({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

export { router as tenantRouter };
