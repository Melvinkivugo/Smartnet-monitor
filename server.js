const http = require('http');
const { router } = require('./routes/index');
const { initDB } = require('./db/database');
const { startMonitoringCron } = require('./scripts/monitor');

const PORT = process.env.PORT || 3000;

initDB();
startMonitoringCron();

const server = http.createServer((req, res) => {
  router(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Default login: admin / admin123`);
});