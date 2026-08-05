<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton } from 'naive-ui'
import srcSvglogo from '@/assets/logo.svg'
import { checkVersion, get } from '@/api/system/about'
import { t } from '@/locales'

const versionName = '1.01'
const projectUrl = 'https://github.com/zhiwen1987/Jydn-Panel'
const releasesUrl = `${projectUrl}/releases`
const qqNumber = '156701818'
const websiteUrl = 'https://www.kefu.me'
type VersionState = 'checking' | 'latest' | 'update' | 'error'
const currentVersion = ref(versionName)
const latestVersion = ref('')
const releaseUrl = ref(releasesUrl)
const versionState = ref<VersionState>('checking')
const checking = ref(false)
const versionLabel = computed(() => `v${currentVersion.value.replace(/^v/i, '')}`)
const statusText = computed(() => {
  if (versionState.value === 'checking')
    return t('apps.about.checking')
  if (versionState.value === 'update')
    return t('apps.about.updateAvailable', { version: `v${latestVersion.value.replace(/^v/i, '')}` })
  if (versionState.value === 'error')
    return t('apps.about.checkFailed')
  return t('apps.about.latest')
})
async function loadAboutInfo() {
  try {
    const response = await get()
    if (response.code === 0 && response.data?.versionName)
      currentVersion.value = response.data.versionName
  }
  catch {}
}
async function detectVersion() {
  if (checking.value)
    return
  checking.value = true
  versionState.value = 'checking'
  try {
    const response = await checkVersion()
    if (response.code !== 0 || !response.data)
      throw new Error(response.msg || 'version check failed')
    currentVersion.value = response.data.currentVersion || currentVersion.value
    latestVersion.value = response.data.latestVersion || currentVersion.value
    releaseUrl.value = response.data.releaseUrl || releasesUrl
    versionState.value = response.data.hasUpdate ? 'update' : 'latest'
  }
  catch {
    versionState.value = 'error'
  }
  finally {
    checking.value = false
  }
}
function handleVersionAction() {
  if (versionState.value === 'update')
    window.open(releaseUrl.value, '_blank', 'noopener,noreferrer')
  else
    detectVersion()
}
onMounted(async () => {
  await loadAboutInfo()
  await detectVersion()
})
</script>

<template>
  <section class="about-page">
    <header class="about-hero">
      <img class="about-logo" :src="srcSvglogo" alt="Jydn-Panel Logo">
      <h1>Jydn-Panel</h1><span class="version-badge">{{ versionLabel }}</span>
      <p>{{ $t('apps.about.tagline') }}</p>
    </header>
    <div class="about-summary-grid">
      <article class="about-card project-card">
        <h2><span>▤</span>{{ $t('apps.about.projectInfo') }}</h2>
        <dl>
          <div><dt>{{ $t('apps.about.projectAddress') }}</dt><dd><a :href="projectUrl" target="_blank">{{ projectUrl }}</a><span>↗</span></dd></div>
          <div><dt>{{ $t('apps.about.currentVersion') }}</dt><dd>{{ versionLabel }}</dd></div>
          <div><dt>{{ $t('apps.about.runtimePort') }}</dt><dd>8008</dd></div>
        </dl>
      </article>
      <article class="about-card version-card" :class="`state-${versionState}`">
        <h2><span>♢</span>{{ $t('apps.about.versionStatus') }}</h2>
        <div class="version-status">
          <span class="status-mark"><span v-if="versionState === 'checking'" class="status-spinner" /><span v-else-if="versionState === 'error'">!</span><span v-else-if="versionState === 'update'">↑</span><span v-else>✓</span></span>
          <strong>{{ statusText }}</strong>
          <NButton type="primary" :loading="checking" @click="handleVersionAction">{{ versionState === 'update' ? $t('apps.about.viewNewVersion') : $t('apps.about.checkUpdate') }}</NButton>
        </div>
      </article>
    </div>
    <article class="about-card support-card">
      <h2><span>♡</span>{{ $t('apps.about.openSourceSupport') }}</h2>
      <nav>
        <a :href="projectUrl" target="_blank"><span><b>●</b>{{ $t('apps.about.githubHome') }}</span><i>›</i></a>
        <a :href="releasesUrl" target="_blank"><span><b>▣</b>{{ $t('apps.about.updateLog') }}</span><i>›</i></a>
        <a :href="`https://wpa.qq.com/msgrd?v=3&uin=${qqNumber}&site=qq&menu=yes`" target="_blank"><span><b>♧</b>{{ $t('apps.about.qqSupport') }}</span><em>{{ qqNumber }}</em><i>›</i></a>
        <a :href="websiteUrl" target="_blank"><span><b>◎</b>{{ $t('apps.about.officialWebsite') }}</span><em>{{ websiteUrl }}</em><i>›</i></a>
      </nav>
    </article>
    <footer>Powered By <a :href="projectUrl" target="_blank">Jydn-Panel</a></footer>
  </section>
</template>

<style scoped>
.about-page{--green:#0aa45a;--border:#d9e0e8;--text:#111827;--muted:#667085;width:100%;max-width:900px;margin:auto;padding:14px 18px 10px;color:var(--text);box-sizing:border-box}.about-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding-bottom:18px}.about-logo{width:84px;height:84px;object-fit:contain}.about-hero h1{margin:4px 0 5px;font-size:34px;line-height:1.15;font-weight:750}.version-badge{height:24px;padding:0 11px;display:inline-flex;align-items:center;color:var(--green);border:1px solid var(--green);border-radius:99px;font-size:13px;font-weight:600}.about-hero p{margin:12px 0 0;color:var(--muted);font-size:15px}.about-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.about-card{overflow:hidden;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.82)}.about-card h2{display:flex;align-items:center;gap:9px;margin:0;padding:13px 18px;border-bottom:1px solid var(--border);font-size:17px;font-weight:700}.project-card dl{margin:0;padding:0 18px}.project-card dl>div{display:grid;grid-template-columns:78px minmax(0,1fr);gap:12px;align-items:center;min-height:48px;border-bottom:1px solid #edf0f4}.project-card dl>div:last-child{border:0}.project-card dt{color:var(--muted)}.project-card dd{display:flex;justify-content:flex-end;min-width:0;margin:0;color:#64748b}.project-card dd a{overflow:hidden;color:#0784ff;text-overflow:ellipsis;white-space:nowrap}.version-status{min-height:143px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px 18px 14px}.status-mark{width:50px;height:50px;display:flex;align-items:center;justify-content:center;color:var(--green);border:1.5px solid;border-radius:50%;font-size:31px}.version-status strong{color:var(--green);font-size:14px}.version-status :deep(.n-button){min-width:148px}.state-error .status-mark,.state-error strong{color:#d03050}.state-update .status-mark,.state-update strong{color:#f0a020}.status-spinner{width:20px;height:20px;border:2px solid;border-right-color:transparent;border-radius:50%;animation:spin .8s linear infinite}.support-card{margin-top:20px}.support-card nav{padding:0 18px}.support-card nav a{min-height:50px;display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:12px;color:var(--text);border-bottom:1px solid #edf0f4;text-decoration:none}.support-card nav a:last-child{border:0}.support-card nav a:hover{color:var(--green)}.support-card nav span{display:flex;align-items:center;gap:12px;font-weight:550}.support-card nav b{width:22px;text-align:center;font-size:18px}.support-card nav em{max-width:310px;overflow:hidden;color:#7b8798;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.support-card nav i{font-size:28px;font-style:normal}.about-page footer{padding:24px 0 4px;color:#8792a4;text-align:center}.about-page footer a{color:#0784ff;text-decoration:none}.dark .about-page{--border:#3a4654;--text:#eef2f7;--muted:#9aa7b8}.dark .about-card{background:rgba(30,41,59,.78)}.dark .project-card dl>div,.dark .support-card nav a{border-color:#344152}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.about-page{padding:8px 6px}.about-summary-grid{grid-template-columns:1fr;gap:12px}.about-logo{width:70px;height:70px}.about-hero h1{font-size:28px}.support-card{margin-top:12px}.support-card nav em{max-width:150px}}
</style>
