import { onUnmounted, ref } from 'vue'

/**
 * 每秒走一次的时钟，只给「现在几点」用。
 *
 * 时间只存在这个 ref 里，不写进 store —— 否则 localStorage 会被每秒写一次。
 */
export function useClock() {
  const now = ref(Date.now())
  const handle = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  onUnmounted(() => clearInterval(handle))

  return now
}
