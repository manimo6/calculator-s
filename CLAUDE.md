# CLAUDE.md - 프로젝트 총괄 가이드

## 프로젝트 개요

학원/교육기관용 **수강 등록 관리 시스템** (모노레포)

| 구분 | 스택 |
|------|------|
| Frontend | React 19 + Vite 7 + TailwindCSS 4 + Radix UI + Mantine |
| Backend | Express 5 + Prisma 6.17 + PostgreSQL |
| 실시간 | Socket.io (출석부) |
| 인증 | JWT (jose) + PBKDF2 + CSRF + Refresh Token Rotation |
| 언어 | TypeScript (strict: false) |

## 디렉토리 구조

```
calculator/
├── frontend/src/
│   ├── pages/              # 4개: Login, Student, Admin, ChangePassword
│   ├── features/admin/     # 8개 관리 탭
│   │   ├── attendance/     # 출석부 (Board, Tab, CourseBrowser + model/state/copy)
│   │   ├── courses/        # 과목설정 (CourseDialog, CategoryDialog + state/payload/copy)
│   │   ├── registrations/  # 등록현황 (Gantt, Sidebar, Cards, Transfer, Withdraw, Note, Merge, Installment + model/selectors/copy)
│   │   └── ...             # 공지, 캘린더, 메모, 계정, 설정
│   ├── components/ui/      # Radix 기반 UI 컴포넌트
│   ├── components/student/ # 학생용 컴포넌트
│   ├── components/common/  # 공통 컴포넌트 (ErrorBoundary, Modal 등)
│   ├── utils/              # calculatorLogic, searchUtils, clipboardUtils
│   ├── api-client.ts       # 40+ API 메서드 (토큰 만료 15초 전 자동 리프레시)
│   ├── auth.ts / auth-store.ts / auth-context.tsx / auth-routing.ts
│   └── ProtectedRoute.tsx
├── backend/
│   ├── routes/             # 20개 라우트 파일 (registrations → 5개 분리, smsWebhook)
│   ├── services/           # 15+ 서비스 (인증, 권한, 등록, 전반, 메모 등)
│   ├── middleware/         # Auth, CSRF, Permission, Reauth, ErrorHandler, RequestLogger, InputValidator
│   ├── utils/              # apiError, shutdown, processErrorHandlers, dateUtils, parsers
│   ├── validators/         # 입력 검증 규칙
│   ├── realtime/           # Socket.io (socket, socketAuth, socketRateLimiter)
│   ├── db/prisma.ts        # Prisma 싱글톤
│   ├── prisma/             # 스키마 + 20+ 마이그레이션
│   ├── config/index.ts     # 환경변수 설정
│   └── server.ts           # 엔트리포인트
```

## 빌드/실행 커맨드

```bash
# Frontend (calculator/frontend/)
npm run dev              # Vite dev 서버
npm run build            # 프로덕션 빌드
npm run typecheck        # 타입 체크
npm run test             # Vitest (143개 테스트)

# Backend (calculator/backend/)
npm run build            # TS → dist/ 컴파일
npm run start            # 서버 실행
npm run prisma:generate  # Prisma 클라이언트 생성
npm run prisma:migrate:dev  # 마이그레이션
```

## 코드 컨벤션

- **Indent**: 2 spaces
- **Quotes**: Double quotes
- **Semicolons**: 프론트 생략, 백엔드 포함
- **Backend import**: `const x = require('x') as typeof import('x')`
- **Frontend import**: ES modules + `@/` path alias
- **컴포넌트**: PascalCase 파일명, functional only
- **훅**: camelCase with `use` prefix
- **에러 메시지**: 한국어
- **에러 응답 형식**: `{ status: '실패', message: string }`

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| main | 메인 (origin 연결) |
| 개발 | 개발 (origin 연결) |
| 버그-수정 | 로컬 버그수정 |
| 재활 | UI 리디자인 + 안정화 (main에 머지 완료) |
| 은행연동 | SMS 입금 webhook + 납부현황 |

## 권한 체계

- **Role**: master, admin, teacher, parttime
- **Permission**: Role 기반 + 유저별 allow/deny 오버라이드
- **Category Access**: 유저별 과목 카테고리 접근 제어
- **Reauth**: 민감 작업 시 10분 내 재인증 필수

---

## 완료된 안정화 작업

서버 생존성, 입력값 검증, WebSocket 보강, Error Boundary, 에러 Sanitize, CORS, CSRF — 7 Phase 전체 완료.

---

## 프론트엔드 아키텍처 규칙

- **컴포넌트 200줄 이하**: 초과 시 하위 컴포넌트로 분리
- **Model/View 분리**: 순수 로직은 `*Model.ts`, 컴포넌트는 렌더링만 담당
- **Copy 파일 분리**: UI 문자열(라벨, 메시지)은 `*Copy.ts`로 분리
- **Barrel export**: 분리된 파일들은 원본 파일에서 thin re-export (기존 import 경로 유지)
- **Selector 패턴**: 파생 데이터는 `*Selectors.ts`에서 계산 (컴포넌트 내 직접 계산 금지)
- **테스트**: Model, Selector, Utils는 반드시 Vitest 테스트 작성

## 백엔드 아키텍처 규칙

- **라우트 = 파싱 + 응답**: 라우트 핸들러는 요청 파싱과 응답 포맷만 담당
- **비즈니스 로직 = services/**: 모든 DB 쿼리와 비즈니스 로직은 서비스 파일로 분리
- **공유 유틸**: `utils/dateUtils.ts` (날짜), `utils/parsers.ts` (파싱), `services/passwordUtils.ts` (해싱)
- **라우트 분리 기준**: 단일 도메인 라우트가 200줄 초과 시 하위 라우트 파일로 분리

---

## 검증 기준

- `npm run test` (프론트) — Vitest 143개 테스트 통과
- `npm run typecheck` (프론트) — 타입 에러 0개
- `npm run build` (백엔드) — 컴파일 에러 없음

## 기능 확장 시 반드시 같이 진행할 사항

| 항목 | 작업 내용 | 트리거 시점 |
|------|-----------|-------------|
| **TS strict 모드** | 새 코드부터 strict 적용, 기존 코드 점진적 전환 | 새 기능 코드 작성 시 |
| **ESM 전환** | 백엔드 CJS → ESM import 전환 | 백엔드 구조 변경 시 |
| **상태 관리 통합** | auth 4파일(auth.ts, auth-store.ts, auth-context.tsx, auth-routing.ts) 통합 | auth 관련 기능 확장 시 |
| **HTTP Rate Limiter Redis 연동** | 인메모리 → Redis 기반으로 전환 | 다중 인스턴스 배포 시 |

## 새 엔드포인트 추가 시 필수 체크리스트

**빠뜨리면 안 되는 항목 — 하나라도 누락 시 배포 금지**

| # | 항목 | 설명 |
|---|------|------|
| 1 | **인증/권한** | 모든 조회·수정 엔드포인트에 `authMiddleware` + 권한 체크. 외부 webhook은 시크릿 키 검증 |
| 2 | **CSRF** | 외부 webhook만 CSRF 면제, 나머지는 반드시 CSRF 뒤에 마운트 |
| 3 | **중복 방지** | 외부 입력(webhook, 문자, 결제 등)은 idempotency 키 또는 해시 기반 중복 체크 |
| 4 | **DB 마이그레이션** | 스키마 변경 시 마이그레이션 파일 생성 또는 배포 스크립트에 SQL 포함 |
| 5 | **입력 검증** | 요청 body/query 파라미터 타입·범위 검증 |
| 6 | **민감 데이터** | 금융·개인정보는 응답에서 필요한 필드만 노출, 로그에 원문 남기지 않기 |

> 이 체크리스트는 SMS webhook에서 조회 엔드포인트를 인증 없이 공개하고, 중복 수신 방지와 마이그레이션을 누락한 사고에서 비롯됨.

## 주의사항

- backend/data/*.json — 시드 스크립트용, DB에 데이터 있으면 불필요하나 백업용 보관
- sqlite3 의존성 제거됨 (PostgreSQL만 사용)
