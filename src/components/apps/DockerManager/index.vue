<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NAlert, NButton, NButtonGroup, NModal, NSpin, useMessage } from 'naive-ui'
import type { DockerContainer, DockerInfo } from '@/api/system/docker'
import { getDockerContainers, getDockerInfo, getDockerLogs, runDockerAction } from '@/api/system/docker'
import { t } from '@/locales'

const message = useMessage()
const loading = ref(false)
const info = ref<DockerInfo>({ available: false })
const containers = ref<DockerContainer[]>([])
const logsVisible = ref(false)
const logsTitle = ref('')
const logsContent = ref('')

async function refresh() {
  loading.value = true
  try {
    const infoResponse = await getDockerInfo()
    if (infoResponse.code !== 0)
      throw new Error(infoResponse.msg)
    info.value = infoResponse.data
    if (!info.value.available) {
      containers.value = []
      return
    }

    const response = await getDockerContainers()
    if (response.code !== 0)
      throw new Error(response.msg)
    containers.value = response.data.list || []
  }
  catch (error) {
    message.error(t('apps.dockerManager.actionFailed', {
      message: error instanceof Error ? error.message : String(error),
    }))
  }
  finally {
    loading.value = false
  }
}

async function runAction(container: DockerContainer, action: 'start' | 'stop' | 'restart') {
  if (action !== 'start' && !window.confirm(`${t(`apps.dockerManager.${action}`)} ${container.name}?`))
    return

  loading.value = true
  try {
    const response = await runDockerAction(container.id || container.name, action)
    if (response.code !== 0)
      throw new Error(response.msg)
    await refresh()
  }
  catch (error) {
    message.error(t('apps.dockerManager.actionFailed', {
      message: error instanceof Error ? error.message : String(error),
    }))
  }
  finally {
    loading.value = false
  }
}

async function showLogs(container: DockerContainer) {
  loading.value = true
  try {
    const response = await getDockerLogs(container.id || container.name)
    if (response.code !== 0)
      throw new Error(response.msg)
    logsTitle.value = `${t('apps.dockerManager.logs')} - ${container.name}`
    logsContent.value = response.data.logs || ''
    logsVisible.value = true
  }
  catch (error) {
    message.error(t('apps.dockerManager.actionFailed', {
      message: error instanceof Error ? error.message : String(error),
    }))
  }
  finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="h-full overflow-auto p-2">
    <div class="flex items-center justify-between mb-3">
      <div class="font-bold text-lg">
        {{ $t('apps.dockerManager.appName') }}
        <span v-if="info.available && info.version" class="text-xs font-normal text-slate-500">v{{ info.version }}</span>
      </div>
      <NButton size="small" :loading="loading" @click="refresh">
        {{ $t('apps.dockerManager.refresh') }}
      </NButton>
    </div>

    <NAlert v-if="!loading && !info.available" type="warning" :bordered="false">
      {{ $t('apps.dockerManager.dockerUnavailable') }}
      <div v-if="info.message" class="text-xs mt-1">
        {{ info.message }}
      </div>
    </NAlert>

    <NSpin :show="loading">
      <div v-if="info.available" class="overflow-x-auto">
        <table class="w-full text-sm docker-table">
          <thead>
            <tr>
              <th>{{ $t('apps.dockerManager.container') }}</th>
              <th>{{ $t('apps.dockerManager.image') }}</th>
              <th>{{ $t('apps.dockerManager.state') }}</th>
              <th>{{ $t('apps.dockerManager.ports') }}</th>
              <th>{{ $t('common.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="container in containers" :key="container.id">
              <td>
                <div class="font-medium">{{ container.name }}</div>
                <div class="text-xs opacity-60">{{ container.id.slice(0, 12) }}</div>
              </td>
              <td class="max-w-[180px] break-all">{{ container.image }}</td>
              <td>
                <div>{{ container.state }}</div>
                <div class="text-xs opacity-60">{{ container.status }}</div>
              </td>
              <td class="max-w-[170px] break-all">{{ container.ports || '-' }}</td>
              <td>
                <NButtonGroup size="tiny">
                  <NButton v-if="container.state !== 'running'" type="success" @click="runAction(container, 'start')">
                    {{ $t('apps.dockerManager.start') }}
                  </NButton>
                  <NButton v-else type="warning" @click="runAction(container, 'stop')">
                    {{ $t('apps.dockerManager.stop') }}
                  </NButton>
                  <NButton @click="runAction(container, 'restart')">
                    {{ $t('apps.dockerManager.restart') }}
                  </NButton>
                  <NButton @click="showLogs(container)">
                    {{ $t('apps.dockerManager.logs') }}
                  </NButton>
                </NButtonGroup>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="containers.length === 0" class="text-center text-slate-500 py-10">
          {{ $t('apps.dockerManager.empty') }}
        </div>
      </div>
    </NSpin>

    <NModal v-model:show="logsVisible" preset="card" :title="logsTitle" style="max-width: 900px;">
      <pre class="docker-logs">{{ logsContent }}</pre>
    </NModal>
  </div>
</template>

<style scoped>
.docker-table {
  border-collapse: collapse;
}
.docker-table th,
.docker-table td {
  padding: 9px;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  vertical-align: middle;
}
.docker-logs {
  max-height: 65vh;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
}
</style>
