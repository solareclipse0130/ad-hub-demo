/** L0 规则引擎：按昨天为止的数据出停投 / 放大 / 补笔记建议。 */
import type { Rules, Suggestion } from "../types";
import { CONTENT_TYPE, NOTES, PACKS, TODAY } from "../mock/catalog";
import { type Account, agg, creativeKey, daysBetween, lastDays, pct, rowsIn, yuan } from "./stats";

const MAX_SUGGESTIONS = 12;
const MAX_FILL = 3;

function activeCreatives(account: Account) {
  return account.plans
    .filter((p) => p.status === "投放中" && p.placement !== "search" && !p.createdInDemo)
    .flatMap((p) => p.noteIds.filter((n) => !account.paused.includes(creativeKey(p.id, n))).map((noteId) => ({ plan: p, noteId })));
}

function stopReason(rules: Rules, planId: string, packIds: string[], noteId: string): [string, Record<string, string>] | null {
  const note = NOTES.find((n) => n.id === noteId)!;
  const cutoff = rules.tooOldByTag[note.tag] ?? rules.tooOldBefore;
  if (note.month < cutoff) return ["太老", { 笔记月份: note.month, 截止月: cutoff }];
  const bad = packIds.find((p) => rules.packMismatch[p]?.includes(note.tag));
  if (bad) return ["不契合", { 内容标签: note.tag, 人群包: PACKS.find((p) => p.id === bad)!.name }];
  const a = agg(rowsIn(lastDays(7), (r) => r.planId === planId && r.noteId === noteId));
  if (a.imp < rules.minImpressions) return null;
  if (a.ctr < rules.ctrStop) return ["指标差", { "近7天CTR": pct(a.ctr, 2), 停投线: pct(rules.ctrStop), 展现: String(a.imp) }];
  const std = rules.amplify[CONTENT_TYPE[note.tag]];
  if (a.cpti !== null && a.cpti > std.cpti * rules.tiFlyMultiple)
    return ["TI飞", { "近7天CPTI": a.cpti.toFixed(1), 放大标准CPTI: String(std.cpti), 倍数: `${rules.tiFlyMultiple}×` }];
  return null;
}

function stopSuggestions(account: Account, rules: Rules): Suggestion[] {
  const byNote = new Map<string, { planIds: string[]; reason: string; evidence: Record<string, string> }>();
  for (const { plan, noteId } of activeCreatives(account)) {
    const hit = stopReason(rules, plan.id, plan.packIds, noteId);
    if (!hit) continue;
    const cur = byNote.get(noteId) ?? { planIds: [], reason: hit[0], evidence: hit[1] };
    cur.planIds.push(plan.id);
    byNote.set(noteId, cur);
  }
  return [...byNote].map(([noteId, s]) => {
    const spend = agg(rowsIn(lastDays(7), (r) => r.noteId === noteId && s.planIds.includes(r.planId))).spend;
    return {
      id: `stop-${noteId}`,
      kind: "停投",
      reason: s.reason,
      noteId,
      evidence: { ...s.evidence, 涉及计划: `${s.planIds.length} 条`, 日均消耗: yuan(spend / 7) },
      action: { type: "pause_creatives", planIds: s.planIds, noteId },
      impact: spend / 7,
      ruleVersion: rules.version,
    };
  });
}

function amplifySuggestions(account: Account, rules: Rules, stopped: Set<string>): Suggestion[] {
  const out: Suggestion[] = [];
  const races = account.plans.filter((p) => p.kind === "赛马" && p.status === "投放中" && daysBetween(p.createdAt, TODAY) >= rules.raceDays);
  for (const race of races) {
    for (const noteId of race.noteIds) {
      if (stopped.has(noteId) || account.paused.includes(creativeKey(race.id, noteId))) continue;
      const note = NOTES.find((n) => n.id === noteId)!;
      const std = rules.amplify[CONTENT_TYPE[note.tag]];
      const best = race.packIds
        .map((packId) => ({ packId, a: agg(rowsIn(lastDays(7), (r) => r.planId === race.id && r.noteId === noteId && r.packId === packId)) }))
        .filter(({ a }) => a.imp >= rules.minImpressions && a.ctr > std.ctr && a.cpti !== null && a.cpti < std.cpti && a.compRate > std.comp)
        .sort((x, y) => y.a.ctr - x.a.ctr)[0];
      if (!best) continue;
      const exists = account.plans.some((p) => p.kind === "单包" && p.noteIds.includes(noteId) && p.packIds.includes(best.packId));
      if (exists) continue;
      out.push({
        id: `amp-${noteId}-${best.packId}`,
        kind: "放大",
        reason: "赛马跑出",
        noteId,
        packId: best.packId,
        evidence: {
          赛马计划: race.name,
          "近7天CTR": `${pct(best.a.ctr)}（标准 > ${pct(std.ctr)}）`,
          CPTI: `${best.a.cpti!.toFixed(1)}（标准 < ${std.cpti}）`,
          组件率: `${pct(best.a.compRate, 2)}（标准 > ${pct(std.comp, 1)}）`,
        },
        action: { type: "create_single_pack", noteId, packId: best.packId, dailyBudget: 260, bid: 0.95 },
        impact: 260 * 0.8,
        ruleVersion: rules.version,
      });
    }
  }
  return out;
}

function fillSuggestions(account: Account, rules: Rules): Suggestion[] {
  const livePacks = new Set(account.plans.filter((p) => p.status === "投放中").flatMap((p) => p.packIds));
  return PACKS.filter((p) => livePacks.has(p.id)).flatMap((pack) => {
    const rows = rowsIn(lastDays(30), (r) => r.packId === pack.id);
    const noteIds = [...new Set(rows.map((r) => r.noteId))];
    const have = noteIds.filter((id) => {
      const a = agg(rows.filter((r) => r.noteId === id));
      const std = rules.amplify[CONTENT_TYPE[NOTES.find((n) => n.id === id)!.tag]];
      return a.imp >= rules.minImpressions && a.ctr >= std.ctr;
    }).length;
    if (have >= rules.perPackQualified) return [];
    const spend = agg(rowsIn(lastDays(7), (r) => r.packId === pack.id)).spend;
    return [{
      id: `fill-${pack.id}`,
      kind: "补笔记" as const,
      reason: "达标笔记不够",
      packId: pack.id,
      evidence: { 人群包: pack.name, 达标篇数: `${have} / ${rules.perPackQualified}`, 日均消耗: yuan(spend / 7) },
      action: { type: "need_notes" as const, packId: pack.id, have, need: rules.perPackQualified },
      impact: ((spend / 7) * (rules.perPackQualified - have)) / rules.perPackQualified / 3,
      ruleVersion: rules.version,
    }];
  })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, MAX_FILL);
}

/** 出建议，按日均影响排序，最多 15 条 */
export function suggest(account: Account, rules: Rules): Suggestion[] {
  const stops = stopSuggestions(account, rules);
  const stopped = new Set(stops.map((s) => s.noteId!));
  return [...stops, ...amplifySuggestions(account, rules, stopped), ...fillSuggestions(account, rules)]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, MAX_SUGGESTIONS);
}
