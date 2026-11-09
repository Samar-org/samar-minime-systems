import { PrismaClient } from '@prisma/client';
import { getConfig } from '@samar/config';
import { getLogger } from '@samar/observability';

const config = getConfig();
const logger = getLogger('database');

export const prisma = new PrismaClient({
  log: [{ emit: "event", level: "error" }],
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

prisma.$on('error', (e) => {
  logger.error({ event: 'database_error' }, 'Database operation failed');
});

export * from '@prisma/client';
