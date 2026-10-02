<script setup>
/**
 * 记录页：日历上看哪天记了多少，点某天看那天三个时段的打卡。
 * 那天的三个时段都在，没打卡的时段直接填时间就补上了（手动补录）。
 */
import { computed } from 'vue'
import { PERIOD_ORDER, formatHM } from '../state/duration.js'
import { store } from '../state/store.js'
import { formatDateCN, isWeekend, parseDateStr, toDateStr } from '../utils/date.js'
import DayTypeBadge from '../components/DayTypeBadge.vue'
import PeriodRow from '../components/PeriodRow.vue'

const dayTotals = store.dayTotals

const selectedDate = computed({
  get: () => store.state.selectedDate,
  set: (value) => {
    store.state.selectedDate = value
  },
})

/** el-calendar 用 Date 对象，store 里存 YYYY-MM-DD 字符串，这里做一次互转 */
const calendarDate = computed({
  get: () => parseDateStr(selectedDate.value),
  set: (date) => {
    store.state.selectedDate = toDateStr(date)
  },
})

const dayStats = computed(() => store.dayStats(selectedDate.value))
</script>

<template>
  <h1 class="wt-page-title">记录</h1>
  <p class="wt-page-sub">点日历上的日期，看那天的打卡</p>

  <section class="wt-card calendar-card">
    <el-calendar v-model="calendarDate">
      <template #date-cell="{ data }">
        <div class="day-cell">
          <span class="day-num" :class="{ 'is-weekend': isWeekend(data.day) }">
            {{ Number(data.day.split('-')[2]) }}
          </span>
          <span v-if="dayTotals[data.day]" class="day-total duration">
            {{ formatHM(dayTotals[data.day]) }}
          </span>
        </div>
      </template>
    </el-calendar>
  </section>

  <section class="wt-card">
    <div class="wt-card-title">
      <span>{{ formatDateCN(selectedDate) }}</span>
    </div>

    <DayTypeBadge :date="selectedDate" />

    <div class="rows">
      <PeriodRow
        v-for="period in PERIOD_ORDER"
        :key="period"
        :date="selectedDate"
        :period="period"
      />
    </div>

    <div class="totals">
      <span>合计 <b class="duration">{{ formatHM(dayStats.total) }}</b></span>
      <span>正常 <b class="duration">{{ formatHM(dayStats.normal) }}</b></span>
      <span>加班 <b class="duration duration-overtime">{{ formatHM(dayStats.overtime) }}</b></span>
      <span>
        周末加班
        <b class="duration duration-overtime">{{ formatHM(dayStats.weekendOvertime) }}</b>
      </span>
    </div>
  </section>
</template>

<style scoped>
.calendar-card {
  padding: 8px;
}

.calendar-card :deep(.el-calendar__header) {
  padding: 8px 8px 4px;
}

.calendar-card :deep(.el-calendar__body) {
  padding: 0 0 8px;
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  height: 100%;
  line-height: 1.2;
}

.day-num {
  font-size: 14px;
}

/* 周末的日期数字换个颜色，一眼能看出这天为什么算周末加班 */
.day-num.is-weekend {
  color: var(--wt-overtime);
}

.day-total {
  font-size: 10px;
  color: var(--wt-primary);
  font-weight: 600;
}

.rows {
  margin-top: 12px;
}

.totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 14px;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: var(--wt-primary-soft);
  border-radius: 10px;
}

.totals b {
  font-weight: 600;
}
</style>
