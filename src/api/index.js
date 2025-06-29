// src/api/index.js
// 애플리케이션의 모든 API 라우트를 통합하고 관리합니다.

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware'); // 내부 API 인증용
const config = require('../config'); // App Proxy 경로 설정 읽기용

const router = express.Router();

// 라우트 모듈들을 안전하게 로드
let syncRoutes, priceRoutes, shopifyAppProxyRoutes;

try {
  const syncModule = require('./syncRoutes');
  // syncRoutes가 router 속성을 가진 객체인 경우 처리
  syncRoutes = syncModule.router || syncModule;
  
  const priceModule = require('./priceRoutes');
  priceRoutes = priceModule.router || priceModule;
  
  const proxyModule = require('./shopifyAppProxyRoutes');
  shopifyAppProxyRoutes = proxyModule.router || proxyModule;
} catch (error) {
  console.error('Error loading route modules:', error);
  // 에러 발생 시 빈 라우터 생성
  syncRoutes = syncRoutes || express.Router();
  priceRoutes = priceRoutes || express.Router();
  shopifyAppProxyRoutes = shopifyAppProxyRoutes || express.Router();
}

// 기본 /api 경로 (헬스 체크 또는 API 정보)
router.get('/', (req, res) => {
  res.json({ 
    message: `Welcome to the ${config.appName} API`,
    version: config.version,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 내부 관리/동기화 트리거용 라우트 (API 키 인증 적용)
// syncRoutes가 함수인지 확인
if (typeof syncRoutes === 'function') {
  router.use('/sync', authMiddleware.verifyInternalApiKey, syncRoutes);
} else {
  console.error('syncRoutes is not a valid Express router');
  router.use('/sync', authMiddleware.verifyInternalApiKey, (req, res) => {
    res.status(500).json({ error: 'Sync routes not properly configured' });
  });
}

// 가격 계산 테스트용 라우트 (개발/테스트 시에만 사용 권장, 필요시 인증 적용)
if (config.env !== 'production') { // 운영 환경에서는 비활성화 또는 인증 강화
  if (typeof priceRoutes === 'function') {
    router.use('/price-utils', authMiddleware.verifyInternalApiKey, priceRoutes);
  } else {
    console.error('priceRoutes is not a valid Express router');
  }
}

// Shopify App Proxy 요청 처리 라우트
const appProxyPath = `/${config.shopify?.appProxy?.subpathPrefix || 'app-proxy'}`;
if (typeof shopifyAppProxyRoutes === 'function') {
  router.use(appProxyPath, shopifyAppProxyRoutes);
} else {
  console.error('shopifyAppProxyRoutes is not a valid Express router');
  router.use(appProxyPath, (req, res) => {
    res.status(500).json({ error: 'App proxy routes not properly configured' });
  });
}

// TODO: 기타 필요한 API 라우트 그룹 추가 (예: 사용자 관리, 설정 관리 등)

module.exports = router;