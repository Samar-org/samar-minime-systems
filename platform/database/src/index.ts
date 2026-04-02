import { PrismaClient } from '@prisma/client';
import { getConfig } from '@samar/config';
import { getLogger } from '@samar/observability';

const config = getConfig();
const logger = getLogger('database');

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

prisma.$on('query', (e) => {
  if (config.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query}`, { duration: e.duration });
  }
});

prisma.$on('error', (e) => {
  logger.error('Database error', { message: e.message });
});

export * from '@prisma/client';
