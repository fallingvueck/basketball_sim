const PREVIEW_ASSET_REV = "growth-ui-v1-20260817d";

function previewAssets() {
  return [
    `<link rel="stylesheet" href="/preview-growth.css?v=${PREVIEW_ASSET_REV}">`,
    `<script defer src="/preview-growth-core.js?v=${PREVIEW_ASSET_REV}"></script>`,
    `<script defer src="/preview-public-read.js?v=${PREVIEW_ASSET_REV}"></script>`,
  ].join("");
}

export async function onRequest(context) {
  const response = await context.next();
  if (context.request.method !== "GET") return response;

  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/")) return response;

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;

  const html = await response.text();
  if (html.includes("preview-growth-core.js")) {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }

  const assets = previewAssets();
  const output = html.includes("</body>")
    ? html.replace("</body>", assets + "</body>")
    : html + assets;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-cache");

  return new Response(output, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
