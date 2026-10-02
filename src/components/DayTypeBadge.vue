<script setup>
/**
 * 只读的「这天按哪套规则算」提示条，替代原来的日期标记选择器：
 * 现在日期本身就决定了规则，没什么可选的，但规则得让人看得见。
 */
import { computed } from 'vue'
import { DAY_TYPES, dayTypeOf } from '../state/duration.js'
import { weekdayCN } from '../utils/date.js'

const props = defineProps({
  date: { type: String, required: true },
})

const dayType = computed(() => dayTypeOf(props.date))
const isWeekendDay = computed(() => dayType.value === 'weekend')
</script>

<template>
  <div class="day-type" :class="{ 'is-weekend': isWeekendDay }">
    <span class="badge">{{ weekdayCN(date) }} · {{ DAY_TYPES[dayType] }}</span>
    <span class="hint">
      {{ isWeekendDay ? '周六周日：整天都算周末加班' : '周一至周五：17:35 之后算正常加班' }}
    </span>
  </div>
</template>

<style scoped>
.day-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--wt-text-dim);
}

.badge {
  flex: none;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wt-primary);
  background: var(--wt-primary-soft);
  border-radius: 6px;
}

.day-type.is-weekend .badge {
  color: var(--wt-overtime);
  background: var(--wt-overtime-soft);
}
</style>
