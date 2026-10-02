import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
// 主题必须在 Element Plus 样式之后引入，否则覆盖不掉它的主色变量
import './styles/theme.css'

import App from './App.vue'
import { router } from './router.js'

createApp(App).use(router).use(ElementPlus, { locale: zhCn }).mount('#app')
