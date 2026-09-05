/**
 * 产教研平台 · 沉浸式课堂 —— 云函数代理
 * 部署位置：Cloudflare Pages Functions（functions/api/chat.js → 路由 /api/chat）
 *
 * 职责：浏览器与模型 API 之间的透明中转，解决浏览器 CORS 限制。
 * 1. 接收前端同域 POST 请求（携带完整请求体 + Authorization 头）
 * 2. 原样转发到目标模型 API（服务端到服务端，无浏览器跨域限制）
 * 3. 将模型响应（含流式 SSE）原样回传
 *
 * 安全：不存储、不记录 API Key 与请求内容，仅做透传。
 */

export async function onRequest(context) {
  const { request } = context;

  // 处理预检请求（跨源/本地调试兜底）
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let parsed;
  try {
    parsed = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // 目标模型 API 地址由前端传入（实现多模型可配置），缺省回退 DeepSeek
  const targetBaseUrl = (parsed.targetBaseUrl || "https://api.deepseek.com/v1").replace(/\/+$/, "");
  const upstreamUrl = targetBaseUrl + "/chat/completions";
  const auth = request.headers.get("Authorization") || "";

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": auth,
    },
    body: JSON.stringify(parsed.payload),
  });

  // 原样透传（含流式 SSE），前端拿到完整响应体
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
