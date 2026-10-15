"use client";
import { useState } from "react";
import { Badge, Button, Card, PageHead, Td, Th } from "@/components/ui";
import { CONTENT_TYPE, PACKS } from "@/lib/mock/catalog";
import { pct } from "@/lib/engine/stats";
import { useDemo } from "@/lib/store";
import type { ContentType, Rules } from "@/lib/types";

const FIELDS: { key: keyof Rules; label: string; pctField?: boolean }[] = [
  { key: "ctrStop", label: "CTR 停投线", pctField: true },
  { key: "tiFlyMultiple", label: "TI 飞倍数（× 放大标准 CPTI）" },
  { key: "minImpressions", label: "排名最少展现" },
  { key: "raceDays", label: "赛马出结论天数" },
  { key: "perPackQualified", label: "每包达标篇数" },
];
const TYPES: ContentType[] = ["曝光", "种草", "转化"];

function diff(a: Rules, b: Rules): string[] {
  const out: string[] = [];
  for (const f of FIELDS) if (a[f.key] !== b[f.key]) out.push(`${f.label} ${a[f.key]} → ${b[f.key]}`);
  for (const t of TYPES)
    for (const k of ["ctr", "cpti", "comp"] as const) if (a.amplify[t][k] !== b.amplify[t][k]) out.push(`${t}放大标准 ${k} ${a.amplify[t][k]} → ${b.amplify[t][k]}`);
  if (a.tooOldBefore !== b.tooOldBefore) out.push(`太老截止月 ${a.tooOldBefore} → ${b.tooOldBefore}`);
  return out;
}

const NumInput = ({ value, onChange, step = 0.001 }: { value: number; onChange: (v: number) => void; step?: number }) => (
  <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-24 rounded border border-line px-2 py-1 text-sm" />
);

export default function RulesPage() {
  const { rules, loaded } = useDemo();
  return <RulesEditor key={`${rules.version}-${loaded}`} />;
}

function RulesEditor() {
  const { state, rules, saveRules, suggestions } = useDemo();
  const [draft, setDraft] = useState<Rules>(rules);
  const [reason, setReason] = useState("");
  const changed = diff(rules, draft);
  const set = (patch: Partial<Rules>) => setDraft({ ...draft, ...patch });

  return (
    <>
      <PageHead
        no="05"
        title="规则与映射"
        desc="管理员和优化师都能改。改了要写理由，自动存成新版本、留历史；建议队列立刻按新规则重算。"
        right={
          <Badge tone="blue">
            当前 v{rules.version} · 建议 {suggestions.length} 条
          </Badge>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold">阈值</div>
          <div className="space-y-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                <span>{f.label}</span>
                <span className="flex items-center gap-2">
                  <NumInput value={draft[f.key] as number} step={f.pctField ? 0.005 : 1} onChange={(v) => set({ [f.key]: v })} />
                  {f.pctField && <span className="w-12 text-xs text-muted">{pct(draft[f.key] as number)}</span>}
                </span>
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>太老截止月（早于它停投）</span>
              <input type="month" value={draft.tooOldBefore} onChange={(e) => set({ tooOldBefore: e.target.value })} className="rounded border border-line px-2 py-1 text-sm" />
            </label>
          </div>
          <div className="mt-3 text-xs text-muted">按标签的截止月：{Object.entries(draft.tooOldByTag).map(([k, v]) => `${k} ${v}`).join("；")}</div>
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold">放大标准（按内容类型）</div>
          <table className="w-full">
            <thead>
              <tr>
                <Th>类型</Th>
                <Th>CTR &gt;</Th>
                <Th>CPTI &lt;</Th>
                <Th>组件率 &gt;</Th>
              </tr>
            </thead>
            <tbody>
              {TYPES.map((t) => (
                <tr key={t}>
                  <Td>
                    {t}
                    <div className="text-xs text-muted">
                      {Object.entries(CONTENT_TYPE)
                        .filter(([, v]) => v === t)
                        .map(([k]) => k)
                        .join("、")}
                    </div>
                  </Td>
                  {(["ctr", "cpti", "comp"] as const).map((k) => (
                    <Td key={k}>
                      <NumInput
                        value={draft.amplify[t][k]}
                        step={k === "cpti" ? 0.5 : 0.001}
                        onChange={(v) => set({ amplify: { ...draft.amplify, [t]: { ...draft.amplify[t], [k]: v } } })}
                      />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-sm font-semibold">人群包 × 内容标签 不契合映射</div>
          <div className="mt-2 space-y-1 text-sm">
            {Object.entries(draft.packMismatch).map(([pack, tags]) => (
              <div key={pack}>
                {PACKS.find((p) => p.id === pack)!.name} 不投：{tags.join("、")}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="text-sm font-semibold">保存为新版本</div>
        {changed.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {changed.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-sm text-muted">还没改动。试试把 CTR 停投线从 0.055 调到 0.06，再去 02 看建议怎么变。</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="改规则的理由（必填）" className="min-w-0 flex-1 rounded border border-line px-3 py-1.5 text-sm" />
          <Button
            variant="primary"
            disabled={!changed.length || !reason.trim()}
            onClick={() => {
              saveRules(draft, reason, changed);
              setReason("");
            }}
          >
            保存为 v{state.ruleHistory.length + 1}
          </Button>
          <Button onClick={() => setDraft(rules)} disabled={!changed.length}>
            撤销改动
          </Button>
        </div>
      </Card>
      <Card className="mt-4">
        <div className="mb-2 text-sm font-semibold">规则历史</div>
        <table className="w-full">
          <thead>
            <tr>
              <Th>版本</Th>
              <Th>谁</Th>
              <Th>时间</Th>
              <Th>改了什么</Th>
              <Th>理由</Th>
            </tr>
          </thead>
          <tbody>
            {[...state.ruleHistory].reverse().map((v) => (
              <tr key={v.rules.version}>
                <Td>v{v.rules.version}</Td>
                <Td>{v.by}</Td>
                <Td className="whitespace-nowrap">{v.at}</Td>
                <Td>{v.changed.join("；") || "—"}</Td>
                <Td>{v.reason}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
