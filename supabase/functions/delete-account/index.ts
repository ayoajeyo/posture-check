// 계정 삭제 (Google Play 정책: 앱 안에서 계정과 데이터를 삭제할 수 있어야 함)
// 로그인한 본인 요청만 처리: 사진 파일 삭제 → 계정 삭제(기록·프로필은 계정 삭제 시 함께 삭제됨)
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminKey, cors, json } from "../_cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: u, error } = await admin.auth.getUser(jwt);
    if (error || !u?.user) return json(req, { error: "로그인이 필요해요" }, 401);
    const uid = u.user.id;

    // 사진 폴더 비우기: photos/{uid}/ 와 photos/{uid}/blobs/ (1000개씩)
    for (const dir of [uid + "/blobs", uid]) {
      for (let guard = 0; guard < 200; guard++) {
        const { data: files } = await admin.storage.from("photos").list(dir, { limit: 1000 });
        const real = (files || []).filter((f) => f.id);   // 폴더 항목(id 없음)은 제외
        if (!real.length) break;
        await admin.storage.from("photos").remove(real.map((f) => dir + "/" + f.name));
        if (real.length < 1000) break;
      }
    }
    const del = await admin.auth.admin.deleteUser(uid);
    if (del.error) return json(req, { error: "계정 삭제 실패", detail: del.error.message }, 500);
    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: "서버 오류", detail: String(e) }, 500);
  }
});
