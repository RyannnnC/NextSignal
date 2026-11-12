'use client';

import { SYDNEY_AREAS, SydneyAreaId, type LocalOpportunityInput } from '@nextsignal/contracts';
import { useLanguage } from './site-shell';

/** 编辑允许的悉尼候选区和创始人提供的可选预算。 */
export function LocalOpportunityFields({ value, onChange, prefix }: {
  value: LocalOpportunityInput;
  onChange: (value: LocalOpportunityInput) => void;
  prefix: string;
}) {
  const { t } = useLanguage();
  return <>
    <p>{t('Business category')}: {t('Computer repair')} · {t('Primary market')}: Sydney, NSW</p>
    <fieldset>
      <legend>{t('Compare up to three Sydney localities')}</legend>
      {SydneyAreaId.options.map(id => <label className="checkbox-label" key={id}>
        <input type="checkbox" checked={value.areaIds.includes(id)} onChange={event => onChange({
          ...value, areaIds: event.target.checked ? [...value.areaIds, id] : value.areaIds.filter(item => item !== id),
        })} /> {SYDNEY_AREAS[id].name}
      </label>)}
    </fieldset>
    <label htmlFor={`${prefix}-budget`}>{t('Startup budget (AUD, optional)')}</label>
    <input id={`${prefix}-budget`} type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={value.budgetAud ?? ''}
      onChange={event => onChange({ ...value, budgetAud: event.target.value === '' ? undefined : event.target.valueAsNumber })} />
  </>;
}
