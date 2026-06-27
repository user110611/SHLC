# RasCloud Server

> Remote server management utility. Run it on any machine — control it from anywhere.

## Quick Start

### Linux / Android (Termux)

```bash
chmod +x start.sh
./start.sh
# Or with custom port:
./start.sh 4000
```

### Windows

```bat
start.bat
REM Or with custom port:
start.bat 4000
```

### Manual

```bash
npm install
node server.js
```

## Configuration

Edit `config.json` before starting or change settings live via the web interface:

```json
{
  "port": 4000,
  "deviceType": "linux",
  "allowedScriptTypes": {
    "python": true,
    "node": true,
    "java": true,
    "bash": true,
    "powershell": false,
    "php": false
  },
  "maxLogLines": 500,
  "autoRestart": false
}
```

| Key | Description |
|-----|-------------|
| `port` | Port to listen on (default: 4000) |
| `deviceType` | `android`, `linux`, or `windows` |
| `allowedScriptTypes` | Toggle which script types can be run |
| `maxLogLines` | Max log lines kept per process (default: 500) |
| `autoRestart` | Auto-restart crashed processes |

## Web Interface

After starting the server, open the **RasCloud web client** in your browser, then enter:

- `<your-public-ip>:4000` — to connect from another device/network
- `localhost:4000` — to connect from the same machine (just enter the port)

## API

All API endpoints are under `/api`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| GET | `/api/status` | Server stats (CPU, memory, uptime) |
| GET | `/api/config` | Get configuration |
| PATCH | `/api/config` | Update configuration |
| POST | `/api/console/exec` | Execute a shell command |
| GET | `/api/console/sessions` | List console sessions |
| POST | `/api/console/sessions` | Create a session |
| DELETE | `/api/console/sessions/:id` | Close a session |
| GET | `/api/files` | List directory contents |
| GET | `/api/files/content` | Read file content |
| POST | `/api/files/content` | Write file content |
| POST | `/api/files/upload` | Upload file(s) |
| GET | `/api/files/download` | Download a file |
| DELETE | `/api/files` | Delete file or directory |
| POST | `/api/files/mkdir` | Create directory |
| POST | `/api/packages/install` | Install a package |
| GET | `/api/processes` | List managed processes |
| POST | `/api/processes/run` | Start a new process |
| POST | `/api/processes/:id/stop` | Stop a process |
| POST | `/api/processes/:id/restart` | Restart a process |
| GET | `/api/processes/:id/logs` | Get process logs |

## WebSocket

Connect to `ws://<host>:<port>/ws/console/<sessionId>` for real-time terminal I/O.

Send:
```json
{ "type": "command", "command": "ls -la" }
```

Receive:
```json
{ "type": "output", "stdout": "...", "stderr": "...", "exitCode": 0 }
```

## Requirements

- Node.js 18+
- npm (comes with Node.js)

## License

MIT — free to use, modify, and distribute.
