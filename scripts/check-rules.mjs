// 离线跑一遍加班规则、校验和统计的边界用例，不依赖浏览器和 Vue
import {
  PERIODS,
  PERIOD_ORDER,
  SPLIT_MINUTES,
  dayTypeOf,
  periodOfTime,
  toMinutes,
  toHHmm,
  splitDuration,
  splitParts,
  formatHM,
  formatHMLabel,
} from '../src/state/duration.js'
import {
  validateRecord,
  buildRecord,
  upsertRecord,
  removeRecord,
  recompute,
  recomputeAll,
  sortRecords,
  splitOf,
  findRecord,
  recordsOn,
  openRecords,
  durationsOf,
} from '../src/state/records.js'
import { dayStats, monthStats, globalStats, dailyTotals } from '../src/state/stats.js'
import { isWeekend, weekdayCN } from '../src/utils/date.js'

let pass = 0
let fail = 0

function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
    console.log(`  ok   ${name}`)
  } else {
    fail++
    console.log(`  FAIL ${name}\n       期望 ${e}\n       实际 ${a}`)
  }
}

/** 只取关心的四个字段，断言写起来短一点 */
const brief = ({ normal, overtime, weekendOvertime, total }) => ({ normal, overtime, weekendOvertime, total })

/** 造一条打卡记录：某天某时段的一对时间，endTime 传 null 表示还没下班 */
const punch = (recordDate, period, startTime, endTime, now) =>
  buildRecord({ recordDate, period, startTime, endTime }, now)

// 测试用的固定日期：规则只看周几，所以日期必须挑准
const WED = '2026-09-23' // 周三
const THU = '2026-10-08' // 周四
const FRI = '2026-09-25' // 周五
const SAT = '2026-09-26' // 周六
const SUN = '2026-09-27' // 周日

console.log('\n--- 时段 ---')
check('一天三个时段，顺序固定', PERIOD_ORDER.map((p) => PERIODS[p]), ['上午', '下午', '晚上'])
check(
  '时间点落在哪个时段',
  ['08:57', '11:59', '12:00', '17:59', '18:00', '22:30'].map(periodOfTime),
  ['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening'],
)

console.log('\n--- 日期先分成工作日 / 周末 ---')
check('周日和周一都不会认错', weekdayCN(SUN), '周日')
check('周三', weekdayCN(WED), '周三')
check('周六', weekdayCN(SAT), '周六')
check(
  '周五 → 工作日，周六周日 → 周末，周一 → 工作日',
  [FRI, SAT, SUN, '2026-09-28'].map(dayTypeOf),
  ['workday', 'weekend', 'weekend', 'workday'],
)
check('isWeekend 与 dayTypeOf 一致', [isWeekend(SAT), isWeekend(SUN), isWeekend(WED)], [true, true, false])

console.log('\n--- 17:35 分界点 ---')
check('17:35 就是第 1055 分钟', SPLIT_MINUTES, 1055)
check('起止时间换算', [toMinutes('00:00'), toMinutes('17:35'), toMinutes('23:59')], [0, 1055, 1439])
check('分钟数回写成 HH:mm', [toHHmm(0), toHHmm(1055), toHHmm(1439)], ['00:00', '17:35', '23:59'])

console.log('\n--- 工作日（周三）：17:35 之前全是正常工时 ---')
check('09:00–12:00 上午', brief(splitDuration('09:00', '12:00', WED)), { normal: 180, overtime: 0, weekendOvertime: 0, total: 180 })
check('08:00–17:00 不沾加班', brief(splitDuration('08:00', '17:00', WED)), { normal: 540, overtime: 0, weekendOvertime: 0, total: 540 })
check('结束时间正好 17:35，加班为 0', brief(splitDuration('09:00', '17:35', WED)), { normal: 515, overtime: 0, weekendOvertime: 0, total: 515 })
check('17:34–17:36 跨分界点，1 分钟加班', brief(splitDuration('17:34', '17:36', WED)), { normal: 1, overtime: 1, weekendOvertime: 0, total: 2 })

console.log('\n--- 工作日（周三）：跨过 17:35 的部分算正常加班 ---')
check('下午 13:30–18:00 劈出 25 分钟加班', brief(splitDuration('13:30', '18:00', WED)), { normal: 245, overtime: 25, weekendOvertime: 0, total: 270 })
check('晚上 18:00–22:00 全是加班', brief(splitDuration('18:00', '22:00', WED)), { normal: 0, overtime: 240, weekendOvertime: 0, total: 240 })
check('17:35–20:00 整段都在分界点后', brief(splitDuration('17:35', '20:00', WED)), { normal: 0, overtime: 145, weekendOvertime: 0, total: 145 })

console.log('\n--- 周末（周六 / 周日）：整天算周末加班，不看 17:35 ---')
check('周六 09:00–12:00', brief(splitDuration('09:00', '12:00', SAT)), { normal: 0, overtime: 0, weekendOvertime: 180, total: 180 })
check('周六 09:00–18:00 全是周末加班', brief(splitDuration('09:00', '18:00', SAT)), { normal: 0, overtime: 0, weekendOvertime: 540, total: 540 })
check('周日 13:30–18:00', brief(splitDuration('13:30', '18:00', SUN)), { normal: 0, overtime: 0, weekendOvertime: 270, total: 270 })
check(
  '同样一段工时，周五和周六算进不同档',
  [brief(splitDuration('09:00', '18:00', FRI)), brief(splitDuration('09:00', '18:00', SAT))],
  [
    { normal: 515, overtime: 25, weekendOvertime: 0, total: 540 },
    { normal: 0, overtime: 0, weekendOvertime: 540, total: 540 },
  ],
)

console.log('\n--- 零长度与格式化 ---')
check('起止相同 → 0', brief(splitDuration('09:00', '09:00', WED)), { normal: 0, overtime: 0, weekendOvertime: 0, total: 0 })
check('时:分 格式', [formatHM(0), formatHM(5), formatHM(65), formatHM(510), formatHM(1439)], ['0:00', '0:05', '1:05', '8:30', '23:59'])
check('口语化时长', [formatHMLabel(45), formatHMLabel(480), formatHMLabel(510)], ['45 分', '8 小时', '8 小时 30 分'])

console.log('\n--- 拆分数写成一句话（提示和卡片共用） ---')
check('工作日跨 17:35', splitParts(splitDuration('09:00', '18:00', WED)), ['正常 8:35', '加班 0:25'])
check('工作日纯正常', splitParts(splitDuration('09:00', '12:00', WED)), ['正常 3:00'])
check('周末只写周末加班一档', splitParts(splitDuration('09:00', '18:00', SAT)), ['周末加班 9:00'])
check('零长度不会变成空句子', splitParts(splitDuration('09:00', '09:00', WED)), ['0:00'])

console.log('\n--- 只打了上班卡：三档都是 0 ---')
check('durationsOf 缺下班时间', durationsOf('09:00', null, WED), { total: 0, normal: 0, overtime: 0, weekendOvertime: 0 })
check('durationsOf 有下班时间', durationsOf('09:00', '18:00', WED), { total: 540, normal: 515, overtime: 25, weekendOvertime: 0 })

const half = punch(WED, 'morning', '09:00', null, 1000)
check('只打上班卡也能建记录', [half.period, half.startTime, half.endTime], ['morning', '09:00', null])
check('只打上班卡时缓存字段全 0', [half.normalDuration, half.overtimeDuration, half.weekendOvertimeDuration, half.totalDuration], [0, 0, 0, 0])
check('找得到没下班的记录', openRecords([half]).map((r) => `${r.recordDate} ${r.period}`), [`${WED} morning`])

console.log('\n--- 表单校验 ---')
const empty = []
check('缺日期', validateRecord(empty, { recordDate: '', period: 'morning', startTime: '09:00', endTime: '12:00' }), '请选择日期')
check('缺时段', validateRecord(empty, { recordDate: WED, period: 'noon', startTime: '09:00', endTime: '12:00' }), '请选择时段')
check('缺上班时间', validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '', endTime: '12:00' }), '请填写上班时间')
check(
  '上班时间格式不对',
  validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '9:0', endTime: '12:00' }),
  '请填写上班时间',
)
check(
  '下班时间格式不对',
  validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '09:00', endTime: '2:00' }),
  '请填写下班时间',
)
check(
  '下班早于上班',
  validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '12:00', endTime: '09:00' }),
  '下班时间需要晚于上班时间',
)
check(
  '下班等于上班',
  validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '09:00', endTime: '09:00' }),
  '下班时间需要晚于上班时间',
)
check('合法记录（有下班）', validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '09:00', endTime: '12:00' }), null)
check('合法记录（没下班也算合法，只是还没时长）', validateRecord(empty, { recordDate: WED, period: 'morning', startTime: '09:00', endTime: null }), null)

const one = [punch(WED, 'morning', '09:00', '12:00')]
check(
  '同一时段再打卡被拦',
  validateRecord(one, { recordDate: WED, period: 'morning', startTime: '10:00', endTime: '11:00' }),
  `${WED} 的上午已经有一条打卡记录了`,
)
check(
  '改自己那条不算重复',
  validateRecord(one, { id: one[0].id, recordDate: WED, period: 'morning', startTime: '08:57', endTime: '12:00' }),
  null,
)
check('同一天换时段可以打卡', validateRecord(one, { recordDate: WED, period: 'afternoon', startTime: '13:30', endTime: '18:00' }), null)
check('同一天晚上也可以', validateRecord(one, { recordDate: WED, period: 'evening', startTime: '19:00', endTime: '22:00' }), null)
check('换一天同一时段也可以', validateRecord(one, { recordDate: THU, period: 'morning', startTime: '09:00', endTime: '12:00' }), null)

console.log('\n--- 记录的增删改 ---')
const base = [
  punch(WED, 'morning', '08:57', '12:00', 1000),
  punch(WED, 'afternoon', '13:30', '18:00', 2000),
  punch(WED, 'evening', '19:00', '22:00', 2500),
]
check(
  '上午：17:35 之前全是正常',
  [base[0].normalDuration, base[0].overtimeDuration, base[0].weekendOvertimeDuration, base[0].totalDuration],
  [183, 0, 0, 183],
)
check('下午跨 17:35', [base[1].normalDuration, base[1].overtimeDuration, base[1].totalDuration], [245, 25, 270])
check('晚上整段算加班', [base[2].normalDuration, base[2].overtimeDuration, base[2].totalDuration], [0, 180, 180])

// 记录上的 *Duration 字段和 splitDuration 的字段名不一样，取错就会全变 0:00
check('缓存字段取出来能正常拼句子', splitParts(splitOf(base[1])), ['正常 4:05', '加班 0:25'])

const weekendDay = punch(SAT, 'morning', '09:00', '12:00', 2600)
check(
  '周末那条三档没串位',
  [weekendDay.normalDuration, weekendDay.overtimeDuration, weekendDay.weekendOvertimeDuration, weekendDay.totalDuration],
  [0, 0, 180, 180],
)
check('周末记录的缓存字段也能拼', splitParts(splitOf(weekendDay)), ['周末加班 3:00'])

const edited = upsertRecord(base, { ...base[1], endTime: '19:30' }, 3000)
check('改了时间就重算加班', [edited[1].normalDuration, edited[1].overtimeDuration], [245, 115])
check('编辑不改 createAt、只动 updateAt', [edited[1].createAt, edited[1].updateAt], [2000, 3000])
check('编辑不动别的时段', [edited[0], edited[2]], [base[0], base[2]])

const cleared = upsertRecord(base, { ...base[1], endTime: null }, 4000)
check('清掉下班时间后时长归 0', [cleared[1].normalDuration, cleared[1].totalDuration], [0, 0])

const added = upsertRecord(base, { recordDate: THU, period: 'morning', startTime: '09:00', endTime: '12:00' })
check('新增是追加', added.length, 4)
check('删除按 id 生效', removeRecord(added, base[0].id).length, 3)
check('按日期 + 时段找记录', findRecord(added, WED, 'evening')?.startTime, '19:00')
check('时段不对就找不到', findRecord(added, WED, 'night'), null)
check('找出某天的三条', recordsOn(added, WED).length, 3)

console.log('\n--- 改日期 / 规则变了之后重算缓存 ---')
const moved = recompute({ ...base[1], recordDate: SAT })
check(
  '把工作日那条挪到周六，三档重算',
  [moved.normalDuration, moved.overtimeDuration, moved.weekendOvertimeDuration, moved.totalDuration],
  [0, 0, 270, 270],
)
const movedBack = recompute({ ...moved, recordDate: WED })
check('挪回工作日又变回正常 + 加班', [movedBack.normalDuration, movedBack.overtimeDuration, movedBack.weekendOvertimeDuration], [245, 25, 0])
check('重算不动 updateAt', moved.updateAt, base[1].updateAt)

const spreadAll = recomputeAll([...base, half])
check('全量重算不挑记录', [spreadAll[0].weekendOvertimeDuration, spreadAll[3].totalDuration], [0, 0])

console.log('\n--- 统计：单日 ---')
const day = dayStats(base, WED)
check(
  '一天三段加起来',
  [day.normal, day.overtime, day.weekendOvertime, day.total, day.count],
  [428, 205, 0, 633, 3],
)
check('没有记录的日期是 0', dayStats(base, '2026-09-01'), { normal: 0, overtime: 0, weekendOvertime: 0, total: 0, count: 0 })
check('没下班的记录不产生时长', dayStats([half], WED), { normal: 0, overtime: 0, weekendOvertime: 0, total: 0, count: 1 })
check('周末单日全在周末加班一档', dayStats([weekendDay], SAT), { normal: 0, overtime: 0, weekendOvertime: 180, total: 180, count: 1 })

console.log('\n--- 统计：月度 / 全局 ---')
const crossMonth = [...base, punch(THU, 'morning', '09:00', '18:00'), punch(SUN, 'morning', '10:00', '15:00')]
const sep = monthStats(crossMonth, '2026-09')
check('9 月汇总不含 10 月那条', [sep.normal, sep.overtime, sep.weekendOvertime, sep.total, sep.count], [428, 205, 300, 933, 4])
const oct = monthStats(crossMonth, '2026-10')
check('10 月汇总', [oct.normal, oct.overtime, oct.weekendOvertime, oct.total, oct.count], [515, 25, 0, 540, 1])
const all = globalStats(crossMonth)
check('全局汇总 = 两个月相加', [all.normal, all.overtime, all.weekendOvertime, all.total, all.count], [943, 230, 300, 1473, 5])
check('三档相加等于总计', all.normal + all.overtime + all.weekendOvertime, all.total)
check('空数据全局汇总为 0', globalStats([]), { normal: 0, overtime: 0, weekendOvertime: 0, total: 0, count: 0 })

console.log('\n--- 日历用的每日合计 ---')
check('按日期聚合成 map', dailyTotals(crossMonth), { '2026-09-23': 633, '2026-10-08': 540, '2026-09-27': 300 })

console.log('\n--- 列表排序 ---')
const sorted = sortRecords([
  punch(WED, 'evening', '19:00', '22:00'),
  punch(WED, 'morning', '09:00', '12:00'),
  punch(THU, 'morning', '09:00', '12:00'),
  punch(WED, 'afternoon', '13:30', '18:00'),
])
check(
  '日期倒序，同一天上午 → 下午 → 晚上',
  sorted.map((r) => `${r.recordDate} ${r.period}`),
  [`${THU} morning`, `${WED} morning`, `${WED} afternoon`, `${WED} evening`],
)

console.log(`\n通过 ${pass} 项，失败 ${fail} 项\n`)
process.exit(fail === 0 ? 0 : 1)
