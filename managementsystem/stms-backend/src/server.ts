// src/server.ts
// Application entry point

import { env } from './config/env';
import { logger } from './middleware/logger.middleware';
import { closeDatabaseConnection } from './config/database';
import { closeRateLimitRedisClient } from './middleware/rate-limit.middleware';
import { closeTokenRedisClient } from './utils/tokens';
import app, { initializeApp } from './app';

async function startServer(): Promise<void> {
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    // Initialize database connection
    await initializeApp();

    // Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        env: env.NODE_ENV,
        message: `🚀 STMS Backend server running on port ${env.PORT}`,
      });
    });

    // Graceful shutdown
    let shutdownStarted = false;
    const shutdown = (signal: string) => {
      if (shutdownStarted) return;
      shutdownStarted = true;
      logger.info({ signal }, 'Shutdown signal received');
      const forceShutdown = setTimeout(() => {
        logger.error('Forced close after shutdown timeout');
        process.exit(1);
      }, 30000);
      forceShutdown.unref();

      server!.close(async () => {
        logger.info('HTTP server closed; closing database and Redis clients');
        const results = await Promise.allSettled([
          closeDatabaseConnection(),
          closeRateLimitRedisClient(),
          closeTokenRedisClient(),
        ]);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            logger.warn({ component: ['MongoDB', 'rate-limit Redis', 'token Redis'][index] }, 'Resource shutdown reported an error');
          }
        });
        clearTimeout(forceShutdown);
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    await Promise.allSettled([
      closeDatabaseConnection(),
      closeRateLimitRedisClient(),
      closeTokenRedisClient(),
    ]);
    process.exit(1);
  }
}

startServer();
