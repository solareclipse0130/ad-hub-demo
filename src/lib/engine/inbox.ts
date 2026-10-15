/** 群消息接活：挑出给投放的指令，同一个人 3 分钟内连发的并成一条。 */
import type { GroupMessage } from "../types";

const MERGE_MINUTES = 3;
const KEYWORDS = /预算|计划|人群|搜索|出价|停|放大|暂停|上线|包/;

export interface Todo {
  id: string;
  at: string;
  sender: string;
  text: string;
  hasImage: boolean;
}

export interface Ignored {
  msg: GroupMessage;
  reason: string;
}

const minutes = (at: string) => Date.parse(at.replace(" ", "T")) / 60000;

export function pickTodos(messages: GroupMessage[]): { todos: Todo[]; ignored: Ignored[] } {
  const todos: Todo[] = [];
  const ignored: Ignored[] = [];
  for (const m of messages) {
    const last = todos[todos.length - 1];
    if (last && last.sender === m.sender && minutes(m.at) - minutes(last.at) <= MERGE_MINUTES) {
      last.text += `\n${m.text}`;
      continue;
    }
    const mentions = m.text.match(/@\S+/g) ?? [];
    if (m.role !== "品牌方") ignored.push({ msg: m, reason: "不是品牌方发的" });
    else if (mentions.length && !mentions.some((x) => x.includes("投放"))) ignored.push({ msg: m, reason: `只 @ 了${mentions.join("、")}，不是给投放的` });
    else if (!mentions.length && !KEYWORDS.test(m.text)) ignored.push({ msg: m, reason: "没 @ 人，也不像投放指令" });
    else todos.push({ id: m.id, at: m.at, sender: m.sender, text: m.text, hasImage: m.text.includes("（图片）") });
  }
  return { todos, ignored };
}
