/**
 * 打卡记录的增删改与校验。
 *
 * 一条记录 = 某天某个时段的一对时间：上班时间 + 下班时间（可能是 null，表示还没下班）。
 * 一天最多三条（上午 / 下午 / 晚上）。
 * normalDuration / overtimeDuration / weekendOvertimeDuration 按表结构存下来当缓存，
 * 但真正的源头永远是 (record_date, start_time, end_time)：时间一改就调 recompute 重算，
 * 保证缓存不会和规则脱节。
 */
import { PERIODS, PERIOD_ORDER, diffMinutes, isTime, splitDuration } from './duration.js'

export function makeId() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** 同一天同一时段只能有一条记录 */
export function findRecord(records, recordDate, period) {
  return records.find((r) => r.recordDate === recordDate && r.period === period) ?? null
}

/** 找出某天的全部记录，按上下午晚排序 */
export function recordsOn(records, recordDate) {
  return records.filter((r) => r.recordDate === recordDate)
}

/** 打了上班卡、下班还没打的那种记录（可能来自过去的某一天） */
export function openRecords(records) {
  return sortRecords(records.filter((r) => !r.endTime))
}

/**
 * 校验一条待写入的记录，返回错误文案；没问题返回 null。
 * candidate 形如 { id?, recordDate, period, startTime, endTime }，endTime 可以是 null。
 */
export function validateRecord(records, candidate) {
  const { id, recordDate, period, startTime, endTime } = candidate

  if (!recordDate) return '请选择日期'
  if (!PERIODS[period]) return '请选择时段'
  if (!isTime(startTime)) return '请填写上班时间'
  if (endTime != null) {
    if (!isTime(endTime)) return '请填写下班时间'
    if (diffMinutes(startTime, endTime) <= 0) return '下班时间需要晚于上班时间'
  }

  const exist = findRecord(records, recordDate, period)
  if (exist && exist.id !== id) return `${recordDate} 的${PERIODS[period]}已经有一条打卡记录了`
  return null
}

/** 有下班时间才算时长；只打了上班卡时三档都算 0 */
export function durationsOf(startTime, endTime, recordDate) {
  if (!endTime) return { total: 0, normal: 0, overtime: 0, weekendOvertime: 0 }
  return splitDuration(startTime, endTime, recordDate)
}

/** 由一对时间算出一条完整记录 */
export function buildRecord(input, now = Date.now()) {
  const endTime = input.endTime ?? null
  const { total, normal, overtime, weekendOvertime } = durationsOf(
    input.startTime,
    endTime,
    input.recordDate,
  )
  return {
    id: input.id ?? makeId(),
    recordDate: input.recordDate,
    period: input.period,
    startTime: input.startTime,
    endTime,
    normalDuration: normal,
    overtimeDuration: overtime,
    weekendOvertimeDuration: weekendOvertime,
    totalDuration: total,
    createAt: input.createAt ?? now,
    updateAt: now,
  }
}

/** 新增或按 id 覆盖，返回新的记录数组 */
export function upsertRecord(records, input, now = Date.now()) {
  const record = buildRecord(input, now)
  const index = records.findIndex((r) => r.id === record.id)
  if (index === -1) return [...records, record]

  const next = [...records]
  // createAt 保留原值，updateAt 用新的
  next[index] = { ...record, createAt: records[index].createAt ?? record.createAt }
  return next
}

export function removeRecord(records, id) {
  return records.filter((r) => r.id !== id)
}

/** 记录里缓存的三档时长，按 splitDuration 的形状取出来，给展示用的格式化函数吃 */
export function splitOf(record) {
  return {
    normal: record.normalDuration,
    overtime: record.overtimeDuration,
    weekendOvertime: record.weekendOvertimeDuration,
    total: record.totalDuration,
  }
}

/** 按当前规则重算一条记录的缓存字段（不动 updateAt —— 这不是用户改的记录） */
export function recompute(record) {
  const { total, normal, overtime, weekendOvertime } = durationsOf(
    record.startTime,
    record.endTime,
    record.recordDate,
  )
  return {
    ...record,
    normalDuration: normal,
    overtimeDuration: overtime,
    weekendOvertimeDuration: weekendOvertime,
    totalDuration: total,
  }
}

/** 规则改过、或者从 localStorage 读回旧数据时，全量重算一遍 */
export function recomputeAll(records) {
  return records.map((r) => recompute(r))
}

/** 展示顺序：日期倒序，同一天上午 → 下午 → 晚上 */
export function sortRecords(records) {
  return [...records].sort(
    (a, b) =>
      b.recordDate.localeCompare(a.recordDate) ||
      PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period),
  )
}
