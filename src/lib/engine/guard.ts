/** 改动护栏：越界直接拒，不打折执行。 */

export const BUDGET_RANGE = [50, 3000] as const;
export const BID_RANGE = [0.1, 15] as const;
export const MAX_BUDGET_STEP = 2.5;
export const MAX_BID_STEP = 2;

/** 返回拒绝理由；null 表示通过 */
export function checkBudget(oldValue: number, newValue: number): string | null {
  if (newValue < BUDGET_RANGE[0] || newValue > BUDGET_RANGE[1]) return `日预算要在 ${BUDGET_RANGE[0]}–${BUDGET_RANGE[1]} 元之间`;
  if (oldValue > 0 && (newValue > oldValue * MAX_BUDGET_STEP || newValue < oldValue / MAX_BUDGET_STEP))
    return `单次最多调 ${MAX_BUDGET_STEP} 倍（当前 ${oldValue} 元）`;
  return null;
}

export function checkBid(oldValue: number, newValue: number): string | null {
  if (newValue < BID_RANGE[0] || newValue > BID_RANGE[1]) return `出价要在 ${BID_RANGE[0]}–${BID_RANGE[1]} 元之间`;
  if (newValue > oldValue * MAX_BID_STEP || newValue < oldValue / MAX_BID_STEP) return `单次最多调 ${MAX_BID_STEP} 倍（当前 ${oldValue} 元）`;
  return null;
}
