import type { Locale } from '../lib/i18n';

/** Original inline flag geometry, never a remote flag/tracking request. */
/** 根据语言选项渲染装饰性旗帜图标。 */
function Flag({ country }: { country: 'AU' | 'CN' }) {
  const star='0,-5 1.5,-1.6 5,-1.6 2.2,1 3.2,4.6 0,2.5 -3.2,4.6 -2.2,1 -5,-1.6 -1.5,-1.6';
  return <svg aria-hidden="true" viewBox="0 0 40 28" width="28" height="20" focusable="false">
    {country === 'CN' ? <><path fill="#DE2910" d="M0 0h40v28H0z"/><polygon points={star} transform="translate(8 8)" fill="#FFDE00"/>{[[17,4],[20,9],[20,15],[16,20]].map(([x,y])=><polygon key={y} points={star} transform={`translate(${x} ${y}) scale(.35)`} fill="#FFDE00"/>)}</> : <><path fill="#012169" d="M0 0h40v28H0z"/><path d="M0 0l20 14M20 0L0 14" stroke="white" strokeWidth="4"/><path d="M0 0l20 14M20 0L0 14" stroke="#C8102E" strokeWidth="1.5"/><path d="M10 0v14M0 7h20" stroke="white" strokeWidth="6"/><path d="M10 0v14M0 7h20" stroke="#C8102E" strokeWidth="3"/>{[[9,22,0.8],[29,6,.5],[25,15,.5],[35,13,.5],[30,23,.5]].map(([x,y,s])=><polygon key={`${x}-${y}`} points={star} transform={`translate(${x} ${y}) scale(${s})`} fill="white"/>)}</>}
  </svg>;
}
/** 显示当前语言的旗帜，按下即可切换到另一种语言。 */
export function LanguageSwitch({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  const english = locale === 'en';
  const label = english ? 'Switch to Simplified Chinese' : '切换到英语（澳大利亚）';
  return <div className="language-switch">
    <button type="button" aria-label={label} title={label} onClick={() => onChange(english ? 'zh-CN' : 'en')}>
      <Flag country={english ? 'AU' : 'CN'} />
    </button>
  </div>;
}
