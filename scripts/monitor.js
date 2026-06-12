/**
 * SmartNet Monitor - Background Monitoring Engine
 * Uses system ping via child_process - no external deps
 */

const { exec } = require('child_process');
const {
    getAllDevices, updateDevice, addMonitoringLog,
    addAlert, getLogsForDevice, getDeviceUptimePercent
} = require('../db/database');

const os = require('os');
const isWindows = os.platform() === 'win32';

// Track previous statuses to detect changes
const previousStatus = new Map();

function pingDevice(ip) {
    return new Promise((resolve) => {
        const cmd = isWindows
            ? `ping -n 1 -w 2000 ${ip}`
            : `ping -c 1 -W 2 ${ip}`;

        const start = Date.now();
        exec(cmd, { timeout: 5000 }, (error, stdout) => {
            const elapsed = Date.now() - start;

            if (error) {
                resolve({ online: false, response_time: null });
                return;
            }

            // Parse response time from ping output
            let responseTime = elapsed;
            const timeMatch = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
            if (timeMatch) responseTime = parseFloat(timeMatch[1]);

            // Check if ping was successful
            const successPatterns = [
                /1 received/i,
                /1 packets received/i,
                /bytes from/i,
                /Reply from/i,
                /time[=<]\d/i
            ];
            const isOnline = successPatterns.some(p => p.test(stdout));

            resolve({ online: isOnline, response_time: isOnline ? Math.round(responseTime) : null });
        });
    });
}

async function checkDevice(device) {
    try {
        const result = await pingDevice(device.ip_address);
        const newStatus = result.online ? 'online' : 'offline';
        const oldStatus = previousStatus.get(device.id) || device.status;

        // Log the check
        addMonitoringLog(
            device.id,
            newStatus,
            result.response_time,
            result.online ? `Response time: ${result.response_time}ms` : 'Host unreachable'
        );

        // Calculate uptime percent
        const uptimePct = getDeviceUptimePercent(device.id, 24);

        // Update device record
        updateDevice(device.id, {
            status: newStatus,
            last_seen: result.online ? new Date().toISOString() : device.last_seen,
            response_time_ms: result.response_time,
            uptime_percent: uptimePct !== null ? uptimePct : device.uptime_percent
        });

        // Generate alert on status change
        if (oldStatus !== newStatus && oldStatus !== 'unknown') {
            if (newStatus === 'offline') {
                addAlert(
                    device.id,
                    'device_down',
                    `⚠️ Device "${device.name}" (${device.ip_address}) went OFFLINE`
                );
                console.log(`\x1b[31m✗\x1b[0m ${device.name} (${device.ip_address}) → OFFLINE`);
            } else if (newStatus === 'online') {
                addAlert(
                    device.id,
                    'device_up',
                    `✅ Device "${device.name}" (${device.ip_address}) is back ONLINE`
                );
                console.log(`\x1b[32m✓\x1b[0m ${device.name} (${device.ip_address}) → ONLINE`);
            }
        } else {
            const icon = result.online ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            console.log(`${icon} ${device.name} (${device.ip_address}) → ${newStatus.toUpperCase()}${result.response_time ? ` [${result.response_time}ms]` : ''}`);
        }

        previousStatus.set(device.id, newStatus);

        // High response time alert (> 500ms)
        if (result.online && result.response_time > 500) {
            addAlert(
                device.id,
                'high_latency',
                `🐢 High latency on "${device.name}" (${device.ip_address}): ${result.response_time}ms`
            );
        }

    } catch (err) {
        console.error(`Error checking device ${device.name}:`, err.message);
    }
}

async function runMonitoringCycle() {
    const devices = getAllDevices();
    if (devices.length === 0) {
        console.log('\x1b[33m⚠\x1b[0m  No devices registered yet');
        return;
    }

    console.log(`\n\x1b[36m[${new Date().toLocaleTimeString()}] Running monitoring cycle (${devices.length} devices)\x1b[0m`);

    // Check all devices in parallel (with concurrency limit)
    const BATCH_SIZE = 10;
    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
        const batch = devices.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(d => checkDevice(d)));
    }
}

let cronInterval = null;

function startMonitoringCron(intervalSeconds = 60) {
    // Run immediately on start
    setTimeout(runMonitoringCycle, 3000);

    // Then on interval
    cronInterval = setInterval(runMonitoringCycle, intervalSeconds * 1000);
    console.log(`\x1b[32m✓\x1b[0m Monitoring cron started (interval: ${intervalSeconds}s)`);
}

function stopMonitoringCron() {
    if (cronInterval) clearInterval(cronInterval);
}

module.exports = { startMonitoringCron, stopMonitoringCron, runMonitoringCycle };