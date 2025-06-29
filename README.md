# HALLYUSTOREWITHBUNJANGPRODUCT

번개장터와 Shopify 간의 상품 동기화 미들웨어입니다.

## 중복 방지 기능

이 시스템은 동일한 상품이 여러 번 업로드되거나 이전에 올라온 글이 다시 업로드되는 문제를 방지하기 위한 종합적인 중복 방지 메커니즘을 제공합니다.

### 주요 기능

#### 1. 고유 Job ID 사용
- 상품별로 고유한 Job ID를 생성하여 중복 작업 방지
- 타임스탬프 대신 PID 기반 ID 사용으로 안정성 향상

#### 2. 분산 락 (Distributed Lock)
- Redis를 이용한 분산 락으로 동시성 제어
- 동일한 상품에 대한 동시 처리 방지

#### 3. 데이터베이스 레벨 중복 방지
- `processingStatus` 필드로 처리 상태 추적
- 동시성 제어를 위한 스태틱 메서드 제공
- 타임아웃 기반 자동 정리

#### 4. 카탈로그 처리 시 중복 제거
- CSV 파싱 후 중복 상품 자동 제거
- 최신 정보 우선 보존

#### 5. 정기 정리 작업
- 오래된 처리 중 상태 정리
- 중복 상품 및 Shopify GID 중복 정리
- 오래된 에러 상태 상품 정리

### 환경 변수 설정

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
CLEANUP_CRON=0 */6 * * *
```

### API 엔드포인트

#### 정리 작업
- `POST /api/sync/cleanup` - 수동 정리 작업 실행
- `GET /api/sync/cleanup/status` - 정리 스케줄러 상태 확인

#### 상품 동기화
- `POST /api/sync/product/:bunjangPid` - 특정 상품 재동기화 (중복 방지 포함)

### 모니터링

시스템은 다음과 같은 로그를 통해 중복 방지 상태를 모니터링할 수 있습니다:

- `[CatalogSvc] Removed X duplicate products`
- `[CatalogSvc] Product X is already being processed`
- `[Cleanup] Reset X stuck products`
- `[Cleanup] Removed X duplicates`

### 성능 최적화

- 동시성 제어로 시스템 부하 감소
- 중복 제거로 불필요한 API 호출 방지
- 정기 정리로 데이터베이스 최적화 