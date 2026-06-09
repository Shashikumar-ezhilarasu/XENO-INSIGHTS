import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

/**
 * GET /api/customers
 * List customers with pagination.
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
 * Calculate dynamic delivery, open, click, and fail rates across all campaigns.
 * Evaluates A/B testing splits.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Group communications by campaignId, variant, and status
    const statusGroups = await prisma.communication.groupBy({
      by: ['campaignId', 'variant', 'status'],
      _count: {
        id: true
      }
    });

    // Construct map: campaignId -> variant -> status -> count
    const countMap: Record<string, Record<string, Record<string, number>>> = {};
    for (const group of statusGroups) {
      const cId = group.campaignId;
      const variant = group.variant || 'A';
      const status = group.status;
      const count = group._count.id;

      if (!countMap[cId]) {
        countMap[cId] = {};
      }
      if (!countMap[cId][variant]) {
        countMap[cId][variant] = {
          PENDING: 0,
          SENT: 0,
          DELIVERED: 0,
          OPENED: 0,
          CLICKED: 0,
          FAILED: 0
        };
      }
      countMap[cId][variant][status] = count;
    }

    const analytics = campaigns.map((campaign) => {
      const getVariantStats = (v: string) => {
        const counts = countMap[campaign.id]?.[v] || {
          PENDING: 0,
          SENT: 0,
          DELIVERED: 0,
          OPENED: 0,
          CLICKED: 0,
          FAILED: 0
        };

        const pending = counts.PENDING || 0;
        const sent = counts.SENT || 0;
        const delivered = counts.DELIVERED || 0;
        const opened = counts.OPENED || 0;
        const clicked = counts.CLICKED || 0;
        const failed = counts.FAILED || 0;

        const totalMessages = pending + sent + delivered + opened + clicked + failed;
        const deliveredTotal = delivered + opened + clicked;
        const openedTotal = opened + clicked;

        const deliveryRate = totalMessages > 0 
          ? Math.round((deliveredTotal / totalMessages) * 10000) / 100 
          : 0;

        const openRate = totalMessages > 0 
          ? Math.round((openedTotal / totalMessages) * 10000) / 100 
          : 0;

        const clickRate = totalMessages > 0 
          ? Math.round((clicked / totalMessages) * 10000) / 100 
          : 0;

        const failRate = totalMessages > 0 
          ? Math.round((failed / totalMessages) * 10000) / 100 
          : 0;

        return {
          totalMessages,
          statusCounts: { pending, sent, delivered, opened, clicked, failed },
          rates: {
            deliveryRatePercent: deliveryRate,
            openRatePercent: openRate,
            clickRatePercent: clickRate,
            failRatePercent: failRate
          }
        };
      };

      const statsA = getVariantStats('A');
      const statsB = getVariantStats('B');

      const totalMessages = statsA.totalMessages + statsB.totalMessages;
      const pending = statsA.statusCounts.pending + statsB.statusCounts.pending;
      const sent = statsA.statusCounts.sent + statsB.statusCounts.sent;
      const delivered = statsA.statusCounts.delivered + statsB.statusCounts.delivered;
      const opened = statsA.statusCounts.opened + statsB.statusCounts.opened;
      const clicked = statsA.statusCounts.clicked + statsB.statusCounts.clicked;
      const failed = statsA.statusCounts.failed + statsB.statusCounts.failed;

      const totalDelivered = delivered + opened + clicked;
      const totalOpened = opened + clicked;

      const deliveryRate = totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 10000) / 100 : 0;
      const openRate = totalMessages > 0 ? Math.round((totalOpened / totalMessages) * 10000) / 100 : 0;
      const clickRate = totalMessages > 0 ? Math.round((clicked / totalMessages) * 10000) / 100 : 0;
      const failRate = totalMessages > 0 ? Math.round((failed / totalMessages) * 10000) / 100 : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        channel: campaign.channel,
        promptText: campaign.promptText,
        messageTemplate: campaign.messageTemplate,
        messageTemplateB: campaign.messageTemplateB || null,
        imageUrl: campaign.imageUrl || null,
        buttons: campaign.buttons || null,
        createdAt: campaign.createdAt,
        totalMessages,
        statusCounts: { pending, sent, delivered, opened, clicked, failed },
        rates: {
          deliveryRatePercent: deliveryRate,
          openRatePercent: openRate,
          clickRatePercent: clickRate,
          failRatePercent: failRate
        },
        variants: {
          A: statsA,
          B: statsB
        }
      };
    });

    return res.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/customers/rfm
 * Group all customer profiles dynamically into RFM tiles for UI display.
 */
router.get('/customers/rfm', async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpends: 'desc' }
    });

    const now = new Date();
    const limit30 = new Date();
    limit30.setDate(limit30.getDate() - 30);
    const limit60 = new Date();
    limit60.setDate(limit60.getDate() - 60);

    const champions: any[] = [];
    const atRisk: any[] = [];
    const hibernating: any[] = [];
    const needsAttention: any[] = [];

    customers.forEach((c) => {
      const spend = c.totalSpends;
      const visit = c.lastVisitDate;

      // Grouping logic based on recency (visit) and monetary spends (spend)
      if (spend > 100 && visit && visit >= limit30) {
        champions.push(c);
      } else if (spend > 100 && (!visit || visit < limit60)) {
        atRisk.push(c);
      } else if (spend <= 100 && (!visit || visit < limit60)) {
        hibernating.push(c);
      } else {
        needsAttention.push(c);
      }
    });

    return res.json({
      champions: {
        count: champions.length,
        customers: champions.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, totalSpends: c.totalSpends }))
      },
      atRisk: {
        count: atRisk.length,
        customers: atRisk.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, totalSpends: c.totalSpends }))
      },
      hibernating: {
        count: hibernating.length,
        customers: hibernating.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, totalSpends: c.totalSpends }))
      },
      needsAttention: {
        count: needsAttention.length,
        customers: needsAttention.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, totalSpends: c.totalSpends }))
      }
    });
  } catch (error: any) {
    console.error('Error grouping RFM clusters:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
