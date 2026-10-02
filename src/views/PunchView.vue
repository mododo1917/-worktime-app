<script setup>
/**
 * 打卡页：只管今天，上午 / 下午 / 晚上各一行。
 *
 * 指纹打卡完打开 App，在对应那一行按一下「上班打卡」或「下班打卡」就行。
 * 按下的时间跟指纹对不上、或者当时没打开 App，直接在那行的两个时间框里填 —— 这就是手动补录。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PERIODS, PERIOD_ORDER, SPLIT_MINUTES, dayTypeOf, periodOfTime, toMinutes } from '../state/duration.js'
import { store } from '../state/store.js'
import { useClock } from '../composables/useClock.js'
import { formatDateCN, formatDateShort, hhmmssOf, toDateStr } from '../utils/date.js'
import DayTypeBadge from '../components/DayTypeBadge.vue'
import PeriodRow from '../components/PeriodRow.vue'
import StatCard from '../components/StatCard.vue'

const router = useRouter()
const now = useClock()
// 跟着时钟走而不是取一次：页面开着一整夜也不会停在昨天
const today = computed(() => toDateStr(new Date(now.value)))

const nowHHmm = computed(() => hhmmssOf(now.value).slice(0, 5))
const currentPeriod = computed(() => periodOfTime(nowHHmm.value))
const isWeekendDay = computed(() => dayTypeOf(today.value) === 'weekend')

/** 工作日过了 17:35：此刻按下去算正常加班 */
const inOvertimeWindow = computed(
  () => !isWeekendDay.value && toMinutes(nowHHmm.value) >= SPLIT_MINUTES,
)

const dayStats = computed(() => store.dayStats(today.value))

/** 以前某天打了上班卡、没打下班卡：不指出来那条就一直是半条记录 */
const unfinished = computed(() => store.openRecords().filter((r) => r.recordDate < today.value))

function goFix(date) {
  store.state.selectedDate = date
  router.push('/records')
}
</script>

<template>
  <h1 class="wt-page-title">打卡</h1>
  <p class="wt-page-sub">{{ formatDateCN(today) }} · 现在 {{ hhmmssOf(now) }}</p>

  <section v-for="item in unfinished" :key="item.id" class="wt-card notice">
    <span>
      {{ formatDateShort(item.recordDate) }} {{ PERIODS[item.period] }} 的上班打卡（{{
        item.startTime
      }}）没有下班时间
    </span>
    <el-button type="primary" size="small" plain @click="goFix(item.recordDate)">去补上</el-button>
  </section>

  <section class="wt-card">
    <DayTypeBadge :date="today" />

    <div class="rows">
      <PeriodRow
        v-for="period in PERIOD_ORDER"
        :key="period"
        :date="today"
        :period="period"
        live
        :current="period === currentPeriod"
      />
    </div>

    <p class="tip" :class="{ 'is-overtime': isWeekendDay || inOvertimeWindow }">
      <template v-if="isWeekendDay">今天周末：打卡的每一段都算周末加班</template>
      <template v-else-if="inOvertimeWindow">已过 17:35：现在这段算正常加班</template>
      <template v-else>工作日 17:35 之前算正常工时，之后算正常加班</template>
    </p>
  </section>

  <StatCard title="当日合计" :stats="dayStats" show-count />
</template>

<style scoped>
.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--wt-danger);
}

.rows {
  margin-top: 12px;
}

.tip {
  margin: 14px 0 0;
  font-size: 12px;
  text-align: center;
  color: var(--wt-text-dim);
}

.tip.is-overtime {
  color: var(--wt-overtime);
  font-weight: 600;
}
</style>
