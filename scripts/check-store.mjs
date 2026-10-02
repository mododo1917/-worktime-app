// 打卡动作（state 层）：三时段的上下班打卡、补录、改时间、删，以及旧数据导进来
// 假 localStorage 必须在 import store 之前装好 —— store 在模块加载时就会 hydrate
const legacy = {
  records: [
    // 两时段时代的记录：带 period，直接保留成上午 / 下午两条
    { id: 'old-am', recordDate: '2026-09-23', period: 'morning', startTime: '08:57', endTime: '12:00', normalDuration: 999, overtimeDuration: 999, totalDuration: 999, createAt: 1, updateAt: 1 },
    { id: 'old-pm', recordDate: '2026-09-23', period: 'afternoon', startTime: '13:30', endTime: '18:00', normalDuration: 999, overtimeDuration: 999, totalDuration: 999, createAt: 2, updateAt: 2 },
    // 一天一条那一版：没有 period，按上班时间猜时段
    { id: 'old-one-am', recordDate: '2026-09-24', period: undefined, startTime: '09:00', endTime: '12:30', createAt: 3, updateAt: 3 },
    { id: 'old-one-pm', recordDate: '2026-09-24', period: undefined, startTime: '13:30', endTime: '18:00', createAt: 4, updateAt: 4 },
    { id: 'old-one-night', recordDate: '2026-09-24', period: undefined, startTime: '19:00', endTime: '22:00', createAt: 5, updateAt: 5 },
    // 时段名不认识：也按时间猜，不丢记录
    { id: 'old-bogus', recordDate: '2026-09-25', period: 'noon', startTime: '14:00', endTime: '17:00', createAt: 6, updateAt: 6 },
    // 周末那条
    { id: 'old-sat', recordDate: '2026-09-26', period: 'morning', startTime: '10:00', endTime: '15:00', createAt: 7, updateAt: 7 },
    // 重复的同一时段：只留第一条
    { id: 'old-dup', recordDate: '2026-09-26', period: 'morning', startTime: '11:00', endTime: '12:00', createAt: 8, updateAt: 8 },
  ],
  marks: { '2026-09-23': 'overtime' },
  running: null,
  selectedDate: '2026-09-23',
}

globalThis.localStorage = {
  data: { 'worktime-app.v1': JSON.stringify(legacy) },
  getItem(key) {
    return this.data[key] ?? null
  },
  setItem(key, value) {
    this.data[key] = value
  },
}

const { store, resetStoreForTest } = await import('../src/state/store.js')
const { splitParts, formatHM } = await import('../src/state/duration.js')
const { splitOf } = await import('../src/state/records.js')

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

/** 本地时区的某一刻，用来假装「现在」 */
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi).getTime()

const WED = '2026-09-23' // 周三
const THU = '2026-09-24' // 周四
const FRI = '2026-09-25' // 周五
const SAT = '2026-09-26' // 周六

const periods = (date) => store.sortedRecords().filter((r) => r.recordDate === date).map((r) => r.period)

console.log('\n--- 旧数据导入 ---')
check('两时段时代的上午 / 下午各留一条', periods(WED), ['morning', 'afternoon'])
const am = store.recordOn(WED, 'morning')
check('旧的缓存值被丢掉、按新规则重算', [am.normalDuration, am.overtimeDuration, am.totalDuration], [183, 0, 183])
check('下午那条也算过了', [store.recordOn(WED, 'afternoon').normalDuration, store.recordOn(WED, 'afternoon').overtimeDuration], [245, 25])
check('没有 period 的按上班时间猜时段', periods(THU), ['morning', 'afternoon', 'evening'])
check('晚上那条猜对了', [store.recordOn(THU, 'evening').startTime, store.recordOn(THU, 'evening').overtimeDuration], ['19:00', 180])
check('不认识的时段名也按时间兜底', store.recordOn(FRI, 'afternoon')?.startTime, '14:00')
check('同一时段重复的只留第一条', store.recordOn(SAT, 'morning').startTime, '10:00')
check('周末那天重算成周末加班', store.dayStats(SAT).weekendOvertime, 300)
check('旧版的 marks 不再留在状态里', 'marks' in store.state, false)

console.log('\n--- 一天三个时段各打各的卡 ---')
resetStoreForTest()
check('上午还没打卡', store.recordOn(FRI, 'morning'), null)
check('上班打卡成功', store.clockIn(FRI, 'morning', at(2026, 9, 25, 8, 57)), null)
check('记下的是按下去的那一刻', store.recordOn(FRI, 'morning').startTime, '08:57')
check('还没下班，endTime 是 null', store.recordOn(FRI, 'morning').endTime, null)
check('还没下班就没有时长', store.dayStats(FRI).total, 0)
check('同一时段不能打两次上班卡', store.clockIn(FRI, 'morning', at(2026, 9, 25, 9, 30)), `${FRI} 的上午已经打过上班卡了（08:57）`)
check('别的时段照样能打', store.clockIn(FRI, 'afternoon', at(2026, 9, 25, 13, 30)), null)
check('同一天已经有两条了', periods(FRI), ['morning', 'afternoon'])
check('半条记录能被列出来', store.openRecords().map((r) => `${r.recordDate} ${r.period}`), [`${FRI} morning`, `${FRI} afternoon`])

console.log('\n--- 下班打卡 ---')
check('上午下班打卡', store.clockOut(FRI, 'morning', at(2026, 9, 25, 12, 0)), null)
check('上午时长', [store.recordOn(FRI, 'morning').normalDuration, store.recordOn(FRI, 'morning').totalDuration], [183, 183])
check('下午下班打卡到 20:30', store.clockOut(FRI, 'afternoon', at(2026, 9, 25, 20, 30)), null)
const pm = store.recordOn(FRI, 'afternoon')
check('下午按 17:35 劈开', [pm.normalDuration, pm.overtimeDuration, pm.totalDuration], [245, 175, 420])
check('落到三档的句子里', splitParts(splitOf(pm)), ['正常 4:05', '加班 2:55'])
check('打过下班卡就不算了', store.clockOut(FRI, 'afternoon', at(2026, 9, 25, 21, 0)), `${FRI} 的下午已经打过下班卡了（20:30）`)
check('没上班卡就打下班卡会被拦', store.clockOut(FRI, 'evening', at(2026, 9, 25, 22, 0)), `${FRI} 的晚上还没有上班打卡`)
check('一天四段的合计', [store.dayStats(FRI).normal, store.dayStats(FRI).overtime, store.dayStats(FRI).total], [428, 175, 603])

console.log('\n--- 跨过零点：记不下就明确报错，别存错数据 ---')
check('晚上先打上班卡', store.clockIn(FRI, 'evening', at(2026, 9, 25, 19, 0)), null)
check('过了零点打下班卡会被拦', store.clockOut(FRI, 'evening', at(2026, 9, 26, 0, 20)), '已经过了零点，这条记不下跨天的时间，请手动填下班时间')
check('拦下之后记录没被改坏（还是半条）', store.recordOn(FRI, 'evening').endTime, null)

console.log('\n--- 手动补录：直接给某天某时段填时间 ---')
resetStoreForTest()
check('这天什么都没记', store.sortedRecords().length, 0)
check('补录上午', store.setTimes(THU, 'morning', { startTime: '09:00', endTime: '12:00' }), null)
check('补出来的就是一条完整记录', [store.recordOn(THU, 'morning').startTime, store.recordOn(THU, 'morning').totalDuration], ['09:00', 180])
check('补录晚上的加班', store.setTimes(THU, 'evening', { startTime: '18:30', endTime: '22:00' }), null)
check('晚上那段全是加班', store.recordOn(THU, 'evening').overtimeDuration, 210)
check('补录不填上班时间会被拦', store.setTimes(THU, 'afternoon', { startTime: '', endTime: '18:00' }), '请填写上班时间')
check('拦下之后没建出半条垃圾记录', store.recordOn(THU, 'afternoon'), null)
check('下班早于上班会被拦', store.setTimes(THU, 'afternoon', { startTime: '18:00', endTime: '13:30' }), '下班时间需要晚于上班时间')
check('补录只填上班时间也行（先记上，下班再说）', store.setTimes(THU, 'afternoon', { startTime: '13:30', endTime: null }), null)
check('这条就是「还没下班」', store.recordOn(THU, 'afternoon').endTime, null)
check('改成完整的一对时间', store.setTimes(THU, 'afternoon', { startTime: '13:30', endTime: '18:00' }), null)
check('改完时长对', store.recordOn(THU, 'afternoon').totalDuration, 270)
check('一天补齐三条', periods(THU), ['morning', 'afternoon', 'evening'])

console.log('\n--- 周末补录 ---')
check('补周末那条', store.setTimes(SAT, 'evening', { startTime: '19:00', endTime: '23:00' }), null)
const sat = store.recordOn(SAT, 'evening')
check('周末整天算周末加班', [sat.normalDuration, sat.overtimeDuration, sat.weekendOvertimeDuration, sat.totalDuration], [0, 0, 240, 240])

console.log('\n--- 删除 ---')
store.deleteRecord(store.recordOn(THU, 'afternoon').id)
check('删掉下午那条', store.recordOn(THU, 'afternoon'), null)
check('别的时段还在', periods(THU), ['morning', 'evening'])

console.log('\n--- 落盘 ---')
await new Promise((resolve) => setTimeout(resolve, 50))
const saved = JSON.parse(localStorage.data['worktime-app.v1'])
check('改动写回了 localStorage', saved.records.length, 3)
check('落盘的记录带时段', saved.records.map((r) => r.period).sort(), ['evening', 'evening', 'morning'])
check('不再有旧字段', !('marks' in saved), true)

console.log('\n--- 统计口径串起来 ---')
resetStoreForTest()
// 周三：上午 08:57–12:00，下午 13:30–18:00，晚上 18:30–22:00
store.setTimes(WED, 'morning', { startTime: '08:57', endTime: '12:00' })
store.setTimes(WED, 'afternoon', { startTime: '13:30', endTime: '18:00' })
store.setTimes(WED, 'evening', { startTime: '18:30', endTime: '22:00' })
// 周六：一整段
store.setTimes(SAT, 'morning', { startTime: '09:00', endTime: '18:00' })
const day = store.dayStats(WED)
check('周三三段的正常 / 加班 / 合计', [day.normal, day.overtime, day.total, day.count], [428, 235, 663, 3])
const global = store.globalStats()
check('全局：正常 / 加班 / 周末加班 / 总计', [global.normal, global.overtime, global.weekendOvertime, global.total], [428, 235, 540, 1203])
check('三档相加等于总计', global.normal + global.overtime + global.weekendOvertime, global.total)
check('月度只算当月', formatHM(store.monthStats('2026-09').total), formatHM(1203))
check('别的月份是 0', store.monthStats('2026-08').total, 0)
check('日历上每天一个合计', store.dayTotals.value, { '2026-09-23': 663, '2026-09-26': 540 })

console.log(`\n通过 ${pass} 项，失败 ${fail} 项\n`)
process.exit(fail === 0 ? 0 : 1)
