import { execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';

/** 使用当前 Docker context 的本地引擎 API，保留容器配置与卷，仅收紧发布地址。 */
async function engine(path: string, method: string, body?: unknown) {
  const context = JSON.parse(execFileSync('docker', ['context', 'inspect'], { encoding: 'utf8' }))[0];
  const host: string = context.Endpoints.docker.Host;
  const socketPath = host.startsWith('npipe://') ? host.slice('npipe://'.length).replaceAll('/', '\\') : host.startsWith('unix://') ? host.slice(7) : '';
  if (!socketPath) throw new Error('Local Docker socket required');
  return new Promise<string>((done, reject) => {
    const req = request({ socketPath, path, method, headers: { 'Content-Type': 'application/json' } }, response => {
      let result = '';
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => {
        if (response.statusCode && response.statusCode < 300) done(result);
        else {
          void writeFile('.local/auth-bind-error.json', result, { mode: 0o600 });
          reject(new Error('Docker binding operation failed'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Local Docker operation timed out')));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

let databaseReplaced = false;
for (const service of ['kong', 'db', 'studio', 'inbucket']) {
  const name = `supabase_${service}_nextsignal-auth-local`;
  const data = JSON.parse(await engine(`/containers/${name}/json`, 'GET'));
  const bindings = data.HostConfig.PortBindings;
  if (Object.values(bindings).every(value => (value as { HostIp: string }[]).every(item => item.HostIp === '127.0.0.1'))) continue;
  for (const values of Object.values(bindings) as { HostIp: string; HostPort: string }[][]) {
    for (const value of values) {
      if (!['55421', '55422', '55423', '55424'].includes(value.HostPort)) throw new Error('Unexpected local Auth port');
      value.HostIp = '127.0.0.1';
    }
  }
  const endpoints = Object.fromEntries(Object.entries(data.NetworkSettings.Networks).map(([network, config]) =>
    [network, { Aliases: (config as { Aliases: string[] }).Aliases }]));
  const original = `${name}_binding_backup`;
  let kongFiles: Buffer | undefined;
  await mkdir('.local/auth-container-recovery', { recursive: true, mode: 0o700 });
  await writeFile(`.local/auth-container-recovery/${name}.json`, JSON.stringify(data), { mode: 0o600 });
  if (service === 'kong') {
    kongFiles = execFileSync('docker', ['cp', `${name}:/home/kong/.`, '-'], { maxBuffer: 16 * 1024 * 1024 });
    await writeFile('.local/auth-container-recovery/kong.tar', kongFiles, { mode: 0o600 });
  }
  await engine(`/containers/${name}/stop?t=10`, 'POST');
  await engine(`/containers/${name}/rename?name=${original}`, 'POST');
  try {
    await engine(`/containers/create?name=${name}`, 'POST', {
      ...data.Config, HostConfig: data.HostConfig, NetworkingConfig: { EndpointsConfig: endpoints },
    });
    if (kongFiles) execFileSync('docker', ['cp', '-a', '-', `${name}:/home/kong`], { input: kongFiles, stdio: ['pipe', 'ignore', 'ignore'] });
    for (let attempt = 0; ; attempt++) {
      try { await engine(`/containers/${name}/start`, 'POST'); break; }
      catch { if (attempt === 15) throw new Error('Local port did not become available'); await new Promise(done => setTimeout(done, 1000)); }
    }
    await new Promise(done => setTimeout(done, 2000));
    const state = JSON.parse(await engine(`/containers/${name}/json`, 'GET')).State;
    if (!state.Running || state.Restarting) throw new Error('Replacement container failed to stay running');
  } catch {
    try { await engine(`/containers/${name}?force=true`, 'DELETE'); } catch { /* Creation may have failed before an ID was assigned. */ }
    await engine(`/containers/${original}/rename?name=${name}`, 'POST');
    await engine(`/containers/${name}/start`, 'POST');
    throw new Error('Could not restrict ports; original local container restored');
  }
  // The original container is stopped. Named database volumes remain attached to the replacement.
  await engine(`/containers/${original}`, 'DELETE');
  if (service === 'db') databaseReplaced = true;
}
if (databaseReplaced) {
  for (const service of ['auth', 'rest', 'pg_meta']) {
    await engine(`/containers/supabase_${service}_nextsignal-auth-local/restart?t=5`, 'POST');
  }
}
console.log('Local Auth published ports restricted to 127.0.0.1; named volumes preserved.');
