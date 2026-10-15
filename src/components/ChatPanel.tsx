"use client";
/** AI 助手对话面：消息、工具调用轨迹、草稿卡 / 改动卡。 */
import { useEffect, useRef, useState } from "react";
import { type AiCard, type ChatMessage, FIELD_LABEL } from "@/lib/cards";
import { NOTES, PACKS } from "@/lib/mock/catalog";
import { useDemo } from "@/lib/store";
import { Badge, Button } from "./ui";

export const EXAMPLES = [
  "停投规则是怎么定的？",
  "昨天哪个点位不正常？",
  "按新笔记表出一批建计划草稿",
  "把期末周的阿宁那篇放大到成分党，260 一天",
  "品质生活广告组预算调到 1500",
  "搜索那条出价调到 3 块",
];

function CardView({ card }: { card: AiCard }) {
  const { state, runCard } = useDemo();
  const status = state.cardStatus[card.id];
  const done = status === "已建-暂停" || status === "已执行";
  return (
    <div className="mt-2 rounded-lg border border-line bg-bg p-3 text-sm">
      {card.kind === "build" ? (
        <>
          <div className="flex items-center gap-2">
            <Badge tone="blue">草稿卡 · 建计划</Badge>
            {status && <Badge tone={done ? "green" : "amber"}>{status}</Badge>}
          </div>
          <div className="mt-2 font-medium break-all">{card.card.name}</div>
          <div className="mt-1 text-xs text-muted">
            笔记 {card.card.noteIds.map((id) => NOTES.find((n) => n.id === id)?.talent ?? id).join("、")} · 包{" "}
            {card.card.packIds.map((id) => PACKS.find((p) => p.id === id)?.name).join("、") || "无（搜索）"} · 日预算{" "}
            {card.card.dailyBudget || "看广告组"} · 出价 {card.card.bid}
          </div>
          {card.card.flags.map((f) => (
            <div key={f} className="mt-1 text-xs text-warn">
              {f}
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge tone="amber">改动卡 · {FIELD_LABEL[card.change.field]}</Badge>
            {status && <Badge tone={done ? "green" : "amber"}>{status}</Badge>}
          </div>
          <div className="mt-2 font-medium break-all">{card.change.targetName}</div>
          <div className="mt-1 text-xs text-muted">
            {card.change.from} → <span className="font-semibold text-ink">{card.change.to}</span>
          </div>
        </>
      )}
      <div className="mt-2 flex gap-2">
        <Button onClick={() => runCard(card, true)} disabled={done}>
          演练
        </Button>
        <Button variant="primary" onClick={() => runCard(card, false)} disabled={done}>
          {card.kind === "build" ? "真建（建完暂停）" : "确认执行"}
        </Button>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const [open, setOpen] = useState(false);
  if (m.role === "user") return <div className="ml-auto max-w-[85%] rounded-xl bg-accent px-3 py-2 text-sm text-white">{m.content}</div>;
  return (
    <div className="max-w-[95%]">
      {!!m.tools?.length && (
        <button type="button" onClick={() => setOpen(!open)} className="mb-1 text-xs text-muted hover:text-ink">
          {open ? "收起" : "展开"}工具调用（{m.tools.length}）：{m.tools.map((t) => t.name).join(" → ")}
        </button>
      )}
      {open && (
        <div className="mb-2 space-y-1">
          {m.tools!.map((t, i) => (
            <div key={i} className="rounded bg-side px-2 py-1 font-mono text-[11px] leading-snug break-all text-side-ink">
              {t.name}({t.args}) → {t.summary}…
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-line bg-panel px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
      {m.cards?.map((c) => <CardView key={c.id} card={c} />)}
    </div>
  );
}

export function ChatPanel({ autoAsk }: { autoAsk?: string }) {
  const { state, rules, setChat } = useDemo();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const history = [...state.chat, { role: "user" as const, content: text }];
    setChat(history);
    setInput("");
    setBusy(true);
    setError("");
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), account: state.account, rules }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "助手出错了");
      return;
    }
    setChat([...history, { role: "assistant", content: data.content, cards: data.cards, tools: data.tools }]);
  };

  useEffect(() => {
    if (autoAsk && !asked.current) {
      asked.current = true;
      void send(autoAsk);
    }
  });

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.chat.length, busy]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-1">
        {!state.chat.length && (
          <div className="text-sm text-muted">
            <p>我能答疑、查数、起草建计划和改动。我出的都是草稿，你在卡片上点了才会生效。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" onClick={() => send(e)} className="rounded-full border border-line bg-panel px-3 py-1 text-xs hover:border-accent hover:text-accent">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {state.chat.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && <div className="text-sm text-muted">助手正在查数和起草…</div>}
        {error && <div className="text-sm text-bad">{error}</div>}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={800}
          placeholder="比如：把 1008 那条赛马里表现最好的笔记放大到品牌种草人群"
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <Button variant="primary" disabled={busy || !input.trim()}>
          发送
        </Button>
      </form>
      {!!state.chat.length && (
        <button type="button" onClick={() => setChat([])} className="mt-2 self-start text-xs text-muted hover:text-ink">
          清空对话
        </button>
      )}
    </div>
  );
}

export function ChatFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110"
      >
        问问助手
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-bg p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold">AI 助手</div>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="关闭">
                ✕
              </button>
            </div>
            <ChatPanel />
          </div>
        </div>
      )}
    </>
  );
}
