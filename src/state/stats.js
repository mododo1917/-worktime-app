/**
 * 统计汇总（PRD 2.3）：单日 / 月度 / 全局。
 * 全部读记录里已经算好的缓存字段，不在这里重算规则 —— 规则只有 duration.js 一份。
 *
 * 三档时长互不重叠：normal（正常工时）+ overtime（工作日 17:35 之后）
 * + weekendOvertime（周六周日整天）= total。
 */

/** @returns {{ normal:number, overtime:number, weekendOvertime:number, total:number, count:number }} 单位分钟 */
export function summarize(records) {
  return records.reduce(
    (acc, r) => {
      const weekendOvertime = r.weekendOvertimeDuration ?? 0
      acc.normal += r.normalDuration
      acc.overtime += r.overtimeDuration
      acc.weekendOvertime += weekendOvertime
      acc.total += r.totalDuration ?? r.normalDuration + r.overtimeDuration + weekendOvertime
      acc.count += 1
      return acc
    },
    { normal: 0, overtime: 0, weekendOvertime: 0, total: 0, count: 0 },
  )
}

export function recordsOn(records, date) {
  return records.filter((r) => r.recordDate === date)
}

export function dayStats(records, date) {
  return summarize(recordsOn(records, date))
}

/** month 形如 'YYYY-MM' */
export function monthStats(records, month) {
  return summarize(records.filter((r) => r.recordDate.startsWith(`${month}-`)))
}

export function globalStats(records) {
  return summarize(records)
}

/** 日历格子上的每日总时长，日历单元格渲染用 */
export function dailyTotals(records) {
  const map = {}
  for (const r of records) {
    map[r.recordDate] = (map[r.recordDate] ?? 0) + (r.totalDuration ?? 0)
  }
  return map
}
