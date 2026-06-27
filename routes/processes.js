import { Router } from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const router = Router();

// processId -> { id, name, command, port, status, startedAt, pid, starred, logs, child }
const processes = new Map();

function toDto(p) {
  return {
    id: p.id,
    name: p.name,
    command: p.command,
    port: p.port ?? null,
    status: p.status,
    startedAt: p.startedAt,
    uptime: p.startedAt ? (Date.now() - new Date(p.startedAt).getTime()) / 1000 : null,
    pid: p.pid ?? null,
    starred: p.starred,
  };
}

function spawnProcess(proc) {
  const [cmd, ...args] = proc.command.split(' ');
  const child = spawn(cmd, args, {
    cwd: proc.cwd || process.cwd(),
    shell: true,
    env: { ...process.env, PORT: proc.port?.toString() || '' },
  });
  proc.child = child;
  proc.pid = child.pid;
  proc.status = 'running';
  proc.startedAt = new Date().toISOString();

  child.stdout.on('data', d => {
    proc.logs.push(`[OUT] ${d.toString()}`);
    if (proc.logs.length > 500) proc.logs.shift();
  });
  child.stderr.on('data', d => {
    proc.logs.push(`[ERR] ${d.toString()}`);
    if (proc.logs.length > 500) proc.logs.shift();
  });
  child.on('close', code => {
    proc.status = code === 0 ? 'stopped' : 'crashed';
    proc.pid = null;
    proc.child = null;
  });
}

router.get('/processes', (req, res) => {
  res.json(Array.from(processes.values()).map(toDto));
});

router.post('/processes/run', (req, res) => {
  const { name, command, port, cwd, autoRestart } = req.body;
  if (!name || !command) return res.status(400).json({ error: 'name and command required' });

  const id = randomUUID();
  const proc = {
    id, name, command,
    port: port ?? null,
    cwd: cwd ?? null,
    status: 'stopped',
    startedAt: null,
    pid: null,
    starred: false,
    logs: [],
    child: null,
    autoRestart: autoRestart ?? false,
  };
  processes.set(id, proc);
  spawnProcess(proc);
  res.status(201).json(toDto(proc));
});

router.post('/processes/:processId/stop', (req, res) => {
  const proc = processes.get(req.params.processId);
  if (!proc) return res.status(404).json({ error: 'Process not found' });
  if (proc.child) {
    proc.child.kill('SIGTERM');
    setTimeout(() => { if (proc.child) proc.child.kill('SIGKILL'); }, 3000);
  }
  proc.status = 'stopped';
  res.json({ success: true, message: 'Process stopped' });
});

router.post('/processes/:processId/restart', (req, res) => {
  const proc = processes.get(req.params.processId);
  if (!proc) return res.status(404).json({ error: 'Process not found' });
  if (proc.child) proc.child.kill('SIGTERM');
  proc.logs = [];
  setTimeout(() => spawnProcess(proc), 500);
  res.json(toDto(proc));
});

router.get('/processes/:processId/logs', (req, res) => {
  const proc = processes.get(req.params.processId);
  if (!proc) return res.status(404).json({ error: 'Process not found' });
  const lines = Math.min(parseInt(req.query.lines || '100'), 500);
  const logs = proc.logs.slice(-lines);
  res.json({ processId: proc.id, logs, totalLines: proc.logs.length });
});

export default router;
