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

    // 사진 폴더 전체 비우기: photos/{uid}/ 아래 모든 파일(하위 폴더 포함 — v156 이미지 폴더까지)
    // 사진 삭제가 실패하면 계정을 지우지 않음 → 주인 없는 사진이 남지 않게(다시 시도 가능)
    const files: string[] = [];
    const dirs: string[] = [uid];
    let walked = 0;
    while (dirs.length) {
      const dir = dirs.pop()!;
      if (++walked > 20000) return json(req, { error: "사진이 너무 많아요. 잠시 뒤 다시 시도해 주세요." }, 500);
      for (let offset = 0; ; offset += 1000) {
        const { data: items, error: le } = await admin.storage.from("photos").list(dir, { limit: 1000, offset });
        if (le) return json(req, { error: "사진 목록을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 500);
        for (const it of items || []) {
          if (it.id) files.push(dir + "/" + it.name);   // 파일
          else dirs.push(dir + "/" + it.name);          // 폴더(id 없음) → 안으로 들어가기
        }
        if (!items || items.length < 1000) break;
      }
    }
    for (let i = 0; i < files.length; i += 1000) {
      const { error: re } = await admin.storage.from("photos").remove(files.slice(i, i + 1000));
      if (re) return json(req, { error: "사진을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 500);
    }
    const del = await admin.auth.admin.deleteUser(uid);
    if (del.error){ console.error("[delete-account]", del.error); return json(req, { error: "계정 삭제 실패" }, 500); }
    return json(req, { ok: true });
  } catch (e) {
    console.error("[delete-account]", e);
    return json(req, { error: "서버 오류" }, 500);
  }
});
