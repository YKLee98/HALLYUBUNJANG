// src/schedulers/cleanupScheduler.js
// 정기적인 정리 작업을 수행하는 스케줄러

const cron = require('node-cron');
const logger = require('../config/logger');
const config = require('../config');
const { runFullCleanup } = require('../jobs/cleanupJob');

let cleanupScheduler = null;

/**
 * 정리 작업 스케줄러 초기화
 */
function initializeCleanupScheduler() {
  if (!config.redis.enabled) {
    logger.warn('[CleanupScheduler] Redis is disabled, cleanup scheduler cannot be started');
    return;
  }

  if (!config.sync.enableDuplicatePrevention) {
    logger.info('[CleanupScheduler] Duplicate prevention is disabled, cleanup scheduler will not start');
    return;
  }

  const cleanupCron = process.env.CLEANUP_CRON || `0 */${config.sync.cleanupIntervalHours} * * *`; // 기본 6시간마다
  
  logger.info(`[CleanupScheduler] Initializing cleanup scheduler with cron: ${cleanupCron}`);
  
  try {
    cleanupScheduler = cron.schedule(cleanupCron, async () => {
      logger.info('[CleanupScheduler] Starting scheduled cleanup process...');
      
      try {
        const result = await runFullCleanup();
        logger.info('[CleanupScheduler] Scheduled cleanup completed successfully:', result);
      } catch (error) {
        logger.error('[CleanupScheduler] Error during scheduled cleanup:', error);
      }
    }, {
      scheduled: false, // 수동으로 시작
      timezone: config.scheduler.timezone
    });

    // 스케줄러 시작
    cleanupScheduler.start();
    logger.info('[CleanupScheduler] Cleanup scheduler started successfully');
    
  } catch (error) {
    logger.error('[CleanupScheduler] Failed to initialize cleanup scheduler:', error);
  }
}

/**
 * 정리 작업 스케줄러 중지
 */
function stopCleanupScheduler() {
  if (cleanupScheduler) {
    cleanupScheduler.stop();
    cleanupScheduler = null;
    logger.info('[CleanupScheduler] Cleanup scheduler stopped');
  }
}

/**
 * 수동으로 정리 작업 실행
 */
async function runManualCleanup() {
  logger.info('[CleanupScheduler] Running manual cleanup...');
  
  try {
    const result = await runFullCleanup();
    logger.info('[CleanupScheduler] Manual cleanup completed successfully:', result);
    return result;
  } catch (error) {
    logger.error('[CleanupScheduler] Error during manual cleanup:', error);
    throw error;
  }
}

/**
 * 스케줄러 상태 확인
 */
function getCleanupSchedulerStatus() {
  return {
    isRunning: cleanupScheduler ? cleanupScheduler.getStatus() === 'started' : false,
    cronExpression: process.env.CLEANUP_CRON || `0 */${config.sync.cleanupIntervalHours} * * *`,
    timezone: config.scheduler.timezone,
    duplicatePreventionEnabled: config.sync.enableDuplicatePrevention,
    redisEnabled: config.redis.enabled
  };
}

module.exports = {
  initializeCleanupScheduler,
  stopCleanupScheduler,
  runManualCleanup,
  getCleanupSchedulerStatus
}; 