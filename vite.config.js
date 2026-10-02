import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 相对路径产物，方便丢到任意子目录下托管
  base: './',
  // 目标压到 2018 年的 Chrome：万一 OPPO A11x 的系统 WebView 版本很老，也不至于白屏
  build: {
    target: 'chrome69',
  },
  server: {
    port: 5174,
    open: true,
  },
})
