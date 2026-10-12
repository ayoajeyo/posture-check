// v185 리포트 공유 링크 열람 (로그인 없이 회원이 여는 r.html에서 호출)
// - 링크 키가 유효하고 만료·중지되지 않았을 때만 10분짜리 이미지 주소를 발급
// - 공유 이미지는 비공개 버킷(shares)에 있어서 이 함수를 거치지 않으면 볼 수 없음
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminKey, cors, json } from "../_cors.ts";

const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;

// 화면에 그대로 보여줄 센터 정보만 골라서 돌려줌 (예약 링크는 http(s)만)
function cleanCenter(c: Record<string, unknown>) {
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const book = s(c.book, 300);
  const logo = s(c.logo, 450000);
  return {
    name: s(c.name, 40),
    contact: s(c.contact, 60),
    phone: s(c.phone, 20).replace(/[^0-9+\-]/g, ""),
    book: /^https?:\/\//i.test(book) ? book : "",
    logo: /^data:image\/(png|jpeg|webp);base64,/i.test(logo) ? logo : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    let k = "";
    try { k = String((await req.json())?.k || ""); } catch (_) { /* 잘못된 요청 */ }
    if (!KEY_RE.test(k)) return json(req, { error: "notfound" }, 404);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: row, error } = await admin.from("ayo_shares")
      .select("id, image_path, center, created_at, expires_at, views").eq("id", k).maybeSingle();
    if (error) { console.error("[share-view]", error); return json(req, { error: "server" }, 500); }
    if (!row) return json(req, { error: "notfound" }, 404);
    if (new Date(row.expires_at).getTime() <= Date.now()) return json(req, { error: "expired" }, 410);

    const { data: su, error: se } = await admin.storage.from("shares").createSignedUrl(row.image_path, 600);
    if (se || !su?.signedUrl) return json(req, { error: "notfound" }, 404);

    // 조회수 (실패해도 열람은 계속)
    await admin.from("ayo_shares").update({ views: (row.views || 0) + 1 }).eq("id", k).then(() => {}, () => {});

    return json(req, {
      image: su.signedUrl,
      center: cleanCenter((row.center || {}) as Record<string, unknown>),
      created_at: row.created_at,
      expires_at: row.expires_at,
    });
  } catch (e) {
    console.error("[share-view]", e);
    return json(req, { error: "server" }, 500);
  }
});
