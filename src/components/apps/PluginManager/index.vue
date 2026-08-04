<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NTag } from 'naive-ui'
import DockerManager from '@/components/apps/DockerManager/index.vue'
import { SvgIcon } from '@/components/common'

const activePlugin = ref('')
</script>

<template>
  <div class="h-full overflow-auto p-3">
    <div v-if="activePlugin === ''">
      <div class="mb-4">
        <div class="text-xl font-bold">
          {{ $t('apps.pluginManager.appName') }}
        </div>
        <div class="text-sm opacity-60 mt-1">
          {{ $t('apps.pluginManager.description') }}
        </div>
      </div>

      <NCard size="small" class="plugin-card">
        <div class="flex items-center gap-3">
          <div class="plugin-icon">
            <SvgIcon icon="mdi:docker" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-base">
              cockpit-docker
            </div>
            <div class="text-xs opacity-60 mt-1">
              Overview · Containers · Images · Volumes · Networks
            </div>
          </div>
          <NTag type="success" size="small">
            {{ $t('apps.pluginManager.installed') }}
          </NTag>
          <NButton type="primary" size="small" @click="activePlugin = 'docker'">
            {{ $t('apps.pluginManager.open') }}
          </NButton>
        </div>
      </NCard>
    </div>

    <div v-else-if="activePlugin === 'docker'" class="h-full">
      <div class="mb-2">
        <NButton size="small" quaternary @click="activePlugin = ''">
          ← {{ $t('apps.pluginManager.back') }}
        </NButton>
      </div>
      <DockerManager />
    </div>
  </div>
</template>

<style scoped>
.plugin-card {
  border-radius: var(--sp-ui-radius, 10px);
}
.plugin-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--sp-ui-radius, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #2496ed;
  background: rgba(36, 150, 237, 0.12);
}
</style>
