"use client";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, PageHead, Stat } from "@/components/ui";
import { PLACEMENTS } from "@/lib/mock/catalog";
import { pct, yuan } from "@/lib/engine/stats";
import { dashboard } from "@/lib/engine/views";
import { useDemo } from "@/lib/store";

const COLORS = ["#2f5bff", "#11a37f", "#f59e0b", "#a855f7", "#ef4444"];
const d = dashboard();
const delta = (a: number, b: number) => (b ? a / b - 1 : 0);

export default function Dashboard() {
  const { suggestions } = useDemo();
  return (
    <>
      <PageHead
        no="01"
        title="今日看板"
        desc={`离线报表 T+1，下面是 ${d.date} 的数。异常：点位 TI 成本比近 14 天均值高 25% 以上，或 CTR 低于均值的 80%。`}
        right={
          <Card className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted">今天待处理建议</div>
              <div className="text-2xl font-bold">{suggestions.length} 条</div>
            </div>
            <Link href="/queue">
              <Button variant="primary">去处理</Button>
            </Link>
          </Card>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="总消耗" value={yuan(d.y.spend)} delta={delta(d.y.spend, d.p.spend)} />
        <Stat label="CTR" value={pct(d.y.ctr, 2)} delta={delta(d.y.ctr, d.p.ctr)} />
        <Stat label="TI 成本（CPTI）" value={`${d.y.cpti?.toFixed(2)} 元`} delta={delta(d.y.cpti ?? 0, d.p.cpti ?? 0)} invert />
        <Stat label="新增种草人群" value={d.y.ti.toLocaleString()} delta={delta(d.y.ti, d.p.ti)} />
        <Stat label="搜索组件点击率" value={pct(d.y.compRate, 2)} delta={delta(d.y.compRate, d.p.compRate)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {d.cards.map((c) => (
          <Card key={c.placement.id} className={c.alerts.length ? "border-bad/40" : ""}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.placement.name}</div>
              {c.alerts.length ? <Badge tone="red">异常</Badge> : <Badge tone="green">正常</Badge>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-muted">
              <div>
                消耗
                <div className="text-sm font-semibold text-ink">{Math.round(c.yd.spend)}</div>
              </div>
              <div>
                CTR
                <div className="text-sm font-semibold text-ink">{pct(c.yd.ctr, 2)}</div>
              </div>
              <div>
                CPTI
                <div className="text-sm font-semibold text-ink">{c.yd.cpti?.toFixed(1) ?? "-"}</div>
              </div>
            </div>
            {c.alerts.map((a) => (
              <div key={a} className="mt-2 text-xs text-bad">
                {a}
              </div>
            ))}
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-2 text-sm font-semibold">近 14 天消耗（按点位堆叠，元）</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {PLACEMENTS.map((p, i) => (
                <Area key={p.id} type="monotone" dataKey={p.name} stackId="1" stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.25} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">近 14 天 CTR（%）与 CPTI（元）</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={d.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis yAxisId="l" fontSize={12} />
              <YAxis yAxisId="r" orientation="right" fontSize={12} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="l" dataKey="CTR" stroke="#2f5bff" dot={false} strokeWidth={2} />
              <Line yAxisId="r" dataKey="CPTI" stroke="#f59e0b" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
