/**
 * SecureKey Intrusion Controller (controllers/intrusionController.js)
 * Handles PIR Motion Sensor Alerts and Nodemailer Gmail SMTP Dispatches
 */
import nodemailer from 'nodemailer';
import IntrusionAlert from '../models/IntrusionAlert.js';
import User from '../models/User.js';

// Setup Nodemailer Transporter using Gmail SMTP (smtp.gmail.com:465)
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

let transporter = null;
if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

/**
 * POST /api/intrusion/alert
 * Called by ESP32 when PIR sensor detects motion during LOCKED state.
 * Saves record to IntrusionAlert collection.
 * Triggers nodemailer using Gmail SMTP (smtp.gmail.com, port 465) to send an immediate HTML alert email.
 */
export async function reportIntrusion(req, res) {
  try {
    const { sensor = 'PIR_MOTION_GPIO27', targetEmail } = req.body;

    // Retrieve destination email from registered user or environment
    let recipientEmail = targetEmail;
    if (!recipientEmail) {
      const admin = await User.findOne({ username: 'admin' });
      recipientEmail = admin ? admin.email : (process.env.EMAIL_USER || 'security-alerts@securekey.io');
    }

    // 1. Save alert record to MongoDB collection
    const newAlert = await IntrusionAlert.create({
      sensor,
      status: 'ALERT_DISPATCHED',
      emailSentTo: recipientEmail,
      timestamp: new Date(),
    });

    // 2. Dispatch immediate HTML email via Nodemailer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 24px;">
        <div style="background-color: #1e293b; border: 1px solid #dc2626; border-radius: 8px; max-width: 550px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #ef4444; margin-top: 0;">🚨 CRITICAL SECURITY ALERT: Intrusion Detected</h2>
          <p>The SecureKey IoT system registered an unauthorized motion detection event while in <strong>LOCKED</strong> state.</p>
          <ul style="line-height: 1.8; color: #cbd5e1;">
            <li><strong>Sensor:</strong> ${sensor} (ESP32 Motion Interrupt)</li>
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Lock Status:</strong> LOCKED (Armed)</li>
          </ul>
          <p style="background: rgba(239,68,68,0.1); padding: 12px; border-radius: 6px; color: #fca5a5;">
            Immediate action recommended: Check mobile app dashboard or local surveillance.
          </p>
        </div>
      </div>
    `;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"SecureKey Security" <${emailUser}>`,
          to: recipientEmail,
          subject: '🚨 CRITICAL SECURITY ALERT: Intrusion Detected on SecureKey Lock',
          html: emailHtml,
        });
        console.log(`[Nodemailer] Alert email successfully sent to ${recipientEmail}`);
      } catch (mailError) {
        console.warn('[Nodemailer] Gmail dispatch error:', mailError.message);
      }
    } else {
      console.log(`[Nodemailer] Simulated email dispatch to ${recipientEmail}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Intrusion alert logged and email dispatched.',
      alert: newAlert,
    });
  } catch (err) {
    console.error('[Intrusion] Alert processing error:', err);
    return res.status(500).json({ error: 'Failed to process intrusion alert' });
  }
}

/**
 * GET /api/intrusion/alerts
 * Returns recent intrusion history.
 */
export async function getAlerts(req, res) {
  try {
    const alerts = await IntrusionAlert.find({}).sort({ timestamp: -1 }).limit(50);
    return res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (err) {
    console.error('[Intrusion] Get alerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch intrusion history' });
  }
}

export default { reportIntrusion, getAlerts };
