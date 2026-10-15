/** 基础界面组件。 */
import type { ReactNode } from "react";

export function PageHead({ no, title, desc, right }: { no: string; title: string; desc: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-xs font-semibold tracking-widest text-accent">{no}</div>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{desc}</p>
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-panel p-4 ${className}`}>{children}</div>;
}

const TONES = {
  gray: "bg-bg text-muted",
  blue: "bg-accent-soft text-accent",
  green: "bg-good-soft text-good",
  amber: "bg-warn-soft text-warn",
  red: "bg-bad-soft text-bad",
};
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

const BTN = {
  primary: "bg-accent text-white hover:brightness-110",
  ghost: "border border-line bg-panel text-ink hover:bg-bg",
  danger: "border border-bad/30 bg-panel text-bad hover:bg-bad-soft",
};

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof BTN;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${BTN[variant]}`}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, delta, invert }: { label: string; value: string; delta?: number; invert?: boolean }) {
  const good = delta !== undefined && (invert ? delta < 0 : delta > 0);
  return (
    <Card>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {delta !== undefined && (
        <div className={`mt-1 text-xs ${good ? "text-good" : "text-bad"}`}>
          环比 {delta > 0 ? "+" : ""}
          {(delta * 100).toFixed(1)}%
        </div>
      )}
    </Card>
  );
}

export function Json({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto rounded-lg bg-side p-3 text-xs leading-relaxed text-side-ink">{JSON.stringify(value, null, 2)}</pre>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="关闭">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-line px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2 text-sm ${className}`}>{children}</td>;
}
