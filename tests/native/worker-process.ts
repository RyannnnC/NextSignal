import { ResearchRunner } from '@nextsignal/application/runner';
import { FixtureProvider } from '@nextsignal/adapters';
import { database } from './setup.js';
import type { ProviderContext } from '@nextsignal/application';

class ConcurrentFixtureProvider extends FixtureProvider {
  /** 在独立测试进程中为任务收集合成证据。 */
  override async collect(context: ProviderContext) {
    // A bounded test barrier window makes overlapping worker executions observable.
    await new Promise(resolve => setTimeout(resolve, 100));
    return super.collect(context);
  }
}

const db = database();
process.send?.('ready');
process.once('message', () => {
  void (async () => {
    try {
      const runner = new ResearchRunner(db, new ConcurrentFixtureProvider());
      let completed = 0;
      while (await runner.processOne()) completed++;
      process.send?.({ completed });
    } finally { await db.close(); process.disconnect?.(); }
  })().catch(() => { process.exitCode = 1; });
});
