/** AI 助手：DeepSeek + 工具循环。key 只从环境变量读。 */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Rules } from "@/lib/types";
import type { ChatMessage, ToolTrace } from "@/lib/cards";
import type { Account } from "@/lib/engine/stats";
import { TOOLS, type ToolContext, runTool } from "@/lib/ai/tools";
import { BRAND, TODAY } from "@/lib/mock/catalog";

const MAX_TURNS = 12;
const MAX_INPUT = 800;
const MAX_TOOL_ROUNDS = 5;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const SYSTEM = `你是「AI 投放中枢」里的投放助手，服务品牌${BRAND}（虚构品牌，这是一个演示系统，数据都是虚构的）在小红书聚光的投放。今天是 ${TODAY}，报表是 T+1。
规则：
1. 回答里的数字只能来自工具结果，不要编；问「怎么用 / 为什么」先 search_docs，回答末尾注明出处。
2. 你没有直接改账户的能力。要建计划就用 draft_* 出草稿卡，要改就用 propose_change 出改动卡，然后告诉用户在卡片上点「演练」或「确认执行」。不要说「已经改好了」。
3. 护栏拒绝时照实转述原因就结束，绝不建议拆成几次调、分步调、先调一部分等任何绕过办法，也不要主动出折中值的卡；确实要调这么多，请用户找管理员。不能开启计划或广告组，被要求时说明这一步要人在聚光后台点。
4. 用户说的是笔记、达人或计划的简称时，先用 get_note / list_plans 查到 ID 再起草。
5. 图片内容你看不到，遇到就说明要人处理。
6. 中文回答，简洁，先给结论。纯文本：不用 Markdown 符号（不要 **、#、表格），列表用「- 」开头。不用 emoji。
7. 不要向用户展示内部 ID（笔记 ID 如 n14、包 ID、卡片编号），用达人名、笔记标题、包名、计划名称呼。`;

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) return Response.json({ error: "演示站还没配置 AI 的 key" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) return Response.json({ error: "提问太频繁了，过几分钟再试" }, { status: 429 });

  const { messages, account, rules } = (await req.json()) as { messages: ChatMessage[]; account: Account; rules: Rules };
  const history: ChatCompletionMessageParam[] = messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_INPUT) }));
  const convo: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM }, ...history];
  const ctx: ToolContext = { account, rules, cards: [] };
  const tools: ToolTrace[] = [];

  const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash",
      messages: convo,
      tools: round < MAX_TOOL_ROUNDS ? TOOLS : undefined,
      max_tokens: 1500,
      temperature: 0.3,
      // @ts-expect-error DeepSeek 的扩展参数：关掉思考模式，回答更快
      thinking: { type: "disabled" },
    });
    const msg = res.choices[0].message;
    const calls = (msg.tool_calls ?? []).filter((c) => c.type === "function");
    if (!calls.length) return Response.json({ content: (msg.content ?? "").replace(/\*\*/g, ""), cards: ctx.cards, tools });
    convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });
    for (const call of calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      const result = runTool(call.function.name, args, ctx);
      const text = JSON.stringify(result);
      tools.push({ name: call.function.name, args: call.function.arguments, summary: text.slice(0, 160) });
      convo.push({ role: "tool", tool_call_id: call.id, content: text });
    }
  }
  return Response.json({ content: "这个问题要查的东西太多了，换个更具体的问法试试。", cards: ctx.cards, tools });
}
