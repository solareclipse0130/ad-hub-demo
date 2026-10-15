"use client";
import { useState } from "react";
import { Badge, Button, Card, Json, Modal, PageHead, type Tone } from "@/components/ui";
import { NOTES, PACKS, PLANS } from "@/lib/mock/catalog";
import { actionRequests } from "@/lib/engine/request";
import { yuan } from "@/lib/engine/stats";
import { useDemo } from "@/lib/store";
import type { Decision, Suggestion, SuggestAction, Verdict } from "@/lib/types";

const KIND_TONE: Record<Suggestion["kind"], Tone> = { 停投: "red", 放大: "green", 补笔记: "amber" };

function target(s: Suggestion) {
  if (s.noteId) {
    const n = NOTES.find((x) => x.id === s.noteId)!;
    return `${n.talent} ·「${n.title}」`;
  }
  return PACKS.find((p) => p.id === s.packId)!.name;
}

function actionText(a: SuggestAction, planName: (id: string) => string) {
  if (a.type === "pause_creatives") return `暂停这篇笔记在 ${a.planIds.length} 条计划里的创意：${a.planIds.map(planName).join("、")}`;
  if (a.type === "create_single_pack") return `新建单包计划：${PACKS.find((p) => p.id === a.packId)!.name}，日预算 ${a.dailyBudget} 元，出价 ${a.bid} 元，建完暂停`;
  return `这个包还差 ${a.need - a.have} 篇达标笔记，提醒品牌方补；不动账户`;
}

function ModifyForm({ s, onDone }: { s: Suggestion; onDone: (a: SuggestAction, reason: string) => void }) {
  const [planIds, setPlanIds] = useState(s.action.type === "pause_creatives" ? s.action.planIds : []);
  const [budget, setBudget] = useState(s.action.type === "create_single_pack" ? s.action.dailyBudget : 0);
  const [reason, setReason] = useState("");
  const a = s.action;
  return (
    <div className="space-y-3 text-sm">
      {a.type === "pause_creatives" &&
        a.planIds.map((id) => (
          <label key={id} className="flex items-center gap-2">
            <input type="checkbox" checked={planIds.includes(id)} onChange={(e) => setPlanIds(e.target.checked ? [...planIds, id] : planIds.filter((x) => x !== id))} />
            {PLANS.find((p) => p.id === id)?.name ?? id}
          </label>
        ))}
      {a.type === "create_single_pack" && (
        <label className="flex items-center gap-2">
          日预算
          <input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-28 rounded border border-line px-2 py-1" />元
        </label>
      )}
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="改了什么、为什么（可选）" className="w-full rounded border border-line px-2 py-1.5" />
      <Button
        variant="primary"
        disabled={a.type === "pause_creatives" && !planIds.length}
        onClick={() => onDone(a.type === "pause_creatives" ? { ...a, planIds } : a.type === "create_single_pack" ? { ...a, dailyBudget: budget } : a, reason)}
      >
        改后批准
      </Button>
    </div>
  );
}

function DecidedRow({ d }: { d: Decision }) {
  const { state, execute } = useDemo();
  const [preview, setPreview] = useState(false);
  const planName = (id: string) => state.account.plans.find((p) => p.id === id)?.name ?? id;
  const runnable = d.verdict !== "拒绝" && d.action.type !== "need_notes";
  return (
    <Card className="flex flex-wrap items-center gap-3">
      <Badge tone={d.verdict === "拒绝" ? "gray" : "blue"}>{d.verdict}</Badge>
      <Badge tone={KIND_TONE[d.kind]}>{d.kind}</Badge>
      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate">{actionText(d.action, planName)}</div>
        <div className="text-xs text-muted">
          {d.by} · {d.at}
          {d.reason && ` · 理由：${d.reason}`}
        </div>
      </div>
      {runnable &&
        (d.executed ? (
          <Badge tone="green">已执行</Badge>
        ) : (
          <>
            <Button
              onClick={() => {
                execute(d.suggestionId, true);
                setPreview(true);
              }}
            >
              预览请求（dry-run）
            </Button>
            <Button variant="primary" onClick={() => execute(d.suggestionId, false)}>
              确认执行
            </Button>
          </>
        ))}
      <Modal open={preview} onClose={() => setPreview(false)} title="要发给聚光的请求（dry-run，未发送）">
        <Json value={actionRequests(d.action, state.account.plans)} />
      </Modal>
    </Card>
  );
}

export default function Queue() {
  const { state, suggestions, decide } = useDemo();
  const [open, setOpen] = useState<Suggestion | null>(null);
  const [mode, setMode] = useState<"view" | "modify" | "reject">("view");
  const [reason, setReason] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const planName = (id: string) => state.account.plans.find((p) => p.id === id)?.name ?? id;

  const close = () => {
    setOpen(null);
    setMode("view");
    setReason("");
  };
  const act = (s: Suggestion, v: Verdict, r: string, a: SuggestAction = s.action) => {
    decide(s, v, r, a);
    close();
  };
  const batch = (v: Verdict) => {
    const r = v === "拒绝" ? prompt("批量拒绝的理由（必填）") : "";
    if (v === "拒绝" && !r) return;
    suggestions.filter((s) => picked.includes(s.id)).forEach((s) => decide(s, v, r ?? "", s.action));
    setPicked([]);
  };

  return (
    <>
      <PageHead
        no="02"
        title="建议队列"
        desc="规则引擎按昨天为止的数据出建议，最多 12 条，按日均影响排序。批准后先预览请求，再确认执行；拒绝必须写理由，理由用来改规则。"
        right={
          <div className="flex gap-2">
            <Button disabled={!picked.length} onClick={() => batch("批准")}>
              批量批准（{picked.length}）
            </Button>
            <Button variant="danger" disabled={!picked.length} onClick={() => batch("拒绝")}>
              批量拒绝
            </Button>
          </div>
        }
      />
      <div className="space-y-2">
        {!suggestions.length && <Card className="text-sm text-muted">今天的建议都处理完了。去 05 改一条规则，建议会按新规则重算。</Card>}
        {suggestions.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center gap-3">
            <input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
            <Badge tone={KIND_TONE[s.kind]}>{s.kind}</Badge>
            <Badge>{s.reason}</Badge>
            <button type="button" onClick={() => setOpen(s)} className="order-last w-full min-w-0 text-left text-sm hover:text-accent sm:order-none sm:w-auto sm:flex-1">
              <div className="truncate font-medium">{target(s)}</div>
              <div className="truncate text-xs text-muted">{actionText(s.action, planName)}</div>
            </button>
            <div className="ml-auto text-right text-xs text-muted sm:ml-0">
              日均影响
              <div className="text-sm font-semibold text-ink">{yuan(s.impact)}</div>
            </div>
            <Button variant="primary" onClick={() => act(s, "批准", "")}>
              批准
            </Button>
          </Card>
        ))}
      </div>

      {state.decisions.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-sm font-semibold text-muted">已审批（{state.decisions.length}）</h2>
          <div className="space-y-2">
            {[...state.decisions].reverse().map((d) => (
              <DecidedRow key={d.suggestionId} d={d} />
            ))}
          </div>
        </>
      )}

      <Modal open={!!open} onClose={close} title={open ? `${open.kind} · ${open.reason}` : ""}>
        {open && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted">对象</div>
              <div className="font-medium">{target(open)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">依据（规则 v{open.ruleVersion}）</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {Object.entries(open.evidence).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-bg px-3 py-2 text-sm">
                    <div className="text-xs text-muted">{k}</div>
                    <div className="break-all">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted">执行动作</div>
              <div className="text-sm">{actionText(open.action, planName)}</div>
            </div>
            {mode === "view" && (
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => act(open, "批准", "")}>
                  批准
                </Button>
                <Button onClick={() => setMode("modify")}>改后批准</Button>
                <Button variant="danger" onClick={() => setMode("reject")}>
                  拒绝
                </Button>
              </div>
            )}
            {mode === "modify" && <ModifyForm s={open} onDone={(a, r) => act(open, "改后批准", r, a)} />}
            {mode === "reject" && (
              <div className="space-y-2">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="为什么不同意？比如：这篇是品牌方点名要保的，停投线对它不适用"
                  className="h-20 w-full rounded border border-line p-2 text-sm"
                />
                <Button variant="danger" disabled={!reason.trim()} onClick={() => act(open, "拒绝", reason)}>
                  确认拒绝
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
