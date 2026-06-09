import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { checkAndRunTriggers } from '../utils/triggerRunner';

const router = Router();

/**
 * POST /api/triggers/create
 * Creates a new trigger rule.
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, type, campaignId, isActive } = req.body;

    if (!name || !type || !campaignId) {
      return res.status(400).json({ error: 'name, type, and campaignId are required.' });
    }

    if (type !== 'LAST_VISIT_30_DAYS') {
      return res.status(400).json({ error: 'Unsupported trigger type. Currently only LAST_VISIT_30_DAYS is supported.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const trigger = await prisma.trigger.create({
      data: {
        name,
        type,
        campaignId,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    return res.status(201).json({ success: true, trigger });
  } catch (error: any) {
    console.error('Error creating trigger:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/triggers/list
 * Lists configured triggers.
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const triggers = await prisma.trigger.findMany({
      include: {
        campaign: {
          select: { name: true, channel: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, triggers });
  } catch (error: any) {
    console.error('Error listing triggers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/triggers/check
 * Manually force evaluations of trigger rules and send campaigns to matching shoppers.
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    console.log('[Manual Trigger Check] Evaluation requested by API client.');
    const result = await checkAndRunTriggers();
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Triggers evaluation completed successfully.',
        triggeredCount: result.triggeredCount,
        details: result.detailList
      });
    } else {
      return res.status(500).json({
        error: 'Triggers evaluation failed.',
        details: result.detailList
      });
    }
  } catch (error: any) {
    console.error('Error running manual trigger check:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

export default router;
