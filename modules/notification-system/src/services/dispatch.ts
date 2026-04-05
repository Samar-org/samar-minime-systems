import nodemailer from 'nodemailer';

/**
 * Result type for dispatch operations
 */
export interface DispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Notification object structure
 */
export interface Notification {
  recipientEmail?: string;
  recipientId?: string;
  subject?: string;
  title?: string;
  message: string;
  body?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Email Dispatcher - sends notifications via SMTP
 */
export class EmailDispatcher {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || 'noreply@samar-minime.com';

      if (!host || !user || !pass) {
        console.warn('SMTP configuration incomplete. Email dispatcher will return success without sending.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async dispatch(notification: Notification): Promise<DispatchResult> {
    try {
      if (!notification.recipientEmail) {
        return { success: false, error: 'Recipient email is required' };
      }

      if (!this.transporter) {
        console.warn('SMTP not configured. Skipping email dispatch.');
        return { success: true, messageId: 'mock-' + Date.now() };
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@samar-minime.com',
        to: notification.recipientEmail,
        subject: notification.subject || notification.title || 'Notification',
        html: this.buildEmailHtml(notification),
        text: notification.body || notification.message,
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || info.response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Email dispatch failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildEmailHtml(notification: Notification): string {
    const title = notification.subject || notification.title || 'Notification';
    const message = notification.body || notification.message;
    const actionUrl = notification.actionUrl;

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
            .content { background: #f9f9f9; padding: 20px; }
            .footer { background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 4px 4px; }
            .button { display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
            .priority-high { border-left: 4px solid #dc2626; }
            .priority-medium { border-left: 4px solid #f59e0b; }
            .priority-low { border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${title}</h1>
            </div>
            <div class="content ${notification.priority ? `priority-${notification.priority}` : ''}">
              <p>${message}</p>
    `;

    if (actionUrl) {
      html += `<a href="${actionUrl}" class="button">View Details</a>`;
    }

    html += `
              ${notification.metadata ? `<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p><strong>Details:</strong></p>
                <pre style="background: white; padding: 10px; border-radius: 4px;">${JSON.stringify(notification.metadata, null, 2)}</pre>
              </div>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from Samar-Minime Systems. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  }
}

/**
 * Slack Dispatcher - sends notifications via Slack webhook
 */
export class SlackDispatcher {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  }

  async dispatch(notification: Notification): Promise<DispatchResult> {
    try {
      if (!this.webhookUrl) {
        console.warn('SLACK_WEBHOOK_URL not configured. Skipping Slack dispatch.');
        return { success: true, messageId: 'mock-' + Date.now() };
      }

      const message = this.buildSlackMessage(notification);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${error}`);
      }

      return {
        success: true,
        messageId: `slack-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Slack dispatch failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildSlackMessage(notification: Notification): Record<string, unknown> {
    const color = this.getPriorityColor(notification.priority);
    const title = notification.subject || notification.title || 'Notification';
    const message = notification.body || notification.message;

    const blocks: unknown[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ];

    if (notification.actionUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            url: notification.actionUrl,
            style: 'primary',
          },
        ],
      });
    }

    if (notification.metadata && Object.keys(notification.metadata).length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${JSON.stringify(notification.metadata, null, 2)}\`\`\``,
        },
      });
    }

    return {
      blocks,
      attachments: [
        {
          color,
          footer: 'Samar-Minime Systems',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  private getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#0066cc';
    }
  }
}

/**
 * Dispatcher Factory - routes notifications to appropriate dispatchers
 */
export class DispatcherFactory {
  private static emailDispatcher = new EmailDispatcher();
  private static slackDispatcher = new SlackDispatcher();

  static async dispatch(
    channel: 'email' | 'slack' | 'all',
    notification: Notification
  ): Promise<DispatchResult | DispatchResult[]> {
    try {
      if (channel === 'email') {
        return this.emailDispatcher.dispatch(notification);
      }

      if (channel === 'slack') {
        return this.slackDispatcher.dispatch(notification);
      }

      if (channel === 'all') {
        const results = await Promise.all([
          this.emailDispatcher.dispatch(notification),
          this.slackDispatcher.dispatch(notification),
        ]);

        // Return combined result: all successful only if both succeeded
        const allSuccessful = results.every((r) => r.success);
        return {
          success: allSuccessful,
          messageId: results.map((r) => r.messageId).filter(Boolean).join(','),
          error: allSuccessful ? undefined : results.map((r) => r.error).filter(Boolean).join('; '),
        };
      }

      return { success: false, error: `Unknown channel: ${channel}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}