import { prisma } from '@samar/database';
import type {
  CreateNotificationInput,
  NotificationFilter,
  Pagination,
} from '../models/notification.types.js';

export class NotificationService {
  // ── Create ───────────────────────────────────────────────────────

  async send(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        channel: input.channel,
        recipient: input.userId,
        subject: input.title,
        body: input.message,
        metadata: {
          type: input.type,
          priority: input.priority,
          actionUrl: input.actionUrl,
          ...input.metadata,
        },
        sent: false,
      },
    });
  }

  async sendBulk(inputs: CreateNotificationInput[]) {
    return prisma.notification.createMany({
      data: inputs.map((input) => ({
        channel: input.channel,
        recipient: input.userId,
        subject: input.title,
        body: input.message,
        metadata: {
          type: input.type,
          priority: input.priority,
          actionUrl: input.actionUrl,
          ...input.metadata,
        },
        sent: false,
      })),
    });
  }

  // ── Read ─────────────────────────────────────────────────────────

  async getNotifications(
    userId: string,
    filter: NotificationFilter = {},
    pagination: Pagination = { page: 1, limit: 20 }
  ) {
    const where: Record<string, unknown> = { recipient: userId };

    if (filter.read !== undefined) {
      where.sentAt = filter.read ? { not: null } : null;
    }
    if (filter.channel) {
      where.channel = filter.channel;
    }
    if (filter.type) {
      where.metadata = {
        path: ['type'],
        equals: filter.type,
      };
    }
    if (filter.priority) {
      where.metadata = {
        path: ['priority'],
        equals: filter.priority,
      };
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecentActivity(userId: string, limit = 10) {
    return prisma.notification.findMany({
      where: { recipient: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Update ───────────────────────────────────────────────────────

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { sentAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { recipient: userId, sentAt: null },
      data: { sentAt: new Date() },
    });
  }

  // ── Count ────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { recipient: userId, sentAt: null },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────

  async deleteNotification(id: string) {
    return prisma.notification.delete({ where: { id } });
  }
}