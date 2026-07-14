# Maple Diary

메이플스토리 수익(사냥·보스·가계부·쌀 장부·레벨·장비) 기록장.
정적 사이트 + 브라우저 저장에서 **Next.js + SQLite + Google 로그인 + Docker 호스팅**으로 전환한 버전.

- 기존 단일 파일 버전은 `legacy/index.html`에 보존되어 있음.
- 계정별 데이터를 서버 DB에 저장 → 기기 간 동기화. 넥슨 API 키는 서버에만 저장되어 브라우저로 노출되지 않음.

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, standalone 출력) |
| 인증 | Auth.js(NextAuth v5) + Google OAuth |
| DB | SQLite (better-sqlite3) + Drizzle ORM |
| 배포 | Docker Compose + Caddy(자동 HTTPS) |

## 로컬 개발

```bash
# Node 22+ 필요
npm install
cp .env.example .env.local        # 값 채우기 (아래 참고)
npm run db:generate               # 스키마 변경 시에만 (마이그레이션 재생성)
npm run dev                       # http://localhost:3000
```

첫 요청 시 `DATABASE_PATH` 위치에 SQLite 파일이 만들어지고 마이그레이션이 자동 적용된다.

### 환경 변수 (`.env.local`)

```
AUTH_SECRET=          # openssl rand -base64 32
AUTH_GOOGLE_ID=       # Google Cloud Console OAuth 클라이언트 ID
AUTH_GOOGLE_SECRET=
DATABASE_PATH=./data/maple.db
AUTH_TRUST_HOST=true
```

### Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com) → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션) 생성
2. **승인된 리디렉션 URI**에 아래 두 개 등록:
   - `http://localhost:3000/api/auth/callback/google` (개발)
   - `https://maplediary.site/api/auth/callback/google` (운영)
3. 발급된 ID/시크릿을 `.env`에 입력

## 배포 (중앙 Caddy에 붙이기)

이 서버는 여러 앱을 **중앙 Caddy 리버스 프록시**(`~/dev/infra/caddy/`)로 호스팅한다. maple-diary는 자체 Caddy를 띄우지 않고 공유 네트워크 `caddy_net`에 붙는다. (ScheduleApp과 동일 패턴)

```bash
cp .env.example .env              # 운영값 입력, AUTH_URL=https://maplediary.site
docker compose up -d --build      # 호스트 포트 미개방, caddy_net에만 연결

# 중앙 Caddyfile에 아래 블록을 추가:
#   maplediary.site {
#       reverse_proxy maple-diary:3000
#   }
# 무중단 반영:
cd ~/dev/infra/caddy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

- 도메인 A레코드가 이 서버 공인 IP를 가리키고 **80·443 포트포워딩**이 되어 있어야 Let's Encrypt 인증서가 발급된다. (인증서는 중앙 Caddy의 `caddy_data` 볼륨에 저장·자동 갱신)
- SQLite 파일은 `maple_data` named volume으로 영속된다.
- 앱 내부 포트는 3000(Next.js 기본). 중앙 Caddy는 `maple-diary:3000`으로 프록시한다.

## 데이터 백업

```bash
# SQLite 볼륨을 tar로 백업
docker run --rm -v maple-diary_maple_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/maple-backup.tar.gz -C /data .
```

## 구조

```
src/
  app/            라우트 (page: 인증 게이트, login, api/auth)
  auth.ts         Auth.js 설정 + requireUserId()
  db/             Drizzle 스키마 + 커넥션(자동 마이그레이션)
  lib/            순수 도메인 로직 (calc, format, boss-data, types) — 서버/클라 공용
  server/         state 로더 + 서버 액션(records/settings/level/auth) + 넥슨 프록시
  components/     클라이언트 UI (App 셸 + store + 탭별 컴포넌트)
legacy/           기존 단일 파일 버전 보존
```
