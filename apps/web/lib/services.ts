export type Service = Readonly<{
  id: string; name: string; amount: number | null;
  status: 'fixture' | 'planned'; perReport: boolean; features: readonly string[];
  href: string;
}>;
/** Display proposals only: no billing, entitlement or provider configuration. */
export const services: readonly Service[] = [
  {id:'free',name:'Free Business Snapshot',amount:0,status:'fixture',perReport:false,
    features:['Business profile placeholder and founder confirmation','Limited synthetic evidence and unknowns','Fixed validation experiment templates'],href:'/validate'},
  {id:'idea-report',name:'Idea Validation Report',amount:49,status:'planned',perReport:true,
    features:['Australian market and search demand research','Keyword and customer question research','Competitor landscape and Red Team assessment','Evidence-based validation action plan'],href:'/#idea-scope'},
  {id:'growth-report',name:'Business Growth Report',amount:79,status:'planned',perReport:true,
    features:['Business and website analysis with SEO findings','Search opportunities and content gaps','Competitor gaps and prioritised growth recommendations'],href:'/grow'},
  {id:'expert',name:'Expert Services',amount:null,status:'planned',perReport:false,
    features:['Human-reviewed analysis and personalised consultation','SEO/GEO implementation','Website and landing page optimisation'],href:'/#expert-status'}
];
