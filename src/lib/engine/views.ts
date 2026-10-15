/** 看板与 TOP10 的取数，都是纯函数。 */
import type { PlacementId, Rules } from "../types";
import { CONTENT_TYPE, NOTES, PACKS, PLACEMENTS, PLANS } from "../mock/catalog";
import { DAYS, YESTERDAY } from "../mock/metrics";
import { type Agg, agg, lastDays, rowsIn } from "./stats";

const placementOf = new Map(PLANS.map((p) => [p.id, p.placement]));

export function dashboard() {
  const prev = DAYS[DAYS.length - 2];
  const y = agg(rowsIn([YESTERDAY]));
  const p = agg(rowsIn([prev]));
  const days14 = lastDays(14);
  const series = days14.map((date) => {
    const point: Record<string, number | string> = { date: date.slice(5) };
    for (const pl of PLACEMENTS) point[pl.name] = Math.round(agg(rowsIn([date], (r) => placementOf.get(r.planId) === pl.id)).spend);
    const a = agg(rowsIn([date]));
    point.CTR = +(a.ctr * 100).toFixed(2);
    point.CPTI = +(a.cpti ?? 0).toFixed(2);
    return point;
  });
  const cards = PLACEMENTS.map((pl) => {
    const yd = agg(rowsIn([YESTERDAY], (r) => placementOf.get(r.planId) === pl.id));
    const avg = agg(rowsIn(days14, (r) => placementOf.get(r.planId) === pl.id));
    const alerts: string[] = [];
    if (yd.cpti && avg.cpti && yd.cpti > avg.cpti * 1.25) alerts.push(`TI 成本 ${yd.cpti.toFixed(1)}，比近 14 天均值高 ${Math.round((yd.cpti / avg.cpti - 1) * 100)}%`);
    if (yd.imp && yd.ctr < avg.ctr * 0.8) alerts.push(`CTR ${(yd.ctr * 100).toFixed(2)}%，低于近 14 天均值的 80%`);
    return { placement: pl, yd, avg, alerts };
  });
  return { date: YESTERDAY, y, p, series, cards };
}

export type RankKey = "ctr" | "compRate" | "cpti" | "spend" | "imp";

export interface RankRow {
  noteId: string;
  title: string;
  talent: string;
  tag: string;
  month: string;
  a: Agg;
  qualified: boolean;
}

export interface Top10Group {
  packId: string;
  packName: string;
  placement: PlacementId;
  head: RankRow[];
  tail: RankRow[];
  thin: number;
  summary: { live: number; oldestMonth: string; qualified: number };
}

function sorter(key: RankKey) {
  return (x: RankRow, y: RankRow) => {
    if (key === "cpti") return (x.a.cpti ?? Infinity) - (y.a.cpti ?? Infinity) || y.a.spend - x.a.spend;
    return (y.a[key] as number) - (x.a[key] as number) || y.a.spend - x.a.spend;
  };
}

export function top10(rules: Rules, windowDays: number, key: RankKey): Top10Group[] {
  const days = lastDays(windowDays);
  const last7 = lastDays(7);
  const groups: Top10Group[] = [];
  for (const pack of PACKS) {
    for (const pl of PLACEMENTS) {
      const rows = rowsIn(days, (r) => r.packId === pack.id && placementOf.get(r.planId) === pl.id);
      if (!rows.length) continue;
      const all: RankRow[] = [...new Set(rows.map((r) => r.noteId))].map((noteId) => {
        const note = NOTES.find((n) => n.id === noteId)!;
        const a = agg(rows.filter((r) => r.noteId === noteId));
        return { noteId, title: note.title, talent: note.talent, tag: note.tag, month: note.month, a, qualified: a.ctr >= rules.amplify[CONTENT_TYPE[note.tag]].ctr };
      });
      const ranked = all.filter((r) => r.a.imp >= rules.minImpressions);
      const tail = ranked.filter(
        (r) => r.a.ctr < rules.ctrStop && last7.every((d) => rows.some((x) => x.date === d && x.noteId === r.noteId && x.imp > 0)),
      );
      groups.push({
        packId: pack.id,
        packName: pack.name,
        placement: pl.id,
        head: ranked.sort(sorter(key)).slice(0, 10),
        tail,
        thin: all.length - ranked.length,
        summary: {
          live: all.length,
          oldestMonth: all.map((r) => r.month).sort()[0],
          qualified: ranked.filter((r) => r.qualified).length,
        },
      });
    }
  }
  return groups;
}

/** 某篇笔记近 30 天在各个包的表现 */
export function noteByPack(noteId: string) {
  const rows = rowsIn(lastDays(30), (r) => r.noteId === noteId);
  return [...new Set(rows.map((r) => r.packId))].map((packId) => ({
    pack: PACKS.find((p) => p.id === packId)?.name ?? "（搜索，无人群包）",
    a: agg(rows.filter((r) => r.packId === packId)),
  }));
}
