import { createRouter, createWebHashHistory } from 'vue-router'
import PunchView from './views/PunchView.vue'
import RecordsView from './views/RecordsView.vue'
import StatsView from './views/StatsView.vue'

/**
 * hash 路由：托管到任意静态目录都不会 404，不用配服务端 rewrite。
 * 全部用静态 import —— 不搞懒加载分包，老手机 WebView 加载本地页面少一个失败点。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/punch' },
    { path: '/punch', name: 'punch', component: PunchView },
    { path: '/records', name: 'records', component: RecordsView },
    { path: '/stats', name: 'stats', component: StatsView },
  ],
})