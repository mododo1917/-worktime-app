<script setup>
import { formatHM } from '../state/duration.js'

defineProps({
  title: { type: String, required: true },
  /** { normal, overtime, weekendOvertime, total, count }，单位分钟 */
  stats: { type: Object, required: true },
  showCount: { type: Boolean, default: false },
})
</script>

<template>
  <section class="wt-card">
    <div class="wt-card-title">
      <span>{{ title }}</span>
      <slot name="extra" />
    </div>

    <div class="grid">
      <div class="cell">
        <div class="value duration">{{ formatHM(stats.total) }}</div>
        <div class="label">总工时</div>
      </div>
      <div class="cell">
        <div class="value duration">{{ formatHM(stats.normal) }}</div>
        <div class="label">正常</div>
      </div>
      <div class="cell">
        <div class="value duration duration-overtime">{{ formatHM(stats.overtime) }}</div>
        <div class="label">加班</div>
      </div>
      <div class="cell">
        <div class="value duration duration-overtime">{{ formatHM(stats.weekendOvertime) }}</div>
        <div class="label">周末加班</div>
      </div>
    </div>

    <p v-if="showCount" class="count">{{ stats.count }} 条记录</p>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  text-align: center;
}

.value {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--wt-text-dim);
}

.count {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--wt-text-dim);
  text-align: center;
}
</style>
