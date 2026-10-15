"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Card, PageHead } from "@/components/ui";
import { TOOLS } from "@/lib/ai/tools";

function Chat() {
  const q = useSearchParams().get("q") ?? undefined;
  return <ChatPanel autoAsk={q} />;
}

export default function Assistant() {
  return (
    <>
      <PageHead
        no="07"
        title="AI 助手"
        desc="接的是真实大模型（DeepSeek），数据是演示数据。助手能查文档、查数、起草，但没有任何直接写账户的工具：它出草稿卡和改动卡，人点了才生效。护栏越界直接拒。"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="flex h-[70vh] flex-col xl:col-span-2">
          <Suspense>
            <Chat />
          </Suspense>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">它有的 {TOOLS.length} 个工具</div>
          <ul className="space-y-2 text-sm">
            {TOOLS.map((t) => (
              <li key={t.function.name}>
                <code className="text-xs text-accent">{t.function.name}</code>
                <div className="text-xs text-muted">{t.function.description}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-warn-soft p-3 text-xs leading-relaxed text-warn">
            护栏：日预算 50–3000 元、单次最多调 2.5 倍；出价 0.1–15 元、单次最多调 2 倍。不能开启计划或广告组。
          </div>
        </Card>
      </div>
    </>
  );
}
