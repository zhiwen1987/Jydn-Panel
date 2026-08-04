<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NGradientText, useMessage } from 'naive-ui'
import { checkVersion, get as getAbout } from '@/api/system/about'

interface VersionCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string
  repository: string
}

const message = useMessage()
const versionName = ref('-')
const checking = ref(false)

async function loadVersion() {
  try {
    const response = await getAbout<{ versionName: string; versionCode: number }>()
    if (response.code !== 0)
      throw new Error(response.msg)
    versionName.value = response.data.versionName
  }
  catch (error) {
    message.error(`版本读取失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

async function checkGithubVersion() {
  checking.value = true
  try {
    const response = await checkVersion<VersionCheckResult>()
    if (response.code !== 0)
      throw new Error(response.msg)
    const result = response.data
    if (result.hasUpdate)
      message.info(`发现新版本 ${result.latestVersion}，当前版本 ${result.currentVersion}`)
    else
      message.success(`当前已是最新版本 ${result.currentVersion}`)
  }
  catch (error) {
    message.error(`GitHub 版本检查失败：${error instanceof Error ? error.message : String(error)}`)
  }
  finally {
    checking.value = false
  }
}

onMounted(loadVersion)
</script>

<template>
  <div class="pt-8 flex flex-col items-center justify-center">
    <div class="text-3xl font-semibold">
      Jydn-Panel
    </div>
    <div class="text-xl mt-2">
      <NGradientText type="info">
        <span class="font-semibold">Ver: {{ versionName }}</span>
      </NGradientText>
    </div>
    <div class="mt-4">
      <NButton type="primary" secondary :loading="checking" @click="checkGithubVersion">
        {{ $t('apps.about.checkUpdate') }}
      </NButton>
    </div>
    <div class="mt-5 text-sm text-gray-500">
      基于 Sun-Panel 开源版持续开发
    </div>
  </div>
</template>