import { Router } from 'express';
import {
  readdirSync, statSync, readFileSync, writeFileSync,
  mkdirSync, rmSync,
} from 'fs';
import path from 'path';
import { join, extname, basename, resolve, relative } from 'path';
import os from 'os';
import multer from 'multer';

const router = Router();
const ROOT = os.homedir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest = req.query.path ? safePath(req.query.path) : ROOT;
      cb(null, dest);
    } catch (err) {
      cb(err, ROOT);
    }
  },
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

function safePath(p) {
  if (!p) throw new Error('Path is required');
  const full = resolve(ROOT, p.replace(/^\//, ''));
  // Use relative check to avoid prefix-collision (e.g. /home/user vs /home/user2)
  const rel = relative(ROOT, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path traversal denied');
  return full;
}

function fileType(name) {
  const ext = extname(name).toLowerCase();
  return ext;
}

router.get('/files', (req, res) => {
  try {
    const dirPath = safePath(req.query.path || '/');
    const entries = readdirSync(dirPath).map(name => {
      const full = join(dirPath, name);
      let stat;
      try { stat = statSync(full); } catch { return null; }
      return {
        name,
        path: '/' + full.slice(ROOT.length + 1).replace(/\\/g, '/'),
        type: stat.isDirectory() ? 'directory' : 'file',
        size: stat.isDirectory() ? null : stat.size,
        extension: stat.isDirectory() ? null : fileType(name),
        modifiedAt: stat.mtime.toISOString(),
      };
    }).filter(Boolean);

    // Directories first, then files
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      path: '/' + dirPath.slice(ROOT.length + 1).replace(/\\/g, '/') || '/',
      entries,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/files', (req, res) => {
  try {
    if (!req.query.path) return res.status(400).json({ error: 'path is required' });
    const p = safePath(req.query.path);
    // Guard: never delete root managed directory itself
    if (p === ROOT) return res.status(403).json({ error: 'Cannot delete root directory' });
    rmSync(p, { recursive: true, force: true });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/files/content', (req, res) => {
  try {
    const p = safePath(req.query.path);
    const content = readFileSync(p, 'utf-8');
    const stat = statSync(p);
    res.json({ path: req.query.path, content, encoding: 'utf-8', size: stat.size });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/files/content', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const p = safePath(filePath);
    writeFileSync(p, content, 'utf-8');
    res.json({ success: true, message: 'File written' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/files/mkdir', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const p = safePath(dirPath);
    mkdirSync(p, { recursive: true });
    res.status(201).json({ success: true, message: 'Directory created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ success: true, message: `Uploaded ${req.file.originalname}` });
});

router.get('/files/download', (req, res) => {
  try {
    const p = safePath(req.query.path);
    res.download(p, basename(p));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
