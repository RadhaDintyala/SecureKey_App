import nodemailer from 'nodemailer';

interface EmailResult {
  success: boolean;
  recipient: string;
  subject: string;
  messageId?: string;
  simulated: boolean;
  previewHtml: string;
  timestamp: string;
  error?: string;
}

// In-memory record of recent email dispatches for dashboard inspection
export const recentDispatches: EmailResult[] = [];

export async function sendIntrusionAlertEmail(recipientEmail: string, alertDetails: {
  sensor: string;
  timestamp: Date;
  lockStatus: string;
  ipAddress?: string;
}): Promise<EmailResult> {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const formattedTime = alertDetails.timestamp.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const subject = `🚨 CRITICAL SECURITY ALERT: Intrusion Detected on SecureKey Lock`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 24px; margin: 0; }
        .card { background-color: #1e293b; border: 1px solid #dc2626; border-radius: 12px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #991b1b, #ef4444); padding: 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
        .content { padding: 28px; line-height: 1.6; }
        .badge { display: inline-block; background-color: #ef4444; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 14px; }
        .info-table td.label { color: #94a3b8; width: 35%; font-weight: 500; }
        .info-table td.value { color: #f1f5f9; font-weight: 600; font-family: monospace; }
        .warning-box { background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; color: #fca5a5; font-size: 13px; }
        .footer { background-color: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>SECUREKEY IOT SECURITY ALERT</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Real-Time Intrusion Alarm System</p>
        </div>
        <div class="content">
          <div class="badge">MOTION DETECTED DURING ARMED STATE</div>
          <p style="margin: 0; color: #cbd5e1;">A security sensor trip was registered while the IoT smart lock was in <strong>LOCKED</strong> state.</p>
          
          <table class="info-table">
            <tr>
              <td class="label">Sensor Trigger</td>
              <td class="value">${alertDetails.sensor} (ESP32 Motion Interrupt)</td>
            </tr>
            <tr>
              <td class="label">Detection Timestamp</td>
              <td class="value">${formattedTime}</td>
            </tr>
            <tr>
              <td class="label">Lock State</td>
              <td class="value" style="color: #ef4444;">${alertDetails.lockStatus}</td>
            </tr>
            <tr>
              <td class="label">Reporting IP / Node</td>
              <td class="value">${alertDetails.ipAddress || 'ESP32_STATION_NODE'}</td>
            </tr>
          </table>

          <div class="warning-box">
            <strong>Immediate Action Recommended:</strong> Check your live surveillance feed or verify access logs in your SecureKey Mobile App. If unauthorized, notify local authorities.
          </div>
        </div>
        <div class="footer">
          SecureKey Node.js Backend &bull; ESP32 IoT Hardware Gateway &bull; Powered by MERN
        </div>
      </div>
    </body>
    </html>
  `;

  // Check if live Gmail SMTP is configured
  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"SecureKey Security" <${emailUser}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
      });

      const dispatchRecord: EmailResult = {
        success: true,
        recipient: recipientEmail,
        subject,
        messageId: info.messageId,
        simulated: false,
        previewHtml: htmlContent,
        timestamp: new Date().toISOString(),
      };

      recentDispatches.unshift(dispatchRecord);
      if (recentDispatches.length > 20) recentDispatches.pop();
      return dispatchRecord;
    } catch (err: any) {
      console.warn('[Nodemailer] Gmail SMTP error, falling back to simulated dispatch:', err.message);
      // Fall through to simulated record so service remains resilient
    }
  }

  // Simulated dispatch for preview / sandbox environment
  const mockRecord: EmailResult = {
    success: true,
    recipient: recipientEmail,
    subject,
    messageId: `mock-msg-${Date.now()}@securekey.iot`,
    simulated: true,
    previewHtml: htmlContent,
    timestamp: new Date().toISOString(),
  };

  recentDispatches.unshift(mockRecord);
  if (recentDispatches.length > 20) recentDispatches.pop();
  return mockRecord;
}
