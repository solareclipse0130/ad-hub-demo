import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { DemoProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 投放中枢 · 演示版",
  description: "小红书聚光投放的「机器起草，人确认」系统：规则引擎出建议、批量建计划、AI 助手出草稿卡。数据为虚构。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <DemoProvider>
          <Shell>{children}</Shell>
        </DemoProvider>
      </body>
    </html>
  );
}
