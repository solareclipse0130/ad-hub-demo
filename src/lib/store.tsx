"use client";
/** 演示状态：账户、规则版本、审批、日志、对话。存在浏览器里，刷新不丢。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActionLog, Decision, Plan, RuleVersion, Rules, Suggestion, SuggestAction, Verdict } from "./types";
import type { AiCard, ChatMessage } from "./cards";
import { AD_GROUPS, PLANS, TODAY } from "./mock/catalog";
import { DEFAULT_RULES } from "./mock/feeds";
import { type BuildCard, createPlans } from "./engine/build";
import { actionRequests, createPlanRequest, singlePackName, updateRequest } from "./engine/request";
import { type Account, creativeKey } from "./engine/stats";
import { suggest } from "./engine/suggest";

export type DemoUser = "优化师" | "管理员";

interface DemoState {
  user: DemoUser;
  account: Account;
  ruleHistory: RuleVersion[];
  decisions: Decision[];
  logs: ActionLog[];
  inbox: Record<string, "已处理" | "忽略">;
  chat: ChatMessage[];
  cardStatus: Record<string, string>;
}

/** 数据体系变了就升版本号，旧版本的状态直接丢弃 */
const STORAGE_KEY = "ad-hub-demo-v2";
const OLD_KEYS = ["ad-hub-demo-v1"];

const initialState = (): DemoState => ({
  user: "优化师",
  account: { plans: PLANS, adGroups: AD_GROUPS, paused: [] },
  ruleHistory: [{ rules: DEFAULT_RULES, by: "管理员", at: "2026-09-29 10:00", reason: "初始版本：按品牌方的换笔记规则整理", changed: [] }],
  decisions: [],
  logs: [],
  inbox: {},
  chat: [],
  cardStatus: {},
});

const now = () => `${TODAY} ${new Date().toTimeString().slice(0, 5)}`;

function applyAction(account: Account, action: SuggestAction): Account {
  if (action.type === "pause_creatives")
    return { ...account, paused: [...account.paused, ...action.planIds.map((p) => creativeKey(p, action.noteId))] };
  if (action.type === "create_single_pack") {
    const tpl = account.plans.find((p) => p.kind === "单包")!;
    const plan: Plan = {
      ...tpl,
      id: `d${Date.now().toString(36)}`,
      name: singlePackName(action.noteId, action.packId),
      noteIds: [action.noteId],
      packIds: [action.packId],
      dailyBudget: action.dailyBudget,
      bid: action.bid,
      status: "暂停",
      createdAt: TODAY,
      createdInDemo: true,
    };
    return { ...account, plans: [...account.plans, plan] };
  }
  return account;
}

function useDemoState() {
  const [state, setState] = useState<DemoState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 首次挂载时从浏览器恢复
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);

  const rules: Rules = state.ruleHistory[state.ruleHistory.length - 1].rules;
  const suggestions: Suggestion[] = useMemo(() => {
    const decided = new Set(state.decisions.map((d) => d.suggestionId));
    return suggest(state.account, rules).filter((s) => !decided.has(s.id));
  }, [state.account, state.decisions, rules]);

  const log = useCallback(
    (s: DemoState, op: string, dryRun: boolean, request: unknown, result: string): DemoState => ({
      ...s,
      logs: [{ at: now(), by: s.user, op, dryRun, request, result }, ...s.logs],
    }),
    [],
  );

  const decide = (sg: Suggestion, verdict: Verdict, reason: string, action: SuggestAction) =>
    setState((s) => ({
      ...s,
      decisions: [...s.decisions, { suggestionId: sg.id, kind: sg.kind, verdict, reason, action, by: s.user, at: now(), executed: false }],
    }));

  const execute = (suggestionId: string, dryRun: boolean) =>
    setState((s) => {
      const d = s.decisions.find((x) => x.suggestionId === suggestionId)!;
      const req = actionRequests(d.action, s.account.plans);
      if (dryRun) return log(s, `预览 ${d.kind}`, true, req, "dry-run，未发送");
      const next = { ...s, account: applyAction(s.account, d.action), decisions: s.decisions.map((x) => (x === d ? { ...x, executed: true } : x)) };
      return log(next, `执行 ${d.kind}`, false, req, d.action.type === "create_single_pack" ? "已建-暂停" : "已暂停");
    });

  const build = (cards: BuildCard[], dryRun: boolean): string[] => {
    const req = cards.map(createPlanRequest);
    if (dryRun) {
      setState((s) => log(s, `批量建计划 ${cards.length} 条`, true, req, "dry-run，未发送"));
      return [];
    }
    const out = createPlans(state.account, cards);
    const result = `已建 ${out.plans.length} 条，全部暂停${out.refused.length ? `；${out.refused.length} 条超上限未建` : ""}`;
    setState((s) => log({ ...s, account: { ...s.account, plans: [...s.account.plans, ...out.plans] } }, `批量建计划 ${out.plans.length} 条`, false, req, result));
    return out.refused;
  };

  const saveRules = (next: Rules, reason: string, changed: string[]) =>
    setState((s) => ({
      ...s,
      ruleHistory: [...s.ruleHistory, { rules: { ...next, version: s.ruleHistory.length + 1 }, by: s.user, at: now(), reason, changed }],
    }));

  const runCard = (card: AiCard, dryRun: boolean) =>
    setState((s) => {
      if (card.kind === "build") {
        const req = createPlanRequest(card.card);
        if (dryRun) return { ...log(s, "AI 草稿 · 建计划", true, req, "演练，未发送"), cardStatus: { ...s.cardStatus, [card.id]: "已演练" } };
        const out = createPlans(s.account, [card.card]);
        const next = { ...s, account: { ...s.account, plans: [...s.account.plans, ...out.plans] }, cardStatus: { ...s.cardStatus, [card.id]: "已建-暂停" } };
        return log(next, "AI 草稿 · 建计划", false, req, out.plans.length ? "已建-暂停" : out.refused[0]);
      }
      const c = card.change;
      const field = { dailyBudget: "campaign_day_budget", bid: "event_bid", pause: "enable", groupBudget: "budget", groupPause: "enable" }[c.field];
      const value = c.field === "pause" || c.field === "groupPause" ? 0 : c.to;
      const req = updateRequest(c.target, c.targetId, field, value);
      if (dryRun) return { ...log(s, "AI 改动卡", true, req, "演练，未发送"), cardStatus: { ...s.cardStatus, [card.id]: "已演练" } };
      const plans = s.account.plans.map((p) =>
        p.id !== c.targetId ? p : c.field === "pause" ? { ...p, status: "暂停" as const } : c.field === "bid" ? { ...p, bid: +c.to } : { ...p, dailyBudget: +c.to },
      );
      const adGroups = s.account.adGroups.map((g) =>
        g.id !== c.targetId ? g : c.field === "groupPause" ? { ...g, enabled: false } : { ...g, budget: +c.to },
      );
      const next = { ...s, account: c.target === "plan" ? { ...s.account, plans } : { ...s.account, adGroups }, cardStatus: { ...s.cardStatus, [card.id]: "已执行" } };
      return log(next, "AI 改动卡", false, req, "已执行");
    });

  return {
    state,
    loaded,
    rules,
    suggestions,
    setUser: (user: DemoUser) => setState((s) => ({ ...s, user })),
    decide,
    execute,
    build,
    saveRules,
    runCard,
    setChat: (chat: ChatMessage[]) => setState((s) => ({ ...s, chat })),
    setInbox: (id: string, v: "已处理" | "忽略") => setState((s) => ({ ...s, inbox: { ...s.inbox, [id]: v } })),
    reset: () => setState(initialState()),
  };
}

type Store = ReturnType<typeof useDemoState>;
const Ctx = createContext<Store | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const store = useDemoState();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDemo(): Store {
  return useContext(Ctx)!;
}
