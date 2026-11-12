const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GROUP = '477';
const PORT_HTTP = 3000;
const PORT_HTTPS = 3443;
const PUBLIC_DIR = path.resolve('public');
const CERT_DIR = path.resolve('certs');
const BIG_FILE = path.resolve('big-file.bin');
const ACCESS_LOG = path.resolve('access.log');
const CACHE_TTL = 60000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.zip': 'application/zip'
};

const startTime = Date.now();
const metrics = {
  total: 0,
  byMethod: {},
  byStatus: {}
};
const cache = new Map();
let dataCounter = 0;

function ts() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

function logAccess(method, url, status) {
  const line = `[${ts()}][${GROUP}] ${method} ${url} ${status}`;
  console.log(line);
  try {
    fs.appendFileSync(ACCESS_LOG, line + '\n');
  } catch (e) {}
}

function setCommon(res) {
  res.setHeader('X-Group', GROUP);
}

function sendHtml(req, res, status, body) {
  setCommon(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(status);
  res.end(body);
}

function sendJson(req, res, status, obj, extraHeaders) {
  setCommon(res);
  if (extraHeaders) {
    for (const key of Object.keys(extraHeaders)) {
      res.setHeader(key, extraHeaders[key]);
    }
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(status);
  res.end(JSON.stringify(obj, null, 2));
}

function sendText(req, res, status, text) {
  setCommon(res);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.writeHead(status);
  res.end(text + '\n');
}

function notFound(req, res) {
  sendHtml(
    req,
    res,
    404,
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre>=== 404 Not Found ===\nПуть ${esc(req.url)} не найден</pre></body></html>`
  );
}

function serve304(res, etag, lastModified) {
  setCommon(res);
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.writeHead(304);
  res.end();
}

function serveStatic(req, res, pathname) {
  if (pathname.includes('..')) {
    sendText(req, res, 403, '403 Forbidden');
    return;
  }

  const rel = pathname.slice('/static/'.length);
  const cleanRel = rel.replace(/^[/\\]+/, '');
  const target = path.resolve(PUBLIC_DIR, cleanRel);

  if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + path.sep)) {
    sendText(req, res, 403, '403 Forbidden');
    return;
  }

  let stat;
  try {
    stat = fs.statSync(target);
  } catch (e) {
    notFound(req, res);
    return;
  }

  if (!stat.isFile()) {
    notFound(req, res);
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etagRaw = crypto.createHash('sha1').update(`${stat.size}-${stat.mtimeMs}`).digest('hex');
  const etag = `"${etagRaw}"`;
  const lastModified = stat.mtime.toUTCString();

  const inm = req.headers['if-none-match'];
  if (inm) {
    const normalized = inm.replace(/^\s*W\//i, '').replace(/"/g, '').trim();
    if (normalized === etagRaw) {
      serve304(res, etag, lastModified);
      return;
    }
  } else {
    const ims = req.headers['if-modified-since'];
    if (ims) {
      const imsTime = Date.parse(ims);
      const mtimeSec = Math.floor(stat.mtime.getTime() / 1000) * 1000;
      if (!Number.isNaN(imsTime) && imsTime >= mtimeSec) {
        serve304(res, etag, lastModified);
        return;
      }
    }
  }

  const body = fs.readFileSync(target);
  setCommon(res);
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'max-age=60');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.writeHead(200);
  res.end(body);
}

function serveStream(req, res) {
  let stat;
  try {
    stat = fs.statSync(BIG_FILE);
  } catch (e) {
    sendText(req, res, 404, '404 big-file.bin not found');
    return;
  }

  setCommon(res);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', 'attachment; filename="big-file.zip"');
  res.writeHead(200);

  const rs = fs.createReadStream(BIG_FILE);
  let sent = 0;

  rs.on('data', chunk => {
    sent += chunk.length;
    const pct = ((sent / stat.size) * 100).toFixed(1);
    process.stdout.write(`\r[STREAM] ${pct}% (${sent}/${stat.size})`);
  });

  rs.on('end', () => {
    process.stdout.write('\n[STREAM] завершён\n');
  });

  rs.on('error', () => {
    process.stdout.write('\n[STREAM] ошибка\n');
    res.destroy();
  });

  rs.pipe(res);
}

function handleApiData(req, res) {
  if (req.method === 'GET') {
    const key = 'GET /api/data';
    const hit = cache.get(key);

    if (hit && hit.expires > Date.now()) {
      sendJson(
        req,
        res,
        200,
        {
          counter: hit.value.counter,
          cached: true
        },
        {
          'X-Cache': 'HIT',
          'Cache-Control': 'max-age=60'
        }
      );
      return;
    }

    const value = { counter: dataCounter };
    cache.set(key, {
      value,
      expires: Date.now() + CACHE_TTL
    });

    sendJson(
      req,
      res,
      200,
      {
        counter: value.counter,
        cached: false
      },
      {
        'X-Cache': 'MISS',
        'Cache-Control': 'max-age=60'
      }
    );
    return;
  }

  if (req.method === 'POST') {
    dataCounter++;
    cache.delete('GET /api/data');

    sendJson(req, res, 200, {
      counter: dataCounter,
      invalidated: true
    });
    return;
  }

  sendText(req, res, 405, '405 Method Not Allowed');
}

function handleRoot(req, res) {
  const secure = req.socket.encrypted;
  const head = secure ? '=== HTTPS работает! ===' : '=== HTTP-сервер (группа 477) ===';

  sendHtml(
    req,
    res,
    200,
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre>${esc(head)}
Группа: ${GROUP}
Режим: ${secure ? 'HTTPS' : 'HTTP'}

/static/index.html
/stream
/metrics
/api/data
/middleware-error</pre></body></html>`
  );
}

function handleMetrics(req, res) {
  sendJson(req, res, 200, {
    group: GROUP,
    total: metrics.total,
    byMethod: metrics.byMethod,
    byStatus: metrics.byStatus,
    uptime: Math.round((Date.now() - startTime) / 1000)
  });
}

const middlewares = [
  function requestContext(req, res, next) {
    req.id = crypto.randomUUID();
    req.startedAt = process.hrtime.bigint();
    res.setHeader('X-Request-Id', req.id);
    console.log(`[MIDDLEWARE][${GROUP}] -> ${req.method} ${req.url} (id=${req.id})`);
    next();
  },

  function metricsIn(req, res, next) {
    metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;
    next();
  },

  function router(req, res, next) {
    const rawUrl = req.url;
    const qIdx = rawUrl.indexOf('?');
    const rawPath = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);

    let pathname;
    try {
      pathname = decodeURIComponent(rawPath);
    } catch (e) {
      pathname = rawPath;
    }

    if (req.method === 'GET' && pathname === '/') {
      handleRoot(req, res);
      return;
    }

    if (req.method === 'GET' && pathname === '/metrics') {
      handleMetrics(req, res);
      return;
    }

    if (req.method === 'GET' && pathname === '/stream') {
      serveStream(req, res);
      return;
    }

    if (pathname === '/api/data') {
      handleApiData(req, res);
      return;
    }

    if (req.method === 'GET' && pathname === '/middleware-error') {
      next(new Error('middleware boom'));
      return;
    }

    if (pathname.startsWith('/static/')) {
      serveStatic(req, res, pathname);
      return;
    }

    notFound(req, res);
  }
];

function errorHandler(err, req, res) {
  console.log(`[MIDDLEWARE][${GROUP}] обработана ошибка: ${err.message}`);
  if (!res.headersSent) {
    sendText(req, res, 500, '500 Internal Server Error: ' + err.message);
  }
}

function runMiddleware(idx, req, res) {
  if (idx >= middlewares.length) {
    return;
  }

  const mw = middlewares[idx];

  const next = err => {
    if (err) {
      errorHandler(err, req, res);
      return;
    }
    runMiddleware(idx + 1, req, res);
  };

  try {
    mw(req, res, next);
  } catch (e) {
    errorHandler(e, req, res);
  }
}

function requestListener(req, res) {
  res.on('finish', () => {
    metrics.total++;
    metrics.byStatus[res.statusCode] = (metrics.byStatus[res.statusCode] || 0) + 1;
    logAccess(req.method, req.url, res.statusCode);
  });

  runMiddleware(0, req, res);
}

let key;
let cert;

try {
  key = fs.readFileSync(path.join(CERT_DIR, 'key.pem'));
  cert = fs.readFileSync(path.join(CERT_DIR, 'cert.pem'));
} catch (e) {
  console.error('[ERROR] Нет сертификатов в certs/. Сгенерируй openssl перед запуском.');
  process.exit(1);
}

const httpServer = http.createServer(requestListener);
const httpsServer = https.createServer({ key, cert }, requestListener);

httpServer.on('error', err => {
  console.error('[ERROR] http:', err.message);
});

httpsServer.on('error', err => {
  console.error('[ERROR] https:', err.message);
});

httpServer.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

httpsServer.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

httpServer.listen(PORT_HTTP, () => {
  console.log(`[INFO] HTTP-сервер запущен на порту ${PORT_HTTP}`);

  httpsServer.listen(PORT_HTTPS, () => {
    console.log(`[INFO] HTTPS-сервер запущен на порту ${PORT_HTTPS}`);
    console.log(`[INFO] Группа: ${GROUP}`);
  });
});

process.on('SIGINT', () => {
  console.log('\n[INFO] Остановка серверов...');

  let closed = 0;

  const done = () => {
    closed++;
    if (closed === 2) {
      console.log('[INFO] Сервер остановлен корректно.');
      process.exit(0);
    }
  };

  httpServer.close(done);
  httpsServer.close(done);

  setTimeout(() => {
    process.exit(0);
  }, 2000);
});