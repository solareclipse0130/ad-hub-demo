import Link from "next/link";
import { Card } from "@/components/ui";

const FLOW = [
  { title: "数据底座", items: ["聚光离线报表七层落库", "创意 × 精准定向回拉", "品牌方飞书表：新笔记、人群组、预算"] },
  { title: "判断线", items: ["L0 规则引擎（带版本）", "停投 / 放大 / 补笔记", "按日均影响排序，每天最多 12 条"] },
  { title: "人审批", items: ["批准 / 改后批准 / 拒绝", "拒绝必须写理由", "理由回流改规则"] },
  { title: "执行线", items: ["写接口唯一入口", "默认 dry-run，建完即暂停", "每天最多 30 条，全量日志"] },
];

const TOUR = [
  { href: "/dashboard", text: "01 看板：昨天视频流 TI 成本比均值高了 69%，华南 CTR 偏低。" },
  { href: "/queue", text: "02 建议队列：点开一条看依据，批准一条停投，拒绝一条并写理由；批准后先预览请求，再确认执行。" },
  { href: "/rules", text: "05 规则：把 CTR 停投线从 5.5% 调到 6%，写理由存成新版本，回 02 看建议怎么变。" },
  { href: "/build", text: "04 批量建计划：读新笔记表，看矩阵怎么分格、哪些没建、为什么；dry-run 后真建，全部暂停。" },
  { href: "/assistant", text: "07 AI 助手：让它「把品质生活广告组预算调到 3000」，看护栏怎么拒；再让它按新笔记表起草。" },
  { href: "/inbox", text: "08 群消息：把品牌方的一句话交给 AI 起草成改动卡。" },
];

const DECISIONS = [
  ["机器起草，人确认", "规则引擎和 AI 都只出草稿。暂停、改预算、建计划都要人点；开启计划永远是人在后台点。"],
  ["AI 没有写权限", "助手有 11 个工具，全是查数和起草。改动卡经人确认后走同一个执行入口，和手工操作一样过护栏、记日志。"],
  ["照抄，不发明", "新计划的预算、出价、广告组照抄同类在投计划，而不是让模型算一个数。优化师过去怎么做，系统就怎么做。"],
  ["拒绝理由是最值钱的数据", "每条拒绝都要写理由，用来改规则；按动作类型算采纳率，连续两轮 ≥ 85% 才考虑逐类放权。"],
  ["对不上就停", "人群标签对不上包、没有同标签模板、搜索计划首次建，都在卡片上标出来，不猜。"],
];

export default function Home() {
  return (
    <>
      <div className="rounded-2xl bg-side p-6 text-side-ink lg:p-10">
        <div className="text-xs font-semibold tracking-widest text-white/60">演示版 · 数据为虚构</div>
        <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">AI 投放中枢</h1>
        <p className="mt-3 max-w-3xl leading-relaxed">
          给小红书聚光投放优化师用的工作台：把优化师每天看数、换笔记、建计划、回品牌方消息的活，拆成「机器起草 + 人确认」。
          它从优化师过去的操作里「蒸馏」出规则，出建议、起草计划，人批准后才动账户。
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
          这是参照我在实习中做的系统重写的公开演示版：品牌、人员、数据全部虚构，功能与真实系统一致；AI 助手接的是真实大模型（DeepSeek）。我负责需求拆解、流程与规则设计、技术决策，代码在 Claude Code 辅助下完成。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
            从看板开始
          </Link>
          <Link href="/assistant" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            直接试 AI 助手
          </Link>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">架构</h2>
      <div className="grid gap-3 md:grid-cols-4">
        {FLOW.map((f, i) => (
          <div key={f.title} className="relative">
            <Card className="h-full">
              <div className="text-xs text-accent">0{i + 1}</div>
              <div className="font-semibold">{f.title}</div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {f.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>
            {i < FLOW.length - 1 && <div className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 text-xl text-muted md:block">→</div>}
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Card className="border-accent/30 bg-accent-soft">
          <div className="font-semibold text-accent">AI 助手（DeepSeek + 11 个工具）</div>
          <p className="mt-1 text-sm">查文档、查数、起草建计划、提改动。只出草稿卡和改动卡，人点「确认执行」后进入执行线，和手工操作一样过护栏。</p>
        </Card>
        <Card className="border-warn/30 bg-warn-soft">
          <div className="font-semibold text-warn">接活与盯盘</div>
          <p className="mt-1 text-sm">每小时读品牌方群，挑出给投放的指令交给 AI 起草；每 20 分钟盯一次账户：撞线、建好没开、卡审、余额，一天只报一次。</p>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">几个设计决定</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DECISIONS.map(([t, d]) => (
          <Card key={t}>
            <div className="font-semibold">{t}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">五分钟试玩路线</h2>
      <Card>
        <ol className="space-y-2">
          {TOUR.map((t, i) => (
            <li key={t.href} className="flex gap-3 text-sm">
              <span className="font-semibold text-accent">{i + 1}</span>
              <Link href={t.href} className="hover:text-accent">
                {t.text}
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">你的操作只存在你自己的浏览器里，右上角「重置演示」可以回到初始状态。</p>
      </Card>
    </>
  );
}
