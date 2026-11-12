import { describe, expect, it, vi } from 'vitest';
import { AbsProvider, parsePopulationCsv } from '@nextsignal/adapters/abs-provider';

// ABS 记录样本采集于 2026-11-12。查询及 CC BY 4.0 归属见 docs/ABS_DATA_INTEGRATION_PLAN.md。
const columns = 'DATAFLOW,SEXP,PCHAR,REGION,REGION_TYPE,STATE,TIME_PERIOD,OBS_VALUE';
const prefix = 'ABS:C21_G01_SAL(1.0.0),3,P_1';
const regions = ['11884', '10716', '10891'];

describe('ABS Census observations', () => {
  it('matches the coded observations independently of the requested ordering', () => {
    const csv = `${columns}\r\n${prefix},10716,SAL,1,2021,18224\r\n${prefix},11884,SAL,1,2021,8305\r\n`;
    expect(parsePopulationCsv(csv, '1.0.0', regions)).toEqual([{ region: '10716', value: 18224 }, { region: '11884', value: 8305 }]);
  });

  it('keeps missing and suppressed observations unavailable', () => {
    const csv = `${columns},OBS_STATUS\n${prefix},10716,SAL,1,2021,,M\n${prefix},10891,SAL,1,2021,999,S`;
    expect(parsePopulationCsv(csv, '1.0.0', regions)).toEqual([{ region: '10716', value: null, status: 'M' }, { region: '10891', value: null, status: 'S' }]);
  });

  it.each(['10716,SA2,1,2021,1', '10716,SAL,2,2021,1', '10716,SAL,1,2022,1',
    '99999,SAL,1,2021,1', '10716,SAL,1,2021,4.1', '10716,SAL,1,2021,9007199254740992',
    `10716,SAL,1,2021,1\n${prefix},10716,SAL,1,2021,2`
  ])('rejects unexpected observation %s', row => {
    expect(() => parsePopulationCsv(`${columns}\n${prefix},${row}`, '1.0.0', regions)).toThrow('abs_csv_observation');
  });

  it('rejects malformed headers and mismatched versions', () => {
    expect(() => parsePopulationCsv('invalid\n', '1.0.0', regions)).toThrow('abs_csv_columns');
    expect(() => parsePopulationCsv(`${columns}\n${prefix},10716,SAL,1,2021,1`, '2.0.0', regions)).toThrow('abs_csv_observation');
  });

  it('rejects duplicate locations without requesting metadata', async () => {
    const transport = vi.fn<typeof fetch>();
    const provider = new AbsProvider({ read: vi.fn(), write: vi.fn() }, transport);
    await expect(provider.population(['haymarket', 'haymarket'], AbortSignal.timeout(1_000))).rejects.toThrow('abs_invalid_regions');
    expect(transport).not.toHaveBeenCalled();
  });

  it('discovers catalogue entries that use legacy version formats', async () => {
    const stub = { id: 'LEGACY', name: 'Legacy dataset', version: '1.0' };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { dataflows: [stub] } }), {
      headers: { 'content-type': 'application/vnd.sdmx.structure+json' },
    }));
    const provider = new AbsProvider({ read: vi.fn(), write: vi.fn() }, transport);
    expect(await provider.discover(AbortSignal.timeout(1_000))).toEqual([stub]);
  });
});
