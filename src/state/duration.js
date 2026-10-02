/**
 * 加班计算的核心，整个 App 只有这一个地方决定「哪些分钟算加班」。
 * 页面、统计都调这里的函数，规则改了只用改这一处。
 *
 * 打卡按时段来：上午 / 下午 / 晚上，每个时段各有一对「上班 ~ 下班」时间。
 * 规则只看日期本身是周几，跟时段无关：
 * - 周一 ~ 周五：17:35 之前算「正常工时」，17:35 之后算「正常加班」
 * - 周六 / 周日：整天都算「周末加班」
 */
import { isWeekend } from '../utils/date.js'

/** 17:35 的分界点，换算成当日分钟数：17 * 60 + 35 = 1055 */
export const SPLIT_MINUTES = 17 * 60 + 35

/** 一天三个时段，顺序就是页面上从上到下的顺序 */
export const PERIODS = { morning: '上午', afternoon: '下午', evening: '晚上' }

/** 时段顺序，排序用 */
export const PERIOD_ORDER = ['morning', 'afternoon', 'evening']

export const DAY_TYPES = { workday: '工作日', weekend: '周末' }

/** 判断某一天按哪套规则算：'workday' | 'weekend' */
export function dayTypeOf(dateStr) {
  return isWeekend(dateStr) ? 'weekend' : 'workday'
}

/** 某个时间点大概落在哪个时段，打卡页把当前那个时段标出来用（12 点起算下午，18 点起算晚上） */
export function periodOfTime(hhmm) {
  const minutes = toMinutes(hhmm)
  if (minutes < 12 * 60) return 'morning'
  if (minutes < 18 * 60) return 'afternoon'
  return 'evening'
}

/** HH:mm，00:00 ~ 23:59 */
export function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHmm(minutes) {
  const clamped = Math.min(Math.max(minutes, 0), 23 * 60 + 59)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 起止时间之间过了多少分钟（结束早于开始时返回 0，校验交给 validateRecord） */
export function diffMinutes(startTime, endTime) {
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime))
}

/**
 * 把一段工时拆成「正常工时 / 正常加班 / 周末加班」。
 *
 * 日期直接传进来（而不是让调用方先算好类型），规则只在这里判一次，外面想传错都难。
 * - 周末（周六 / 周日）：整段都算 weekendOvertime，不看时间点
 * - 工作日（周一 ~ 周五）：以 17:35 分割，17:35 之后的部分算 overtime
 *   （17:35 整点前后不重叠：结束时间正好 17:35 时加班为 0）
 *
 * 三个数永远满足 normal + overtime + weekendOvertime === total。
 */
export function splitDuration(startTime, endTime, dateStr) {
  const total = diffMinutes(startTime, endTime)
  if (dayTypeOf(dateStr) === 'weekend') {
    return { total, normal: 0, overtime: 0, weekendOvertime: total }
  }
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const overtime = Math.max(0, end - Math.max(start, SPLIT_MINUTES))
  return { total, normal: total - overtime, overtime, weekendOvertime: 0 }
}

/**
 * 把 splitDuration 的结果写成「正常 8:30」「加班 0:25」这样的片段，为 0 的那档不写。
 * 计时结束的提示、表单预览都走这里，措辞不会各写一套。
 */
export function splitParts({ normal, overtime, weekendOvertime }) {
  const parts = []
  if (normal) parts.push(`正常 ${formatHM(normal)}`)
  if (overtime) parts.push(`加班 ${formatHM(overtime)}`)
  if (weekendOvertime) parts.push(`周末加班 ${formatHM(weekendOvertime)}`)
  return parts.length ? parts : ['0:00']
}

/** 汇总用的统一格式：时:分，例如 8:30、0:05 */
export function formatHM(minutes) {
  const safe = Math.max(0, Math.round(minutes))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

/** 时分的口语化写法，卡片副标题用：8 小时 30 分 */
export function formatHMLabel(minutes) {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m} 分`
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}
