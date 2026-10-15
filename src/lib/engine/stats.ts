/** 指标聚合与取数。 */
import type { AdGroup, MetricRow, Plan } from "../types";
import { DAYS } from "../mock/metrics";
import { METRICS } from "../mock/metrics";

/** 演示里可变的账户状态 */
export interface Account {
  plans: Plan[];
  adGroups: AdGroup[];
  /** 已暂停的创意，planId:noteId */
  paused: string[];
}

export interface Agg {
  imp: number;
  clk: number;
  spend: number;
  ti: number;
  comp: number;
  ctr: number;
  cpti: number | null;
  compRate: number;
}

export function agg(rows: MetricRow[]): Agg {
  const s = { imp: 0, clk: 0, spend: 0, ti: 0, comp: 0 };
  for (const r of rows) {
    s.imp += r.imp;
    s.clk += r.clk;
    s.spend += r.spend;
    s.ti += r.ti;
    s.comp += r.comp;
  }
  return {
    ...s,
    ctr: s.imp ? s.clk / s.imp : 0,
    cpti: s.ti ? s.spend / s.ti : null,
    compRate: s.imp ? s.comp / s.imp : 0,
  };
}

export function lastDays(n: number): string[] {
  return DAYS.slice(-n);
}

export function rowsIn(days: string[], pred: (r: MetricRow) => boolean = () => true): MetricRow[] {
  const set = new Set(days);
  return METRICS.filter((r) => set.has(r.date) && pred(r));
}

export const creativeKey = (planId: string, noteId: string) => `${planId}:${noteId}`;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const yuan = (x: number) => `${Math.round(x).toLocaleString("zh-CN")} 元`;
