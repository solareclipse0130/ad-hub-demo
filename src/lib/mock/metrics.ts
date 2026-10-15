/** 用固定种子生成 30 天离线报表，每次打开数据都一样。 */
import type { MetricRow, Plan } from "../types";
import { AD_GROUPS, CONTENT_TYPE, NOTES, PLANS, TODAY } from "./catalog";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 报表日期：TODAY 之前 30 天，最后一天是昨天（T+1） */
export const DAYS: string[] = Array.from({ length: 30 }, (_, i) => addDays(TODAY, i - 30));
export const YESTERDAY = DAYS[DAYS.length - 1];

const BASE = {
  曝光: { ctr: 0.078, cpti: 4.2, comp: 0.0085 },
  种草: { ctr: 0.064, cpti: 5.4, comp: 0.0095 },
  转化: { ctr: 0.07, cpti: 6.4, comp: 0.0088 },
};
/** 昨天的两处异常，让看板的异常检测有东西可看 */
const INCIDENT: Partial<Record<Plan["placement"], { ctr: number; ti: number }>> = {
  video: { ctr: 1, ti: 0.55 },
  feed_south: { ctr: 0.72, ti: 1 },
};
const CPM: Record<Plan["placement"], number> = { feed: 46, video: 82, search: 30, feed_east: 38, feed_south: 41 };

function planDailySpend(p: Plan): number {
  if (p.dailyBudget > 0) return p.dailyBudget * 0.82;
  const group = AD_GROUPS.find((g) => g.id === p.adGroupId)!;
  const siblings = PLANS.filter((x) => x.adGroupId === p.adGroupId).length;
  return group.enabled ? (group.budget * 0.8) / siblings : 0;
}

function generate(): MetricRow[] {
  const rand = mulberry32(20261015);
  const noise = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const rows: MetricRow[] = [];
  for (const p of PLANS) {
    const packs = p.packIds.length ? p.packIds : ["-"];
    const daily = planDailySpend(p);
    for (const date of DAYS) {
      if (date < p.createdAt) continue;
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const dayFactor = weekday === 0 || weekday === 6 ? 1.12 : 1;
      const incident = (date === DAYS[DAYS.length - 1] && INCIDENT[p.placement]) || { ctr: 1, ti: 1 };
      for (const noteId of p.noteIds) {
        const note = NOTES.find((n) => n.id === noteId)!;
        const base = BASE[CONTENT_TYPE[note.tag]];
        for (const packId of packs) {
          const spend = (daily / (p.noteIds.length * packs.length)) * noise(0.55, 1.45) * dayFactor;
          const imp = Math.round((spend / CPM[p.placement]) * 1000);
          const ctr = base.ctr * note.ctrFactor * noise(0.88, 1.12) * (p.placement === "search" ? 1.6 : 1) * incident.ctr;
          rows.push({
            date,
            planId: p.id,
            noteId,
            packId,
            imp,
            clk: Math.round(imp * ctr),
            spend: Math.round(spend * 100) / 100,
            ti: Math.round((spend / (base.cpti * note.cptiFactor * noise(0.85, 1.15))) * incident.ti),
            comp: Math.round(imp * base.comp * note.ctrFactor * noise(0.8, 1.2)),
          });
        }
      }
    }
  }
  return rows;
}

export const METRICS: MetricRow[] = generate();
