import { SafetyOutlined, TeamOutlined, WalletOutlined, ShopOutlined } from '@ant-design/icons';

const dimensions = [
  [SafetyOutlined, 'Operating risk', 'Verify licences, insurance and how you will handle customer devices.'],
  [TeamOutlined, 'Customer demand', 'Interview likely customers and test whether they would book a repair.'],
  [WalletOutlined, 'Cost and budget', 'Get quotes for tools, parts and insurance before comparing them with your budget.'],
  [ShopOutlined, 'Local competition', 'Compare which local providers handle the same repairs, their price and turnaround.'],
] as const;

/** 在报告首屏说明决策所需的证据。 */
export function ReportSummary({ t, localRepair }: { t: (text: string) => string; localRepair: boolean }) {
  return <section className="decision-summary" aria-labelledby="decision-summary">
    <h2 id="decision-summary">{t('Should I take this idea further?')}</h2>
    <p><strong>{t('Run a small validation test before investing.')}</strong></p>
    <p>{t('Overall score: insufficient evidence')}</p>
    <dl className="decision-dimensions">
      {dimensions.map(([Icon, label, detail]) => <div key={label}>
        <dt><Icon aria-hidden="true" />{t(label)}</dt>
        <dd><span className="chip warning">{t('Needs verification')}</span>
          {localRepair && <p>{t(detail)}</p>}
        </dd>
      </div>)}
    </dl>
  </section>;
}
