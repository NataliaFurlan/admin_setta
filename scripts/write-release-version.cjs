// Public build metadata only: never include environment or credentials.
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname } = require('node:path');
let commit = process.env.RELEASE_COMMIT;
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { throw new Error('Commit do build indisponível. Preserve o checkout Git ou forneça RELEASE_COMMIT na hospedagem.'); }
}
if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('RELEASE_COMMIT inválido.');
const output = process.argv[2];
if (!output) throw new Error('Informe o caminho de release-version.json.');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ commit, built_at: new Date().toISOString() }) + '\n');
