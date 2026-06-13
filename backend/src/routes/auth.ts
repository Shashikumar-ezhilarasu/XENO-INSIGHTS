/**
 * @file auth.ts
 * @module routes/auth
 * @description
 * Authentication routes for tenant brand accounts.
 *
 * ENDPOINTS:
 * POST /api/auth/register   — Create brand account + seed default preferences + seed 4 demo team members
 * POST /api/auth/login      — Validate credentials, return JWT
 * GET  /api/auth/me         — Return current tenant profile from JWT
 * POST /api/auth/logout     — Client-side token invalidation (stateless)
 * PUT  /api/auth/onboarding — Save brand category + initial preferences after onboarding step
 *
 * SECURITY:
 * Passwords hashed with bcrypt (12 rounds).
 * JWT signed with JWT_SECRET env var, expires in 7 days.
 * All protected routes use authenticateTenant middleware (see middleware/auth.ts).
 *
 * SEEDED ON REGISTER:
 * - TenantPreferences row with category-appropriate defaults
 * - NotificationSettings row with all notifications enabled
 * - 4 demo TeamMember rows (Sarah Chen/Admin, Michael/Editor, Aisha/Editor, David/Viewer)
 *   so Team Management page shows real data immediately
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prismaT } from '../config/prismaT';
import { CATEGORY_DEFAULTS } from '../config/categoryDefaults';
import { authenticateTenant } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xeno-dev-secret-change-in-prod';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, brandName, brandCategory } = req.body;

  if (!email || !password || !brandName || !brandCategory) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const existing = await prismaT.tenantAccount.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Account already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const defaults = CATEGORY_DEFAULTS[brandCategory] || CATEGORY_DEFAULTS.retail;

  const tenant = await prismaT.$transaction(async (tx) => {
    const account = await tx.tenantAccount.create({
      data: {
        email,
        passwordHash,
        brandName,
        brandCategory,
        accentColor: defaults.accentColor,
        language: 'en',
      },
    });

    // Seed preferences with category defaults
    await tx.tenantPreferences.create({
      data: {
        tenantId: account.id,
        brandVoice: defaults.brandVoice,
        defaultChannel: defaults.defaultChannel,
        productLabels: defaults.productLabels,
        kpiPrimaryLabel: defaults.kpiPrimaryLabel,
        kpiRevenueLabel: defaults.kpiRevenueLabel,
        kpiCustomerLabel: defaults.kpiCustomerLabel,
        defaultSpinPrizes: defaults.defaultSpinPrizes,
        primaryCampaignGoal: defaults.primaryCampaignGoal,
      },
    });

    // Seed notification settings
    await tx.notificationSettings.create({
      data: { tenantId: account.id },
    });

    // Seed 4 demo team members
    await tx.teamMember.createMany({
      data: [
        { tenantId: account.id, name: 'Sarah Chen', email: 'sarah.c@xenobrand.com', role: 'admin', lastActiveAt: new Date() },
        { tenantId: account.id, name: 'Michael Rodriguez', email: 'm.rodriguez@xenobrand.com', role: 'editor', lastActiveAt: new Date(Date.now() - 5 * 60000) },
        { tenantId: account.id, name: 'Aisha Patel', email: 'apatel@xenobrand.com', role: 'editor', lastActiveAt: new Date(Date.now() - 2 * 3600000) },
        { tenantId: account.id, name: 'David Kim', email: 'david.kim@xenobrand.com', role: 'viewer', lastActiveAt: new Date(Date.now() - 86400000) },
      ],
    });

    return account;
  });

  const token = jwt.sign({ tenantId: tenant.id, email: tenant.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, tenantId: tenant.id, brandCategory, brandName });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const tenant = await prismaT.tenantAccount.findUnique({
    where: { email },
    include: { preferences: true },
  });

  if (!tenant) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, tenant.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ tenantId: tenant.id, email: tenant.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    tenantId: tenant.id,
    brandName: tenant.brandName,
    brandCategory: tenant.brandCategory,
    accentColor: tenant.accentColor,
    language: tenant.language,
    planTier: tenant.planTier,
    campaignLimit: tenant.campaignLimit,
    aiCallLimit: tenant.aiCallLimit,
    aiCallsUsed: tenant.aiCallsUsed,
    campaignsCreated: tenant.campaignsCreated,
    onboardingDone: tenant.onboardingDone,
    preferences: tenant.preferences,
  });
});

// GET /api/auth/me
router.get('/me', authenticateTenant, async (req: any, res) => {
  const tenant = await prismaT.tenantAccount.findUnique({
    where: { id: req.tenantId },
    include: { preferences: true, notificationSettings: true },
  });
  if (!tenant) return res.status(404).json({ error: 'Account not found' });
  const { passwordHash, ...safe } = tenant;
  res.json(safe);
});

// PUT /api/auth/onboarding
router.put('/onboarding', authenticateTenant, async (req: any, res) => {
  const { brandCategory, brandName, language, timezone } = req.body;
  const defaults = CATEGORY_DEFAULTS[brandCategory] || CATEGORY_DEFAULTS.retail;

  await prismaT.$transaction(async (tx) => {
    await tx.tenantAccount.update({
      where: { id: req.tenantId },
      data: { brandCategory, brandName, language, timezone, onboardingDone: true, accentColor: defaults.accentColor },
    });
    await tx.tenantPreferences.update({
      where: { tenantId: req.tenantId },
      data: {
        brandVoice: defaults.brandVoice,
        defaultChannel: defaults.defaultChannel,
        productLabels: defaults.productLabels,
        kpiPrimaryLabel: defaults.kpiPrimaryLabel,
        kpiRevenueLabel: defaults.kpiRevenueLabel,
        kpiCustomerLabel: defaults.kpiCustomerLabel,
        defaultSpinPrizes: defaults.defaultSpinPrizes,
        primaryCampaignGoal: defaults.primaryCampaignGoal,
      },
    });
  });

  res.json({ success: true, brandCategory, defaults });
});

export { router as authRouter };
