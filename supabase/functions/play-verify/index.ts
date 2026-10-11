// Google Play 월 구독 확인 (v158)
// 앱이 받은 구매 토큰을 Google Play 서버에 직접 물어봐서 진짜 결제인지 확인 → 구독 확정(acknowledge) → ayo_subs에 기록
// 토큰 없이 부르면: 이 계정에 저장된 구독을 Google에 다시 확인(자동 갱신·해지 반영)
// 필요한 비밀값(대시보드 Edge Functions → Secrets에만 저장): GOOGLE_PLAY_SA_JSON = 서비스 계정 JSON 키 전체
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminKey, cors, json } from "../_cors.ts";

const PKG = "com.physiomaster.posture";
const PRODUCTS = ["ayo_pro_monthly"];
const ENTITLED = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;

function b64u(buf: ArrayBuffer | Uint8Array | string): string {
  const b = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let tokCache: { t: string; exp: number } | null = null;
async function googleToken(): Promise<string> {
  if (tokCache && tokCache.exp > Date.now() + 60_000) return tokCache.t;
  const raw = Deno.env.get("GOOGLE_PLAY_SA_JSON");
  if (!raw) throw new Error("NO_SA");
  const sa = JSON.parse(raw);
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + body)));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + head + "." + body + "." + sig,
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("GOOGLE_AUTH " + r.status);
  tokCache = { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokCache.t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: u, error } = await admin.auth.getUser(jwt);
    if (error || !u?.user) return json(req, { error: "로그인이 필요해요" }, 401);
    const uid = u.user.id;

    let body: { purchaseToken?: string; productId?: string } = {};
    try { body = await req.json(); } catch (_) { /* 빈 요청 = 다시 확인 */ }
    let token = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    if (token.length > 4096) return json(req, { error: "잘못된 요청" }, 400);

    if (!token) {   // 저장된 구독 다시 확인
      const { data: row } = await admin.from("ayo_subs").select("purchase_token").eq("user_id", uid).maybeSingle();
      if (!row) return json(req, { pro: false, none: true });
      token = row.purchase_token;
    }
    // 같은 구독을 다른 계정이 이미 쓰고 있으면 거절 (구독 1개 = 계정 1개)
    const { data: other } = await admin.from("ayo_subs").select("user_id").eq("purchase_token", token).neq("user_id", uid).maybeSingle();
    if (other) return json(req, { error: "이 구독은 다른 계정에 연결돼 있어요. 구독한 계정으로 로그인해 주세요.", code: "OTHER_ACCOUNT" }, 409);

    let gt: string;
    try { gt = await googleToken(); } catch (e) {
      console.error("[play-verify] google auth", e);
      return json(req, { error: "결제 확인 설정이 아직 끝나지 않았어요. 잠시 뒤 다시 시도해 주세요." }, 503);
    }
    const r = await fetch(API + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(token), { headers: { Authorization: "Bearer " + gt } });
    if (r.status === 404 || r.status === 410 || r.status === 400) {
      await admin.from("ayo_subs").update({ state: "SUBSCRIPTION_STATE_EXPIRED", updated_at: new Date().toISOString() }).eq("user_id", uid).eq("purchase_token", token);
      return json(req, { pro: false, state: "INVALID" });
    }
    if (!r.ok) { console.error("[play-verify] google", r.status, await r.text()); return json(req, { error: "결제 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 502); }
    const s = await r.json();
    const items: { productId: string; expiryTime?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[] = s.lineItems || [];
    const item = items.find((x) => PRODUCTS.includes(x.productId));
    if (!item) return json(req, { error: "아요바디요 PRO 구독이 아니에요." }, 400);
    const exp = Math.max(0, ...items.map((x) => Date.parse(x.expiryTime || "") || 0));
    const state = String(s.subscriptionState || "");

    // 구매 확정: 3일 안에 안 하면 Google이 자동 환불함
    if (s.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" && state === "SUBSCRIPTION_STATE_ACTIVE") {
      const a = await fetch(API + "/purchases/subscriptions/" + encodeURIComponent(item.productId) + "/tokens/" + encodeURIComponent(token) + ":acknowledge",
        { method: "POST", headers: { Authorization: "Bearer " + gt, "Content-Type": "application/json" }, body: "{}" });
      if (!a.ok) console.error("[play-verify] ack", a.status, await a.text());
    }
    const row = {
      user_id: uid, product_id: item.productId, purchase_token: token, state,
      expires_at: exp ? new Date(exp).toISOString() : null,
      auto_renew: !!item.autoRenewingPlan?.autoRenewEnabled, updated_at: new Date().toISOString(),
    };
    const { error: ue } = await admin.from("ayo_subs").upsert(row, { onConflict: "user_id" });
    if (ue) { console.error("[play-verify] save", ue); return json(req, { error: "구독 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 500); }
    const pro = ENTITLED.includes(state) && exp > Date.now();
    return json(req, { pro, state, expires_at: row.expires_at, auto_renew: row.auto_renew });
  } catch (e) {
    console.error("[play-verify]", e);
    return json(req, { error: "서버 오류" }, 500);
  }
});
