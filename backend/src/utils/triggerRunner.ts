import prisma from '../config/prisma';

/**
 * Runs trigger condition evaluations across the database.
 * If customers match the criteria and have not previously received the campaign,
 * it calls the internal dispatch sequence.
 */
export async function checkAndRunTriggers(): Promise<{ success: boolean; triggeredCount: number; detailList: string[] }> {
  const detailList: string[] = [];
  let triggeredCount = 0;

  try {
    // 1. Fetch all active trigger configurations
    const activeTriggers = await prisma.trigger.findMany({
      where: { isActive: true },
      include: { campaign: true }
    });

    if (activeTriggers.length === 0) {
      return { success: true, triggeredCount: 0, detailList: ['No active triggers found in database.'] };
    }

    for (const trigger of activeTriggers) {
      const campaign = trigger.campaign;
      if (!campaign) {
        detailList.push(`Trigger "${trigger.name}" bypassed: campaign relation missing.`);
        continue;
      }

      // 2. Evaluate criteria: LAST_VISIT_30_DAYS
      if (trigger.type === 'LAST_VISIT_30_DAYS') {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - 30); // 30 days ago limit

        // Find customers whose last visit was >= 30 days ago
        const candidates = await prisma.customer.findMany({
          where: {
            lastVisitDate: {
              lte: thresholdDate
            }
          },
          include: {
            communications: {
              where: {
                campaignId: campaign.id
              }
            }
          }
        });

        // Exclude customers who have already received this campaign (deduplication)
        const targets = candidates.filter(c => c.communications.length === 0);

        if (targets.length === 0) {
          detailList.push(`Trigger "${trigger.name}" evaluated: 0 new matching customers found.`);
          continue;
        }

        console.log(`[Trigger Runner] Trigger "${trigger.name}" fired! Queueing campaign "${campaign.name}" for ${targets.length} customers.`);
        
        // 3. Dispatch campaign send request
        // Since we already have the sending logic, we can trigger the send directly:
        // We make a fetch or call the internal send sequence.
        // Calling the API endpoint or fetching locally is extremely easy,
        // but since we want to trigger the existing send campaign pipeline in campaigns.ts,
        // we can simply call a POST request locally to /api/campaigns/send.
        // Even simpler: call the database inserts and background fetches directly!
        const port = process.env.PORT || 3000;
        const sendUrl = `http://localhost:${port}/api/campaigns/send`;

        try {
          const response = await fetch(sendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: campaign.id,
              customerIds: targets.map(t => t.id)
            })
          });

          if (response.ok) {
            triggeredCount += targets.length;
            detailList.push(`Trigger "${trigger.name}" fired successfully for ${targets.length} target shoppers.`);
          } else {
            const errBody = await response.json();
            detailList.push(`Trigger "${trigger.name}" failed to send: ${errBody.error || response.statusText}`);
          }
        } catch (dispatchErr: any) {
          detailList.push(`Trigger "${trigger.name}" request dispatch error: ${dispatchErr.message}`);
        }
      } else {
        detailList.push(`Trigger "${trigger.name}" bypassed: unsupported trigger type "${trigger.type}".`);
      }
    }

    return {
      success: true,
      triggeredCount,
      detailList
    };

  } catch (error: any) {
    console.error('[Trigger Runner] Error executing trigger checks:', error);
    return {
      success: false,
      triggeredCount: 0,
      detailList: [`Trigger checks execution failed: ${error.message}`]
    };
  }
}
