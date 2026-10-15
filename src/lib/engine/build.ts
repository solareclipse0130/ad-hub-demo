/** 批量建计划：读新笔记表，按「内容标签 × 人群标签」出矩阵计划预览。 */
import type { Plan, PlacementId, SheetRow } from "../types";
import { CROWD_TABLE, LABEL_ALIASES, PACKS, TODAY } from "../mock/catalog";
import { addDays } from "../mock/metrics";
import type { Account } from "./stats";

export const DAILY_CREATE_LIMIT = 30;
const FRESH_DAYS = 10;
const FALLBACK_BUDGET = 180;
const OVERSEAS: Record<string, { placement: PlacementId; prefix: string }> = {
  华东: { placement: "feed_east", prefix: "信息流华东" },
  华南: { placement: "feed_south", prefix: "信息流华南" },
};

export interface BuildCard {
  key: string;
  name: string;
  placement: PlacementId;
  kind: Plan["kind"];
  noteIds: string[];
  packIds: string[];
  dailyBudget: number;
  bid: number;
  adGroupId: string;
  keywords?: string[];
  template: string;
  why: string[];
  flags: string[];
}

export interface Skipped {
  noteId: string;
  target: string;
  reason: string;
}

const mmdd = (date: string) => date.slice(5).replace("-", "");

function latest(plans: Plan[], pred: (p: Plan) => boolean): Plan | undefined {
  return plans.filter(pred).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function rowSkipReason(row: SheetRow, account: Account): string | null {
  if (row.launched) return `表里已标「${row.launched}」`;
  if (row.updatedAt < addDays(TODAY, -FRESH_DAYS)) return `更新时间 ${row.updatedAt} 超过 ${FRESH_DAYS} 天，多半是有意不投`;
  const inPlan = account.plans.find((p) => p.placement === "feed" && p.noteIds.includes(row.noteId));
  if (inPlan) return `已经在同类计划「${inPlan.name}」里`;
  return null;
}

function matrixCard(account: Account, row: SheetRow, label: string): BuildCard | Skipped {
  const names = CROWD_TABLE[label];
  const packs = names.map((n) => PACKS.find((p) => p.name === n)).filter((p) => p !== undefined);
  const missing = names.filter((n) => !PACKS.some((p) => p.name === n));
  if (!packs.length) return { noteId: row.noteId, target: label, reason: `人群组表里有「${label}」，但账户里还没有这些包：${missing.join("、")}` };
  const sameLabel = latest(account.plans, (p) => p.kind === "矩阵" && p.packIds.some((id) => PACKS.find((x) => x.id === id)?.label === label));
  const anyMatrix = latest(account.plans, (p) => p.kind === "矩阵" && p.placement === "feed");
  const tpl = sameLabel ?? anyMatrix!;
  const flags = missing.map((n) => `人群组表里的「${n}」账户里还没有，没加`);
  if (!sameLabel) flags.push(`没有同标签模板：不进别人的广告组，计划自己限 ${FALLBACK_BUDGET} 元/天，广告组和预算你来定`);
  return {
    key: `matrix|${row.tag}|${label}`,
    name: `${mmdd(TODAY)}-信息流-点击-${row.tag}-${label}-${row.spu}`,
    placement: "feed",
    kind: "矩阵",
    noteIds: [row.noteId],
    packIds: packs.map((p) => p.id),
    dailyBudget: sameLabel ? 0 : FALLBACK_BUDGET,
    bid: tpl.bid,
    adGroupId: sameLabel ? tpl.adGroupId : "",
    template: tpl.name,
    why: [`人群标签「${label}」按人群组表对到 ${packs.map((p) => p.name).join("、")}`, `模板：${sameLabel ? "同标签" : "同点位"}最近一条「${tpl.name}」，出价 ${tpl.bid} 照抄`],
    flags,
  };
}

function overseasCard(account: Account, row: SheetRow, label: string): BuildCard {
  const o = OVERSEAS[label];
  const tpl = latest(account.plans, (p) => p.placement === o.placement)!;
  return {
    key: `overseas|${row.tag}|${label}`,
    name: `${mmdd(TODAY)}-${o.prefix}-点击-${row.tag}-美妆兴趣人群`,
    placement: o.placement,
    kind: "区域批次",
    noteIds: [row.noteId],
    packIds: tpl.packIds,
    dailyBudget: tpl.dailyBudget,
    bid: tpl.bid,
    adGroupId: tpl.adGroupId,
    template: tpl.name,
    why: [`「${label}」是区域批次，包按人群组表的「${label}」组取`, `日预算 ${tpl.dailyBudget} / 出价 ${tpl.bid} 照抄同地区最近一条在投计划`],
    flags: [],
  };
}

function searchCard(account: Account, row: SheetRow, wordType: string): BuildCard {
  const tpl = latest(account.plans, (p) => p.placement === "search")!;
  return {
    key: `search|${row.tag}|${wordType}`,
    name: `${mmdd(TODAY)}-搜索-点击-${row.tag}-${wordType}`,
    placement: "search",
    kind: "搜索",
    noteIds: [row.noteId],
    packIds: [],
    dailyBudget: tpl.dailyBudget,
    bid: tpl.bid,
    adGroupId: tpl.adGroupId,
    keywords: tpl.keywords,
    template: tpl.name,
    why: [`「搜索-${wordType}」按内容标签 × 词类一条，不挂人群包`, `关键词、出价照抄最近一条搜索计划「${tpl.name}」`],
    flags: ["搜索计划还没在真账户上建过，先演练"],
  };
}

/** 读新笔记表出预览：同一格的笔记合进同一条计划 */
export function previewBuild(account: Account, sheet: SheetRow[]): { cards: BuildCard[]; skipped: Skipped[] } {
  const cards = new Map<string, BuildCard>();
  const skipped: Skipped[] = [];
  for (const row of sheet) {
    const reason = rowSkipReason(row, account);
    if (reason) {
      skipped.push({ noteId: row.noteId, target: row.targets.join("、"), reason });
      continue;
    }
    for (const raw of row.targets) {
      const label = LABEL_ALIASES[raw] ?? raw;
      let card: BuildCard | Skipped;
      if (label.startsWith("搜索-")) card = searchCard(account, row, label.slice(3));
      else if (OVERSEAS[label]) card = overseasCard(account, row, label);
      else if (CROWD_TABLE[label]) card = matrixCard(account, row, label);
      else card = { noteId: row.noteId, target: raw, reason: `人群组表里没有「${raw}」，这一格跳过` };
      if (!("key" in card)) {
        skipped.push(card);
        continue;
      }
      if (raw !== label) card.why.unshift(`表里写「${raw}」，按「${label}」认`);
      if (account.plans.some((p) => p.name === card.name)) {
        skipped.push({ noteId: row.noteId, target: raw, reason: `今天已有同名计划「${card.name}」，这篇笔记该加进那条` });
        continue;
      }
      const cur = cards.get(card.key);
      if (cur) cur.noteIds.push(row.noteId);
      else cards.set(card.key, card);
    }
  }
  return { cards: [...cards.values()], skipped };
}

export function createdToday(account: Account): number {
  return account.plans.filter((p) => p.createdInDemo && p.createdAt === TODAY).length;
}

/** 真建：建完一律暂停，每天最多 30 条 */
export function createPlans(account: Account, cards: BuildCard[]): { plans: Plan[]; refused: string[] } {
  const room = DAILY_CREATE_LIMIT - createdToday(account);
  const plans = cards.slice(0, Math.max(room, 0)).map((c, i) => ({
    id: `d${Date.now().toString(36)}${i}`,
    name: c.name,
    placement: c.placement,
    kind: c.kind,
    noteIds: c.noteIds,
    packIds: c.packIds,
    dailyBudget: c.dailyBudget,
    bid: c.bid,
    adGroupId: c.adGroupId,
    status: "暂停" as const,
    createdAt: TODAY,
    keywords: c.keywords,
    createdInDemo: true,
  }));
  const refused = cards.slice(plans.length).map((c) => `${c.name}：今天已到 ${DAILY_CREATE_LIMIT} 条上限`);
  return { plans, refused };
}
