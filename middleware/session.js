/**
 * SmartNet Monitor - Session Middleware
 * Pure in-memory session store, no dependencies
 */

const crypto = require('crypto');

const sessions = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function cleanExpired() {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (now > session._expires) sessions.delete(id);
    }
}

setInterval(cleanExpired, 5 * 60 * 1000);

function parseCookies(req) {
    const cookies = {};
    const header = req.headers.cookie || '';
    header.split(';').forEach(pair => {
        const [key, ...vals] = pair.trim().split('=');
        if (key) cookies[key.trim()] = decodeURIComponent(vals.join('='));
    });
    return cookies;
}

function sessionMiddleware(req, res) {
    const cookies = parseCookies(req);
    let sessionId = cookies['smartnet_sid'];
    let session = sessionId ? sessions.get(sessionId) : null;

    if (!session || Date.now() > session._expires) {
        sessionId = generateSessionId();
        session = { _expires: Date.now() + SESSION_TTL };
        sessions.set(sessionId, session);
        res.setHeader('Set-Cookie', `smartnet_sid=${sessionId}; HttpOnly; Path=/; SameSite=Strict`);
    } else {
        // Refresh TTL
        session._expires = Date.now() + SESSION_TTL;
    }

    req.session = session;
    req.sessionId = sessionId;

    req.session.save = () => sessions.set(sessionId, session);
    req.session.destroy = () => sessions.delete(sessionId);
}

module.exports = { sessionMiddleware };