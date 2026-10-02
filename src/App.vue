<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { name: 'punch', to: '/punch', label: '打卡', icon: '⏱' },
  { name: 'records', to: '/records', label: '记录', icon: '📋' },
  { name: 'stats', to: '/stats', label: '统计', icon: '📊' },
]
</script>

<template>
  <div class="app">
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <nav class="tabbar">
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ active: route.name === tab.name }"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </router-link>
    </nav>
  </div>
</template>
