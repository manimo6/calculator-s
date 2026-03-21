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
│   ├── features/admin/     # 8개 관리 탭 (공지, 캘린더, 수업, 등록현황, 출석, 메모, 계정, 설정)
│   ├── components/ui/      # Radix 기반 UI 컴포넌트
│   ├── components/student/  # 학생용 컴포넌트
│   ├── components/common/  # 공통 컴포넌트 (ErrorBoundary 등)
│   ├── utils/              # 계산기 로직, 클립보드
│   ├── api-client.ts       # 40+ API 메서드
│   ├── auth.ts / auth-store.ts / auth-context.tsx / auth-routing.ts
│   └── ProtectedRoute.tsx
├── backend/
│   ├── routes/             # 14개 라우트 파일
│   ├── services/           # 인증, 권한, Rate Limit
│   ├── middleware/          # Auth, CSRF, Permission, Reauth, ErrorHandler, RequestLogger, InputValidator
│   ├── utils/              # apiError, shutdown, processErrorHandlers
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
| 재활 | 현재 작업 브랜치 — UI 리디자인 + 안정화 |

## 권한 체계

- **Role**: master, admin, teacher, parttime
- **Permission**: Role 기반 + 유저별 allow/deny 오버라이드
- **Category Access**: 유저별 과목 카테고리 접근 제어
- **Reauth**: 민감 작업 시 10분 내 재인증 필수

---

# 안정화 작업 계획 (7 Phase)

## 진행 상태

| Phase | 작업 | 상태 | 리스크 |
|-------|------|------|--------|
| 1 | 서버 생존성 (에러핸들러, 셧다운, 로깅) | **완료** ✔ `8b935fc` | 없음 (순수 추가) |
| 2 | 입력값 검증 레이어 | **완료** ✔ `d237d8c` | 낮음 (순수 추가) |
| 3 | WebSocket 보강 (Rate Limit, 인증 분리) | **완료** ✔ `0298f68` | 중간 (리팩토링) |
| 4 | Error Boundary (프론트) | **완료** ✔ `2700586` | 없음 (순수 추가) |
| 5 | 에러 메시지 Sanitize | **완료** ✔ `689be25` | 낮음 (동작 변경) |
| 6 | CORS 기본값 수정 | **완료** ✔ `7b5693e` | 없음 (1줄) |
| 7 | CSRF 로직 수정 (프론트+백 동시) | **완료** ✔ `04bfc9f` | 높음 (2단계 롤아웃) |

## Phase 상세

### Phase 1: 서버 생존성
새 파일 4개 생성, server.ts에 import 추가만. 기존 라우트 수정 없음.
- `middleware/errorHandler.ts` — 글로벌 에러 핸들러
- `middleware/requestLogger.ts` — 요청 로깅
- `utils/shutdown.ts` — graceful shutdown + Prisma disconnect
- `utils/processErrorHandlers.ts` — uncaughtException, unhandledRejection

### Phase 2: 입력값 검증
각 라우트에 미들웨어로 끼워넣기. 기존 로직 변경 없음.
- `middleware/inputValidator.ts` — 공통 검증 유틸
- `validators/studentValidator.ts` — 학생 API 검증
- `validators/registrationValidator.ts` — 등록 API 검증

### Phase 3: WebSocket 보강
socket.ts에서 인증/Rate Limit 로직을 분리. handshake 흐름 동일 유지.
- `realtime/socketRateLimiter.ts` — 소켓 전용 Rate Limit
- `realtime/socketAuth.ts` — 소켓 인증/권한 분리

### Phase 4: Error Boundary
App.tsx에서 감싸기만. 기존 컴포넌트 수정 없음.
- `components/common/ErrorBoundary.tsx` — 글로벌 에러 경계
- `components/common/ErrorFallback.tsx` — fallback UI

### Phase 5: 에러 메시지 Sanitize
AppError 클래스 도입. 응답 형식 `{ status, message }` 유지.
- `utils/apiError.ts` — 커스텀 에러 (userMessage + internalMessage 분리)
- `middleware/errorHandler.ts` 확장

### Phase 6: CORS 기본값
`config/index.ts`에서 `'*'` → `'http://localhost:5173'`. .env 설정 있으면 영향 없음.

### Phase 7: CSRF 수정 (2단계)
**Step A** (백엔드 선행): CSRF 토큰 사전 발급 엔드포인트 추가. 면제 아직 유지.
**Step B** (프론트+백 동시): 프론트에 CSRF 확보 로직 추가 → 백엔드 면제 제거.

## 검증 기준

- `npm run test` (프론트) — Vitest 24개 테스트 통과
- `npm run typecheck` (프론트) — 기존 에러 9개 외 새 에러 없음
- `npm run build` (백엔드) — 컴파일 에러 없음
- Phase별 독립 커밋 — 문제 시 해당 Phase만 revert

## 이미 완료된 정리 작업

- [x] 백엔드 레거시 Store 파일 7개 삭제 (data/*Store.ts)
- [x] 프론트엔드 레거시 admin 컴포넌트 10개 삭제 (components/admin/)
- [x] 루트 table.txt 삭제
- [x] 전반(transfer) 기능 분리: `useTransfer.ts` + `TransferDialog.tsx` (`f4e337e`)

## RegistrationsTab.tsx 추가 분리 대상

| 기능 | 분리 파일명 (제안) | 상태 |
|------|---------------------|------|
| 퇴원(withdraw) 다이얼로그 + 핸들러 | `WithdrawDialog.tsx` + `useWithdraw.ts` | **완료** ✔ |
| 메모(note) 다이얼로그 + 핸들러 | `NoteDialog.tsx` + `useNote.ts` | **완료** ✔ |
| 전반 버그 수정 (endDate 미계산, skipWeeks 복사) | `useTransfer.ts` + 백엔드 | **완료** ✔ |

## 기능 확장 시 반드시 같이 진행할 사항

| 항목 | 작업 내용 | 트리거 시점 |
|------|-----------|-------------|
| **TS strict 모드** | 새 코드부터 strict 적용, 기존 코드 점진적 전환 | 새 기능 코드 작성 시 |
| **ESM 전환** | 백엔드 CJS → ESM import 전환 | 백엔드 구조 변경 시 |
| **다크모드 정리** | 주석 제거하고 feature flag로 재구현, 또는 완전 삭제 | 다크모드 다시 살릴 때 |
| **상태 관리 통합** | auth 4파일(auth.ts, auth-store.ts, auth-context.tsx, auth-routing.ts) 통합 | auth 관련 기능 확장 시 |
| **useCourseManager 리팩토링** | 전역 뮤터블 상태 제거 (delete, push 직접 변경) | 과목 관리 기능 수정 시 |
| **HTTP Rate Limiter Redis 연동** | 인메모리 → Redis 기반으로 전환 | 다중 인스턴스 배포 시 |

## 주의사항

- 기존 타입 에러 9개 존재 (Radix UI prop 타입 불일치) — 안정화 작업과 무관
- backend/data/*.json — 시드 스크립트용, DB에 데이터 있으면 불필요하나 백업용 보관
- 다크모드 — 현재 주석처리로 비활성화 상태
- sqlite3 의존성 제거됨 (PostgreSQL만 사용)
- 테스트: Vitest 도입 완료, calculatorLogic 순수 함수 24개 테스트 커버
