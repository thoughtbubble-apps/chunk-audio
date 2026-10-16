export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/__version") return Response.json({ sha: env.DEPLOYED_SHA }, { headers: { "cache-control": "no-store" } });
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", {status: 405, headers: {allow: "GET, HEAD"}});
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("x-deployed-sha", env.DEPLOYED_SHA);
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    headers.set("cross-origin-opener-policy", "same-origin");
    headers.set("cross-origin-embedder-policy", "require-corp");
    return new Response(request.method === "HEAD" ? null : response.body, {status: response.status, headers});
  }
};
