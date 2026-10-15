import { describe, expect, it } from "vitest";
import { createPlans, previewBuild } from "@/lib/engine/build";
import { checkBid, checkBudget } from "@/lib/engine/guard";
import { dashboard, top10 } from "@/lib/engine/views";
import { AD_GROUPS, PLANS } from "@/lib/mock/catalog";
import { DEFAULT_RULES, NEW_NOTE_SHEET } from "@/lib/mock/feeds";

const account = { plans: PLANS, adGroups: AD_GROUPS, paused: [] };

describe("previewBuild", () => {
  const { cards, skipped } = previewBuild(account, NEW_NOTE_SHEET);
  it("矩阵按格合并，跳过该跳的", () => {
    for (const c of cards) console.log("CARD", c.name, c.noteIds.join(","), c.packIds.join(","), c.dailyBudget, c.adGroupId, c.flags.join("|"));
    for (const s of skipped) console.log("SKIP", s.noteId, s.target, s.reason);
    const tech = cards.find((c) => c.name.includes("成分科普-成分党"))!;
    expect(tech.noteIds).toEqual(["n29", "n35"]);
    expect(cards.some((c) => c.name.includes("品质生活") && c.noteIds.includes("n32"))).toBe(true);
    expect(skipped.map((s) => s.noteId)).toEqual(expect.arrayContaining(["n04", "n19", "n28", "n25"]));
  });
  it("建完全部暂停，30 条上限", () => {
    const many = Array.from({ length: 35 }, () => cards[0]);
    const { plans, refused } = createPlans(account, many);
    expect(plans).toHaveLength(30);
    expect(refused).toHaveLength(5);
    expect(plans.every((p) => p.status === "暂停")).toBe(true);
  });
});

describe("guard", () => {
  it("预算和出价越界拒绝", () => {
    expect(checkBudget(500, 1200)).toBeNull();
    expect(checkBudget(500, 1300)).toMatch("2.5 倍");
    expect(checkBudget(500, 6000)).toMatch("50–3000");
    expect(checkBid(1.2, 2.4)).toBeNull();
    expect(checkBid(1.2, 3)).toMatch("2 倍");
  });
});

describe("views", () => {
  it("看板与 TOP10 有数", () => {
    const d = dashboard();
    console.log("DASH", d.date, Math.round(d.y.spend), d.y.ctr.toFixed(4), d.cards.map((c) => c.alerts.join(";")).join(" / "));
    expect(d.series).toHaveLength(14);
    const g = top10(DEFAULT_RULES, 30, "ctr");
    console.log("TOP10 groups", g.length, g.map((x) => `${x.packName}/${x.placement}:${x.head.length}/${x.tail.length}`).join(" "));
    expect(g.length).toBeGreaterThan(5);
  });
});
