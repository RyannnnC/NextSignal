import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const expression = process.argv[2];
if (!expression) throw new Error('Pass a regular expression to scan tracked paths and UTF-8 text.');
const pattern = new RegExp(expression, 'iu');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).split('\0').filter(Boolean);
let identifiers = 0;
let integrity = 0;
for (const path of files) {
  if (pattern.test(path)) { console.log(`path ${path}`); identifiers++; }
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  let content;
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { continue; }
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!pattern.test(line)) continue;
    const opaque = path === 'package-lock.json' && /^\s*"integrity": "sha\d+-[A-Za-z0-9+/=]+",?$/.test(line);
    console.log(`${opaque ? 'integrity' : 'text'} ${path}:${index + 1}`);
    if (opaque) integrity++; else identifiers++;
  }
}
console.log(`${identifiers} identifier matches, ${integrity} opaque integrity matches.`);
process.exitCode = identifiers ? 1 : 0;
