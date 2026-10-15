import { expect, it } from "vitest";
import { pickTodos } from "@/lib/engine/inbox";
import { GROUP_MESSAGES } from "@/lib/mock/feeds";

it("合并连发、跳过 @ 达人的", () => {
  const { todos, ignored } = pickTodos(GROUP_MESSAGES);
  expect(todos[0].text).toContain("今天能上就今天上");
  expect(ignored.map((x) => x.msg.id)).toEqual(["m3"]);
  expect(todos.find((t) => t.id === "m6")!.hasImage).toBe(true);
});
