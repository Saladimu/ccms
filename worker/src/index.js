/**
 * CCMS — API Gateway (Cloudflare Worker)
 *
 * Peran Worker:
 *  - Menangani semua request /api/* dari frontend (public + internal).
 *  - CORS, normalisasi path, validasi bentuk request.
 *  - Forward request ke Google Apps Script (backend).
 *
 * Yang TIDAK dilakukan di sini:
 *  - Autentikasi, otorisasi, validasi bisnis, logika apa pun.
 *  Semua keamanan ditegakkan di Apps Script (lihat docs/architecture/ARCHITECTURE.md).
 *
 * Catatan teknis:
 *  - GAS web app selalu membalas HTTP 200 dengan body JSON; status HTTP
 *    "asli" dikirim di field `status` dalam body dan dibangun kembali di sini.
 *  - Token sesi dikirim di body (field meta.token), bukan cookie.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const allowed = Array.isArray(env.ALLOWED_ORIGINS)
      ? env.ALLOWED_ORIGINS
      : env.ALLOWED_ORIGINS
        ? JSON.parse(env.ALLOWED_ORIGINS)
        : [];
    const cors = corsHeaders(request.headers.get("Origin") || "", allowed);

    // Hanya /api dan /api/* yang ditangani Worker. Halaman statis di-handle Cloudflare Pages.
    if (!url.pathname.startsWith("/api") && url.pathname !== "/api") {
      return json({ ok: false, error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" } }, 404, cors);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Metode tidak diizinkan" } }, 405, cors);
    }

    let payload = null;
    if (request.method === "POST") {
      try {
        payload = await request.json();
      } catch (e) {
        return json({ ok: false, error: { code: "BAD_REQUEST", message: "Body harus JSON valid" } }, 400, cors);
      }
      if (typeof payload !== "object" || payload === null || typeof payload.action !== "string") {
        return json({ ok: false, error: { code: "BAD_REQUEST", message: "Field 'action' (string) wajib ada" } }, 400, cors);
      }
    }

    const gasUrl = env.GAS_URL || "";
    if (!gasUrl || gasUrl.indexOf("DEPLOY_ID") !== -1) {
      return json({ ok: false, error: { code: "CONFIG_ERROR", message: "GAS_URL belum dikonfigurasi di Worker" } }, 500, cors);
    }

    let upstreamJson;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      const upstream = await fetch(gasUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "text/plain;charset=utf-8",
          "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0 (compatible; CCMS-Worker)"
        },
        body: JSON.stringify({
          action: payload ? payload.action : "public.info",
          payload: payload && payload.payload ? payload.payload : {},
          meta: {
            token: (payload && payload.token) || url.searchParams.get("token") || "",
            ip: request.headers.get("cf-connecting-ip") || "",
            userAgent: (request.headers.get("User-Agent") || "").slice(0, 255),
          },
        }),
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      upstreamJson = await upstream.json();
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return json({ ok: false, error: { code: "UPSTREAM_TIMEOUT", message: "Backend timeout, coba lagi" } }, 504, cors);
      }
      return json({ ok: false, error: { code: "UPSTREAM_ERROR", message: "Backend tidak dapat dihubungi" } }, 502, cors);
    }

    const status = upstreamJson && typeof upstreamJson.status === "number" ? upstreamJson.status : 502;
    const out = { ok: !!upstreamJson.ok };
    if (upstreamJson.data !== undefined) out.data = upstreamJson.data;
    if (upstreamJson.error !== undefined) out.error = upstreamJson.error;
    return json(out, status, cors);
  },
};

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, cors),
  });
}

function corsHeaders(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": allowed.indexOf(origin) !== -1 ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}