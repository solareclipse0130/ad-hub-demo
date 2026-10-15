"use client";
import Link from "next/link";
import { Badge, Button, Card, PageHead, type Tone } from "@/components/ui";
import { GROUP_MESSAGES, WATCH_EVENTS } from "@/lib/mock/feeds";
import { pickTodos } from "@/lib/engine/inbox";
import { useDemo } from "@/lib/store";
import type { WatchEvent } from "@/lib/types";

const { todos, ignored } = pickTodos(GROUP_MESSAGES);
const WATCH_TONE: Record<WatchEvent["kind"], Tone> = { 撞线: "red", 建好没开: "amber", 卡审: "amber", 余额: "red" };

export default function Inbox() {
  const { state, setInbox } = useDemo();
  const createdPaused = state.account.plans.filter((p) => p.createdInDemo && p.status === "暂停");
  const digest = [
    `【盯盘汇总 10:30】`,
    ...WATCH_EVENTS.map((e) => `· ${e.kind}：${e.text}`),
    ...(createdPaused.length ? [`· 建好没开：今天建的 ${createdPaused.length} 条计划还在暂停，看过记得开`] : []),
  ].join("\n");

  return (
    <>
      <PageHead
        no="08"
        title="群消息与盯盘"
        desc="每天 9:00–20:00 每小时读一次品牌方群：像是给投放的指令交给 AI 起草，只 @ 了达人、媒介的不收，同一个人 3 分钟内连发的并成一条。盯盘每 20 分钟看一眼账户，同一件事一天只报一次。"
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">群消息待办（{todos.length}）</h2>
          <div className="space-y-2">
            {todos.map((t) => {
              const status = state.inbox[t.id];
              return (
                <Card key={t.id} className={status ? "opacity-60" : ""}>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{t.at}</span>
                    <span>{t.sender}</span>
                    {t.text.includes("\n") && <Badge>3 分钟内连发，已合并</Badge>}
                    {status && <Badge tone="green">{status}</Badge>}
                  </div>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{t.text}</div>
                  {t.hasImage && <div className="mt-1 text-xs text-warn">含图片：AI 看不到图片里的内容，这条要人看图处理</div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/assistant?q=${encodeURIComponent(`品牌方在群里说：「${t.text.replace(/\n/g, "；")}」，帮我起草`)}`}>
                      <Button variant="primary">交给 AI 起草</Button>
                    </Link>
                    <Button onClick={() => setInbox(t.id, "已处理")}>标记已处理</Button>
                    <Button onClick={() => setInbox(t.id, "忽略")}>忽略</Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-muted">没收的（{ignored.length}）</h2>
          {ignored.map((x) => (
            <Card key={x.msg.id} className="mb-2 text-sm">
              <div className="text-xs text-muted">
                {x.msg.at} {x.msg.sender} · {x.reason}
              </div>
              <div className="mt-1">{x.msg.text}</div>
            </Card>
          ))}
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">盯盘（{WATCH_EVENTS.length + (createdPaused.length ? 1 : 0)}）</h2>
          <div className="space-y-2">
            {createdPaused.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge tone="amber">建好没开</Badge>今天
                </div>
                <div className="mt-1 text-sm">你在演示里建的 {createdPaused.length} 条计划还在暂停：{createdPaused.map((p) => p.name).join("、")}</div>
              </Card>
            )}
            {WATCH_EVENTS.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge tone={WATCH_TONE[e.kind]}>{e.kind}</Badge>
                  {e.at}
                </div>
                <div className="mt-1 text-sm">{e.text}</div>
              </Card>
            ))}
          </div>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-muted">每天 10:30、16:30 发到内部群的汇总（预览）</h2>
          <pre className="rounded-xl border border-line bg-panel p-4 text-xs leading-relaxed whitespace-pre-wrap">{digest}</pre>
        </div>
      </div>
    </>
  );
}
