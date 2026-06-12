/**
 * SmartNet Monitor - Auth Middleware
 */

function requireAuth(req, res) {
    if (!req.session || !req.session.userId) {
        res.writeHead(302, { Location: '/login?redirect=' + encodeURIComponent(req.url) });
        res.end();
        return false;
    }
    return true;
}

function requireAdmin(req, res) {
    if (!requireAuth(req, res)) return false;
    if (req.session.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1><p>Admin access required.</p><a href="/dashboard">Back</a>');
        return false;
    }
    return true;
}

module.exports = { requireAuth, requireAdmin };