<script setup>
import { computed, ref } from 'vue'
import { DAY_TYPES, dayTypeOf } from '../state/duration.js'
import { store } from '../state/store.js'
import { formatDateCN, thisMonth } from '../utils/date.js'
import StatCard from '../components/StatCard.vue'

// 和「记录」页共用同一个选中日期，切页不用重新选
const dayDate = computed({
  get: () => store.state.selectedDate,
  set: (value) => {
    store.state.selectedDate = value
  },
})

const month = ref(thisMonth())

const dayStats = computed(() => store.dayStats(dayDate.value))
const monthStat = computed(() => store.monthStats(month.value))
const globalStat = computed(() => store.globalStats())
</script>

<template>
  <h1 class="wt-page-title">统计</h1>
  <p class="wt-page-sub">单日 / 月度 / 全部历史</p>

  <StatCard title="单日" :stats="dayStats" show-count>
    <template #extra>
      <el-date-picker
        v-model="dayDate"
        type="date"
        value-format="YYYY-MM-DD"
        size="small"
        :clearable="false"
        style="width: 132px"
      />
    </template>
  </StatCard>
  <p class="note">{{ formatDateCN(dayDate) }} · {{ DAY_TYPES[dayTypeOf(dayDate)] }}</p>

  <StatCard title="月度" :stats="monthStat" show-count>
    <template #extra>
      <el-date-picker
        v-model="month"
        type="month"
        value-format="YYYY-MM"
        size="small"
        :clearable="false"
        style="width: 112px"
      />
    </template>
  </StatCard>

  <StatCard title="全部历史" :stats="globalStat" show-count />

  <p class="note">
    口径：只看日期是周几。周一至周五以 17:35 分界，之前算正常工时、之后算正常加班；周六周日整天都算周末加班。
  </p>
</template>

<style scoped>
.note {
  margin: 8px 2px 16px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--wt-text-dim);
}
</style>
