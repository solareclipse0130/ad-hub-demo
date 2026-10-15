/** 虚构的客户新笔记表、群消息、盯盘事件和默认规则。 */
import type { GroupMessage, Rules, SheetRow, WatchEvent } from "../types";
import { NOTES, SPU } from "./catalog";

const row = (n: number, scene: string, targets: string[], updatedAt: string, launched = ""): SheetRow => {
  const note = NOTES[n - 1];
  return {
    noteId: note.id,
    talent: note.talent,
    title: note.title,
    scene,
    targets,
    tag: note.tag,
    spu: SPU,
    updatedAt,
    launched,
  };
};

/** 客户表「新笔记list」 */
export const NEW_NOTE_SHEET: SheetRow[] = [
  row(29, "信息流", ["成分党", "品质生活"], "2026-10-13"),
  row(35, "信息流", ["成分党"], "2026-10-13"),
  row(30, "信息流", ["进阶护肤", "抗初老"], "2026-10-12"),
  row(34, "信息流", ["进阶护肤", "搜索-品类词"], "2026-10-12"),
  row(36, "信息流", ["进阶护肤", "搜索-品类词"], "2026-10-14"),
  row(31, "信息流", ["都市女性28+", "华东"], "2026-10-11"),
  row(32, "信息流", ["品质生活家"], "2026-10-14"),
  row(33, "信息流", ["都市女性28+", "敏感肌人群"], "2026-10-14"),
  row(28, "信息流", ["品质生活"], "2026-10-10"),
  row(25, "信息流", ["西南-精致女性"], "2026-10-09"),
  row(4, "信息流", ["都市女性28+"], "2026-09-18"),
  row(19, "信息流", ["品质生活"], "2026-10-08", "已建-暂停"),
];

export const GROUP_MESSAGES: GroupMessage[] = [
  { id: "m1", at: "2026-10-15 09:12", sender: "品牌方-投放负责人", role: "品牌方", text: "@投放 都市女性28+这个人群包最近效果不错，预算先调到1500" },
  { id: "m2", at: "2026-10-15 09:13", sender: "品牌方-投放负责人", role: "品牌方", text: "今天能上就今天上" },
  { id: "m3", at: "2026-10-15 10:05", sender: "品牌方-内容负责人", role: "品牌方", text: "@达人对接 熬夜修仙的桃子那篇脚本第二版发我一下" },
  { id: "m4", at: "2026-10-15 10:41", sender: "品牌方-投放负责人", role: "品牌方", text: "1008那条熬夜急救赛马里，期末周的阿宁那篇数据很好，帮忙放大到成分党这个包，260一天" },
  { id: "m5", at: "2026-10-15 11:20", sender: "品牌方-投放负责人", role: "品牌方", text: "杭州Mia那篇测评点击率太低了，先停掉吧" },
  { id: "m6", at: "2026-10-15 13:02", sender: "品牌方-投放负责人", role: "品牌方", text: "（图片）这几个词也加到搜索里" },
  { id: "m7", at: "2026-10-15 14:30", sender: "品牌方-投放负责人", role: "品牌方", text: "搜索那条出价调到3块试试" },
];

export const WATCH_EVENTS: WatchEvent[] = [
  { id: "w1", at: "2026-10-15 10:45", kind: "撞线", text: "广告组「品质生活」今日预算 1100 元已花完（晚高峰 20 点前就撞线，建议看是否加预算）" },
  { id: "w2", at: "2026-10-15 09:30", kind: "建好没开", text: "计划「1012-信息流-点击-成分科普-成分党-澄光精华油」开着，但广告组「成分党」没开" },
  { id: "w3", at: "2026-10-15 11:15", kind: "卡审", text: "笔记「连熬三晚后的急救方案」（期末周的阿宁）1 条创意被拒：物料【0:12 一晚见效】涉及效果保证性承诺" },
  { id: "w4", at: "2026-10-15 08:00", kind: "余额", text: "账户可用余额 9,860 元，按当前日预算约可投 1.9 天，不足 2 天" },
];

export const DEFAULT_RULES: Rules = {
  version: 1,
  ctrStop: 0.055,
  tiFlyMultiple: 2.5,
  minImpressions: 400,
  raceDays: 4,
  perPackQualified: 6,
  amplify: {
    曝光: { ctr: 0.082, cpti: 4.5, comp: 0.0075 },
    种草: { ctr: 0.062, cpti: 6.5, comp: 0.011 },
    转化: { ctr: 0.072, cpti: 7.5, comp: 0.0085 },
  },
  tooOldBefore: "2026-04",
  tooOldByTag: { 换季修护: "2026-07" },
  packMismatch: { city_q: ["宝妈护肤"], east: ["横评种草"] },
};
