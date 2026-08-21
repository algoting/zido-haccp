const http = require('http');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, 'web');
const WEBSITE_DIR = path.join(__dirname, 'website');
const API_TARGET = { host: '127.0.0.1', port: 3000 };

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function serveStatic(baseDir, req, res, isSpa = true) {
  let reqPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  let filePath = path.join(baseDir, reqPath);

  // Security check: ensure inside baseDir
  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else if (isSpa) {
      // SPA Fallback: Serve index.html
      const indexPath = path.join(baseDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
}

function proxyRequest(target, req, res) {
  const options = {
    hostname: target.host,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${target.host}:${target.port}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${req.method} ${req.url} ->`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
}

// 1. Web App Server (Port 5173) with API Proxy & Marketing Site route
const webAppServer = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (urlPath.startsWith('/api') || urlPath.startsWith('/uploads') || urlPath.startsWith('/health')) {
    proxyRequest(API_TARGET, req, res);
  } else if (urlPath.startsWith('/vitrine') || urlPath.startsWith('/site') || urlPath.startsWith('/marketing')) {
    req.url = req.url.replace(/^\/(vitrine|site|marketing)/, '') || '/';
    serveStatic(WEBSITE_DIR, req, res, true);
  } else {
    serveStatic(WEB_DIR, req, res, true);
  }
});

webAppServer.listen(5173, () => {
  console.log('🌐 Web Dashboard running at: http://localhost:5173');
});

// 2. Marketing Website Server (Port 5174)
const websiteServer = http.createServer((req, res) => {
  serveStatic(WEBSITE_DIR, req, res, false);
});

websiteServer.listen(5174, () => {
  console.log('📖 Marketing Website running at: http://localhost:5174');
});
