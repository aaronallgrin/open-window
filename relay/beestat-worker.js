// Open Window relay for Beestat — a Cloudflare Worker.
// Beestat only accepts browser requests from its own site, so the app asks this relay instead,
// and the relay asks Beestat. It only forwards the two calls the app uses (thermostat read and sync),
// and it returns only the fields the app needs.
//
// Optional secrets (Worker → Settings → Variables and Secrets):
//   BEESTAT_KEY  Your Beestat API key. Then nobody's browser needs the key, and a share link is all your partner needs.
//   RELAY_TOKEN  Any long random string. The relay then only answers at https://<your-worker>/<RELAY_TOKEN>,
//                so someone who finds or guesses the bare Worker address can't read your thermostat.
//                Paste that full address (token included) into the app's "Relay address" field.

const ORIGINS = ["https://aaronallgrin.github.io"];
const ALLOWED = {
  thermostat: ["read_id", "sync"],
};
// Fields the app reads from each thermostat row. Everything else Beestat returns stays here.
const ROW_FIELDS = ["thermostat_id", "name", "temperature", "humidity", "sync_end"];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const json = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

    const u = new URL(req.url);

    // With RELAY_TOKEN set, the token is the path. Anything else gets a plain 404, so the relay doesn't reveal itself.
    if (env.RELAY_TOKEN) {
      const path = u.pathname.replace(/\/+$/, "");
      if (!timingSafeEqual(path, "/" + env.RELAY_TOKEN)) return json(404, { success: false, data: { error_message: "Not found" } });
    }

    const resource = u.searchParams.get("resource");
    const method = u.searchParams.get("method");
    if (!resource && !method) return json(200, { success: true, data: { relay: "Open Window relay is running" } });
    if (!ALLOWED[resource]?.includes(method)) return json(403, { success: false, data: { error_message: "This relay only allows thermostat reads." } });

    const key = env.BEESTAT_KEY || u.searchParams.get("api_key");
    if (!key) return json(401, { success: false, data: { error_message: "No Beestat key. Add one in the app or as the relay's BEESTAT_KEY secret." } });

    const up = new URL("https://api.beestat.io/");
    up.searchParams.set("api_key", key);
    up.searchParams.set("resource", resource);
    up.searchParams.set("method", method);
    const args = u.searchParams.get("arguments");
    if (args) up.searchParams.set("arguments", args);

    let r, body;
    try {
      r = await fetch(up, { headers: { "User-Agent": "OpenWindow-relay" }, signal: AbortSignal.timeout(20000) });
      body = await r.json();
    } catch (e) {
      const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
      return json(502, { success: false, data: { error_message: timedOut ? "Beestat took too long to answer." : "Beestat sent an unreadable answer or couldn't be reached." } });
    }

    if (!body || body.success === false) {
      return json(r.ok ? 502 : r.status, { success: false, data: { error_message: body?.data?.error_message || `Beestat error (HTTP ${r.status})` } });
    }

    if (method === "sync") return json(200, { success: true, data: null });

    // read_id: keep the { id: row } shape the app expects, with only the fields it uses.
    const out = {};
    for (const [id, row] of Object.entries(body.data || {})) {
      if (!row || typeof row !== "object") continue;
      out[id] = Object.fromEntries(ROW_FIELDS.filter(f => f in row).map(f => [f, row[f]]));
    }
    return json(200, { success: true, data: out });
  },
};

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
