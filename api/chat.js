// ============================================================
//  知识脉络 · DeepSeek AI 问答代理（Vercel Edge Function 版）
//  作用：把浏览器请求转发给 DeepSeek，在服务端注入 API Key，
//        前端永远看不到 Key，同时解决跨域(CORS)问题。
// ------------------------------------------------------------
//  部署步骤（约 3 分钟，见同目录 README.md 图文版）：
//    1. vercel.com 用 GitHub 登录 → 新建项目
//    2. 把本文件放到项目的 api/chat.js（保持 api 目录结构）
//    3. 项目 Settings → Environment Variables 添加：
//         DEEPSEEK_KEY = sk-你的DeepSeek密钥
//         （可选）CLIENT_KEY = 自定义客户端密钥
//    4. 部署后拿到地址：https://你的项目.vercel.app/api/chat
//    5. 把该地址填进 index.html 的 AI_WORKER_URL
// ------------------------------------------------------------
//  与 Cloudflare Worker 版的两点区别：
//    ① 环境变量用 process.env.XXX 读取（Worker 是 env.XXX）
//    ② 函数放在 api/ 目录，Vercel 自动识别为接口
// ============================================================

export const config = {
  runtime: 'edge',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Key',
    'Access-Control-Max-Age': '86400'
  };
}

export default async function handler(request) {
  // OPTIONS 预检直接放行
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }),
      { status: 405, headers: corsHeaders() });
  }

  // 可选的客户端密钥校验（设置了 CLIENT_KEY 才校验）
  var clientKey = request.headers.get('X-Client-Key') || '';
  if (process.env.CLIENT_KEY && clientKey !== process.env.CLIENT_KEY) {
    return new Response(JSON.stringify({ error: '客户端密钥无效' }),
      { status: 401, headers: corsHeaders() });
  }

  // 读取前端对话体（messages 数组 + model + 是否流式）
  var body;
  try { body = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ error: '请求体不是合法 JSON' }),
      { status: 400, headers: corsHeaders() });
  }

  // 转发给 DeepSeek，服务端注入 Key（Vercel 用 process.env 读环境变量）
  var upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.DEEPSEEK_KEY
    },
    body: JSON.stringify({
      model: body.model || 'deepseek-chat',
      messages: body.messages || [],
      stream: !!body.stream,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
      max_tokens: body.max_tokens || 1024
    })
  });

  // 把 DeepSeek 响应【原样流式透传】给浏览器，保留 SSE 打字机效果，并补 CORS 头
  var headers = new Headers(corsHeaders());
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
  if (body.stream) headers.set('Cache-Control', 'no-cache');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: headers
  });
}
