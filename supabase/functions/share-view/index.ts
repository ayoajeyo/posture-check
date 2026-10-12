// v185 리포트 공유 링크 열람 · v186 전화·예약 클릭 집계 + 센터 소개 페이지
// 로그인 없이 회원·방문자가 여는 r.html / c.html에서 호출
//   { k }            → 공유 리포트: 기간·중지 확인 후 10분짜리 이미지 주소 발급 (+조회 1)
//   { c }            → 센터 소개 페이지: 센터가 '공개'한 경우만 (+조회 1)
//   { k|c, ev }      → 전화(call)·예약(book) 버튼 누름 집계만
// 공유 이미지는 비공개 버킷(shares), 표는 본인 외 접근 불가 → 이 함수를 거쳐야만 볼 수 있음
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminKey, cors, json } from "../_cors.ts";

const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;
const SLUG_RE = /^[A-Za-z0-9_-]{8,40}$/;
const EVS = ["call", "book"];

const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
const httpUrl = (v: unknown) => { const u = s(v, 300); return /^https?:\/\//i.test(u) ? u : ""; };
const logoUrl = (v: unknown) => { const u = s(v, 450000); return /^data:image\/(png|jpeg|webp);base64,/i.test(u) ? u : ""; };
const phone = (v: unknown) => s(v, 20).replace(/[^0-9+\-]/g, "");

// 공유 리포트 화면에 보여줄 센터 정보만 골라서 (예약 링크는 http(s)만)
function cleanCenter(c: Record<string, unknown>) {
  return { name: s(c.name, 40), contact: s(c.contact, 60), phone: phone(c.phone), book: httpUrl(c.book), logo: logoUrl(c.logo) };
}
// 센터 소개 페이지
function cleanProfile(p: Record<string, unknown>) {
  const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string").slice(0, 8).map((t) => (t as string).slice(0, 20)) : [];
  const items = Array.isArray(p.items) ? p.items.filter((t) => typeof t === "string").slice(0, 6).map((t) => (t as string).slice(0, 20)) : [];
  return {
    ...cleanCenter(p),
    kind: s(p.kind, 20), intro: s(p.intro, 300), address: s(p.address, 80), hours: s(p.hours, 80), tags, items,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    let body: Record<string, unknown> = {};
    try { body = (await req.json()) || {}; } catch (_) { /* 잘못된 요청 */ }
    const k = String(body.k || ""), c = String(body.c || ""), ev = String(body.ev || "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const hit = (kind: string, key: string, e: string) =>
      admin.rpc("ayo_hit", { p_kind: kind, p_key: key, p_ev: e }).then(() => {}, () => {});

    // ---- 센터 소개 페이지 ----
    if (c) {
      if (!SLUG_RE.test(c)) return json(req, { error: "notfound" }, 404);
      if (EVS.includes(ev)) { await hit("center", c, ev); return json(req, { ok: true }); }
      const { data: row, error } = await admin.from("ayo_centers").select("profile, published").eq("slug", c).maybeSingle();
      if (error) { console.error("[share-view] center", error); return json(req, { error: "server" }, 500); }
      if (!row || !row.published) return json(req, { error: "notfound" }, 404);
      await hit("center", c, "view");
      return json(req, { profile: cleanProfile((row.profile || {}) as Record<string, unknown>) });
    }

    // ---- 공유 리포트 ----
    if (!KEY_RE.test(k)) return json(req, { error: "notfound" }, 404);
    const { data: row, error } = await admin.from("ayo_shares")
      .select("id, user_id, image_path, center, created_at, expires_at").eq("id", k).maybeSingle();
    if (error) { console.error("[share-view]", error); return json(req, { error: "server" }, 500); }
    if (!row) return json(req, { error: "notfound" }, 404);
    if (new Date(row.expires_at).getTime() <= Date.now()) return json(req, { error: "expired" }, 410);
    if (EVS.includes(ev)) { await hit("share", k, ev); return json(req, { ok: true }); }

    const { data: su, error: se } = await admin.storage.from("shares").createSignedUrl(row.image_path, 600);
    if (se || !su?.signedUrl) return json(req, { error: "notfound" }, 404);
    await hit("share", k, "view");

    // 센터가 소개 페이지를 공개했으면 [센터 소개 보기] 연결
    let page = "";
    const { data: ctr } = await admin.from("ayo_centers").select("slug, published").eq("user_id", row.user_id).maybeSingle();
    if (ctr && ctr.published) page = ctr.slug;

    return json(req, {
      image: su.signedUrl,
      center: cleanCenter((row.center || {}) as Record<string, unknown>),
      page,
      created_at: row.created_at,
      expires_at: row.expires_at,
    });
  } catch (e) {
    console.error("[share-view]", e);
    return json(req, { error: "server" }, 500);
  }
});
