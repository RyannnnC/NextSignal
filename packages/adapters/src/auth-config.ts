import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

export const LocalAuthConfig = z.object({
  url: z.literal('http://127.0.0.1:55421'), key: z.string().min(20),
  host: z.literal('127.0.0.1'), port: z.literal(55422), database: z.literal('postgres'),
  backendPassword: z.string().regex(/^[a-f0-9]{64}$/), queuePassword: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

/** 从专属私有文件读取本地 Auth 环境，拒绝托管 URL 或 fixture 数据库。 */
export async function readLocalAuth(root: string) {
  return LocalAuthConfig.parse(JSON.parse(await readFile(resolve(root, '.local/auth-local.json'), 'utf8')));
}

