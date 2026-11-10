import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
/** 读取以空字符分隔的 Git 路径，保留含空格和非 ASCII 字符的文件名。 */
function gitPaths(...flags) {
  return execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'ls-files', ...flags, '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
}
const deleted = new Set(gitPaths('--deleted'));
const paths = gitPaths('--cached', '--others', '--exclude-standard').filter(path => !deleted.has(path));
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk_live_|rk_live_)[a-zA-Z0-9]{16,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /(?:service_role|api[_-]?key|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{24,}["']/i
];
let findings = 0;
for (const path of paths) {
  if (!/\.(?:ts|tsx|js|mjs|json|md|sql|ya?ml|env|example)$/i.test(path) || path === 'package-lock.json') continue;
  const content = readFileSync(resolve(root, path), 'utf8');
  if (patterns.some(pattern => pattern.test(content))) { console.error(`Possible secret in ${path}; value suppressed.`); findings++; }
}
if (findings) process.exitCode = 1;
else console.log(`Secret heuristic scan passed (${paths.length} candidate repository files; ignored runtime data excluded).`);
