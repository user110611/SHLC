import { Router } from 'express';
import os from 'os';

const router = Router();

const startTime = Date.now();
let connectedClients = 0;

export function setConnectedClients(count) {
  connectedClients = count;
}

router.get('/status', (req, res) => {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;

  // CPU usage approximation
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

  res.json({
    uptime: (Date.now() - startTime) / 1000,
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuUsage,
    memUsed,
    memTotal,
    rascloudVersion: '1.0.0',
    connectedClients,
  });
});

export default router;
