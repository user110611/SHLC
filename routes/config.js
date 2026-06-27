import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'config.json');

function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

router.get('/config', (req, res) => {
  try {
    res.json(readConfig());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

router.patch('/config', (req, res) => {
  try {
    const current = readConfig();
    const updated = { ...current, ...req.body };
    if (req.body.allowedScriptTypes) {
      updated.allowedScriptTypes = { ...current.allowedScriptTypes, ...req.body.allowedScriptTypes };
    }
    writeConfig(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;
