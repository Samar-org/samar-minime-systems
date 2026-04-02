import { prisma } from '../index';
import { getLogger } from '@samar/observability';

const logger = getLogger('seed');

async function main() {
  logger.info('Starting database seed...');

  try {
    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Failed to seed database', { error });
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    logger.error('Seed failed', { error: e });
    await prisma.$disconnect();
    process.exit(1);
  });
