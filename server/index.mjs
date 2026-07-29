import 'node:process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { createApiHandler } from './core.mjs';

const port = Number(process.env.PORT || 8787);
const defaultDist = resolve(process.env.STATIC_DIR || './dist');
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

function isInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === ''
    || (pathFromRoot !== '..' && !pathFromRoot.startsWith('../') && !pathFromRoot.startsWith('..\\') && !isAbsolute(pathFromRoot));
}

function serveStatic(req, res, staticDir) {
  const url = new URL(req.url || '/', 'http://localhost');
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  if (decodedPath.includes('\0')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  const relativePath = decodedPath.replaceAll('\\', '/').replace(/^\/+/, '');
  let file = resolve(staticDir, relativePath || 'index.html');
  if (!isInside(staticDir, file)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(staticDir, 'index.html');
  if (!existsSync(file)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('尚未建立前端檔案，請先執行 npm run build。');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  createReadStream(file).pipe(res);
}

export function createAppServer({ staticDir = defaultDist, apiHandler = createApiHandler() } = {}) {
  const resolvedStaticDir = resolve(staticDir);
  return createServer((req, res) => {
    if ((req.url || '').startsWith('/api/')) {
      void apiHandler(req, res);
      return;
    }
    serveStatic(req, res, resolvedStaticDir);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Prompt Words running at http://localhost:${port}`);
  });
}
