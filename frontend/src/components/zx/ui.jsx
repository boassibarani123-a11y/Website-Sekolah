import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export function PageHeader({ title, subtitle, actions, testid = "page-header" }) {
  return (
    <div className="zx-page-header flex flex-wrap items-start justify-between gap-4" data-testid={testid}>
      <div className="min-w-0">
        <h1 className="zx-title">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatStrip({ items, testid = "stat-strip" }) {
  return (
    <div className="zx-card grid grid-cols-2 lg:grid-flow-col lg:auto-cols-fr" data-testid={testid}>
      {items.map((s, i) => {
        const body = (
          <>
            <p className="text-[12.5px] text-slate-500">{s.label}</p>
            <p className="zx-stat-value mt-2" data-testid={s.testid}>{s.value}</p>
            {s.hint && <p className="mt-1 text-[11.5px] text-slate-400">{s.hint}</p>}
          </>
        );
        const cls = "block p-5 sm:p-6 zx-stat-cell";
        return s.to ? <Link key={i} to={s.to} className={`${cls} hover:bg-slate-50/70 transition-colors`}>{body}</Link> : <div key={i} className={cls}>{body}</div>;
      })}
    </div>
  );
}

export function Panel({ title, subtitle, link, linkTo, actions, children, className = "", bodyClass = "", testid }) {
  return (
    <section className={`zx-card p-5 sm:p-6 ${className}`} data-testid={testid}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="zx-panel-title">{title}</h2>
              {link && linkTo && <Link to={linkTo} className="text-[12px] text-sky-600 font-medium inline-flex items-center gap-0.5 hover:underline">{link}<ArrowUpRight className="w-3 h-3"/></Link>}
            </div>
            {subtitle && <p className="text-[12px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const TONE = { green: "text-emerald-600", amber: "text-amber-600", sky: "text-sky-600", rose: "text-rose-600", slate: "text-slate-500" };
export function StatusText({ tone = "slate", children }) {
  return <span className={`text-[12.5px] font-medium ${TONE[tone]}`}>{children}</span>;
}

export function PrimaryButton({ children, className = "", ...p }) {
  return <button {...p} className={`zx-btn-primary ${className}`}>{children}</button>;
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {Icon && <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-2"><Icon className="w-5 h-5 text-slate-400"/></div>}
      <p className="text-[13px] text-slate-400">{text}</p>
    </div>
  );
}

export function UnderlineTabs({ tabs, value, onChange, testid = "tab" }) {
  return (
    <div className="flex gap-6 border-b border-slate-200/80 overflow-x-auto no-scrollbar">
      {tabs.map(([k, l, Icon]) => (
        <button key={k} data-testid={`${testid}-${k}`} onClick={() => onChange(k)}
          className={`pb-2.5 -mb-px text-[13px] whitespace-nowrap border-b-2 inline-flex items-center gap-1.5 transition-colors ${value === k ? "border-sky-600 text-sky-700 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {Icon && <Icon className="w-3.5 h-3.5"/>}{l}
        </button>
      ))}
    </div>
  );
}
