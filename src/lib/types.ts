/** 演示版的领域类型。所有数据均为虚构。 */

export type PlacementId = "feed" | "video" | "search" | "feed_east" | "feed_south";
export type ContentType = "曝光" | "种草" | "转化";

export interface Placement {
  id: PlacementId;
  name: string;
}

export interface Pack {
  id: string;
  name: string;
  /** 人群标签（人群组），矩阵建计划按它分组 */
  label: string;
}

export interface Note {
  id: string;
  title: string;
  talent: string;
  tag: string;
  /** 笔记发布月份，YYYY-MM */
  month: string;
  /** 生成指标用的质量系数，页面不展示 */
  ctrFactor: number;
  cptiFactor: number;
}

export type PlanKind = "赛马" | "单包" | "矩阵" | "视频流逐包" | "区域批次" | "搜索";
export type PlanStatus = "投放中" | "暂停";

export interface Plan {
  id: string;
  name: string;
  placement: PlacementId;
  kind: PlanKind;
  noteIds: string[];
  packIds: string[];
  /** 0 表示不限（看广告组） */
  dailyBudget: number;
  bid: number;
  adGroupId: string;
  status: PlanStatus;
  /** 建计划日期，YYYY-MM-DD */
  createdAt: string;
  keywords?: string[];
  /** 演示里新建的计划 */
  createdInDemo?: boolean;
}

export interface AdGroup {
  id: string;
  name: string;
  budget: number;
  enabled: boolean;
}

/** 一行离线报表：日 × 计划 × 笔记 × 人群包 */
export interface MetricRow {
  date: string;
  planId: string;
  noteId: string;
  packId: string;
  imp: number;
  clk: number;
  spend: number;
  ti: number;
  comp: number;
}

export interface Standard {
  ctr: number;
  cpti: number;
  comp: number;
}

export interface Rules {
  version: number;
  ctrStop: number;
  tiFlyMultiple: number;
  minImpressions: number;
  raceDays: number;
  perPackQualified: number;
  amplify: Record<ContentType, Standard>;
  /** 笔记月份早于它就停投 */
  tooOldBefore: string;
  tooOldByTag: Record<string, string>;
  /** 人群包 → 不契合的内容标签 */
  packMismatch: Record<string, string[]>;
}

export interface RuleVersion {
  rules: Rules;
  by: string;
  at: string;
  reason: string;
  changed: string[];
}

export type SuggestionKind = "停投" | "放大" | "补笔记";

export type SuggestAction =
  | { type: "pause_creatives"; planIds: string[]; noteId: string }
  | { type: "create_single_pack"; noteId: string; packId: string; dailyBudget: number; bid: number }
  | { type: "need_notes"; packId: string; have: number; need: number };

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  reason: string;
  noteId?: string;
  packId?: string;
  evidence: Record<string, string>;
  action: SuggestAction;
  /** 日均影响消耗（元） */
  impact: number;
  ruleVersion: number;
}

export type Verdict = "批准" | "改后批准" | "拒绝";

export interface Decision {
  suggestionId: string;
  kind: SuggestionKind;
  verdict: Verdict;
  reason: string;
  action: SuggestAction;
  by: string;
  at: string;
  executed: boolean;
}

export interface ActionLog {
  at: string;
  by: string;
  op: string;
  dryRun: boolean;
  request: unknown;
  result: string;
}

export interface SheetRow {
  noteId: string;
  talent: string;
  title: string;
  scene: string;
  targets: string[];
  tag: string;
  spu: string;
  updatedAt: string;
  launched: string;
}

export interface GroupMessage {
  id: string;
  at: string;
  sender: string;
  role: string;
  text: string;
}

export interface WatchEvent {
  id: string;
  at: string;
  kind: "撞线" | "建好没开" | "卡审" | "余额";
  text: string;
}
