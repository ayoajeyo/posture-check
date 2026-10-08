// 앱 주소에서만 호출되도록 CORS 허용 목록 관리
export const ALLOWED = ["https://ayoajeyo.github.io", "http://localhost:8765"];
export function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(o) ? o : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

// 서버 전용 관리자 키: 새 방식(SUPABASE_SECRET_KEYS)을 먼저 쓰고, 없으면 예전 service_role 키
export function adminKey(): string {
  try {
    const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const v = j.default || Object.values(j)[0];
    if (v) return String(v);
  } catch (_) { /* 무시 */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}
