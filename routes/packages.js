import { Router } from 'express';
import { exec } from 'child_process';

const router = Router();

const MANAGER_COMMANDS = {
  pip:      (pkg) => `pip install ${pkg}`,
  pip3:     (pkg) => `pip3 install ${pkg}`,
  npm:      (pkg) => `npm install -g ${pkg}`,
  yarn:     (pkg) => `yarn global add ${pkg}`,
  pnpm:     (pkg) => `pnpm add -g ${pkg}`,
  apt:      (pkg) => `apt-get install -y ${pkg}`,
  pkg:      (pkg) => `pkg install ${pkg}`,
  gem:      (pkg) => `gem install ${pkg}`,
  cargo:    (pkg) => `cargo install ${pkg}`,
  go:       (pkg) => `go install ${pkg}@latest`,
  composer: (pkg) => `composer global require ${pkg}`,
};

router.post('/packages/install', (req, res) => {
  const { packageName, manager } = req.body;
  if (!packageName || !manager) {
    return res.status(400).json({ error: 'packageName and manager are required' });
  }
  const cmdFactory = MANAGER_COMMANDS[manager];
  if (!cmdFactory) {
    return res.status(400).json({ error: `Unknown package manager: ${manager}` });
  }

  const command = cmdFactory(packageName);
  const start = Date.now();

  exec(command, { timeout: 120000 }, (err, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code ?? 1) : 0,
      duration: (Date.now() - start) / 1000,
    });
  });
});

export default router;
