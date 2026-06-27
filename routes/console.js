import { Router } from 'express';
import { spawn, exec } from 'child_process';
import { randomUUID } from 'crypto';
import os from 'os';

const router = Router();

// Active sessions map: id -> { id, name, createdAt, lastActivity, cwd, history }
export const sessions = new Map();

// WebSocket handlers map: sessionId -> ws
export const wsHandlers = new Map();

function defaultCwd() {
  return os.homedir() || process.cwd();
}

router.get('/console/sessions', (req, res) => {
  const list = Array.from(sessions.values()).map(s => ({
    id: s.id,
    name: s.name,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity,
    cwd: s.cwd,
  }));
  res.json(list);
});

router.post('/console/sessions', (req, res) => {
  const id = randomUUID();
  const session = {
    id,
    name: `Session ${sessions.size + 1}`,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    cwd: defaultCwd(),
    history: [],
  };
  sessions.set(id, session);
  res.status(201).json({
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    cwd: session.cwd,
  });
});

router.delete('/console/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  const ws = wsHandlers.get(sessionId);
  if (ws) {
    ws.close();
    wsHandlers.delete(sessionId);
  }
  res.json({ success: true, message: 'Session closed' });
});

router.post('/console/exec', (req, res) => {
  const { command, sessionId, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });

  const session = sessionId ? sessions.get(sessionId) : null;
  const workDir = cwd || (session ? session.cwd : defaultCwd());
  const start = Date.now();

  // Handle cd specially
  const cdMatch = command.trim().match(/^cd\s+(.+)$/);
  if (cdMatch && session) {
    const { resolve } = require('path');
    const newDir = resolve(workDir, cdMatch[1]);
    session.cwd = newDir;
    session.lastActivity = new Date().toISOString();
    return res.json({ stdout: '', stderr: '', exitCode: 0, duration: 0 });
  }

  exec(command, { cwd: workDir, timeout: 30000 }, (err, stdout, stderr) => {
    if (session) {
      session.lastActivity = new Date().toISOString();
      session.history.push({ command, stdout, stderr, exitCode: err?.code ?? 0, ts: new Date().toISOString() });
    }
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code ?? 1) : 0,
      duration: (Date.now() - start) / 1000,
    });
  });
});

export default router;
