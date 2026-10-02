/** 日期工具。全部按本地时区算，不走 toISOString（那个是 UTC，晚上会串日期） */

const pad = (n) => String(n).padStart(2, '0')
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function toDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayStr() {
  return toDateStr(new Date())
}

/** 时间戳 → 当天的 HH:mm */
export function hhmmOf(ms) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 时间戳 → HH:mm:ss，计时面板顶上的「当前时间」 */
export function hhmmssOf(ms) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function isDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthOf(dateStr) {
  return dateStr.slice(0, 7)
}

export function thisMonth() {
  return monthOf(todayStr())
}

/** 避免 new Date('2026-09-27') 被当成 UTC 解析 */
export function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dateStrOf(date) {
  return toDateStr(date)
}

/** 周六 / 周日。工时规则按这个把一天分成「工作日」和「周末」 */
export function isWeekend(dateStr) {
  const day = parseDateStr(dateStr).getDay()
  return day === 0 || day === 6
}

/** 周三 */
export function weekdayCN(dateStr) {
  return `周${WEEK[parseDateStr(dateStr).getDay()]}`
}

/** 9 月 27 日 */
export function formatDateShort(dateStr) {
  const d = parseDateStr(dateStr)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

/** 9 月 27 日 周日 */
export function formatDateCN(dateStr) {
  return `${formatDateShort(dateStr)} ${weekdayCN(dateStr)}`
}

/** YYYY-MM-DD 字符串可以直接比大小 */
export function isFutureDate(dateStr) {
  return dateStr > todayStr()
}

export function isToday(dateStr) {
  return dateStr === todayStr()
}
