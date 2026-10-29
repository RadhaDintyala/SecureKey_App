import { Request, Response } from 'express';
import { addIntrusionAlert, getIntrusionAlerts, findUserByUsername } from '../db.ts';
import { sendIntrusionAlertEmail, recentDispatches } from '../services/emailService.ts';
import { getLockState } from '../lockState.ts';

export async function reportIntrusion(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ESP32_PIR_NODE';
  try {
    const { sensor = 'PIR_MOTION_GPIO27', deviceId, targetEmail } = req.body;
    const lockStatus = getLockState().status;

    // Determine recipient email (targetEmail parameter, or registered admin, or env EMAIL_USER)
    let recipientEmail = targetEmail;
    if (!recipientEmail) {
      const admin = await findUserByUsername('admin');
      recipientEmail = admin?.email || process.env.EMAIL_USER || 'dintyalaradhakalyani@gmail.com';
    }

    // Save alert to database
    const alertRecord = await addIntrusionAlert({
      sensor: sensor || 'PIR_MOTION_GPIO27',
      status: 'ALERT_DISPATCHED',
      emailSentTo: recipientEmail,
      notes: `Intrusion tripped while lock state was ${lockStatus}. Node: ${deviceId || 'ESP32'}`,
    });

    // Send immediate HTML email dispatch via Nodemailer
    const emailResult = await sendIntrusionAlertEmail(recipientEmail, {
      sensor: sensor || 'PIR_MOTION_GPIO27',
      timestamp: new Date(),
      lockStatus,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Intrusion alert recorded and email notification dispatched',
      alert: alertRecord,
      emailDelivery: {
        recipient: recipientEmail,
        status: emailResult.success ? 'DISPATCHED' : 'FAILED',
        simulated: emailResult.simulated,
        messageId: emailResult.messageId,
      },
    });
  } catch (err: any) {
    console.error('[IntrusionController] Report intrusion error:', err);
    res.status(500).json({ error: 'Failed to process intrusion alert' });
  }
}

export async function getAlertHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await getIntrusionAlerts(limit);
    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (err: any) {
    console.error('[IntrusionController] Get alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch intrusion history' });
  }
}

export function getDispatchedEmails(_req: Request, res: Response): void {
  res.json({
    success: true,
    count: recentDispatches.length,
    dispatches: recentDispatches,
  });
}
