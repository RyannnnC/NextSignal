import { z } from 'zod';
import { SYDNEY_AREAS, type LocalOpportunityInput } from '@nextsignal/contracts';
import type { AbsPopulationProvider, Transaction } from '@nextsignal/application';

const base = 'https://data.api.abs.gov.au/rest/';
const flowId = 'C21_G01_SAL';
const indicator = 'census_total_persons';
const structureMedia = 'application/vnd.sdmx.structure+json';
const csvMedia = 'application/vnd.sdmx.data+csv';
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const dimensionIds = ['SEXP', 'PCHAR', 'REGION', 'REGION_TYPE', 'STATE'];
const CodeList = z.object({ id: z.string(), codes: z.array(z.object({ id: z.string(), name: z.string() })) });
const Dataflow = z.object({ id: z.string(), version, name: z.string(), structure: z.string() });
const Structure = z.object({ id: z.string(), version, dataStructureComponents: z.object({ dimensionList: z.object({ dimensions: z.array(z.object({ id: z.string(), position: z.number(), localRepresentation: z.object({ enumeration: z.string() }) })) }) }) });
const Snapshot = z.object({
  dataflowVersion: version, structureVersion: version, sourceUrl: z.url({ protocol: /^https$/, hostname: /^data\.api\.abs\.gov\.au$/ }),
  collectedAt: z.iso.datetime(), observations: z.array(z.object({ region: z.string().regex(/^\d{5}$/), value: z.number().int().nonnegative().safe().nullable(), status: z.string().optional() }).strict()).max(3),
}).strict();
type Snapshot = z.infer<typeof Snapshot>;
export interface AbsCache {
  read(key: string): Promise<unknown>;
  write(key: string, value: Snapshot): Promise<void>;
}

export class PostgresAbsCache implements AbsCache {
  /** 只通过受限 worker 事务访问公共统计缓存。 */
  constructor(private readonly run: <T>(work: (tx: Transaction) => Promise<T>) => Promise<T>) {}

  /** 过期记录视同未命中。 */
  async read(key: string): Promise<unknown> {
    return this.run(async tx => (await tx.query<{ payload: unknown }>(
      'select payload from kyb_private.abs_observation_cache where cache_key=$1 and expires_at > now()', [key]
    )).rows[0]?.payload);
  }

  /** 缓存保留七天。旧请求即使稍晚写入也不会覆盖新快照。 */
  async write(key: string, value: Snapshot): Promise<void> {
    await this.run(async tx => {
      await tx.query(`insert into kyb_private.abs_observation_cache(cache_key,payload,collected_at,expires_at)
        values($1,$2,$3::timestamptz,$3::timestamptz + interval '7 days')
        on conflict(cache_key) do update set payload=excluded.payload,collected_at=excluded.collected_at,expires_at=excluded.expires_at
        where kyb_private.abs_observation_cache.collected_at <= excluded.collected_at`, [key, value, value.collectedAt]);
    });
  }
}

export class AbsError extends Error {
  /** 保存经过控制的错误码和可选等待时长。 */
  constructor(readonly code: string, readonly status?: number, readonly retryAfter?: string | null) { super(code); }
}

export class AbsProvider implements AbsPopulationProvider {
  private metadata?: { flow: string; structure: string; expiresAt: number };
  private active = false;

  /** 使用可注入的请求和共享缓存，便于验证离线与失败场景。 */
  constructor(private readonly cache: AbsCache, private readonly transport: typeof fetch = fetch) {}

  /** 读取轻量数据流目录，供服务端数据发现使用。 */
  async discover(signal: AbortSignal) {
    const body = await this.request('dataflow/ABS?detail=allstubs', structureMedia, signal);
    const stub = z.object({ id: z.string().min(1), name: z.string().min(1), version: z.string().min(1).max(80) });
    return z.object({ data: z.object({ dataflows: z.array(stub) }) }).parse(JSON.parse(body)).data.dataflows;
  }

  /** 读取已允许数据流的 DSD。 */
  async structure(signal: AbortSignal) {
    const body = await this.request(`datastructure/ABS/${flowId}`, structureMedia, signal);
    return z.object({ data: z.object({ dataStructures: z.array(Structure).length(1) }) }).parse(JSON.parse(body)).data.dataStructures[0]!;
  }

  /** 从共享缓存读取或向 ABS 查询最多三个已验证的统计地区。 */
  async population(ids: LocalOpportunityInput['areaIds'], signal: AbortSignal): Promise<Snapshot> {
    if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !Object.hasOwn(SYDNEY_AREAS, id))) throw new AbsError('abs_invalid_regions');
    if (this.active) throw new AbsError('abs_busy');
    this.active = true;
    try {
      const meta = await this.resolveMetadata(signal);
      const regions = ids.map(id => SYDNEY_AREAS[id].sourceId.slice(3)).sort();
      const query = `data/ABS,${flowId},${meta.flow}/3.P_1.${regions.join('+')}.SAL.1?startPeriod=2021&endPeriod=2021&lastNObservations=1&detail=full&dimensionAtObservation=AllDimensions&format=csv`;
      const sourceUrl = new URL(query, base).href;
      const key = ['abs', indicator, flowId, meta.flow, meta.structure, 'ASGS3-SAL-2021', '3.P_1.SAL.1', regions.join('+'), '2021'].join(':');
      const cached = Snapshot.safeParse(await this.cache.read(key));
      if (cached.success && cached.data.sourceUrl === sourceUrl && cached.data.structureVersion === meta.structure && cached.data.dataflowVersion === meta.flow &&
        new Set(cached.data.observations.map(item => item.region)).size === cached.data.observations.length &&
        cached.data.observations.every(item => regions.includes(item.region))) return cached.data;
      const observations = parsePopulationCsv(await this.request(query, csvMedia, signal), meta.flow, regions);
      const snapshot = Snapshot.parse({ dataflowVersion: meta.flow, structureVersion: meta.structure, sourceUrl, collectedAt: new Date().toISOString(), observations });
      await this.cache.write(key, snapshot);
      return snapshot;
    } finally { this.active = false; }
  }

  /** 从元数据核实维度顺序、编码含义和地区版本。 */
  private async resolveMetadata(signal: AbortSignal) {
    if (this.metadata && this.metadata.expiresAt > Date.now()) return this.metadata;
    const body = await this.request(`dataflow/ABS/${flowId}?references=descendants`, structureMedia, signal);
    const { data } = z.object({ data: z.object({ dataflows: z.array(Dataflow).length(1), dataStructures: z.array(Structure).length(1), codelists: z.array(CodeList) }) }).parse(JSON.parse(body));
    const flow = data.dataflows[0]!, structure = data.dataStructures[0]!;
    const dimensions = [...structure.dataStructureComponents.dimensionList.dimensions].sort((a,b) => a.position-b.position);
    if (flow.id !== flowId || structure.id !== flowId || !flow.structure.endsWith(`=ABS:${structure.id}(${structure.version})`) || dimensions.map(d => d.id).join() !== dimensionIds.join()) throw new AbsError('abs_metadata_mismatch');
    const expected = [
      ['CL_C21_SEXP01', [['3', 'Persons']]], ['CL_C21_PCHAR01', [['P_1', 'Total persons']]],
      ['CL_SAL_2021', Object.values(SYDNEY_AREAS).map(area => [area.sourceId.slice(3), area.name])],
      ['CL_REGION_TYPE', [['SAL', 'Suburbs and Localities']]], ['CL_STATE', [['1', 'New South Wales']]],
    ] as const;
    for (const [index, [listId, codes]] of expected.entries()) {
      const list = data.codelists.find(item => item.id === listId);
      if (!dimensions[index]?.localRepresentation.enumeration.includes(`=ABS:${listId}(`) || !list || codes.some(([id,name]) => !list.codes.some(code => code.id === id && code.name === name))) throw new AbsError('abs_metadata_mismatch');
    }
    return this.metadata = { flow: flow.version, structure: structure.version, expiresAt: Date.now() + 86_400_000 };
  }

  /** 对固定 ABS 路径执行有界 HTTPS 请求，限制重试和解压后的响应大小。 */
  private async request(path: string, media: string, signal: AbortSignal): Promise<string> {
    const url = new URL(path, base);
    if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/rest/')) throw new AbsError('abs_invalid_origin');
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted();
      const timeout = AbortSignal.timeout(5_000);
      try {
        const response = await this.transport(url, { headers: { accept: media, 'user-agent': 'NextSignal-ABS/1.0' }, redirect: 'error', signal: AbortSignal.any([signal, timeout]) });
        if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== media) {
          await response.body?.cancel();
          throw response.ok ? new AbsError('abs_content_type') : new AbsError('abs_http', response.status, response.headers.get('retry-after'));
        }
        // SAL 目录包含全国约 1.5 万个地区，解压后的元数据约 5.3 MB。
        const limit = media === csvMedia ? 16_384 : 8_388_608;
        const reader = response.body?.getReader();
        if (!reader) throw new AbsError('abs_empty_response');
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          length += next.value.byteLength;
          if (length > limit) { await reader.cancel(); throw new AbsError('abs_response_too_large'); }
          chunks.push(next.value);
        }
        return Buffer.concat(chunks).toString('utf8');
      } catch (error) {
        signal.throwIfAborted();
        const failure = error instanceof AbsError ? error : new AbsError(timeout.aborted ? 'abs_timeout' : 'abs_network');
        const retryable = failure.status === undefined ? ['abs_network','abs_timeout'].includes(failure.code) : [429, 500, 502, 503, 504].includes(failure.status);
        const retryAfter = failure.retryAfter;
        const delay = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now())) : 200 * 2 ** attempt + Math.random() * 100;
        if (!retryable || attempt >= 1 || !Number.isFinite(delay) || delay > 1000) throw failure;
        const { setTimeout } = await import('node:timers/promises');
        await setTimeout(delay, undefined, { signal });
      }
    }
  }
}

/** 解析限定的 SDMX-CSV 序列，按地区编码匹配观察值。 */
export function parsePopulationCsv(csv: string, flowVersion: string, regions: readonly string[]) {
  const [header, ...lines] = csv.trimEnd().split(/\r?\n/);
  const expected = 'DATAFLOW,SEXP,PCHAR,REGION,REGION_TYPE,STATE,TIME_PERIOD,OBS_VALUE';
  const hasStatus = header === `${expected},OBS_STATUS`;
  if (header !== expected && !hasStatus) throw new AbsError('abs_csv_columns');
  const seen = new Set<string>();
  return lines.map(line => {
    const fields = line.split(',');
    const [flow, sex, measure, region, type, state, period, value, status] = fields;
    if (fields.length !== (hasStatus ? 9 : 8) || flow !== `ABS:${flowId}(${flowVersion})` || sex !== '3' || measure !== 'P_1' || !region || !regions.includes(region) || seen.has(region) || type !== 'SAL' || state !== '1' || period !== '2021' || (value !== '' && (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) || (status && !/^[A-Z0-9_]+$/.test(status))) throw new AbsError('abs_csv_observation');
    seen.add(region);
    return { region, value: value === '' || (status && status !== 'A') ? null : Number(value), ...(status ? { status } : {}) };
  });
}
