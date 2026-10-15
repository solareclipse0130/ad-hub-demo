"use client";
/** 侧栏 + 页头 + 右下角助手入口。 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/mock/catalog";
import { type DemoUser, useDemo } from "@/lib/store";
import { ChatFab } from "./ChatPanel";

export const NAV = [
  { href: "/", no: "00", label: "项目说明" },
  { href: "/dashboard", no: "01", label: "今日看板" },
  { href: "/queue", no: "02", label: "建议队列" },
  { href: "/top10", no: "03", label: "定向 TOP10" },
  { href: "/build", no: "04", label: "批量建计划" },
  { href: "/rules", no: "05", label: "规则与映射" },
  { href: "/logs", no: "06", label: "日志与复盘" },
  { href: "/assistant", no: "07", label: "AI 助手" },
  { href: "/inbox", no: "08", label: "群消息与盯盘" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { state, suggestions, setUser, reset } = useDemo();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-side text-side-ink lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0">
        <div className="px-5 pt-5 pb-3">
          <div className="text-lg font-bold text-white">AI 投放中枢</div>
          <div className="mt-0.5 text-xs opacity-70">机器起草，人确认</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
              >
                <span className="text-xs opacity-60">{n.no}</span>
                {n.label}
                {n.href === "/queue" && suggestions.length > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-xs text-white">{suggestions.length}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-5 py-4 text-xs leading-relaxed opacity-70 lg:absolute lg:bottom-0 lg:block">
          执行开关：演示模式
          <br />
          「确认执行」只写入模拟账户
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-2.5 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">演示版 · 数据为虚构</span>
            <span className="text-muted">品牌：{BRAND}（虚构） · 小红书聚光</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">当前身份</span>
            <select
              value={state.user}
              onChange={(e) => setUser(e.target.value as DemoUser)}
              className="rounded-md border border-line bg-panel px-2 py-1"
            >
              <option>优化师</option>
              <option>管理员</option>
            </select>
            <button
              type="button"
              onClick={() => confirm("清空你在演示里的所有操作，回到初始数据？") && reset()}
              className="rounded-md border border-line px-2 py-1 text-muted hover:text-ink"
            >
              重置演示
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 lg:px-8">{children}</main>
      </div>
      {path !== "/assistant" && <ChatFab />}
    </div>
  );
}
