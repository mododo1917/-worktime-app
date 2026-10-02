<script setup>
/**
 * 某天某个时段的一行：上班 ~ 下班两个时间点 + 这行的时长。
 *
 * 两个时间框一直可编辑，点开就是时间选择器 —— 手动补录和「改错了的时间」都走这里，
 * 没记录也能直接填，填完这行就建出来了。校验不过弹提示，输入框自动退回存储里的值。
 * live = true（打卡页）时多两个按钮：上班打卡 / 下班打卡，按一下就把「现在」填进去。
 */
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PERIODS, splitParts } from '../state/duration.js'
import { splitOf } from '../state/records.js'
import { store } from '../state/store.js'
import { formatDateCN } from '../utils/date.js'

const props = defineProps({
  date: { type: String, required: true },
  period: { type: String, required: true },
  /** 打卡页传 true：多出上班打卡 / 下班打卡按钮 */
  live: { type: Boolean, default: false },
  /** 当前时间落在的时段，打卡页标出来 */
  current: { type: Boolean, default: false },
})

const record = computed(() => store.recordOn(props.date, props.period))
const parts = computed(() => (record.value?.endTime ? splitParts(splitOf(record.value)) : []))

function save(times) {
  const error = store.setTimes(props.date, props.period, times)
  if (error) ElMessage.warning(error)
}

const startModel = computed({
  get: () => record.value?.startTime ?? '',
  set: (value) => save({ startTime: value, endTime: record.value?.endTime ?? null }),
})

const endModel = computed({
  get: () => record.value?.endTime ?? '',
  set: (value) => save({ startTime: record.value?.startTime ?? '', endTime: value || null }),
})

function punchIn() {
  const error = store.clockIn(props.date, props.period)
  if (error) ElMessage.warning(error)
}

function punchOut() {
  const error = store.clockOut(props.date, props.period)
  if (error) ElMessage.warning(error)
}

async function remove() {
  try {
    await ElMessageBox.confirm(
      `删除 ${formatDateCN(props.date)} ${PERIODS[props.period]} 的打卡？`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '再想想', type: 'warning' },
    )
    store.deleteRecord(record.value.id)
    ElMessage.success('已删除')
  } catch {
    // 取消删除
  }
}
</script>

<template>
  <div class="period-row" :class="{ 'is-current': current }">
    <div class="row-head">
      <span class="period-name">{{ PERIODS[period] }}</span>
      <span v-if="parts.length" class="parts duration">
        <span
          v-for="part in parts"
          :key="part"
          :class="{ 'is-overtime': !part.startsWith('正常') }"
          >{{ part }}</span
        >
      </span>
      <span v-else-if="record" class="state">还没下班</span>
      <span v-else class="state">未打卡 · 直接填时间就能补录</span>
      <el-button v-if="record" text size="small" type="danger" @click="remove">删除</el-button>
    </div>

    <div class="row-times">
      <el-time-picker
        v-model="startModel"
        format="HH:mm"
        value-format="HH:mm"
        :clearable="false"
        placeholder="上班"
        style="width: 100%"
      />
      <span class="dash">–</span>
      <el-time-picker
        v-model="endModel"
        format="HH:mm"
        value-format="HH:mm"
        placeholder="下班"
        style="width: 100%"
      />
    </div>

    <template v-if="live">
      <el-button v-if="!record" type="primary" class="block" @click="punchIn">上班打卡</el-button>
      <el-button v-else-if="!record.endTime" type="primary" class="block" @click="punchOut">
        下班打卡
      </el-button>
    </template>
  </div>
</template>

<style scoped>
.period-row {
  padding: 12px 0;
  border-top: 1px solid var(--wt-border);
}

.period-row:first-child {
  padding-top: 0;
  border-top: none;
}

/* 当前时间落在的时段，底色标出来，打卡页一眼找到该按哪一行 */
.period-row.is-current {
  padding: 12px;
  border-top-color: transparent;
  border-radius: 10px;
  background: var(--wt-primary-soft);
}

.row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--wt-text-dim);
}

.period-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--wt-text);
}

.period-row.is-current .period-name {
  color: var(--wt-primary);
}

.parts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.parts .is-overtime {
  color: var(--wt-overtime);
  font-weight: 600;
}

.state {
  flex: 1;
  font-size: 12px;
}

.row-head :deep(.el-button) {
  flex: none;
}

.row-times {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.dash {
  flex: none;
  color: var(--wt-text-dim);
}

.block {
  width: 100%;
}
</style>
