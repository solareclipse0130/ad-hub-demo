"use client";
import { useState } from "react";
import { Badge, Button, Card, Json, Modal, PageHead, Td, Th } from "@/components/ui";
import { CROWD_TABLE, NOTES, PACKS, PLACEMENTS, TODAY } from "@/lib/mock/catalog";
import { NEW_NOTE_SHEET } from "@/lib/mock/feeds";
import { type BuildCard, DAILY_CREATE_LIMIT, type Skipped, createdToday, previewBuild } from "@/lib/engine/build";
import { createPlanRequest } from "@/lib/engine/request";
import { useDemo } from "@/lib/store";

const talent = (id: string) => NOTES.find((n) => n.id === id)?.talent ?? id;

function SheetTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <Th>笔记</Th>
            <Th>投放场域</Th>
            <Th>定向（人群标签 / 包）</Th>
            <Th>内容标签</Th>
            <Th>更新时间</Th>
            <Th>是否已上线测试</Th>
          </tr>
        </thead>
        <tbody>
          {NEW_NOTE_SHEET.map((r) => (
            <tr key={r.noteId}>
              <Td>
                <div className="font-medium">{r.talent}</div>
                <div className="text-xs text-muted">{r.title}</div>
              </Td>
              <Td>{r.scene}</Td>
              <Td>{r.targets.join("、")}</Td>
              <Td>{r.tag}</Td>
              <Td>{r.updatedAt}</Td>
              <Td>{r.launched || <span className="text-muted">（空）</span>}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Build() {
  const { state, build } = useDemo();
  const [preview, setPreview] = useState<{ cards: BuildCard[]; skipped: Skipped[] } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [json, setJson] = useState<unknown>(null);
  const [msg, setMsg] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const used = createdToday(state.account);

  const read = () => {
    const p = previewBuild(state.account, NEW_NOTE_SHEET);
    setPreview(p);
    setPicked(p.cards.map((c) => c.key));
    setMsg("");
  };
  const chosen = preview?.cards.filter((c) => picked.includes(c.key)) ?? [];

  return (
    <>
      <PageHead
        no="04"
        title="批量建计划"
        desc="建什么由品牌方的新笔记表决定，怎么建照优化师过去的做法：按「内容标签 × 人群标签」一格一条矩阵计划，预算出价照抄同类在投计划。建完一律暂停，开启永远是人在后台点。"
        right={
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">
              今天已建 {used} / {DAILY_CREATE_LIMIT}
            </span>
            <Button onClick={() => setShowSheet(true)}>看新笔记表</Button>
            <Button variant="primary" onClick={read}>
              读新笔记表出预览
            </Button>
          </div>
        }
      />
      {!preview && (
        <Card className="text-sm text-muted">
          点「读新笔记表出预览」。只读「是否已上线测试」为空、更新时间在 {TODAY} 前 14 天内的行；已经在同类计划里的笔记会跳过。人群标签按品牌方「人群组表」翻成包：
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(CROWD_TABLE).map(([k, v]) => (
              <Badge key={k}>
                {k} → {v.join(" + ")}
              </Badge>
            ))}
          </div>
        </Card>
      )}
      {preview && (
        <>
          <Card>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">要建的（{preview.cards.length} 条，勾选 {chosen.length} 条）</div>
              <div className="flex gap-2">
                <Button
                  disabled={!chosen.length}
                  onClick={() => {
                    build(chosen, true);
                    setJson(chosen.map(createPlanRequest));
                  }}
                >
                  先 dry-run
                </Button>
                <Button
                  variant="primary"
                  disabled={!chosen.length}
                  onClick={() => {
                    const refused = build(chosen, false);
                    setMsg(`已建 ${chosen.length - refused.length} 条，全部暂停。到聚光后台按计划名搜到，看过再开启。${refused.length ? ` ${refused.length} 条超过每天 ${DAILY_CREATE_LIMIT} 条上限没建。` : ""}`);
                    setPreview({ cards: preview.cards.filter((c) => !chosen.includes(c)), skipped: preview.skipped });
                    setPicked([]);
                  }}
                >
                  真建（建完暂停）
                </Button>
              </div>
            </div>
            {msg && <div className="mb-2 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{msg}</div>}
            <div className="space-y-2">
              {preview.cards.map((c) => (
                <div key={c.key} className="rounded-lg border border-line">
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <input type="checkbox" checked={picked.includes(c.key)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.key] : picked.filter((x) => x !== c.key))} />
                    <Badge tone="blue">{c.kind}</Badge>
                    <Badge>{PLACEMENTS.find((p) => p.id === c.placement)!.name}</Badge>
                    <button type="button" onClick={() => setExpanded(expanded === c.key ? null : c.key)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-accent">
                      {c.name}
                    </button>
                    <span className="text-xs text-muted">
                      {c.noteIds.length} 篇 · 日预算 {c.dailyBudget || "看广告组"} · 出价 {c.bid}
                    </span>
                  </div>
                  {c.flags.map((f) => (
                    <div key={f} className="border-t border-line bg-warn-soft px-3 py-1.5 text-xs text-warn">
                      {f}
                    </div>
                  ))}
                  {expanded === c.key && (
                    <div className="border-t border-line px-3 py-2 text-sm">
                      <div className="text-xs text-muted">这条计划怎么来的</div>
                      <ul className="mt-1 list-disc pl-5">
                        {c.why.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-muted">笔记</div>
                      <div>{c.noteIds.map(talent).join("、")}</div>
                      <div className="mt-2 text-xs text-muted">包</div>
                      <div>{c.packIds.map((id) => PACKS.find((p) => p.id === id)!.name).join("、") || "无（搜索计划不挂包）"}</div>
                      {c.keywords && <div className="mt-1 text-xs text-muted">关键词：{c.keywords.join("、")}</div>}
                    </div>
                  )}
                </div>
              ))}
              {!preview.cards.length && <div className="text-sm text-muted">没有要建的了。</div>}
            </div>
          </Card>
          {preview.skipped.length > 0 && (
            <Card className="mt-3">
              <div className="mb-2 text-sm font-semibold">没建的（{preview.skipped.length}）</div>
              <table className="w-full">
                <tbody>
                  {preview.skipped.map((s, i) => (
                    <tr key={i}>
                      <Td className="whitespace-nowrap">{talent(s.noteId)}</Td>
                      <Td className="whitespace-nowrap text-muted">{s.target}</Td>
                      <Td>{s.reason}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
      <Modal open={!!json} onClose={() => setJson(null)} title="dry-run：要发给聚光的请求（未发送）">
        <Json value={json} />
      </Modal>
      <Modal open={showSheet} onClose={() => setShowSheet(false)} title="品牌方新笔记表（虚构）">
        <SheetTable />
      </Modal>
    </>
  );
}
