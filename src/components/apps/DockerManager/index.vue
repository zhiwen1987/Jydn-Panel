<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NAlert, NButton, NButtonGroup, NCard, NInput, NModal, NSelect, NSpin, NTabPane, NTabs, useDialog, useMessage } from 'naive-ui'
import type { DockerContainer, DockerInfo } from '@/api/system/docker'
import { dockerPost, getDockerContainers, getDockerImages, getDockerInfo, getDockerLogs, getDockerNetworks, getDockerVolumes, runDockerAction } from '@/api/system/docker'

type Row = Record<string, any>
type TabName = 'overview' | 'containers' | 'images' | 'volumes' | 'networks'

const message = useMessage()
const dialog = useDialog()
const activeTab = ref<TabName>('overview')
const loading = ref(false)
const overview = ref<DockerInfo>({ available: false })
const containers = ref<DockerContainer[]>([])
const images = ref<Row[]>([])
const volumes = ref<Row[]>([])
const networks = ref<Row[]>([])
const containerFilter = ref('all')
const search = ref('')
const logsVisible = ref(false)
const logsTitle = ref('')
const logsContent = ref('')
const detailsVisible = ref(false)
const detailsTitle = ref('')
const detailsContent = ref('')
const imageName = ref('')
const volumeName = ref('')
const networkName = ref('')
const networkSubnet = ref('')
const networkGateway = ref('')
const networkContainer = ref('')
const selectedNetwork = ref('')
const renameValue = ref('')
const cpuLimit = ref('')
const memoryLimit = ref('')
const selectedContainer = ref<DockerContainer | null>(null)

const filteredContainers = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return containers.value.filter((item) => {
    if (containerFilter.value === 'running' && item.state !== 'running')
      return false
    if (containerFilter.value === 'stopped' && item.state === 'running')
      return false
    return !keyword || item.name.toLowerCase().includes(keyword) || item.id.toLowerCase().includes(keyword)
  })
})

function value(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '')
      return row[key]
  }
  return '-'
}

async function unwrap<T>(promise: Promise<any>): Promise<T> {
  const response = await promise
  if (response.code !== 0)
    throw new Error(response.msg)
  return response.data as T
}

async function refresh() {
  loading.value = true
  try {
    if (activeTab.value === 'overview')
      overview.value = await unwrap<DockerInfo>(getDockerInfo())
    else if (activeTab.value === 'containers')
      containers.value = (await unwrap<Common.ListResponse<DockerContainer[]>>(getDockerContainers())).list || []
    else if (activeTab.value === 'images')
      images.value = (await unwrap<Common.ListResponse<Row[]>>(getDockerImages())).list || []
    else if (activeTab.value === 'volumes')
      volumes.value = (await unwrap<Common.ListResponse<Row[]>>(getDockerVolumes())).list || []
    else
      networks.value = (await unwrap<Common.ListResponse<Row[]>>(getDockerNetworks())).list || []
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
  finally {
    loading.value = false
  }
}

function confirmAction(title: string, content: string, action: () => Promise<void>) {
  dialog.warning({
    title,
    content,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: action,
  })
}

async function containerAction(container: DockerContainer, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill' | 'remove') {
  await unwrap(runDockerAction(container.id || container.name, action))
  message.success('操作成功')
  await refresh()
}

function runContainerAction(container: DockerContainer, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill' | 'remove') {
  if (['stop', 'kill', 'remove'].includes(action)) {
    confirmAction('确认容器操作', `${action} ${container.name}？`, () => containerAction(container, action))
    return
  }
  containerAction(container, action).catch(error => message.error(String(error)))
}

async function showLogs(container: DockerContainer) {
  try {
    const data = await unwrap<{ logs: string }>(getDockerLogs(container.id || container.name, 500))
    logsTitle.value = `日志 - ${container.name}`
    logsContent.value = data.logs || ''
    logsVisible.value = true
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
}

function downloadLogs() {
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([logsContent.value], { type: 'text/plain;charset=utf-8' }))
  anchor.download = `${logsTitle.value.replace(/\s+/g, '-')}.log`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
}

async function showContainerDetails(container: DockerContainer) {
  loading.value = true
  try {
    const id = container.id || container.name
    const [detail, stats, top] = await Promise.all([
      unwrap<Row>(dockerPost('container/inspect', { id })),
      container.state === 'running' ? unwrap<Row>(dockerPost('container/stats', { id })).catch(() => ({})) : Promise.resolve({}),
      container.state === 'running' ? unwrap<{ processes: string }>(dockerPost('container/top', { id })).catch(() => ({ processes: '' })) : Promise.resolve({ processes: '' }),
    ])
    selectedContainer.value = container
    renameValue.value = container.name
    detailsTitle.value = `容器详情 - ${container.name}`
    detailsContent.value = JSON.stringify({ detail, stats, processes: top.processes }, null, 2)
    detailsVisible.value = true
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
  finally {
    loading.value = false
  }
}

async function renameContainer() {
  if (!selectedContainer.value)
    return
  await unwrap(dockerPost('container/rename', { id: selectedContainer.value.id, name: renameValue.value }))
  message.success('容器已重命名')
  detailsVisible.value = false
  await refresh()
}

async function updateResources() {
  if (!selectedContainer.value)
    return
  await unwrap(dockerPost('container/update', {
    id: selectedContainer.value.id,
    cpus: Number(cpuLimit.value || 0),
    memory: memoryLimit.value,
  }))
  message.success('资源限制已更新')
}

async function imageAction(action: 'pull' | 'remove' | 'prune', image = '') {
  await unwrap(dockerPost('image/action', { action, image }))
  message.success('镜像操作成功')
  imageName.value = ''
  await refresh()
}

async function showImageHistory(image: Row) {
  const target = value(image, 'ID', 'Id')
  const data = await unwrap<Common.ListResponse<Row[]>>(dockerPost('image/history', { image: target }))
  detailsTitle.value = `镜像分层 - ${value(image, 'Repository')}:${value(image, 'Tag')}`
  detailsContent.value = JSON.stringify(data.list || [], null, 2)
  detailsVisible.value = true
}

async function volumeAction(action: 'create' | 'remove', name: string) {
  await unwrap(dockerPost('volume/action', { action, name }))
  volumeName.value = ''
  message.success('数据卷操作成功')
  await refresh()
}

async function networkAction(action: 'create' | 'remove' | 'connect' | 'disconnect', name: string) {
  await unwrap(dockerPost('network/action', {
    action,
    name,
    subnet: networkSubnet.value,
    gateway: networkGateway.value,
    container: networkContainer.value,
  }))
  networkName.value = ''
  message.success('网络操作成功')
  await refresh()
}

async function inspectNetwork(network: Row) {
  const name = value(network, 'Name')
  const data = await unwrap<Row>(dockerPost('network/inspect', { name }))
  selectedNetwork.value = name
  detailsTitle.value = `网络详情 - ${name}`
  detailsContent.value = JSON.stringify(data, null, 2)
  detailsVisible.value = true
}

async function daemonAction(action: 'start' | 'stop' | 'restart') {
  await unwrap(dockerPost('daemon/action', { action }))
  message.success('Docker 守护进程操作已提交')
  await refresh()
}

function formatBytes(value: unknown) {
  const bytes = Number(value || 0)
  if (!bytes)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

onMounted(refresh)
</script>

<template>
  <div class="docker-manager h-full overflow-auto p-2">
    <div class="flex items-center justify-between gap-2 mb-3">
      <div>
        <div class="font-bold text-lg">cockpit-docker</div>
        <div class="text-xs opacity-60">Docker API · /var/run/docker.sock</div>
      </div>
      <NButton size="small" :loading="loading" @click="refresh">刷新</NButton>
    </div>

    <NTabs v-model:value="activeTab" type="segment" animated @update:value="refresh">
      <NTabPane name="overview" tab="全局概览">
        <NAlert v-if="!loading && !overview.available" type="warning" :bordered="false">
          {{ overview.message || 'Docker 不可用或当前进程无权访问 Docker' }}
        </NAlert>
        <div v-else class="space-y-3">
          <div class="docker-stat-grid">
            <NCard size="small"><b>容器</b><div>{{ overview.containers || 0 }} / 运行 {{ overview.containersRunning || 0 }}</div></NCard>
            <NCard size="small"><b>镜像</b><div>{{ overview.images || 0 }}</div></NCard>
            <NCard size="small"><b>数据卷</b><div>{{ overview.volumes || 0 }}</div></NCard>
            <NCard size="small"><b>网络</b><div>{{ overview.networks || 0 }}</div></NCard>
          </div>
          <NCard size="small" title="Docker 系统信息">
            <div class="docker-info-grid">
              <span>版本：{{ overview.version || '-' }}</span>
              <span>API：{{ overview.apiVersion || '-' }}</span>
              <span>存储驱动：{{ overview.storageDriver || '-' }}</span>
              <span>日志驱动：{{ overview.loggingDriver || '-' }}</span>
            </div>
          </NCard>
          <NCard size="small" title="宿主机监控">
            <div class="docker-info-grid">
              <span>负载：{{ overview.host?.load1 || '-' }} / {{ overview.host?.load5 || '-' }} / {{ overview.host?.load15 || '-' }}</span>
              <span>可用内存：{{ formatBytes(overview.host?.memoryAvailable) }}</span>
              <span>可用磁盘：{{ formatBytes(overview.host?.diskFree) }}</span>
              <span>网卡流量：↓ {{ formatBytes(overview.host?.networkRxBytes) }} ↑ {{ formatBytes(overview.host?.networkTxBytes) }}</span>
            </div>
          </NCard>
          <NCard size="small" title="系统级控制">
            <NButtonGroup size="small">
              <NButton type="success" @click="daemonAction('start')">启动 Docker</NButton>
              <NButton type="warning" @click="confirmAction('停止 Docker', '停止后所有容器管理将暂时不可用，确认继续？', () => daemonAction('stop'))">停止 Docker</NButton>
              <NButton @click="confirmAction('重启 Docker', '确认重启 Docker 守护进程？', () => daemonAction('restart'))">重启 Docker</NButton>
            </NButtonGroup>
          </NCard>
        </div>
      </NTabPane>

      <NTabPane name="containers" tab="容器">
        <div class="docker-toolbar">
          <NSelect v-model:value="containerFilter" :options="[{ label: '全部', value: 'all' }, { label: '运行', value: 'running' }, { label: '停止', value: 'stopped' }]" class="w-[120px]" />
          <NInput v-model:value="search" clearable placeholder="搜索名称或 ID" />
        </div>
        <NSpin :show="loading">
          <table class="docker-table">
            <thead><tr><th>容器</th><th>镜像</th><th>状态</th><th>端口</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="container in filteredContainers" :key="container.id">
                <td><b>{{ container.name }}</b><div class="text-xs opacity-60">{{ container.id.slice(0, 12) }}</div></td>
                <td>{{ container.image }}</td>
                <td>{{ container.status || container.state }}</td>
                <td>{{ container.ports || '-' }}</td>
                <td>
                  <NButtonGroup size="tiny">
                    <NButton @click="showContainerDetails(container)">详情</NButton>
                    <NButton v-if="container.state !== 'running'" type="success" @click="runContainerAction(container, 'start')">启动</NButton>
                    <NButton v-else type="warning" @click="runContainerAction(container, 'stop')">停止</NButton>
                    <NButton @click="runContainerAction(container, 'restart')">重启</NButton>
                    <NButton @click="showLogs(container)">日志</NButton>
                    <NButton type="error" @click="runContainerAction(container, 'remove')">删除</NButton>
                  </NButtonGroup>
                </td>
              </tr>
            </tbody>
          </table>
        </NSpin>
      </NTabPane>

      <NTabPane name="images" tab="镜像">
        <div class="docker-toolbar">
          <NInput v-model:value="imageName" placeholder="镜像，例如 nginx:latest" />
          <NButton type="primary" @click="imageAction('pull', imageName)">拉取镜像</NButton>
          <NButton @click="confirmAction('清理悬空镜像', '确认清理所有悬空镜像？', () => imageAction('prune'))">清理悬空镜像</NButton>
        </div>
        <table class="docker-table">
          <thead><tr><th>仓库</th><th>标签</th><th>ID</th><th>大小</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="image in images" :key="value(image, 'ID')">
              <td>{{ value(image, 'Repository') }}</td><td>{{ value(image, 'Tag') }}</td><td>{{ String(value(image, 'ID')).slice(0, 19) }}</td>
              <td>{{ value(image, 'Size') }}</td><td>{{ value(image, 'CreatedAt') }}</td>
              <td><NButtonGroup size="tiny"><NButton @click="showImageHistory(image)">分层</NButton><NButton type="error" @click="confirmAction('删除镜像', '确认删除该镜像？', () => imageAction('remove', value(image, 'ID')))">删除</NButton></NButtonGroup></td>
            </tr>
          </tbody>
        </table>
      </NTabPane>

      <NTabPane name="volumes" tab="数据卷">
        <div class="docker-toolbar">
          <NInput v-model:value="volumeName" placeholder="新数据卷名称" />
          <NButton type="primary" @click="volumeAction('create', volumeName)">创建</NButton>
        </div>
        <table class="docker-table">
          <thead><tr><th>名称</th><th>驱动</th><th>挂载路径</th><th>关联容器</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="volume in volumes" :key="value(volume, 'Name')">
              <td>{{ value(volume, 'Name') }}</td><td>{{ value(volume, 'Driver') }}</td><td>{{ value(volume, 'Mountpoint') }}</td><td>{{ value(volume, 'Containers') }}</td>
              <td><NButton size="tiny" type="error" @click="confirmAction('删除数据卷', '仅闲置卷可以删除，确认继续？', () => volumeAction('remove', value(volume, 'Name')))">删除</NButton></td>
            </tr>
          </tbody>
        </table>
      </NTabPane>

      <NTabPane name="networks" tab="网络">
        <div class="docker-toolbar docker-toolbar-wrap">
          <NInput v-model:value="networkName" placeholder="Bridge 网络名称" />
          <NInput v-model:value="networkSubnet" placeholder="CIDR，可选" />
          <NInput v-model:value="networkGateway" placeholder="网关，可选" />
          <NButton type="primary" @click="networkAction('create', networkName)">新建 Bridge</NButton>
        </div>
        <div class="docker-toolbar docker-toolbar-wrap">
          <NInput v-model:value="networkContainer" placeholder="容器名称或 ID" />
          <NSelect v-model:value="selectedNetwork" :options="networks.map(item => ({ label: value(item, 'Name'), value: value(item, 'Name') }))" placeholder="选择自定义网络" />
          <NButton @click="networkAction('connect', selectedNetwork)">接入网络</NButton>
          <NButton @click="networkAction('disconnect', selectedNetwork)">脱离网络</NButton>
        </div>
        <table class="docker-table">
          <thead><tr><th>名称</th><th>驱动</th><th>范围</th><th>ID</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="network in networks" :key="value(network, 'ID')">
              <td>{{ value(network, 'Name') }}</td><td>{{ value(network, 'Driver') }}</td><td>{{ value(network, 'Scope') }}</td><td>{{ String(value(network, 'ID')).slice(0, 12) }}</td>
              <td><NButtonGroup size="tiny"><NButton @click="inspectNetwork(network)">详情</NButton><NButton v-if="!['bridge', 'host', 'none'].includes(value(network, 'Name'))" type="error" @click="confirmAction('删除网络', '仅无容器依附的自定义网络可以删除，确认继续？', () => networkAction('remove', value(network, 'Name')))">删除</NButton></NButtonGroup></td>
            </tr>
          </tbody>
        </table>
      </NTabPane>
    </NTabs>

    <NModal v-model:show="logsVisible" preset="card" :title="logsTitle" style="max-width: 900px">
      <div class="mb-2"><NButton size="small" @click="downloadLogs">下载日志</NButton></div>
      <pre class="docker-logs">{{ logsContent }}</pre>
    </NModal>

    <NModal v-model:show="detailsVisible" preset="card" :title="detailsTitle" style="max-width: 1000px">
      <div v-if="selectedContainer" class="docker-toolbar docker-toolbar-wrap mb-3">
        <NInput v-model:value="renameValue" placeholder="新容器名称" /><NButton @click="renameContainer">重命名</NButton>
        <NInput v-model:value="cpuLimit" placeholder="CPU，例如 1.5" /><NInput v-model:value="memoryLimit" placeholder="内存，例如 512m" /><NButton @click="updateResources">在线更新资源</NButton>
      </div>
      <pre class="docker-logs">{{ detailsContent }}</pre>
    </NModal>
  </div>
</template>

<style scoped>
.docker-manager { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: auto; color: var(--n-text-color); }
.docker-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; }
.docker-info-grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 8px; font-size: 13px; }
.docker-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.docker-toolbar-wrap { flex-wrap: wrap; }
.docker-toolbar :deep(.n-input), .docker-toolbar :deep(.n-select) { max-width: 260px; }
.docker-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.docker-table th, .docker-table td { padding: 8px; text-align: left; border-bottom: 1px solid rgba(148, 163, 184, .25); vertical-align: middle; }
.docker-logs { max-height: 65vh; overflow: auto; padding: 12px; border-radius: var(--sp-ui-radius, 10px); background: #111827; color: #e5e7eb; white-space: pre-wrap; word-break: break-all; user-select: text; }
@media (max-width: 700px) {
  .docker-stat-grid, .docker-info-grid { grid-template-columns: 1fr 1fr; }
  .docker-table { min-width: 760px; }
}
</style>
