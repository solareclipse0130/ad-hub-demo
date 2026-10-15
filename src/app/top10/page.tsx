"use client";
import { useMemo, useState } from "react";
import { Badge, Card, Modal, PageHead, Td, Th } from "@/components/ui";
import { NOTES, PLACEMENTS } from "@/lib/mock/catalog";
import { pct } from "@/lib/engine/stats";
import { type RankKey, type RankRow, noteByPack, top10 } from "@/lib/engine/views";
import { useDemo } from "@/lib/store";

const SORTS: [RankKey, string][] = [
  ["ctr", "CTR"],
  ["compRate", "组件率"],
  ["cpti", "CPTI（低在前）"],
  ["spend", "消耗"],
  ["imp", "展现"],
];

function Rows({ rows, onPick }: { rows: RankRow[]; onPick: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <Th>#</Th>
            <Th>笔记</Th>
            <Th>标签</Th>
            <Th>月份</Th>
            <Th className="text-right">展现</Th>
            <Th className="text-right">CTR</Th>
            <Th className="text-right">组件率</Th>
            <Th className="text-right">CPTI</Th>
            <Th className="text-right">消耗</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.noteId} className="hover:bg-bg">
              <Td className="text-muted">{i + 1}</Td>
              <Td>
                <button type="button" onClick={() => onPick(r.noteId)} className="text-left hover:text-accent">
                  <div className="font-medium">{r.talent}</div>
                  <div className="text-xs text-muted">{r.title}</div>
                </button>
              </Td>
              <Td>
                {r.tag}
                {r.qualified && (
                  <span className="ml-1">
                    <Badge tone="green">达标</Badge>
                  </span>
                )}
              </Td>
              <Td>{r.month}</Td>
              <Td className="text-right">{r.a.imp.toLocaleString()}</Td>
              <Td className="text-right">{pct(r.a.ctr, 2)}</Td>
              <Td className="text-right">{pct(r.a.compRate, 2)}</Td>
              <Td className="text-right">{r.a.cpti?.toFixed(1) ?? "-"}</Td>
              <Td className="text-right">{Math.round(r.a.spend)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Top10() {
  const { rules } = useDemo();
  const [win, setWin] = useState(7);
  const [key, setKey] = useState<RankKey>("ctr");
  const [note, setNote] = useState<string | null>(null);
  const groups = useMemo(() => top10(rules, win, key), [rules, win, key]);
  const n = NOTES.find((x) => x.id === note);

  return (
    <>
      <PageHead
        no="03"
        title="定向 TOP10"
        desc={`每个人群包 × 点位一组。展现不足 ${rules.minImpressions} 不排名；尾部是 CTR 低于停投线（${pct(rules.ctrStop, 0)}）且近 7 天天天在投的，停投候选，不跟着排序变。`}
        right={
          <div className="flex flex-wrap gap-2 text-sm">
            <select value={win} onChange={(e) => setWin(+e.target.value)} className="rounded-md border border-line bg-panel px-2 py-1.5">
              {[7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  近 {d} 天
                </option>
              ))}
            </select>
            <select value={key} onChange={(e) => setKey(e.target.value as RankKey)} className="rounded-md border border-line bg-panel px-2 py-1.5">
              {SORTS.map(([k, l]) => (
                <option key={k} value={k}>
                  按 {l} 排
                </option>
              ))}
            </select>
          </div>
        }
      />
      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={`${g.packId}-${g.placement}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="font-semibold">{g.packName}</div>
              <Badge tone="blue">{PLACEMENTS.find((p) => p.id === g.placement)!.name}</Badge>
              <span className="text-xs text-muted">
                在投 {g.summary.live} 篇 · 最老 {g.summary.oldestMonth} · 达标 {g.summary.qualified} 篇{g.thin ? ` · 样本不足 ${g.thin} 篇` : ""}
              </span>
            </div>
            <Rows rows={g.head} onPick={setNote} />
            {g.tail.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold text-bad">尾部 · 停投候选</div>
                <Rows rows={g.tail} onPick={setNote} />
              </div>
            )}
          </Card>
        ))}
      </div>
      <Modal open={!!n} onClose={() => setNote(null)} title={n ? `${n.talent} ·「${n.title}」` : ""}>
        {n && (
          <>
            <div className="mb-2 text-sm text-muted">
              {n.tag} · {n.month} · 近 30 天在各个包的表现
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>人群包</Th>
                  <Th className="text-right">展现</Th>
                  <Th className="text-right">CTR</Th>
                  <Th className="text-right">CPTI</Th>
                  <Th className="text-right">消耗</Th>
                </tr>
              </thead>
              <tbody>
                {noteByPack(n.id).map((x) => (
                  <tr key={x.pack}>
                    <Td>{x.pack}</Td>
                    <Td className="text-right">{x.a.imp.toLocaleString()}</Td>
                    <Td className="text-right">{pct(x.a.ctr, 2)}</Td>
                    <Td className="text-right">{x.a.cpti?.toFixed(1) ?? "-"}</Td>
                    <Td className="text-right">{Math.round(x.a.spend)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </>
  );
}
