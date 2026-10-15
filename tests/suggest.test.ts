import { describe, expect, it } from "vitest";
import { suggest } from "@/lib/engine/suggest";
import { AD_GROUPS, PLANS } from "@/lib/mock/catalog";
import { DEFAULT_RULES } from "@/lib/mock/feeds";

const account = { plans: PLANS, adGroups: AD_GROUPS, paused: [] };

describe("suggest", () => {
  it("出三类建议", () => {
    const s = suggest(account, DEFAULT_RULES);
    for (const x of s) console.log(x.kind, x.reason, x.noteId ?? x.packId, Math.round(x.impact), JSON.stringify(x.evidence));
    expect(new Set(s.map((x) => x.kind))).toEqual(new Set(["停投", "放大", "补笔记"]));
    expect(s.length).toBeLessThanOrEqual(15);
  });
});

import { NOTES } from "@/lib/mock/catalog";

it("笔记标题不重复", () => {
  expect(new Set(NOTES.map((n) => n.title)).size).toBe(NOTES.length);
});
