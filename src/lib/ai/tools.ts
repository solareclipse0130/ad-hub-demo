/** 助手的 11 个工具。查数和起草都对演示数据运行；没有任何直接写账户的工具。 */
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import type { Plan, Rules } from "../types";
import type { AiCard, ChangeCard, ChangeField } from "../cards";
import { CONTENT_TYPE, CROWD_TABLE, NOTES, PACKS, PLACEMENTS, SPU, TODAY } from "../mock/catalog";
import { NEW_NOTE_SHEET } from "../mock/feeds";
import { type BuildCard, previewBuild } from "../engine/build";
import { checkBid, checkBudget } from "../engine/guard";
import { type Account, pct } from "../engine/stats";
import { suggest } from "../engine/suggest";
import { type RankKey, dashboard, noteByPack, top10 } from "../engine/views";
import { searchDocs } from "./docs";

export interface ToolContext {
  account: Account;
  rules: Rules;
  cards: AiCard[];
}

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []): ChatCompletionFunctionTool => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});
const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const strs = (description: string) => ({ type: "array", items: { type: "string" }, description });

export const TOOLS: ChatCompletionFunctionTool[] = [
  fn("search_docs", "查使用说明：系统怎么用、规则为什么这么定。回答「怎么用 / 逻辑是什么」前先查。", { query: str("要查的问题") }, ["query"]),
  fn("get_rules", "查当前规则版本：停投线、放大标准、太老截止月、不契合映射等阈值。"),
  fn("get_dashboard", "查今日看板：昨日总消耗、CTR、CPTI、各点位数据与异常。"),
  fn("get_suggestions", "查规则引擎今天出的建议（停投 / 放大 / 补笔记）及依据。"),
  fn("get_top10", "查某人群包的定向 TOP10。", {
    pack: str("人群包名或人群标签，可写简称，如「都市女性28+」"),
    window_days: num("7、14 或 30，默认 7"),
    sort: str("ctr / compRate / cpti / spend / imp，默认 ctr"),
  }),
  fn("get_note", "按达人名、笔记标题片段或笔记 ID 查笔记：基本信息、所在计划、近 30 天各包表现。", { query: str("达人名 / 标题片段 / 笔记 ID") }, ["query"]),
  fn("list_plans", "查账户里的计划和广告组（状态、日预算、出价、包、广告组预算）。可按关键词过滤。", { keyword: str("计划名关键词，可空") }),
  fn("draft_batch_from_sheet", "按品牌方新笔记表出一批建计划草稿（矩阵 / 搜索 / 区域），每条一张草稿卡。"),
  fn(
    "draft_copy_plan",
    "照抄一条现有计划再建一条：换笔记、包、预算、出价。出一张草稿卡。",
    {
      template_plan: str("模板计划的名字片段或 ID"),
      note_ids: strs("要投的笔记 ID 列表"),
      pack_names: strs("人群包名或人群标签，可空表示沿用模板的包"),
      daily_budget: num("日预算（元），0 表示看广告组"),
      bid: num("出价（元），可空表示沿用模板"),
    },
    ["template_plan", "note_ids"],
  ),
  fn("draft_amplify", "把一篇笔记放大到某个包：起草一条单包计划，出一张草稿卡。", { note_id: str("笔记 ID"), pack_name: str("人群包名或简称"), daily_budget: num("日预算，默认 300") }, ["note_id", "pack_name"]),
  fn(
    "propose_change",
    "提一张改动卡：暂停计划、改计划日预算、改出价、改广告组预算、暂停广告组。会过护栏，越界直接拒。不能开启计划或广告组。",
    {
      target: str("plan 或 group"),
      name: str("计划或广告组的名字片段 / ID"),
      field: str("dailyBudget / bid / pause / groupBudget / groupPause"),
      value: num("新值；暂停类可空"),
    },
    ["target", "name", "field"],
  ),
];

const guardError = (err: string) => ({
  error: `护栏拒绝：${err}。这是硬限制：不要建议拆成几次调来绕过，也不要替用户出折中值；照实告诉用户被拒和原因，确实要调这么多找管理员。`,
});

const findPacks = (q: string) => {
  const label = Object.keys(CROWD_TABLE).find((l) => q.includes(l) || l.includes(q));
  if (label) return PACKS.filter((p) => CROWD_TABLE[label].includes(p.name));
  return PACKS.filter((p) => p.name.includes(q) || q.includes(p.name));
};

const findPlan = (plans: Plan[], q: string) => plans.find((p) => p.id === q) ?? plans.find((p) => p.name.includes(q));

const planView = (p: Plan, ctx: ToolContext) => ({
  id: p.id,
  name: p.name,
  status: p.status,
  点位: PLACEMENTS.find((x) => x.id === p.placement)!.name,
  日预算: p.dailyBudget || "不限（看广告组）",
  出价: p.bid,
  包: p.packIds.map((id) => PACKS.find((x) => x.id === id)!.name),
  笔记: p.noteIds,
  已暂停创意: p.noteIds.filter((n) => ctx.account.paused.includes(`${p.id}:${n}`)),
  广告组: ctx.account.adGroups.find((g) => g.id === p.adGroupId)?.name ?? "无",
});

let seq = 0;
const cardId = () => `c${Date.now().toString(36)}${seq++}`;

function addBuildCard(ctx: ToolContext, card: BuildCard) {
  const id = cardId();
  ctx.cards.push({ id, kind: "build", card });
  return {
    计划名: card.name,
    笔记: card.noteIds.map((n) => NOTES.find((x) => x.id === n)?.talent ?? n),
    包: card.packIds.map((p) => PACKS.find((x) => x.id === p)?.name ?? p),
    日预算: card.dailyBudget || "看广告组",
    出价: card.bid,
    提示: card.flags,
  };
}

function draftCopy(ctx: ToolContext, a: { template_plan: string; note_ids: string[]; pack_names?: string[]; daily_budget?: number; bid?: number; name?: string }) {
  const tpl = findPlan(ctx.account.plans, a.template_plan);
  if (!tpl) return { error: `找不到模板计划「${a.template_plan}」` };
  const bad = a.note_ids.filter((id) => !NOTES.some((n) => n.id === id));
  if (bad.length) return { error: `没有这些笔记：${bad.join("、")}` };
  const packs = a.pack_names?.length ? a.pack_names.flatMap(findPacks) : PACKS.filter((p) => tpl.packIds.includes(p.id));
  if (a.pack_names?.length && !packs.length) return { error: `对不上人群包：${a.pack_names.join("、")}` };
  const budget = a.daily_budget ?? tpl.dailyBudget;
  const bid = a.bid ?? tpl.bid;
  const err = (budget ? checkBudget(tpl.dailyBudget, budget) : null) ?? checkBid(tpl.bid, bid);
  if (err) return guardError(err);
  const tag = NOTES.find((n) => n.id === a.note_ids[0])!.tag;
  return addBuildCard(ctx, {
    key: cardId(),
    name: a.name ?? `${TODAY.slice(5).replace("-", "")}-${PLACEMENTS.find((x) => x.id === tpl.placement)!.name}-点击-${tag}-照抄-${SPU}`,
    placement: tpl.placement,
    kind: tpl.kind,
    noteIds: a.note_ids,
    packIds: packs.map((p) => p.id),
    dailyBudget: budget,
    bid,
    adGroupId: tpl.adGroupId,
    keywords: tpl.keywords,
    template: tpl.name,
    why: [`照抄「${tpl.name}」`, `换了笔记 ${a.note_ids.join("、")}${a.pack_names?.length ? `、包 ${packs.map((p) => p.name).join("、")}` : ""}`],
    flags: [],
  });
}

function proposeChange(ctx: ToolContext, a: { target: string; name: string; field: string; value?: number }) {
  const field = a.field as ChangeField;
  if (a.target === "plan") {
    const p = findPlan(ctx.account.plans, a.name);
    if (!p) return { error: `找不到计划「${a.name}」` };
    let from: number | string = p.status;
    let to: number | string = "暂停";
    if (field === "dailyBudget") {
      if (!p.dailyBudget) return { error: "这条计划不设计划预算（看广告组），要改请改广告组预算" };
      const err = checkBudget(p.dailyBudget, a.value ?? 0);
      if (err) return guardError(err);
      [from, to] = [p.dailyBudget, a.value!];
    } else if (field === "bid") {
      const err = checkBid(p.bid, a.value ?? 0);
      if (err) return guardError(err);
      [from, to] = [p.bid, a.value!];
    } else if (field !== "pause") return { error: `计划不支持「${a.field}」；开启计划只能人在后台点` };
    return pushChange(ctx, { target: "plan", targetId: p.id, targetName: p.name, field, from, to });
  }
  const g = ctx.account.adGroups.find((x) => x.id === a.name) ?? ctx.account.adGroups.find((x) => x.name.includes(a.name) || a.name.includes(x.name));
  if (!g) return { error: `找不到广告组「${a.name}」` };
  if (field === "groupBudget") {
    const err = checkBudget(g.budget, a.value ?? 0);
    if (err) return guardError(err);
    return pushChange(ctx, { target: "group", targetId: g.id, targetName: g.name, field, from: g.budget, to: a.value! });
  }
  if (field === "groupPause") return pushChange(ctx, { target: "group", targetId: g.id, targetName: g.name, field, from: g.enabled ? "开启" : "暂停", to: "暂停" });
  return { error: `广告组不支持「${a.field}」；开启广告组只能人在后台点` };
}

function pushChange(ctx: ToolContext, change: ChangeCard) {
  const id = cardId();
  ctx.cards.push({ id, kind: "change", change });
  return { 已出改动卡: true, 对象: change.targetName, 改动: change.field, 从: change.from, 到: change.to };
}

/** 执行一个工具，返回给模型的 JSON 结果 */
export function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): unknown {
  const a = args as never;
  switch (name) {
    case "search_docs":
      return searchDocs(String(args.query ?? ""));
    case "get_rules":
      return {
        ...ctx.rules,
        packMismatch: Object.fromEntries(Object.entries(ctx.rules.packMismatch).map(([id, tags]) => [PACKS.find((p) => p.id === id)!.name, tags])),
      };
    case "get_dashboard": {
      const d = dashboard();
      return {
        日期: d.date,
        昨日: { 消耗: Math.round(d.y.spend), CTR: pct(d.y.ctr, 2), CPTI: d.y.cpti?.toFixed(2), 新增种草人群: d.y.ti, 组件率: pct(d.y.compRate, 2) },
        前日: { 消耗: Math.round(d.p.spend), CTR: pct(d.p.ctr, 2), CPTI: d.p.cpti?.toFixed(2) },
        点位: d.cards.map((c) => ({ 点位: c.placement.name, 消耗: Math.round(c.yd.spend), CTR: pct(c.yd.ctr, 2), CPTI: c.yd.cpti?.toFixed(2), 异常: c.alerts })),
      };
    }
    case "get_suggestions":
      return suggest(ctx.account, ctx.rules).map((s) => ({ id: s.id, 动作: s.kind, 原因: s.reason, 笔记: s.noteId, 依据: s.evidence, 日均影响: Math.round(s.impact) }));
    case "get_top10": {
      const packs = args.pack ? findPacks(String(args.pack)).map((p) => p.id) : null;
      return top10(ctx.rules, Number(args.window_days ?? 7), (args.sort as RankKey) ?? "ctr")
        .filter((g) => !packs || packs.includes(g.packId))
        .slice(0, 4)
        .map((g) => ({
          包: g.packName,
          点位: PLACEMENTS.find((p) => p.id === g.placement)!.name,
          头部: g.head.slice(0, 5).map((r) => ({ 笔记: r.noteId, 达人: r.talent, 标签: r.tag, CTR: pct(r.a.ctr, 2), CPTI: r.a.cpti?.toFixed(1), 消耗: Math.round(r.a.spend) })),
          尾部停投候选: g.tail.map((r) => `${r.noteId} ${r.talent} CTR ${pct(r.a.ctr, 2)}`),
          汇总: g.summary,
        }));
    }
    case "get_note": {
      const q = String(args.query ?? "");
      const hits = NOTES.filter((n) => n.id === q || n.talent.includes(q) || q.includes(n.talent) || n.title.includes(q)).slice(0, 3);
      if (!hits.length) return { error: `没找到「${q}」相关的笔记` };
      return hits.map((n) => ({
        id: n.id,
        标题: n.title,
        达人: n.talent,
        内容标签: n.tag,
        内容类型: CONTENT_TYPE[n.tag],
        笔记月份: n.month,
        所在计划: ctx.account.plans.filter((p) => p.noteIds.includes(n.id)).map((p) => p.name),
        近30天各包: noteByPack(n.id).map((x) => ({ 包: x.pack, 展现: x.a.imp, CTR: pct(x.a.ctr, 2), CPTI: x.a.cpti?.toFixed(1), 消耗: Math.round(x.a.spend) })),
      }));
    }
    case "list_plans": {
      const k = String(args.keyword ?? "");
      return {
        计划: ctx.account.plans.filter((p) => !k || p.name.includes(k)).map((p) => planView(p, ctx)),
        广告组: ctx.account.adGroups.map((g) => ({ id: g.id, 名称: g.name, 预算: g.budget, 状态: g.enabled ? "开启" : "暂停" })),
      };
    }
    case "draft_batch_from_sheet": {
      const { cards, skipped } = previewBuild(ctx.account, NEW_NOTE_SHEET);
      return { 草稿: cards.map((c) => addBuildCard(ctx, c)), 没建的: skipped };
    }
    case "draft_copy_plan":
      return draftCopy(ctx, a);
    case "draft_amplify": {
      const { note_id, pack_name, daily_budget } = args as { note_id: string; pack_name: string; daily_budget?: number };
      const tpl = ctx.account.plans.find((p) => p.kind === "单包")!;
      const pack = findPacks(pack_name)[0];
      if (!pack) return { error: `对不上人群包「${pack_name}」` };
      const note = NOTES.find((n) => n.id === note_id);
      if (!note) return { error: `没有笔记 ${note_id}` };
      const name = `${TODAY.slice(5).replace("-", "")}-信息流推广-点击量-${note.talent}-${pack.name}`;
      return draftCopy(ctx, { template_plan: tpl.id, note_ids: [note_id], pack_names: [pack.name], daily_budget: daily_budget ?? 300, name });
    }
    case "propose_change":
      return proposeChange(ctx, a);
    default:
      return { error: `没有工具 ${name}` };
  }
}
