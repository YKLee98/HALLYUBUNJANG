# HALLYUSTOREWITHBUNJANGPRODUCT

번개장터와 Shopify 간의 상품 동기화 및 주문 관리 미들웨어입니다.

## 📋 프로젝트 개요

이 프로젝트는 번개장터(Bunjang)의 상품 정보를 Shopify 스토어에 자동으로 동기화하고, Shopify에서 발생한 주문을 번개장터로 전달하는 종합적인 e-commerce 통합 솔루션입니다.

### 🎯 주요 목표
- 번개장터 상품을 Shopify에 자동 동기화
- Shopify 주문을 번개장터로 자동 전달
- 실시간 재고 관리 및 가격 동기화
- 중복 업로드 방지 및 데이터 무결성 보장
- 안정적인 대용량 데이터 처리

## 🏗️ 시스템 아키텍처

### 기술 스택
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Queue System**: BullMQ (Redis 기반)
- **Authentication**: JWT
- **Logging**: Winston
- **Scheduling**: node-cron
- **API Integration**: Shopify Admin API, Bunjang Open API

### 디렉토리 구조
```
src/
├── api/                    # API 라우트 정의
├── config/                 # 설정 및 환경 변수
├── controllers/            # 요청 처리 컨트롤러
├── hooks/                  # 이벤트 훅
├── jobs/                   # BullMQ 작업 큐 시스템
│   ├── workers/           # 작업 처리 워커
│   └── producers/         # 작업 생산자
├── mappers/               # 데이터 매핑 로직
├── middleware/            # Express 미들웨어
├── models/                # MongoDB 스키마
├── routes/                # 웹훅 라우트
├── schedulers/            # 정기 작업 스케줄러
├── scripts/               # 유틸리티 스크립트
├── services/              # 비즈니스 로직 서비스
└── utils/                 # 공통 유틸리티
```

## 🚀 주요 기능

### 1. 상품 동기화 시스템

#### 카탈로그 처리
- **Full Catalog**: 전체 상품 카탈로그 일일 동기화 (03:30 AM KST)
- **Segment Catalog**: 변경된 상품만 시간별 동기화 (매시각 10분)
- **중복 제거**: CSV 파싱 후 중복 상품 자동 제거
- **데이터 검증**: 필수 필드 검증 및 필터링

#### 가격 계산
- **환율 서비스**: 실시간 USD/KRW 환율 적용
- **마크업 계산**: 설정 가능한 마크업 비율 적용
- **수수료 적용**: 배송비 및 처리 수수료 계산
- **가격 검증**: 계산된 가격의 유효성 검증

#### 이미지 처리
- **이미지 변환**: 번개장터 이미지를 Shopify 형식으로 변환
- **대체 텍스트**: 자동 alt 텍스트 생성
- **배치 처리**: 대량 이미지 업로드 최적화

### 2. 주문 관리 시스템

#### 주문 동기화
- **Shopify → Bunjang**: Shopify 주문을 번개장터로 자동 전달
- **실시간 처리**: 웹훅 기반 즉시 처리
- **상태 추적**: 주문 상태 실시간 모니터링
- **재시도 로직**: 실패 시 자동 재시도

#### 주문 취소 처리
- **자동 취소**: Shopify 주문 취소 시 번개장터 주문도 자동 취소
- **부분 취소**: 부분 취소 상황 처리
- **환불 처리**: 환불 정보 동기화

### 3. 재고 관리

#### 실시간 재고 동기화
- **단일 재고**: 모든 상품을 1개 재고로 관리
- **자동 업데이트**: 판매 시 자동 재고 차감
- **재고 복구**: 취소 시 재고 자동 복구
- **재고 검증**: 정기적인 재고 무결성 검증

### 4. 중복 방지 시스템

#### 다층 중복 방지
- **Job ID 관리**: 고유한 작업 ID로 중복 작업 방지
- **분산 락**: Redis 기반 분산 락으로 동시성 제어
- **데이터베이스 락**: MongoDB 레벨 동시성 제어
- **상태 추적**: 처리 상태 실시간 모니터링

#### 정기 정리 작업
- **오래된 처리 상태 정리**: 타임아웃된 작업 자동 정리
- **중복 상품 제거**: 중복된 상품 데이터 정리
- **Shopify GID 중복 정리**: Shopify 상품 ID 중복 제거
- **에러 상태 정리**: 오래된 에러 상태 상품 복구

### 5. 모니터링 및 로깅

#### 로그 시스템
- **구조화된 로깅**: Winston 기반 체계적 로깅
- **로그 로테이션**: 일별 로그 파일 관리
- **에러 추적**: 상세한 에러 스택 정보
- **성능 모니터링**: 처리 시간 및 성능 지표

#### 대시보드
- **BullMQ Arena**: 작업 큐 상태 모니터링
- **실시간 상태**: 시스템 상태 실시간 확인
- **통계 정보**: 처리 통계 및 성능 지표

## 🔧 API 엔드포인트

### 상품 동기화
```
POST /api/sync/catalog/full          # 전체 카탈로그 동기화
POST /api/sync/catalog/segment       # 세그먼트 카탈로그 동기화
POST /api/sync/product/:bunjangPid   # 특정 상품 재동기화
```

### 정리 작업
```
POST /api/sync/cleanup               # 수동 정리 작업 실행
GET  /api/sync/cleanup/status        # 정리 스케줄러 상태 확인
```

### 가격 관리
```
GET  /api/price/calculate            # 가격 계산 테스트
POST /api/price/update               # 가격 업데이트
```

### Shopify App Proxy
```
GET  /bunjang-proxy/products         # 상품 검색 (Shopify 프론트엔드용)
GET  /bunjang-proxy/product/:id      # 상품 상세 정보
```

## ⚙️ 설정 및 환경 변수

### 필수 환경 변수
```bash
# 번개장터 API 설정
BUNJANG_API_ACCESS_KEY=your_access_key
BUNJANG_API_SECRET_KEY=your_secret_key
BUNJANG_CATALOG_API_URL=https://outbound-catalog.bunjang.io

# Shopify 설정
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_DEFAULT_LOCATION_ID=your_location_id

# 데이터베이스 설정
DB_CONNECTION_STRING=mongodb://localhost:27017/bunjangShopifyIntegrationDB

# Redis 설정
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 중복 방지 설정
```bash
# 중복 방지 활성화
ENABLE_DUPLICATE_PREVENTION=true

# 분산 락 설정
SYNC_LOCK_TTL_MS=60000
SYNC_PROCESSING_TIMEOUT_MINUTES=30

# 동시성 제어
MAX_CONCURRENT_PRODUCT_SYNC=1

# 정리 작업 설정
CLEANUP_INTERVAL_HOURS=6
CLEANUP_STUCK_TIMEOUT_MINUTES=30
CLEANUP_OLD_ERRORS_DAYS=7
```

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 설정 입력
```

### 3. 데이터베이스 설정
```bash
# MongoDB 설치 및 실행
./setup-mongodb.sh
```

### 4. Redis 설정
```bash
# Redis 설치 및 실행
redis-server
```

### 5. 애플리케이션 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start

# 백그라운드 실행
npm run loop:start
```

## 📊 성능 및 확장성

### 처리 성능
- **카탈로그 처리**: 시간당 수천 개 상품 처리 가능
- **주문 처리**: 실시간 웹훅 처리 (수백 ms 응답 시간)
- **동시성 제어**: 최대 1개 상품 동시 처리로 안정성 보장
- **메모리 효율성**: 스트리밍 처리로 대용량 파일 처리

### 확장성
- **수평 확장**: BullMQ 워커 다중 인스턴스 지원
- **데이터베이스 샤딩**: MongoDB 샤딩 지원
- **Redis 클러스터**: Redis 클러스터 지원
- **로드 밸런싱**: 다중 서버 배포 지원

## 🔍 모니터링 및 디버깅

### 로그 확인
```bash
# 실시간 로그 확인
npm run loop:logs

# 특정 로그 파인
tail -f logs/app-$(date +%Y-%m-%d)-combined.log
```

### 상태 확인
```bash
# 백그라운드 프로세스 상태
npm run loop:status

# BullMQ 대시보드
http://localhost:3000/admin/jobs
```

### 디버깅 스크립트
```bash
# 번개장터 API 테스트
node debugBunjangApi.js

# 상품 동기화 테스트
node testProductSync.js

# 재고 설정 테스트
node testInventorySetup.js
```

## 🛠️ 유틸리티 스크립트

### 관리 스크립트
- `checkAllBunjangProducts.js`: 모든 번개장터 상품 상태 확인
- `fixZeroPrices.js`: 0원 가격 상품 수정
- `migrateSoldProducts.js`: 판매된 상품 데이터 마이그레이션
- `linkOrderProduct.js`: 주문-상품 연결
- `manualStockSync.js`: 수동 재고 동기화

### 디버깅 스크립트
- `debugBunjangApi.js`: 번개장터 API 디버깅
- `debugBunjangOrder.js`: 번개장터 주문 디버깅
- `checkWebhookLogs.js`: 웹훅 로그 확인
- `testMongoConnection.js`: MongoDB 연결 테스트

## 🔮 향후 개선 계획

### 단기 계획 (1-2개월)
- [ ] **테스트 코드 작성**: Jest 기반 단위/통합 테스트
- [ ] **API 문서화**: Swagger/OpenAPI 문서 작성
- [ ] **성능 최적화**: 메모리 사용량 최적화
- [ ] **에러 처리 개선**: 더 상세한 에러 메시지 및 복구 로직

### 중기 계획 (3-6개월)
- [ ] **다중 스토어 지원**: 여러 Shopify 스토어 동시 관리
- [ ] **실시간 알림**: Slack/이메일 알림 시스템
- [ ] **대시보드 개선**: React 기반 관리 대시보드
- [ ] **백업 시스템**: 자동 데이터 백업 및 복구

### 장기 계획 (6개월 이상)
- [ ] **AI 기반 가격 최적화**: 머신러닝 기반 동적 가격 설정
- [ ] **다중 플랫폼 지원**: 다른 e-commerce 플랫폼 추가
- [ ] **마이크로서비스 아키텍처**: 서비스 분리 및 독립 배포
- [ ] **국제화**: 다국어 지원 및 글로벌 확장

## 🤝 기여하기

### 개발 환경 설정
```bash
# 개발 의존성 설치
npm install

# 코드 스타일 검사
npm run lint

# 코드 포맷팅
npm run format

# 설정 검증
npm run validate-config
```

### 코드 컨벤션
- ESLint 규칙 준수
- Prettier 포맷팅 적용
- 커밋 메시지 컨벤션 준수
- 테스트 코드 작성 필수

## 📄 라이선스

ISC License

## 👥 팀

**CS Trading (AI Enhanced Pro Version)**

---

## 📞 지원

문제가 발생하거나 질문이 있으시면 다음 방법으로 문의해주세요:

- **이슈 등록**: GitHub Issues
- **문서 확인**: 프로젝트 Wiki
- **로그 확인**: `logs/` 디렉토리

---

*이 프로젝트는 번개장터와 Shopify 간의 원활한 통합을 위해 지속적으로 개선되고 있습니다.* 