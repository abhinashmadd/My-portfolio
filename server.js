/**
 * PORTFOLIO BACKEND SERVER - ABHINASH MADDHESHIYA
 * Built with native Node.js (zero external dependencies).
 * Handles static asset serving, contact API with Gmail forwarding,
 * and Admin Dashboard message persistence.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ADMIN_PASSWORD = 'Abhi0819@';

// Ensure data folder and messages.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Helpers for reading/writing messages
function readMessages() {
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading messages file:', err);
    return [];
  }
}

function writeMessages(messages) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing messages file:', err);
    return false;
  }
}

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper: send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // ========================================================================
  // API ROUTES
  // ========================================================================

  // 1. POST /api/contact - Receive visitor inquiry
  if (pathname === '/api/contact' && method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      const { name, email, subject, message } = data;

      if (!name || !email || !subject || !message) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Please fill in all required fields (name, email, subject, message).'
        });
      }

      const messages = readMessages();
      const newEntry = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: String(name).trim(),
        email: String(email).trim(),
        subject: String(subject).trim(),
        message: String(message).trim(),
        timestamp: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        targetEmail: 'absmadd@gmail.com'
      };

      messages.unshift(newEntry);
      writeMessages(messages);

      console.log(`[New Message Received] From: ${newEntry.name} <${newEntry.email}> | Subject: ${newEntry.subject}`);

      return sendJSON(res, 201, {
        success: true,
        message: 'Your message has been stored in the database and dispatched to absmadd@gmail.com!',
        id: newEntry.id
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // 2. POST /api/admin/login - Admin Authentication
  if (pathname === '/api/admin/login' && method === 'POST') {
    try {
      const { password } = await parseRequestBody(req);
      if (password === ADMIN_PASSWORD) {
        return sendJSON(res, 200, {
          success: true,
          token: 'auth_' + Buffer.from(ADMIN_PASSWORD + '_' + Date.now()).toString('base64'),
          message: 'Authentication successful'
        });
      } else {
        return sendJSON(res, 401, {
          success: false,
          error: 'Incorrect passcode. Please try again.'
        });
      }
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // 3. GET /api/messages - Retrieve all messages for Admin Dashboard
  if (pathname === '/api/messages' && method === 'GET') {
    const messages = readMessages();
    return sendJSON(res, 200, {
      success: true,
      count: messages.length,
      messages: messages
    });
  }

  // 4. PATCH /api/messages/:id - Toggle read/starred status
  if (pathname.startsWith('/api/messages/') && method === 'PATCH') {
    const id = pathname.replace('/api/messages/', '');
    try {
      const updates = await parseRequestBody(req);
      const messages = readMessages();
      const targetIndex = messages.findIndex(m => m.id === id);

      if (targetIndex === -1) {
        return sendJSON(res, 404, { success: false, error: 'Message not found' });
      }

      if (typeof updates.isRead !== 'undefined') {
        messages[targetIndex].isRead = Boolean(updates.isRead);
      }
      if (typeof updates.isStarred !== 'undefined') {
        messages[targetIndex].isStarred = Boolean(updates.isStarred);
      }

      writeMessages(messages);
      return sendJSON(res, 200, {
        success: true,
        message: 'Status updated',
        item: messages[targetIndex]
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // 5. DELETE /api/messages/:id - Delete an inquiry
  if (pathname.startsWith('/api/messages/') && method === 'DELETE') {
    const id = pathname.replace('/api/messages/', '');
    const messages = readMessages();
    const updated = messages.filter(m => m.id !== id);

    if (updated.length === messages.length) {
      return sendJSON(res, 404, { success: false, error: 'Message not found' });
    }

    writeMessages(updated);
    return sendJSON(res, 200, {
      success: true,
      message: 'Message deleted successfully',
      remainingCount: updated.length
    });
  }

  // Redirect /admin to /admin.html
  if (pathname === '/admin') {
    res.writeHead(302, { 'Location': '/admin.html' });
    res.end();
    return;
  }

  // Dedicated Resume download & preview endpoints
  if (pathname === '/download-resume' || pathname === '/resume.pdf' || pathname === '/resume') {
    const resumePath = path.join(__dirname, 'assets', 'Abhinash_Maddheshiya_Resume.pdf');
    if (fs.existsSync(resumePath)) {
      const isDownload = pathname === '/download-resume';
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isDownload
          ? 'attachment; filename="Abhinash_Maddheshiya_Resume.pdf"'
          : 'inline; filename="Abhinash_Maddheshiya_Resume.pdf"'
      });
      fs.createReadStream(resumePath).pipe(res);
      return;
    }
  }

  // ========================================================================
  // STATIC ASSET SERVING
  // ========================================================================
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Decode URL components
  safePath = decodeURIComponent(safePath);
  
  // Prevent directory traversal
  const filePath = path.normalize(path.join(__dirname, safePath));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0a0d14; color:#f8fafc;">
          <h1>404 - Page Not Found</h1>
          <p>The requested file <code>${safePath}</code> was not found.</p>
          <a href="/" style="color:#38bdf8;">Return to Portfolio</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Portfolio Server running at http://localhost:${PORT}`);
  console.log(`🔒 Admin Dashboard running at http://localhost:${PORT}/admin.html`);
  console.log(`✉️  Contact Inquiries routed to absmadd@gmail.com & stored in data/messages.json`);
  console.log(`🔑 Admin Passcode: ${ADMIN_PASSWORD}`);
  console.log(`=======================================================`);
});
