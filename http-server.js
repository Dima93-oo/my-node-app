const http = require('http');
const qs = require('querystring');
const { URL } = require('url');

const GROUP = '477';
const STUDENT = 'Фурс Дмитрий Геннадьевич';
const MAX_BODY = 1024 * 1024;

let nextId = 3;
let students = [
  { id: 1, name: 'Иван', group: GROUP },
  { id: 2, name: 'Мария', group: '478' }
];

function ts() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function page(title, lines) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><pre>${esc(title)}\n${lines.map(esc).join('\n')}</pre></body></html>`;
}

function setCommon(res) {
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP);
  res.setHeader('Cache-Control', 'no-cache');
}

function log(req, status, size) {
  const suffix = size === undefined ? '' : ` ${size} bytes`;
  console.log(`[${ts()}][${GROUP}] ${req.method} ${req.url} ${status}${suffix}`);
}

function respond(req, res, status, type, body) {
  setCommon(res);
  res.setHeader('Content-Type', type);
  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', '0');
    res.writeHead(status);
    res.end();
  } else {
    res.writeHead(status);
    res.end(body);
  }
}

function sendHtml(req, res, status, title, lines, size) {
  respond(req, res, status, 'text/html; charset=utf-8', page(title, lines));
  log(req, status, size);
}

function sendJson(req, res, status, obj, size) {
  respond(req, res, status, 'application/json; charset=utf-8', JSON.stringify(obj, null, 2));
  log(req, status, size);
}

function sendText(req, res, status, text, size) {
  respond(req, res, status, 'text/plain; charset=utf-8', text + '\n');
  log(req, status, size);
}

function ctOf(req) {
  return (req.headers['content-type'] || '').split(';')[0].trim();
}

function readBody(req, res, handler) {
  const chunks = [];
  let size = 0;
  let done = false;

  const fail = (status, message, reportedSize) => {
    if (done) return;
    done = true;
    sendText(req, res, status, message, reportedSize);
    req.destroy();
  };

  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_BODY) {
    fail(413, '413 Payload Too Large', declared);
    return;
  }

  req.on('data', chunk => {
    if (done) return;
    size += chunk.length;
    if (size > MAX_BODY) {
      fail(413, '413 Payload Too Large', size);
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (done) return;
    done = true;
    try {
      handler(Buffer.concat(chunks), size);
    } catch (err) {
      sendText(req, res, 400, '400 Bad Request: ' + err.message, size);
    }
  });

  req.on('error', () => {
    if (done) return;
    done = true;
    sendText(req, res, 400, '400 Bad Request', size);
  });
}

function echoHandler(req, res, buf, size) {
  const ct = ctOf(req);

  if (ct === 'application/json') {
    const data = JSON.parse(buf.toString('utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      data.group = GROUP;
    }
    sendJson(req, res, 200, data, size);
    return;
  }

  if (ct === 'application/x-www-form-urlencoded') {
    sendJson(req, res, 200, qs.parse(buf.toString('utf8')), size);
    return;
  }

  if (ct === 'text/plain') {
    sendText(req, res, 200, buf.toString('utf8'), size);
    return;
  }

  if (ct === 'application/octet-stream') {
    respond(req, res, 200, 'application/octet-stream', buf);
    log(req, 200, size);
    return;
  }

  respond(req, res, 200, ct || 'application/octet-stream', buf);
  log(req, 200, size);
}

function formHandler(req, res, buf, size) {
  const ct = ctOf(req);
  if (ct !== 'application/x-www-form-urlencoded') {
    sendText(req, res, 400, '400 Bad Request: expected application/x-www-form-urlencoded', size);
    return;
  }
  sendJson(req, res, 200, qs.parse(buf.toString('utf8')), size);
}

function compilePattern(pattern) {
  const keys = [];
  const segments = pattern.split('/').filter(Boolean);
  let source = '^';
  if (segments.length === 0) {
    source += '/';
  } else {
    for (const segment of segments) {
      source += '/';
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        source += '([^/]+)';
      } else {
        source += segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
  }
  source += '$';
  return { regex: new RegExp(source), keys };
}

const routes = [
  { method: 'GET', pattern: '/', handler: (req, res) => {
    sendHtml(req, res, 200, '=== Лабораторная работа №20 ===', [`Группа: ${GROUP}`, `Метод: ${req.method}`, `URL: ${req.url}`]);
  }},
  { method: 'GET', pattern: '/about', handler: (req, res) => {
    sendHtml(req, res, 200, '=== О студенте ===', [`Группа: ${GROUP}`, `Студент: ${STUDENT}`]);
  }},
  { method: 'GET', pattern: '/headers', handler: (req, res) => {
    sendJson(req, res, 200, { headers: req.headers, method: req.method, url: req.url, httpVersion: req.httpVersion });
  }},
  { method: 'GET', pattern: '/headers/set', handler: (req, res) => {
    setCommon(res);
    res.setHeader('X-Temp', 'will-be-removed');
    const groupValue = res.getHeader('X-Group');
    res.removeHeader('X-Temp');
    const body = page('=== /headers/set ===', [`X-Group через getHeader: ${groupValue}`, 'X-Temp удалён через removeHeader']);
    respond(req, res, 200, 'text/html; charset=utf-8', body);
    log(req, 200);
  }},
  { method: 'GET', pattern: '/headers/check', handler: (req, res) => {
    setCommon(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const out = {
      hasContentType: res.hasHeader('Content-Type'),
      hasXGroup: res.hasHeader('X-Group'),
      hasUnknown: res.hasHeader('X-Unknown')
    };
    respond(req, res, 200, 'application/json; charset=utf-8', JSON.stringify(out, null, 2));
    log(req, 200);
  }},
  { method: 'POST', pattern: '/echo', handler: (req, res) => {
    readBody(req, res, (buf, size) => echoHandler(req, res, buf, size));
  }},
  { method: 'POST', pattern: '/form', handler: (req, res) => {
    readBody(req, res, (buf, size) => formHandler(req, res, buf, size));
  }},
  { method: 'GET', pattern: '/search', handler: (req, res, params, query) => {
    const q = query.q || '';
    const requestedLimit = Number(query.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit >= 0 ? Math.trunc(requestedLimit) : 10;
    const capped = Math.min(limit, 100);
    const results = Array.from({ length: capped }, (_, i) => `result ${i + 1} for ${q}`);
    sendJson(req, res, 200, { q, limit: capped, results });
  }},
  { method: 'GET', pattern: '/users/:id', handler: (req, res, params) => {
    sendJson(req, res, 200, { params });
  }},
  { method: 'GET', pattern: '/users/:userId/posts/:postId', handler: (req, res, params) => {
    sendJson(req, res, 200, { params });
  }},
  { method: 'GET', pattern: '/api/students', handler: (req, res, params, query) => {
    const group = query.group;
    const list = group ? students.filter(s => s.group === group) : students;
    sendJson(req, res, 200, list);
  }},
  { method: 'POST', pattern: '/api/students', handler: (req, res) => {
    readBody(req, res, (buf, size) => {
      let data;
      try { data = JSON.parse(buf.toString('utf8')); }
      catch (err) { sendText(req, res, 400, '400 Bad Request: invalid JSON', size); return; }
      if (!data || typeof data !== 'object' || Array.isArray(data) || !data.name) {
        sendJson(req, res, 400, { error: 'name is required' }, size);
        return;
      }
      const student = { id: nextId++, name: String(data.name), group: data.group ? String(data.group) : GROUP };
      students.push(student);
      sendJson(req, res, 201, student, size);
    });
  }},
  { method: 'GET', pattern: '/api/students/:id', handler: (req, res, params) => {
    const id = Number(params.id);
    const student = students.find(s => s.id === id);
    if (!student) { sendJson(req, res, 404, { error: 'Student not found' }); return; }
    sendJson(req, res, 200, student);
  }},
  { method: 'PUT', pattern: '/api/students/:id', handler: (req, res, params) => {
    const id = Number(params.id);
    readBody(req, res, (buf, size) => {
      let data;
      try { data = JSON.parse(buf.toString('utf8')); }
      catch (err) { sendText(req, res, 400, '400 Bad Request: invalid JSON', size); return; }
      const student = students.find(s => s.id === id);
      if (!student) { sendJson(req, res, 404, { error: 'Student not found' }, size); return; }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.name !== undefined) student.name = String(data.name);
        if (data.group !== undefined) student.group = String(data.group);
      }
      sendJson(req, res, 200, student, size);
    });
  }},
  { method: 'DELETE', pattern: '/api/students/:id', handler: (req, res, params) => {
    const id = Number(params.id);
    const index = students.findIndex(s => s.id === id);
    if (index === -1) { sendJson(req, res, 404, { error: 'Student not found' }); return; }
    students.splice(index, 1);
    sendJson(req, res, 200, { deleted: true, id });
  }}
];

for (const route of routes) {
  const compiled = compilePattern(route.pattern);
  route.regex = compiled.regex;
  route.keys = compiled.keys;
}

const server = http.createServer((req, res) => {
  let parsed;
  try { parsed = new URL(req.url, 'http://localhost'); }
  catch (err) { sendText(req, res, 400, '400 Bad Request'); return; }

  let pathname;
  try { pathname = decodeURIComponent(parsed.pathname); }
  catch (err) { pathname = parsed.pathname; }

  const query = Object.fromEntries(parsed.searchParams);
  const routeMethod = req.method === 'HEAD' ? 'GET' : req.method;
  const pathMatches = [];

  for (const route of routes) {
    const match = route.regex.exec(pathname);
    if (!match) continue;
    const params = {};
    route.keys.forEach((key, i) => {
      try { params[key] = decodeURIComponent(match[i + 1]); }
      catch (err) { params[key] = match[i + 1]; }
    });
    pathMatches.push({ route, params });
  }

  if (pathMatches.length === 0) {
    sendHtml(req, res, 404, '=== 404 Not Found ===', [`Путь ${pathname} не найден`]);
    return;
  }

  const matched = pathMatches.find(item => item.route.method === routeMethod);
  if (!matched) { sendText(req, res, 405, '405 Method Not Allowed'); return; }

  matched.route.handler(req, res, matched.params, query);
});

server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});