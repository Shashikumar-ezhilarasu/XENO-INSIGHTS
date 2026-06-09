import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

/**
 * GET /api/customers
 * List customers with pagination.
 * Query Parameters:
 *  - page: number (default: 1)
 *  - limit: number (default: 10)
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      }),
      prisma.customer.count()
    ]);

    return res.json({
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/analytics
 * Calculate dynamic delivery, open, and fail rates across all campaigns.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    // Fetch all campaigns
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Group communications by campaignId and status to count them
    const statusGroups = await prisma.communication.groupBy({
      by: ['campaignId', 'status'],
      _count: {
        id: true
      }
    });

    // Structure grouped results: campaignId -> status -> count
    const countMap: Record<string, Record<string, number>> = {};
    for (const group of statusGroups) {
      if (!countMap[group.campaignId]) {
        countMap[group.campaignId] = {
          PENDING: 0,
          SENT: 0,
          DELIVERED: 0,
          OPENED: 0,
          FAILED: 0
        };
      }
      countMap[group.campaignId][group.status] = group._count.id;
    }

    // Build the analytics report
    const analytics = campaigns.map((campaign) => {
      const counts = countMap[campaign.id] || {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        OPENED: 0,
        FAILED: 0
      };

      const pending = counts.PENDING || 0;
      const sent = counts.SENT || 0;
      const delivered = counts.DELIVERED || 0;
      const opened = counts.OPENED || 0;
      const failed = counts.FAILED || 0;

      const totalMessages = pending + sent + delivered + opened + failed;

      // Delivery Rate: Delivered and Opened count towards successfully delivered messages
      const deliveredTotal = delivered + opened;
      const deliveryRate = totalMessages > 0 
        ? Math.round((deliveredTotal / totalMessages) * 10000) / 100 
        : 0;

      // Open Rate: Opened messages out of the total messages sent
      const openRate = totalMessages > 0 
        ? Math.round((opened / totalMessages) * 10000) / 100 
        : 0;

      // Fail Rate: Failed messages out of the total messages sent
      const failRate = totalMessages > 0 
        ? Math.round((failed / totalMessages) * 10000) / 100 
        : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        channel: campaign.channel,
        promptText: campaign.promptText,
        messageTemplate: campaign.messageTemplate,
        createdAt: campaign.createdAt,
        totalMessages,
        statusCounts: {
          pending,
          sent,
          delivered,
          opened,
          failed
        },
        rates: {
          deliveryRatePercent: deliveryRate,
          openRatePercent: openRate,
          failRatePercent: failRate
        }
      };
    });

    return res.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
