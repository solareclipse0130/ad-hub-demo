/** AI 助手出的卡片：草稿卡（建计划）和改动卡（改预算 / 出价 / 暂停）。前后端共用。 */
import type { BuildCard } from "./engine/build";

export type ChangeField = "dailyBudget" | "bid" | "pause" | "groupBudget" | "groupPause";

export interface ChangeCard {
  target: "plan" | "group";
  targetId: string;
  targetName: string;
  field: ChangeField;
  from: number | string;
  to: number | string;
}

export type AiCard = { id: string; kind: "build"; card: BuildCard } | { id: string; kind: "change"; change: ChangeCard };

export const FIELD_LABEL: Record<ChangeField, string> = {
  dailyBudget: "改日预算",
  bid: "改出价",
  pause: "暂停计划",
  groupBudget: "改广告组预算",
  groupPause: "暂停广告组",
};

export interface ToolTrace {
  name: string;
  args: string;
  summary: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  cards?: AiCard[];
  tools?: ToolTrace[];
}
