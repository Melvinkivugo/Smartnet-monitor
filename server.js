/**
 * SmartNet Monitor - Server Entry Point
 * Pure Node.js, zero external dependencies
 */

const http = require('http');
const { router } = require('./routes/index');
const { initDB } = require('./db/database');
const { startMonitoringCron } = require('./scripts/monitor');

const PORT = process.env.PORT || 3000;

// Initialize database
initDB();

// Start background monitoring every 60 seconds
startMonitoringCron();

const server = http.createServer((req, res) => {
    router(req, res);
});

server.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', '╔══════════════════════════════════════╗');
    console.log('\x1b[36m%s\x1b[0m', '║      SmartNet Monitor - STARTED      ║');
    console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════════╝');
    console.log(`\x1b[32m✓\x1b[0m Server running at: \x1b[4mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[32m✓\x1b[0m Default login: admin / admin123`);
    console.log(`\x1b[33m⏰\x1b[0m Monitoring cron: every 60 seconds\n`);
});