// 네이버 로그인 → Supabase 계정 로그인
// 앱이 네이버에서 받은 code/state를 보내면: 네이버 토큰 교환 → 프로필(이메일) 확인 →
// 같은 이메일의 Supabase 계정을 찾거나 만들고 → 1회용 로그인 토큰(token_hash)을 돌려준다.
// 앱은 supabase.auth.verifyOtp({ token_hash, type: "magiclink" })로 로그인 완료.
// 필요한 비밀값(Supabase 대시보드 > Edge Functions > Secrets): NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminKey, cors, json } from "../_cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const { code, state } = await req.json();
    if (!code || !state) return json(req, { error: "code와 state가 필요해요" }, 400);

    const id = Deno.env.get("NAVER_CLIENT_ID")!, secret = Deno.env.get("NAVER_CLIENT_SECRET")!;
    const tk = await fetch("https://nid.naver.com/oauth2.0/token?" + new URLSearchParams({
      grant_type: "authorization_code", client_id: id, client_secret: secret, code, state,
    })).then((r) => r.json());
    if (!tk.access_token) return json(req, { error: "네이버 인증에 실패했어요", detail: tk.error_description }, 401);

    const me = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: "Bearer " + tk.access_token },
    }).then((r) => r.json());
    const p = me && me.response;
    if (!p || !p.email) return json(req, { error: "네이버 계정의 이메일 제공 동의가 필요해요" }, 400);
    const email = String(p.email).toLowerCase();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // 처음이면 계정 생성(이메일 확인 완료 상태). 이미 있으면 오류가 나도 그대로 진행.
    await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { provider: "naver", naver_id: p.id, name: p.name || p.nickname || "" },
    }).catch(() => null);

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data?.properties?.hashed_token) return json(req, { error: "로그인 토큰을 만들지 못했어요", detail: error?.message }, 500);
    // 보안: 같은 이메일로 '인증 안 된' 이메일 가입이 먼저 있었다면(남이 미리 만들어 둔 계정일 수 있음)
    // 그 비밀번호는 무효로 바꾸고 네이버로 확인된 본인 계정으로 확정
    const u = data.user;
    if (u && !u.email_confirmed_at) {
      const rnd = crypto.randomUUID() + crypto.randomUUID();
      await admin.auth.admin.updateUserById(u.id, { password: rnd, email_confirm: true });
    }
    return json(req, { token_hash: data.properties.hashed_token, email });
  } catch (e) {
    return json(req, { error: "서버 오류", detail: String(e) }, 500);
  }
});
