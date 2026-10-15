"use client";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, Json, Modal, PageHead, Td, Th } from "@/components/ui";
import { useDemo } from "@/lib/store";
import type { Decision, SuggestionKind } from "@/lib/types";

const KINDS: SuggestionKind[] = ["停投", "放大", "补笔记"];
/** 演示用的往期采纳率（虚构），本周一列按你在 02 的实际操作算 */
const HISTORY = [
  { week: "第 40 周", 停投: 72, 放大: 55, 补笔记: 80 },
  { week: "第 41 周", 停投: 81, 放大: 63, 补笔记: 86 },
  { week: "第 42 周", 停投: 88, 放大: 70, 补笔记: 92 },
];

function adoption(ds: Decision[], kind: SuggestionKind): number | null {
  const k = ds.filter((d) => d.kind === kind);
  return k.length ? Math.round((k.filter((d) => d.verdict !== "拒绝").length / k.length) * 100) : null;
}

export default function Logs() {
  const { state } = useDemo();
  const [json, setJson] = useState<unknown>(null);
  const now = { week: "本周（你的操作）", ...Object.fromEntries(KINDS.map((k) => [k, adoption(state.decisions, k)])) };

  return (
    <>
      <PageHead
        no="06"
        title="日志与复盘"
        desc="采纳率 =（批准 + 改后批准）÷ 全部审批。某类动作连续两轮 ≥ 85% 且没有方向性修改，才考虑把这类动作交给机器自动执行：逐类放权，而不是一次性放手。"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-2 text-sm font-semibold">采纳率走势（%）</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={[...HISTORY, now]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={85} stroke="#11875d" strokeDasharray="4 4" label={{ value: "放权线 85%", fontSize: 11, fill: "#11875d" }} />
              <Line dataKey="停投" stroke="#c43a3a" strokeWidth={2} connectNulls />
              <Line dataKey="放大" stroke="#11875d" strokeWidth={2} connectNulls />
              <Line dataKey="补笔记" stroke="#b26b00" strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 text-xs text-muted">前三周是虚构的往期数据；最后一个点按你在 02 建议队列的审批实时计算。</div>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">本周</div>
          {KINDS.map((k) => {
            const ds = state.decisions.filter((d) => d.kind === k);
            return (
              <div key={k} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
                <span>{k}</span>
                <span className="text-muted">
                  批 {ds.filter((d) => d.verdict === "批准").length} · 改 {ds.filter((d) => d.verdict === "改后批准").length} · 拒 {ds.filter((d) => d.verdict === "拒绝").length}
                </span>
                <span className="font-semibold">{adoption(state.decisions, k) === null ? "—" : `${adoption(state.decisions, k)}%`}</span>
              </div>
            );
          })}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-2 text-sm font-semibold">审批记录</div>
        {!state.decisions.length && <div className="text-sm text-muted">还没有审批。去 02 建议队列批准或拒绝几条。</div>}
        {!!state.decisions.length && (
          <table className="w-full">
            <thead>
              <tr>
                <Th>时间</Th>
                <Th>谁</Th>
                <Th>动作</Th>
                <Th>结论</Th>
                <Th>理由</Th>
              </tr>
            </thead>
            <tbody>
              {[...state.decisions].reverse().map((d) => (
                <tr key={d.suggestionId}>
                  <Td className="whitespace-nowrap">{d.at}</Td>
                  <Td>{d.by}</Td>
                  <Td>{d.kind}</Td>
                  <Td>
                    <Badge tone={d.verdict === "拒绝" ? "red" : d.verdict === "改后批准" ? "amber" : "green"}>{d.verdict}</Badge>
                  </Td>
                  <Td>{d.reason || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-4">
        <div className="mb-2 text-sm font-semibold">操作日志（每一次写接口调用，含 dry-run）</div>
        {!state.logs.length && <div className="text-sm text-muted">还没有操作。</div>}
        {!!state.logs.length && (
          <table className="w-full">
            <thead>
              <tr>
                <Th>时间</Th>
                <Th>谁</Th>
                <Th>操作</Th>
                <Th>类型</Th>
                <Th>结果</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {state.logs.map((l, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap">{l.at}</Td>
                  <Td>{l.by}</Td>
                  <Td>{l.op}</Td>
                  <Td>{l.dryRun ? <Badge>dry-run</Badge> : <Badge tone="blue">执行</Badge>}</Td>
                  <Td>{l.result}</Td>
                  <Td>
                    <button type="button" onClick={() => setJson(l.request)} className="text-xs text-accent hover:underline">
                      请求
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={!!json} onClose={() => setJson(null)} title="请求体">
        <Json value={json} />
      </Modal>
    </>
  );
}
