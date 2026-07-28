import 'node:process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createApiHandler } from './core.mjs';

const port = Number(process.env.PORT || 8787);
const dist = resolve(process.env.STATIC_DIR || './dist');
const api = createApiHandler();
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(dist, relative || 'index.html');
  if (file !== dist && !file.startsWith(`${dist}/`)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  if (!existsSync(file)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('尚未建立前端檔案，請先執行 npm run build。');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    void api(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Prompt Words running at http://localhost:${port}`);
});
