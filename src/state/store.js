/**
 * 全局状态（一个 reactive 单例就够了，不引 Pinia）。
 *
 * 分工：本文件只负责「状态 + 落盘 + 打卡动作」，
 * 加班规则在 duration.js，增删改校验在 records.js，汇总在 stats.js —— 都是纯函数，能离线测。
 */
import { computed, reactive, watch } from 'vue'
import { PERIODS, diffMinutes, isTime, periodOfTime } from './duration.js'
import {
  buildRecord,
  findRecord,
  makeId,
  openRecords,
  recomputeAll,
  removeRecord,
  sortRecords,
  upsertRecord,
  validateRecord,
} from './records.js'
import { dailyTotals, dayStats, globalStats, monthStats } from './stats.js'
import { hhmmOf, isDateStr, todayStr } from '../utils/date.js'

export const STORAGE_KEY = 'worktime-app.v1'

const state = reactive({
  /** 打卡记录表，一天最多三条（上午 / 下午 / 晚上） */
  records: [],
  /** 当前选中的日期，记录页 / 统计页共用 */
  selectedDate: todayStr(),
})

function readStorage() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // 隐私模式读不到、或者存的 JSON 坏了：当新用户处理
    return null
  }
}

/**
 * 时段兜底：老数据可能没有 period（有一版是一天一条），
 * 按上班时间猜一个时段，至少不丢记录。
 */
function periodOf(record) {
  return PERIODS[record.period] ? record.period : periodOfTime(record.startTime)
}

function sanitizeRecords(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const r of value) {
    if (!r || !isDateStr(r.recordDate)) continue
    if (!isTime(r.startTime)) continue
    if (r.endTime != null && !isTime(r.endTime)) continue

    const period = periodOf(r)
    const key = `${r.recordDate}|${period}`
    if (seen.has(key)) continue // 同一时段重复的只留第一条
    seen.add(key)

    out.push({
      id: typeof r.id === 'string' ? r.id : makeId(),
      recordDate: r.recordDate,
      period,
      startTime: r.startTime,
      endTime: r.endTime ?? null,
      normalDuration: 0,
      overtimeDuration: 0,
      weekendOvertimeDuration: 0,
      totalDuration: 0,
      createAt: typeof r.createAt === 'number' ? r.createAt : Date.now(),
      updateAt: typeof r.updateAt === 'number' ? r.updateAt : Date.now(),
    })
  }
  return out
}

function hydrate() {
  const data = readStorage()
  if (!data) return
  // 读进来的缓存字段一律重算：规则变过、或者有人手改过存储，都以日期 + 起止时间为准
  state.records = recomputeAll(sanitizeRecords(data.records))
  if (isDateStr(data.selectedDate)) state.selectedDate = data.selectedDate
}

hydrate()

watch(
  state,
  () => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 写不进去（隐私模式 / 配额满）不影响当前会话
    }
  },
  { deep: true },
)

export const store = {
  state,

  /** 日历格子上的每日合计 */
  dayTotals: computed(() => dailyTotals(state.records)),

  /** 某天某时段那条记录，没有就是 null */
  recordOn: (date, period) => findRecord(state.records, date, period),

  /** 打了上班卡、还没打下班卡的记录（按日期倒序） */
  openRecords: () => openRecords(state.records),

  sortedRecords: () => sortRecords(state.records),

  /**
   * 上班打卡：把「现在」记成上班时间，当天该时段的记录会当场建出来。
   * @returns 错误文案，成功返回 null
   */
  clockIn(date, period, nowMs = Date.now()) {
    const exist = findRecord(state.records, date, period)
    if (exist) return `${date} 的${PERIODS[period]}已经打过上班卡了（${exist.startTime}）`

    const input = { recordDate: date, period, startTime: hhmmOf(nowMs) }
    state.records = [...state.records, buildRecord(input, nowMs)]
    return null
  },

  /**
   * 下班打卡：给当天该时段的记录补上下班时间并算时长。
   * @returns 错误文案，成功返回 null
   */
  clockOut(date, period, nowMs = Date.now()) {
    const exist = findRecord(state.records, date, period)
    if (!exist) return `${date} 的${PERIODS[period]}还没有上班打卡`
    if (exist.endTime) return `${date} 的${PERIODS[period]}已经打过下班卡了（${exist.endTime}）`

    const endTime = hhmmOf(nowMs)
    if (diffMinutes(exist.startTime, endTime) <= 0) {
      // 跨过零点：一条记录存不下跨天的时间，交给用户手动改
      return '已经过了零点，这条记不下跨天的时间，请手动填下班时间'
    }

    state.records = upsertRecord(state.records, { ...exist, endTime }, nowMs)
    return null
  },

  /**
   * 直接写某天某时段的一对时间：没有记录就补一条（手动补录），有记录就改。
   * 下班时间可以传 null，表示「还没下班」。
   * @returns 错误文案，成功返回 null
   */
  setTimes(date, period, { startTime, endTime }) {
    const exist = findRecord(state.records, date, period)
    const candidate = {
      ...(exist ?? { recordDate: date, period }),
      startTime,
      endTime: endTime ?? null,
    }

    const error = validateRecord(state.records, candidate)
    if (error) return error

    state.records = upsertRecord(state.records, candidate)
    return null
  },

  deleteRecord(id) {
    state.records = removeRecord(state.records, id)
  },

  dayStats: (date) => dayStats(state.records, date),
  monthStats: (month) => monthStats(state.records, month),
  globalStats: () => globalStats(state.records),
}

/** 仅供离线测试用：把状态清回初始值 */
export function resetStoreForTest() {
  state.records = []
  state.selectedDate = todayStr()
}
