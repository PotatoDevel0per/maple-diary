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

## 배포 (Docker + Caddy)

```bash
cp .env.example .env              # 운영값 입력, AUTH_URL=https://maplediary.site
docker compose up -d --build
```

- **Caddy**가 80/443을 받아 `maplediary.site` 인증서를 Let's Encrypt로 자동 발급/갱신하고 앱으로 프록시한다.
- 인증서 발급 조건: 도메인 A레코드가 이 PC 공인 IP를 가리키고, 공유기에서 **80·443 포트포워딩**이 되어 있어야 함. (443만 열면 인증서 발급이 실패할 수 있어 80도 함께 열 것)
- SQLite 파일(`maple_data`)과 인증서(`caddy_data`)는 named volume으로 영속된다. 백업은 이 볼륨을 복사하면 된다.

### 앱 추가 (2~3개 호스팅)

새 앱은 `compose.yaml`에 service를 추가하고 `Caddyfile`에 도메인 블록 한 개만 늘리면 된다. Caddy가 알아서 각 도메인 인증서를 발급한다.

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
