# 아요바디요 · 회원가입/서버 저장 준비 가이드 (Supabase)

> 이 문서의 단계는 **계정 소유자(본인)**가 직접 해야 하는 설정이에요.
> 끝나면 아래 **[7. Claude에게 전달할 값]**만 알려주시면 앱 연결 작업을 이어서 진행해요.
> 비밀값(Client Secret, service_role 키)은 **절대 채팅이나 GitHub에 올리지 말고** 각 대시보드에만 입력하세요.

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 → **New project**
2. 설정값
   - Name: `ayobodyyo`
   - Database Password: 강력한 비밀번호 (따로 보관)
   - Region: **Northeast Asia (Seoul)**
3. 생성 후 **Project Settings → API**에서 확인
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **Publishable key** (또는 anon public key) ← 앱에 넣는 공개 키
   - `service_role` 키는 앱에 넣지 않아요 (서버 함수가 자동으로 사용)

## 2. 데이터베이스 · 사진 저장소 만들기

1. Supabase 대시보드 → **SQL Editor** → New query
2. 이 폴더의 `schema.sql` 내용을 전부 붙여넣고 **Run**
3. 확인: Table Editor에 `ayo_items`, `ayo_profiles` / Storage에 `photos` 버킷(비공개)

## 3. 이메일(아이디) 가입 설정

1. **Authentication → Sign In / Providers → Email**: 켜짐 확인
2. **Confirm email** 켜기 권장 (가입 시 인증 메일 확인)
3. **Authentication → URL Configuration**
   - Site URL: `https://ayoajeyo.github.io/posture-check/`
   - Redirect URLs에 추가: `https://ayoajeyo.github.io/posture-check/**`, `http://localhost:8765/**`
4. **메일 발송 서비스 연결 (필수 · 2026-10-16 결정, ADR-015)** — Supabase 기본 발송기는 시험용이라 **프로젝트 팀원 주소에만** 메일을 보내고, 프로젝트 전체에서 **시간당 2통** 정도만 보낸다. 연결하지 않으면 다른 센터는 가입 인증·비밀번호 찾기 메일을 받지 못한다.
   - ① Google 계정 `ayobodyyo@gmail.com` → 보안 → **2단계 인증** 켜기
   - ② https://myaccount.google.com/apppasswords → 이름 `Supabase` → **앱 비밀번호 16자리** 만들기 (이 값은 Supabase 화면에만 입력 · 저장소·메모·채팅에 적지 않는다)
   - ③ **Authentication → Emails → SMTP Settings → Enable custom SMTP** 켜기
     | 칸 | 값 |
     |---|---|
     | Sender email | `ayobodyyo@gmail.com` |
     | Sender name | `아요바디요` |
     | Host | `smtp.gmail.com` |
     | Port | `465` |
     | Username | `ayobodyyo@gmail.com` |
     | Password | ②의 앱 비밀번호 (띄어쓰기 없이) |
     | Minimum interval | `60` 초 (기본값 그대로) |
   - ④ **Authentication → Rate Limits → Rate limit for sending emails**: 시간당 `30` (연결 직후 기본값 · Gmail 하루 한도 약 500통 안쪽이면 더 올려도 됨)
   - ⑤ **Authentication → Emails → Templates** 에서 아래 한국어 템플릿으로 바꾸기 (선택 · 권장)
   - ⑥ 팀원이 아닌 새 주소로 가입해 인증 메일이 오는지 확인 (스팸함 포함)
   - 메뉴 이름은 Supabase 화면 개편에 따라 조금 다를 수 있다

   **가입 인증 (Confirm signup)** — 제목: `[아요바디요] 이메일 인증을 완료해 주세요`
   ```html
   <h2>아요바디요 가입을 환영합니다</h2>
   <p>아래 단추를 누르면 이메일 인증이 끝나고 바로 로그인됩니다.</p>
   <p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p>
   <p>본인이 가입하지 않았다면 이 메일을 무시해 주세요.</p>
   <p style="color:#888;font-size:12px">made by AYOAJEYO · 문의 ayobodyyo@gmail.com</p>
   ```
   **비밀번호 재설정 (Reset password)** — 제목: `[아요바디요] 비밀번호 재설정 안내`
   ```html
   <h2>비밀번호를 다시 정해 주세요</h2>
   <p>아래 단추를 눌러 새 비밀번호를 정하면 됩니다.</p>
   <p><a href="{{ .ConfirmationURL }}">비밀번호 재설정하기</a></p>
   <p>본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 바뀌지 않습니다.</p>
   <p style="color:#888;font-size:12px">made by AYOAJEYO · 문의 ayobodyyo@gmail.com</p>
   ```

## 4. 구글 로그인

1. https://console.cloud.google.com → 프로젝트 만들기
2. **OAuth 동의 화면**: 외부(External), 앱 이름 `아요바디요`, 지원 이메일, 개인정보 처리방침 URL `https://ayoajeyo.github.io/posture-check/privacy.html`
3. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기** → 유형 **웹 애플리케이션**
   - 승인된 JavaScript 원본: `https://ayoajeyo.github.io`
   - 승인된 리디렉션 URI: Supabase의 Google 설정 화면에 나오는 Callback URL (`https://<프로젝트>.supabase.co/auth/v1/callback`)
4. 받은 **Client ID / Client Secret**을 Supabase **Sign In / Providers → Google**에 입력 → Enable

## 5. 카카오 로그인

1. https://developers.kakao.com → **앱 만들기** (앱 이름 `아요바디요`)
2. **앱 설정 → 플랫폼 → Web**: 사이트 도메인 `https://ayoajeyo.github.io`
3. **앱 키(REST API 키)** 복사 → Supabase Kakao의 **Client ID**
4. REST API 키 편집 → **카카오 로그인 Client Secret** 활성화 → 코드 복사 → Supabase Kakao의 **Client Secret**
5. 같은 화면 **Redirect URI**: Supabase Kakao 설정 화면의 Callback URL
6. **제품 설정 → 카카오 로그인**: 사용 ON, State ON
7. **동의항목**: 닉네임·프로필 사진 설정
   - `account_email`(이메일)은 **비즈 앱**만 받을 수 있어요. 비즈 앱 전환 전이라면 Supabase Kakao 설정에서 **Allow users without an email**을 켜 주세요.
8. Supabase **Sign In / Providers → Kakao** → Enable

## 6. 네이버 로그인 (서버 함수 방식)

Supabase가 네이버를 기본 지원하지 않아서, 이 폴더의 `functions/naver-auth` 함수로 연결해요.

1. https://developers.naver.com → **Application 등록**
   - 사용 API: **네이버 로그인**, 제공 정보: **이메일(필수)**, 이름
   - 서비스 환경: PC웹·모바일웹 → 서비스 URL `https://ayoajeyo.github.io`
   - Callback URL: `https://ayoajeyo.github.io/posture-check/`
2. 받은 **Client ID / Client Secret**
   - Client ID → Claude에게 전달 (공개값)
   - Client Secret → Supabase **Edge Functions → Secrets**에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`으로 저장
3. 함수 배포 (`naver-auth`, `delete-account`)
   - 대시보드 **Edge Functions → Deploy a new function**에서 코드 붙여넣기, 또는 Supabase CLI로 배포
   - 원하시면 Claude가 PC에서 Supabase CLI로 배포를 진행할 수 있어요 (로그인은 본인이 브라우저에서)
4. 네이버는 **검수 전에는 등록한 테스터 아이디만** 로그인돼요. 출시 전 **검수 요청** 필요.

## 7. Claude에게 전달할 값 (공개값만)

| 항목 | 예시 |
|---|---|
| Supabase Project URL | `https://abcd1234.supabase.co` |
| Supabase Publishable(anon) key | `sb_publishable_...` 또는 `eyJ...` |
| 네이버 Client ID | `AbCdEf...` |
| 완료한 항목 | 2 / 3 / 4 / 5 / 6 중 완료한 번호 |

## 8. 출시 전 꼭 필요한 것

- **개인정보 처리방침 개정**: 수집 항목(이메일·이름), 회원(고객)의 신체 측정값·사진, 보관 위치(Supabase 서울 리전), 보관 기간, 삭제 방법
- **민감정보 동의**: 체형·관절 측정값과 신체 사진은 건강 관련 정보로 볼 수 있어 가입 시 **별도 동의** 화면을 둬요
- **계정 삭제**: 앱 안 [계정 삭제] + 웹 삭제 안내 페이지 (Google Play 정책)
- **Play Console 데이터 보안 양식** 업데이트: 계정 정보, 건강·피트니스 정보, 사진 수집·저장 반영
