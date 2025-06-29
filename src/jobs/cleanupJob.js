// src/jobs/cleanupJob.js
// 중복 방지를 위한 정리 작업을 수행합니다.

const { Worker } = require('bullmq');
const SyncedProduct = require('../models/syncedProduct.model');
const logger = require('../config/logger');
const config = require('../config');

/**
 * 오래된 처리 중 상태 정리
 * @param {number} timeoutMinutes - 타임아웃 시간 (분)
 * @returns {Promise<number>} 정리된 상품 수
 */
async function cleanupStuckProcessing(timeoutMinutes = 30) {
  const timeout = timeoutMinutes * 60 * 1000; // 밀리초로 변환
  const stuckProducts = await SyncedProduct.updateMany(
    {
      processingStatus: 'processing',
      processingStartedAt: { $lt: new Date(Date.now() - timeout) }
    },
    {
      $set: {
        processingStatus: 'failed',
        processingStartedAt: null,
        processingJobId: null,
        processingTimeoutAt: null,
        syncStatus: 'ERROR',
        syncErrorMessage: 'Processing timeout - stuck in processing state'
      }
    }
  );
  
  logger.info(`[Cleanup] Reset ${stuckProducts.modifiedCount} stuck products`);
  return stuckProducts.modifiedCount;
}

/**
 * 중복 상품 확인 및 정리
 * @returns {Promise<number>} 정리된 중복 상품 수
 */
async function findAndRemoveDuplicates() {
  const duplicates = await SyncedProduct.aggregate([
    {
      $group: {
        _id: '$bunjangPid',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        docs: { $push: '$$ROOT' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  let totalRemoved = 0;
  
  for (const dup of duplicates) {
    logger.warn(`[Cleanup] Found ${dup.count} duplicates for bunjangPid: ${dup._id}`);
    
    // 가장 최근 것만 남기고 삭제
    const sortedDocs = dup.docs.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime; // 최신 순으로 정렬
    });
    
    const [keep, ...remove] = sortedDocs;
    const removeIds = remove.map(doc => doc._id);
    
    if (removeIds.length > 0) {
      const deleteResult = await SyncedProduct.deleteMany({ _id: { $in: removeIds } });
      totalRemoved += deleteResult.deletedCount;
      logger.info(`[Cleanup] Removed ${deleteResult.deletedCount} duplicates for bunjangPid: ${dup._id}, kept: ${keep._id}`);
    }
  }
  
  logger.info(`[Cleanup] Total duplicates removed: ${totalRemoved}`);
  return totalRemoved;
}

/**
 * Shopify GID 중복 확인 및 정리
 * @returns {Promise<number>} 정리된 중복 상품 수
 */
async function findAndRemoveShopifyGidDuplicates() {
  const duplicates = await SyncedProduct.aggregate([
    {
      $match: {
        shopifyGid: { $ne: null, $exists: true }
      }
    },
    {
      $group: {
        _id: '$shopifyGid',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        docs: { $push: '$$ROOT' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  let totalRemoved = 0;
  
  for (const dup of duplicates) {
    logger.warn(`[Cleanup] Found ${dup.count} duplicates for shopifyGid: ${dup._id}`);
    
    // 가장 최근에 성공적으로 동기화된 것만 남기고 삭제
    const sortedDocs = dup.docs.sort((a, b) => {
      const aTime = a.lastSuccessfulSyncAt ? new Date(a.lastSuccessfulSyncAt).getTime() : 0;
      const bTime = b.lastSuccessfulSyncAt ? new Date(b.lastSuccessfulSyncAt).getTime() : 0;
      return bTime - aTime; // 최신 순으로 정렬
    });
    
    const [keep, ...remove] = sortedDocs;
    const removeIds = remove.map(doc => doc._id);
    
    if (removeIds.length > 0) {
      const deleteResult = await SyncedProduct.deleteMany({ _id: { $in: removeIds } });
      totalRemoved += deleteResult.deletedCount;
      logger.info(`[Cleanup] Removed ${deleteResult.deletedCount} shopifyGid duplicates for ${dup._id}, kept: ${keep._id}`);
    }
  }
  
  logger.info(`[Cleanup] Total shopifyGid duplicates removed: ${totalRemoved}`);
  return totalRemoved;
}

/**
 * 오래된 에러 상태 상품 정리
 * @param {number} daysOld - 일수 기준
 * @returns {Promise<number>} 정리된 상품 수
 */
async function cleanupOldErrorProducts(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await SyncedProduct.updateMany(
    {
      syncStatus: 'ERROR',
      lastSyncAttemptAt: { $lt: cutoffDate },
      processingStatus: { $ne: 'processing' }
    },
    {
      $set: {
        syncStatus: 'PENDING',
        syncErrorMessage: null,
        syncErrorStackSample: null,
        syncRetryCount: 0
      }
    }
  );
  
  logger.info(`[Cleanup] Reset ${result.modifiedCount} old error products (older than ${daysOld} days) to PENDING status`);
  return result.modifiedCount;
}

/**
 * 전체 정리 작업 실행
 * @returns {Promise<Object>} 정리 결과 요약
 */
async function runFullCleanup() {
  logger.info('[Cleanup] Starting full cleanup process...');
  
  const startTime = Date.now();
  
  try {
    // 1. 오래된 처리 중 상태 정리
    const stuckCleaned = await cleanupStuckProcessing(30); // 30분 타임아웃
    
    // 2. 중복 상품 정리
    const duplicatesRemoved = await findAndRemoveDuplicates();
    
    // 3. Shopify GID 중복 정리
    const shopifyDuplicatesRemoved = await findAndRemoveShopifyGidDuplicates();
    
    // 4. 오래된 에러 상태 정리
    const oldErrorsReset = await cleanupOldErrorProducts(7); // 7일 이상
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const summary = {
      stuckCleaned,
      duplicatesRemoved,
      shopifyDuplicatesRemoved,
      oldErrorsReset,
      totalDurationMs: duration,
      timestamp: new Date().toISOString()
    };
    
    logger.info('[Cleanup] Full cleanup completed successfully:', summary);
    return summary;
    
  } catch (error) {
    logger.error('[Cleanup] Error during full cleanup:', error);
    throw error;
  }
}

/**
 * 정기 정리 작업을 위한 Worker 설정
 */
function setupCleanupWorker() {
  if (!config.redis.enabled) {
    logger.warn('[Cleanup] Redis is disabled, cleanup worker cannot be started');
    return null;
  }
  
  const { getBullMQRedisConnection } = require('../config/redisClient');
  const { Queue } = require('bullmq');
  
  const cleanupQueue = new Queue('cleanup', {
    connection: getBullMQRedisConnection()
  });
  
  const cleanupWorker = new Worker('cleanup', async (job) => {
    logger.info(`[Cleanup] Processing cleanup job: ${job.id}`);
    
    const { type, options = {} } = job.data;
    
    switch (type) {
      case 'full':
        return await runFullCleanup();
      case 'stuck':
        return await cleanupStuckProcessing(options.timeoutMinutes || 30);
      case 'duplicates':
        return await findAndRemoveDuplicates();
      case 'shopify_duplicates':
        return await findAndRemoveShopifyGidDuplicates();
      case 'old_errors':
        return await cleanupOldErrorProducts(options.daysOld || 7);
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
  }, {
    connection: getBullMQRedisConnection(),
    concurrency: 1 // 한 번에 하나의 정리 작업만 실행
  });
  
  cleanupWorker.on('completed', (job, result) => {
    logger.info(`[Cleanup] Job ${job.id} completed successfully:`, result);
  });
  
  cleanupWorker.on('failed', (job, err) => {
    logger.error(`[Cleanup] Job ${job.id} failed:`, err);
  });
  
  return { cleanupQueue, cleanupWorker };
}

module.exports = {
  cleanupStuckProcessing,
  findAndRemoveDuplicates,
  findAndRemoveShopifyGidDuplicates,
  cleanupOldErrorProducts,
  runFullCleanup,
  setupCleanupWorker
}; 