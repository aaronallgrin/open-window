// Open Window relay for Beestat — a Cloudflare Worker.
// Beestat only accepts browser requests from its own site, so the app asks this relay instead,
// and the relay asks Beestat. It only forwards the three read/sync calls the app uses.
//
// Optional: add your Beestat key as a Worker secret named BEESTAT_KEY.
// Then nobody's browser needs the key, and a share link is all your partner needs.

const ORIGINS = ["https://aaronallgrin.github.io"];
const ALLOWED = {
  thermostat: ["read_id", "sync"],
  ecobee_thermostat: ["read_id"],
};

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const json = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

    const u = new URL(req.url);
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

    const r = await fetch(up, { headers: { "User-Agent": "OpenWindow-relay" } });
    return new Response(r.body, {
      status: r.status,
      headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
    });
  },
};
