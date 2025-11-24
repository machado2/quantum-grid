import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const REMOTE = process.env.REMOTE || 'debian@fbmac.net';
const REMOTE_DIR = process.env.REMOTE_DIR || '/home/debian/quantum-matrix';
const DIST_DIR = 'dist';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status || 1);
}

function resolveCmd(envVar, winPaths, candidates) {
  const override = process.env[envVar];
  if (override && fs.existsSync(override)) return override;
  for (const p of winPaths) { if (fs.existsSync(p)) return p; }
  for (const c of candidates) {
    const r = spawnSync(c, ['-V'], { stdio: 'ignore', shell: true });
    if ((r.status ?? 0) === 0) return c;
  }
  return candidates[0];
}

const SSH = resolveCmd('SSH_BIN', [
  'C:/Windows/System32/OpenSSH/ssh.exe',
  'C:/Program Files/Git/usr/bin/ssh.exe'
], ['ssh', 'ssh.exe']);
const SCP = resolveCmd('SCP_BIN', [
  'C:/Windows/System32/OpenSSH/scp.exe',
  'C:/Program Files/Git/usr/bin/scp.exe'
], ['scp', 'scp.exe']);
function hasWSL() {
  const r = spawnSync('wsl', ['-e', 'bash', '-lc', 'command -v scp >/dev/null 2>&1'], { stdio: 'ignore', shell: false });
  return (r.status ?? 1) === 0;
}

run('npm', ['ci']);
run('npm', ['run', 'build']);

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist não encontrado');
  process.exit(1);
}

if (SSH && SCP) {
  const scpOpts = [];
  if (process.platform === 'win32') scpOpts.push('-O');
  if (process.env.SCP_OPTS) scpOpts.push(...String(process.env.SCP_OPTS).split(/\s+/).filter(Boolean));
  run(SSH, [REMOTE, `mkdir -p '${REMOTE_DIR}'`]);
  run(SCP, [...scpOpts, '-r', `${DIST_DIR}/`, `${REMOTE}:${REMOTE_DIR}/`]);
} else if (hasWSL()) {
  const cwd = process.cwd().replace(/\\/g, '/');
  const cmd = `cd \"$(wslpath -a '${cwd}')\" && ssh ${REMOTE} \"mkdir -p '${REMOTE_DIR}'\" && scp -r ${DIST_DIR}/ ${REMOTE}:${REMOTE_DIR}/`;
  run('wsl', ['-e', 'bash', '-lc', cmd]);
} else {
  console.error('Nenhum método disponível para ssh/scp. Instale OpenSSH ou use WSL.');
  process.exit(1);
}
