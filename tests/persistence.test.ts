import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { openFixtureDatabase, LOCAL_ACCOUNTS, FixtureProvider } from '@nextsignal/adapters';
import { Projects } from '@nextsignal/application/projects';
import { ResearchRunner } from '@nextsignal/application/runner';
import { prepared } from './helpers.js';

it('persists jobs and reports across database close/reopen and rejects migration drift', async () => {
  const temporaryRoot = resolve('.local');
  await mkdir(temporaryRoot, { recursive: true });
  // Keep PostgreSQL relation paths below Windows path-length limits in sandboxed temp directories.
  const directory = await mkdtemp(join(temporaryRoot, 'persistence-'));
  const path = join(directory, 'db');
  let db = await openFixtureDatabase(path);
  try {
    const { id } = await prepared(new Projects(db), LOCAL_ACCOUNTS.alice);
    await db.close();
    db = await openFixtureDatabase(path);
    await new ResearchRunner(db, new FixtureProvider()).processOne();
    const report = (await new Projects(db).get(LOCAL_ACCOUNTS.alice, id)).reports[0];
    expect(report?.synthetic).toBe(true);
    await db.close();
    db = await openFixtureDatabase(path);
    expect((await new Projects(db).get(LOCAL_ACCOUNTS.alice, id)).reports[0]).toEqual(report);
    await db.engine.query("update local_fixture.schema_migrations set checksum='invalid'");
    await db.close();
    await expect(openFixtureDatabase(path)).rejects.toThrow('checksum mismatch');
  } finally {
    if (!db.engine.closed) await db.close();
    await cleanup(directory, temporaryRoot);
  }
});

/** 关闭测试资源并清理本用例产生的临时文件。 */
async function cleanup(directory: string, temporaryRoot: string) {
  if (dirname(resolve(directory)) !== temporaryRoot || !basename(directory).startsWith('persistence-')) throw new Error('Unsafe temporary cleanup path');
  await rm(directory, { recursive: true, force: true });
}
