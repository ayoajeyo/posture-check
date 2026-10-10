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
    if (!tk.access_token) return json(req, { error: "네이버 인증에 실패했어요" }, 401);

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
    const made = await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { provider: "naver", naver_id: p.id, name: p.name || p.nickname || "" },
    }).catch(() => null);
    const created = !!(made && made.data && made.data.user);

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data?.properties?.hashed_token){ console.error("[naver-auth] link", error); return json(req, { error: "로그인 토큰을 만들지 못했어요" }, 500); }
    // 보안: 같은 이메일로 '인증 안 된' 이메일 가입이 먼저 있었다면(남이 미리 만들어 둔 계정일 수 있음)
    // 그 비밀번호는 무효로 바꾸고 네이버로 확인된 본인 계정으로 확정
    const u = data.user;
    // 보안: 이 계정에 이미 다른 네이버 계정이 연결돼 있으면 거절 (네이버 이메일을 바꿔 남의 계정에 들어오는 것 방지)
    // 처음 연결할 때 네이버 고유번호를 app_metadata(본인이 바꿀 수 없는 값)에 기록
    const linked = u && u.app_metadata && u.app_metadata.naver_id;
    if (linked && linked !== p.id) return json(req, { error: "이 이메일 계정에는 다른 네이버 계정이 연결돼 있어요. 이메일로 로그인해 주세요." }, 403);
    // 보안(v150): 이미 다른 방법(이메일·구글·카카오)으로 가입해 인증까지 마친 계정에는 네이버를 자동으로 연결하지 않음
    //   (네이버 프로필 이메일만 맞추면 남의 계정에 들어오는 것 방지) · 예전에 네이버로 만든 계정(user_metadata.naver_id 같음)은 허용
    const ownNaver = !!(u && u.user_metadata && u.user_metadata.naver_id === p.id);
    if (u && !linked && !created && !ownNaver && u.email_confirmed_at) {
      return json(req, { error: "이 이메일은 이미 다른 방법(이메일·카카오·구글)으로 가입돼 있어요. 처음 가입한 방법으로 로그인해 주세요." }, 409);
    }
    if (u && !u.email_confirmed_at) {
      const rnd = crypto.randomUUID() + crypto.randomUUID();
      await admin.auth.admin.updateUserById(u.id, { password: rnd, email_confirm: true, app_metadata: { naver_id: p.id } });
    } else if (u && !linked) {
      await admin.auth.admin.updateUserById(u.id, { app_metadata: { naver_id: p.id } });
    }
    return json(req, { token_hash: data.properties.hashed_token, email });
  } catch (e) {
    console.error("[naver-auth]", e);
    return json(req, { error: "서버 오류" }, 500);
  }
});
