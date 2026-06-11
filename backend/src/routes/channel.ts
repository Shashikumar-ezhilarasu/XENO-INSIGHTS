import { Router, Request, Response } from 'express';

const router = Router();

// Internal route for dispatching messages
router.post('/send', (req: Request, res: Response) => {
  const { communicationId, recipient, message, channel } = req.body;

  if (!communicationId || !recipient) {
    return res.status(400).json({ error: 'communicationId and recipient are required' });
  }

  // Acknowledge receipt
  res.json({ success: true, message: 'Message accepted for delivery' });

  // Determine the backend URL dynamically (defaulting to localhost if not set)
  // In production, you'd set process.env.BACKEND_URL to your Render/Vercel backend domain
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const webhookUrl = `${backendUrl}/api/webhooks/receipt`;

  // Asynchronous Simulation Logic
  const states = ['SENT', 'DELIVERED', 'OPENED', 'READ']; // Adding READ to simulation
  
  let delay = 0;
  
  states.forEach((status, index) => {
    // Add random 2 to 8 second delay between each state transition
    delay += Math.floor(Math.random() * 6000) + 2000;
    
    setTimeout(() => {
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer webhook_secret_123'
        },
        body: JSON.stringify({
          communicationId,
          status,
          timestamp: new Date().toISOString()
        })
      }).catch(err => {
        console.error(`[Channel Simulation] Failed to ping webhook ${webhookUrl}:`, err.message);
      });
    }, delay);
  });
});

export default router;
