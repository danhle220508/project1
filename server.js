const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

const MAX_BODY_BYTES = 64 * 1024; // 64KB Payload limit (Phase 9 Security)

const server = http.createServer((req, res) => {
  // Hỗ trợ API xác thực, Health-check & kiểm tra quyền Admin phía Server (Phase 8 & 9 Security)
  if (req.url.startsWith('/api/')) {
    if (req.method === 'GET' && req.url.split('?')[0] === '/api/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        ...SECURITY_HEADERS
      });
      res.end(JSON.stringify({
        ok: true,
        service: 'PC MON MVP',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      let aborted = false;
      req.on('data', chunk => {
        body += chunk.toString();
        if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
          aborted = true;
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: false, error: '413 Payload vượt quá dung lượng cho phép (64KB)' }));
          req.destroy();
        }
      });
      req.on('end', () => {
        if (aborted) return;
        try {
          const data = JSON.parse(body || '{}');
          if (req.url === '/api/admin/verify') {
            const authHeader = req.headers['x-pcmon-role'] || data.role;
            if (authHeader !== 'admin') {
              res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
              res.end(JSON.stringify({ ok: false, error: '403 Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
            res.end(JSON.stringify({ ok: true, role: 'admin', verifiedAt: new Date().toISOString() }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: false, error: 'Dữ liệu JSON không hợp lệ' }));
        }
      });
      return;
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Phương thức không được hỗ trợ');
    return;
  }

  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  const spaRoutes = [
    '/', '', '/usage', '/budget', '/builder', '/summary', '/featured', '/account', '/cart', '/admin',
    '/usage.html', '/budget.html', '/builder.html', '/summary.html', '/featured.html', '/account.html', '/cart.html', '/admin.html'
  ];
  if (spaRoutes.includes(reqPath.toLowerCase())) {
    reqPath = '/index.html';
  } else if (reqPath.toLowerCase() === '/retailer-build') {
    reqPath = '/retailer-build.html';
  }

  const filePath = path.resolve(ROOT_DIR, '.' + reqPath);

  // Bảo vệ chống Path Traversal (chỉ cho phép truy cập file bên trong thư mục dự án)
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Truy cập bị từ chối');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Không tìm thấy file: ' + reqPath);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Lỗi máy chủ nội bộ');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      ...SECURITY_HEADERS
    });

    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(content);
    }
  });
});

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function startServer(port) {
  server.listen(port, HOST, () => {
    const lanIp = getLanIp();
    console.log(`[PC MON] Máy chủ trên máy này: http://localhost:${port}/`);
    console.log(`[PC MON] Link mạng LAN/Wi-Fi: http://${lanIp}:${port}/`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[PC MON] Cổng ${DEFAULT_PORT} đang bận, thử chuyển sang cổng ${DEFAULT_PORT + 1}...`);
    startServer(DEFAULT_PORT + 1);
  } else {
    console.error('[PC MON] Lỗi khởi động server:', err);
  }
});

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = { server, getLanIp, startServer };
