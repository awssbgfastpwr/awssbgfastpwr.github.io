import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);

const build = spawnSync(process.execPath, ['scripts/build-site.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8']
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^\.+/, '');
  return path.join(dist, normalized);
}

async function resolveFile(requestPath) {
  let file = safePath(requestPath);
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    if (!path.extname(file)) file = path.join(file, 'index.html');
  }
  try {
    await fs.access(file);
    return file;
  } catch {
    return path.join(dist, '404.html');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const file = await resolveFile(request.url || '/');
    const body = await fs.readFile(file);
    response.writeHead(file.endsWith('404.html') ? 404 : 200, {
      'content-type': contentTypes.get(path.extname(file)) || 'application/octet-stream'
    });
    response.end(body);
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Server error');
  }
});

server.listen(port, () => {
  console.log(`Serving ${path.relative(root, dist)} at http://localhost:${port}`);
});
