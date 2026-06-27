/**
 * RasCloud Server - Remote Server Management Utility
 * Runs in Termux (Android), Linux, or Windows PowerShell
 *
 * Usage:
 * node server.js
 * or use start.sh / start.bat for quick launch
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';

import statusRouter, { setConnectedClients } from './routes/status.js';
import configRouter from './routes/config.js';
import consoleRouter, { sessions, wsHandlers } from './routes/console.js';
import filesRouter from './routes/files.js';
import packagesRouter from './routes/packages.js';
import processesRouter from './routes/processes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config.json');

// Load config
let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
} catch {
  config = { port: 4000 };
}

const PORT = process.env.PORT || config.port || 4000;

const app = express();
const server = createServer(app);

// Middleware — открываем CORS настежь для работы с Firebase / удаленными хостами
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check для проверки доступности сервера фронтендом
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routers
app.use('/api', statusRouter);
app.use('/api', configRouter);
app.use('/api', consoleRouter);
app.use('/api', filesRouter);
app.use('/api', packagesRouter);
app.use('/api', processesRouter);

// 404 fallback для REST API
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// WebSocket сервер без жесткого path, чтобы не дропать динамические пути консоли
const wss = new WebSocketServer({ noServer: true });

// Ручной перехват HTTP-апгрейда для маршрутов вида /ws/console/<sessionId>
server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  // Извлекаем sessionId из URL: /ws/console/<sessionId>
  const match = req.url.match(/\/ws\/console\/([^/?]+)/);
  const sessionId = match?.[1];

  if (!sessionId) {
    ws.close(1008, 'Session ID required');
    return;
  }

  // Гарантируем существование сессии консоли
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      name: `Session`,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      cwd: process.env.HOME || process.cwd(),
      history: [],
    });
  }

  wsHandlers.set(sessionId, ws);
  setConnectedClients(wss.clients.size);

  ws.send(JSON.stringify({
    type: 'connected',
    message: `Connected to RasCloud console. Session: ${sessionId}`,
  }));

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'command') {
      const session = sessions.get(sessionId);
      const cwd = session?.cwd || process.cwd();
      const start = Date.now();

      exec(msg.command, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
        if (session) {
          session.lastActivity = new Date().toISOString();
          session.history.push({ command: msg.command, ts: session.lastActivity });
        }

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'output',
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: err ? (err.code ?? 1) : 0,
            duration: (Date.now() - start) / 1000,
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    wsHandlers.delete(sessionId);
    setConnectedClients(wss.clients.size);
  });
});

// Запуск сервера на всех сетевых интерфейсах (0.0.0.0) для доступности по локалке
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ██████╗  █████╗ ███████╗ ██████╗██╗      ██████╗ ██╗   ██╗██████╗ ');
  console.log('  ██╔══██╗██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗');
  console.log('  ██████╔╝███████║███████╗██║     ██║     ██║   ██║██║   ██║██║  ██║');
  console.log('  ██╔══██╗██╔══██║╚════██║██║     ██║     ██║   ██║██║   ██║██║  ██║');
  console.log('  ██║  ██║██║  ██║███████║╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝');
  console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ');
  console.log('');
  console.log(`  Remote Server Management Utility v1.0.0`);
  console.log(`  Running on port ${PORT}`);
  console.log('');
  console.log(`  API:       http://0.0.0.0:${PORT}/api`);
  console.log(`  WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log('');
  console.log('  Connect from the RasCloud web interface at:');
  console.log(`  http://<your-public-ip>:${PORT}  or  localhost:${PORT}`);
  console.log('');
});

