/** 把动作翻成要发给投放平台的请求体（演示用，字段仿照开放接口的形态）。 */
import type { Plan, SuggestAction } from "../types";
import { ADVERTISER_ID, NOTES, PACKS, TODAY } from "../mock/catalog";
import type { BuildCard } from "./build";

export interface ApiRequest {
  method: "POST";
  path: string;
  body: Record<string, unknown>;
}

export function createPlanRequest(c: BuildCard | Plan): ApiRequest {
  return {
    method: "POST",
    path: "/api/open/jg/plan/create",
    body: {
      advertiser_id: ADVERTISER_ID,
      campaign_name: c.name,
      placement: c.placement,
      campaign_group_id: c.adGroupId || null,
      campaign_day_budget: c.dailyBudget || null,
      bid_type: "稳定成本",
      event_bid: c.bid,
      unit: { target_audience_ids: c.packIds, keywords: c.keywords ?? [] },
      creativities: c.noteIds.map((note_id) => ({ note_id })),
      enable_after_create: false,
    },
  };
}

/** 单包放大计划的名字：MMDD-信息流推广-点击量-达人-包名 */
export function singlePackName(noteId: string, packId: string): string {
  const talent = NOTES.find((n) => n.id === noteId)!.talent;
  return `${TODAY.slice(5).replace("-", "")}-信息流推广-点击量-${talent}-${PACKS.find((p) => p.id === packId)!.name}`;
}

export function actionRequests(action: SuggestAction, plans: Plan[]): ApiRequest[] {
  if (action.type === "pause_creatives")
    return action.planIds.map((planId) => ({
      method: "POST",
      path: "/api/open/jg/creativity/status/update",
      body: { advertiser_id: ADVERTISER_ID, campaign_id: planId, note_ids: [action.noteId], action_type: "pause" },
    }));
  if (action.type === "create_single_pack") {
    const tpl = plans.find((p) => p.kind === "单包")!;
    return [
      createPlanRequest({
        ...tpl,
        name: singlePackName(action.noteId, action.packId),
        noteIds: [action.noteId],
        packIds: [action.packId],
        dailyBudget: action.dailyBudget,
        bid: action.bid,
      }),
    ];
  }
  return [];
}

export function updateRequest(target: "plan" | "group", id: string, field: string, value: number | string): ApiRequest {
  return {
    method: "POST",
    path: target === "plan" ? "/api/open/jg/plan/update" : "/api/open/jg/campaign_group/update",
    body: { advertiser_id: ADVERTISER_ID, [target === "plan" ? "campaign_id" : "campaign_group_id"]: id, [field]: value },
  };
}
