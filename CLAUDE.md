# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Maple Diary — 메이플스토리 수익(사냥·보스·가계부·쌀 장부·레벨·장비) 기록장.
**Next.js 15(App Router) + SQLite(Drizzle) + Auth.js(Google OAuth)** 스택이며 Docker + Caddy로 셀프호스팅한다.
계정별 데이터를 서버 DB에 저장하고, 넥슨 API 키는 서버에만 두어 브라우저로 노출하지 않는다.

기존 순수 정적 단일 파일 버전은 `legacy/index.html`에 보존되어 있다 — 도메인 계산 규칙의 원본 레퍼런스로 참고할 것.

## 명령어

```bash
npm run dev            # 개발 서버 (http://localhost:3000)
npm run build          # 프로덕션 빌드 (standalone)
npm start              # 빌드 결과 실행
npm run db:generate    # 스키마 변경 후 마이그레이션 파일 재생성
docker compose up -d --build   # 배포
```

- Node 22+ 필요. 이 환경에는 `~/.local/node/bin`에 설치돼 있어 `PATH`에 추가해야 `node`/`npm`이 잡힌다.
- 로컬 실행 전 `.env.local`에 `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` 필요 (`.env.example` 참고).
- 테스트 러너·린트 스크립트는 아직 없음. 검증은 `npm run build` 통과 + 실제 구동 확인으로 한다.

## 아키텍처

### 데이터 흐름 (핵심)
`page.tsx`(서버)가 `auth()`로 세션을 확인하고 미로그인 시 `/login`으로 리다이렉트한다. 로그인 상태면 `loadState(userId)`로 **DB 전체를 하나의 `DiaryState` 객체로 조립해** `<App initial={...}>`(클라이언트)에 넘긴다. 이후 UI는 이 초기 스냅샷을 클라이언트 스토어(`components/store.tsx`)에 담고, 변경은 **서버 액션 호출 + 성공 시 로컬 스토어 낙관적 갱신** 패턴으로 처리한다. 페이지 리로드 없이 동작하며, 새로고침하면 서버에서 다시 로드된다.

### 계층
- `src/lib/` — **순수 도메인 로직, 서버/클라이언트 공용**. `calc.ts`(집계·손익·쌀복구·레벨), `format.ts`(fmtMeso/fmtWon·날짜), `boss-data.ts`(결정석 가격표·카테고리 상수), `types.ts`. 여기 함수는 `DiaryState`나 개별 엔티티를 인자로 받는 순수 함수 — DB·React 의존 없음.
- `src/db/` — Drizzle 스키마와 커넥션. `db/index.ts`는 **import 시점에 마이그레이션을 자동 적용**하고 커넥션을 전역 캐시한다(`foreign_keys=ON`, WAL).
- `src/server/` — `state.ts`(DB→DiaryState 로더, `ensureSettings`로 설정 행 lazy 생성), `actions/*`(서버 액션), `nexon.ts`(넥슨 API 서버측 프록시). 모든 액션은 `requireUserId()`로 사용자를 강제하고 `and(eq(userId), eq(id))`로 소유권을 검증한다 — **userId 스코프 없는 쿼리를 만들지 말 것**.
- `src/components/` — `App.tsx`(사이드바·탭 전환·토스트), `store.tsx`(Context), `Modal`/`Calendar` 공용, `tabs/*` 8개 탭.

### 도메인 규칙 (단위 주의 — legacy와 동일하게 유지)
- 메소는 **raw 메소**로 저장, 입력은 **억(1e8) 단위**로 받아 변환. 표시는 `fmtMeso`.
- 가계부(`ledger`)는 게임 메소, 쌀 장부(`cashBook`)와 장비 쌀 가치는 **원(KRW)** — 서로 독립 집계.
- 시세는 계정 설정(`settings`)의 전역값: `solPrice`(솔조각 메소/개), `mktPrice`(메소마켓), `cashPrice`(쌀 1억당 원).
- 사냥: 소재비 1개=30분, 수익=`meso + sol*solPrice`(`huntNet`).
- 보스 주간 사이클은 **목요일 00:00~수요일 23:59**, 주차 키는 시작 목요일 `YYYY-MM-DD`(목요일이 속한 달로 귀속). 캐릭터당 주간 결정석 12개 한도. 가격표는 `boss-data.ts`에 하드코딩(기준일 `PRICE_BASIS`) — 시세 갱신 시 이 배열만 수정.
- 보스 캐릭터 슬롯은 `boss_week`/`boss_month` 테이블에 **JSON 컬럼(chars)** 으로 통째 저장하며, 액션은 슬롯 배열 전체를 upsert한다(부분 업데이트 아님).
- 쌀 복구(`recoveryStatus`): 쌀장부 순투입(원) 대비 (보유 게임메소×쌀시세 + 장비 쌀가치) 회수율.

### 배포
- `Dockerfile`은 multi-stage로 standalone 산출물 + `drizzle/`(마이그레이션) + `public/`을 런타임 이미지에 넣는다. better-sqlite3 네이티브 모듈 때문에 `libstdc++6`가 필요.
- 이 서버는 **중앙 Caddy**(`~/dev/infra/caddy/`, compose project `caddy`)가 80/443을 잡고 여러 앱을 프록시한다. maple-diary는 자체 Caddy를 띄우지 않고 `compose.yaml`에서 공유 네트워크 `caddy_net`(external)에만 붙고 호스트 포트는 열지 않는다(`expose: 3000`).
- 도메인 라우팅은 중앙 `~/dev/infra/caddy/Caddyfile`에 `maplediary.site { reverse_proxy maple-diary:3000 }` 블록으로 추가하고 `docker compose exec caddy caddy reload`로 무중단 반영한다. 인증서는 중앙 Caddy의 `caddy_data` 볼륨에 저장.
- SQLite는 `maple_data` named volume으로 영속. **빌드 시 마이그레이션 금지**: `db/index.ts`는 `NEXT_PHASE==='phase-production-build'`이면 migrate를 건너뛴다(빌드 워커 병렬 실행 시 CREATE TABLE 충돌 방지). 런타임 단일 프로세스에서만 1회 적용.
- 도커 명령은 이 환경에서 `sg docker -c '...'`로 실행(현재 셸에 docker 그룹 미적용).

### 새 데이터 추가 시 체크리스트
1. `db/schema.ts`에 컬럼/테이블 추가 → `npm run db:generate`
2. `lib/types.ts`의 `DiaryState`(및 엔티티 타입) 갱신
3. `server/state.ts`의 `loadState`에서 매핑
4. `server/actions/`에 액션 추가(userId 스코프 필수)
5. 해당 탭 컴포넌트에서 액션 호출 + 스토어 낙관적 갱신
