/**
 * CCMS — API Gateway (Cloudflare Worker)
 *
 * Peran Worker:
 *  - Menangani semua request /api/* dari frontend (public + internal).
 *  - CORS, normalisasi path, validasi bentuk request.
 *  - Forward request ke Google Apps Script (backend).
 *  - CACHE: response publik (public.info, public.page) di-cache 60 detik
 *    agar page load tidak menembus ke Google Sheets berulang kali.
 *
 * Yang TIDAK dilakukan di sini:
 *  - Autentikasi, otorisasi, validasi bisnis, logika apa pun.
 *  Semua keamanan ditegakkan di Apps Script.
 *
 * Catatan teknis:
 *  - GAS web app selalu membalas HTTP 200 dengan body JSON; status HTTP
 *    "asli" dikirim di field `status` dalam body dan dibangun kembali di sini.
 *  - Token sesi dikirim di body (field meta.token), bukan cookie.
 *  - Cache hanya untuk action publik TANPA token. Response ber-token
 *    (auth.*, users.*, config.* dst.) TIDAK pernah di-cache.
 *  - Pola cache: body dibaca SEKALI sebagai string, Response terpisah
 *    dibangun untuk cache dan client (menghindari stream lock 500).
 */

// Action yang boleh di-cache (publik, tanpa token, data jarang berubah)
const CACHEABLE_ACTIONS = new Set(["public.info", "public.page"]);
const CACHE_TTL_SECONDS = 60;
const UPSTREAM_TIMEOUT_MS = 55000;

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
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
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

    const action = payload ? payload.action : "public.info";
    const hasToken = !!(payload && (payload.token || (payload.meta && payload.meta.token)));

    // ---- Cache untuk action publik tanpa token ----
    if (CACHEABLE_ACTIONS.has(action) && !hasToken) {
      const cache = caches.default;
      // Cloudflare Cache API BUTUH Request object (bukan string key)
      const cacheReq = new Request(request.url + '?__cache__=' + action + '&' + encodeURIComponent(JSON.stringify((payload && payload.payload) || {})));

      try {
        const cached = await cache.match(cacheReq);
        if (cached) {
          const text = await cached.text();
          return new Response(text, {
            status: 200,
            headers: Object.assign({
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=" + CACHE_TTL_SECONDS,
              "X-CCMS-Cache": "HIT",
            }, cors),
          });
        }
      } catch (e) {
        console.error("CCMS cache MATCH error:", e && e.message ? e.message : e);
      }

      // Cache miss → fetch dari backend
      const upstream = await fetchUpstream(env, payload, request);
      const text = await upstream.response.text();

      if (upstream.response.status === 200) {
        try {
          await cache.put(
            cacheReq,
            new Response(text, {
              status: 200,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=" + CACHE_TTL_SECONDS,
              },
            })
          );
        } catch (e) {
          console.error("CCMS cache PUT error:", e && e.message ? e.message : e);
        }
      }

      return new Response(text, {
        status: upstream.response.status,
        headers: Object.assign(
          {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=" + CACHE_TTL_SECONDS,
            "X-CCMS-Cache": "MISS",
          },
          cors
        ),
      });
    }

    // ---- Action non-cacheable (internal/ber-token) ----
    const upstream = await fetchUpstream(env, payload, request);
    const text = await upstream.response.text();
    return new Response(text, {
      status: upstream.response.status,
      headers: Object.assign(
        {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-CCMS-Cache": "BYPASS",
        },
        cors
      ),
    });
  },
};

/** Fetch ke Apps Script dengan timeout 55 detik + forward User-Agent. */
async function fetchUpstream(env, payload, request) {
  const gasUrl = env.GAS_URL || "";
  if (!gasUrl || gasUrl.indexOf("DEPLOY_ID") !== -1 || gasUrl.indexOf("CONFIGURE_") === 0) {
    return {
      response: json(
        { ok: false, error: { code: "CONFIG_ERROR", message: "GAS_URL belum dikonfigurasi di Worker" } },
        500,
        corsHeaders(request.headers.get("Origin") || "", [])
      ),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const upstream = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0 (compatible; CCMS-Worker)",
      },
      body: JSON.stringify({
        action: payload ? payload.action : "public.info",
        payload: payload && payload.payload ? payload.payload : {},
        meta: {
          token: (payload && (payload.token || (payload.meta && payload.meta.token))) || "",
          ip: request.headers.get("cf-connecting-ip") || "",
          userAgent: (request.headers.get("User-Agent") || "").slice(0, 255),
        },
      }),
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const upstreamJson = await upstream.json();

    const status = upstreamJson && typeof upstreamJson.status === "number" ? upstreamJson.status : 502;
    const out = { ok: !!upstreamJson.ok };
    if (upstreamJson.data !== undefined) out.data = upstreamJson.data;
    if (upstreamJson.error !== undefined) out.error = upstreamJson.error;
    return { response: json(out, status, corsHeaders(request.headers.get("Origin") || "", [])) };
  } catch (e) {
    if (e && e.name === "AbortError") {
      return { response: json({ ok: false, error: { code: "UPSTREAM_TIMEOUT", message: "Backend timeout, coba lagi" } }, 504, {}) };
    }
    return { response: json({ ok: false, error: { code: "UPSTREAM_ERROR", message: "Backend tidak dapat dihubungi" } }, 502, {}) };
  }
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, cors || {}),
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
