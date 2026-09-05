#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
产教研平台 · 沉浸式课堂 —— 本地零依赖代理
仅依赖 Python 标准库，无需 pip install 任何包。

用法：
    python proxy.py

功能：
    1. 代理 POST /api/chat → 转发到目标模型 API（解决浏览器 CORS）
    2. 托管前端页面（浏览器访问 http://127.0.0.1:8000 直接打开）
    3. 流式透传（保留 AI 回答的打字机效果）
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

PORT = 8000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(SCRIPT_DIR, "immersive-classroom.html")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body=b"", content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        if self.path in ("/", "/index.html", "/immersive-classroom.html"):
            try:
                with open(HTML_PATH, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except FileNotFoundError:
                self._send(404, "页面文件不存在，请确认 immersive-classroom.html 与本脚本同目录".encode("utf-8"),
                           "text/plain; charset=utf-8")
        else:
            self._send(404, b"Not Found", "text/plain")

    def do_POST(self):
        if self.path.rstrip("/") != "/api/chat":
            self._send(404, b"Not Found", "text/plain")
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            parsed = json.loads(body.decode("utf-8"))
        except Exception:
            self._send(400, b"Bad JSON", "text/plain")
            return

        target = (parsed.get("targetBaseUrl") or "https://api.deepseek.com/v1").rstrip("/")
        upstream_url = target + "/chat/completions"
        auth = self.headers.get("Authorization", "")
        payload = json.dumps(parsed.get("payload", {})).encode("utf-8")

        req = urlrequest.Request(upstream_url, data=payload, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", auth)

        try:
            resp = urlrequest.urlopen(req, timeout=600)
            self.send_response(resp.status)
            self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
            for k, v in CORS_HEADERS.items():
                self.send_header(k, v)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            # 流式逐块转发，保留打字机效果
            while True:
                chunk = resp.read(4096)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except HTTPError as e:
            self._send(e.code, e.read(), "application/json")
        except Exception as e:
            self._send(502, ("代理转发失败：" + str(e)).encode("utf-8"), "text/plain; charset=utf-8")

    def log_message(self, format, *args):
        pass  # 关闭访问日志


if __name__ == "__main__":
    print("=" * 50)
    print("  沉浸式课堂 · 本地代理已启动")
    print("  页面地址：http://127.0.0.1:%d" % PORT)
    print("  API 代理：http://127.0.0.1:%d/api/chat" % PORT)
    print("  按 Ctrl+C 停止")
    print("=" * 50)
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n代理已停止")
        server.server_close()
