import { AimOutlined, BarChartOutlined, DownOutlined, ExperimentOutlined, FileSearchOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import styles from './evidence-preview.module.css';

const icons = {
  statistic: BarChartOutlined,
  statement: UserOutlined,
  simulation: ExperimentOutlined,
  hypothesis: QuestionCircleOutlined,
  action: AimOutlined,
  unknown: FileSearchOutlined,
};

/** Shares the evidence treatment between the public preview and private report. */
export function EvidencePreview({ kind, label, summary, children }: {
  kind: keyof typeof icons;
  label: string;
  summary: ReactNode;
  children?: ReactNode;
}) {
  const Icon = icons[kind];
  const content = <>
    <span className={styles.icon} data-kind={kind}><Icon aria-hidden="true" /></span>
    <span className={styles.copy}><strong>{label}</strong><span>{summary}</span></span>
  </>;

  return children ? <details className={styles.row}>
    <summary className={styles.line}>{content}<DownOutlined aria-hidden="true" className={styles.chevron} /></summary>
    <div className={styles.details}>{children}</div>
  </details> : <div className={styles.row}><div className={styles.line}>{content}</div></div>;
}
