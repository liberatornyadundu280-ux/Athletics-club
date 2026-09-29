// apps/backend/src/server.ts
// Application entry point

import 'dotenv/config';
import { env } from './config/env';
import { logger } from './middleware/logger.middleware';
import { closeDatabaseConnection } from './config/database';
import app, { initializeApp } from './app';

async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    await initializeApp();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        env: env.NODE_ENV,
        message: `🚀 STMS Backend server running on port ${env.PORT}`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDatabaseConnection();
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();