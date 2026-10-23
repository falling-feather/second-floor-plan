import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT ?? 5177);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg':'image/svg+xml', '.glb':'model/gltf-binary', '.blend':'application/octet-stream', '.pdf':'application/pdf', '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end(); return;
    }
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !(await stat(target)).isFile()) {
      res.writeHead(404).end('Not found'); return;
    }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT' || code === 'ENOTDIR' || error instanceof URIError) res.writeHead(404).end('Not found');
    else { console.error(error); res.writeHead(500).end('Server error'); }
  }
});
server.on('error', (error) => { console.error(error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
