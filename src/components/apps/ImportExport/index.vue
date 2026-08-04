<script setup lang="ts">
import { ref } from 'vue'
import type { UploadFileInfo } from 'naive-ui'
import { NAlert, NButton, NCheckbox, NCheckboxGroup, NDivider, NInput, NSpace, NUpload, NUploadDragger, useMessage } from 'naive-ui'
import { RoundCardModal, SvgIcon } from '@/components/common'
import type { EmbeddedAsset, EmbeddedAssetType, IconGroup, ImportJsonResult } from '@/utils/jsonImportExport'
import { ConfigVersionLowError, FormatError, exportJson, importJsonString } from '@/utils/jsonImportExport'
import { edit as addGroup, deletes as deleteGroups, getList as getGroupList } from '@/api/panel/itemIconGroup'
import { addMultiple as addMultipleIcons, deletes as deleteIcons, getListByGroupId, getSiteFavicon } from '@/api/panel/itemIcon'
import { set as setUserConfig } from '@/api/panel/userConfig'
import { useAppStore, useAuthStore, usePanelState } from '@/store'
import { t } from '@/locales'

interface ItemGroup extends Panel.ItemIconGroup {
  items?: Panel.ItemInfo[]
}

const ms = useMessage()
const authStore = useAuthStore()
const appStore = useAppStore()
const panelState = usePanelState()

const jsonData = ref<string | null>(null)
const importWarning = ref<string[]>([])
const importRoundModalShow = ref(false)
const exportRoundModalShow = ref(false)
const loading = ref(false)
const uploadLoading = ref(false)
const version = ref(import.meta.env.VITE_APP_VERSION || '1.00')
const debug = ref(false)

const importObj = ref<ImportJsonResult | null>(null)
const importItems = ref<string[]>(['icons', 'style'])
const checkedItems = ref<string[]>(['icons', 'style'])
const importMode = ref<'append' | 'overwrite'>('append')
let restoredAssetUrls = new Map<string, string>()

function handleFileChangeWithMode(options: { file: UploadFileInfo; fileList: Array<UploadFileInfo> }, mode: 'append' | 'overwrite') {
  importMode.value = mode
  handleFileChange(options)
}

function fileNameFromUrl(sourceUrl: string, index: number, mimeType: string) {
  try {
    const pathname = new URL(sourceUrl, window.location.origin).pathname
    const name = decodeURIComponent(pathname.split('/').pop() || '')
    if (name.includes('.'))
      return name
  }
  catch {
    // Use generated fallback below.
  }

  const extByMime: Record<string, string> = {
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'image/x-icon': '.ico',
  }
  return `jydn-asset-${index}${extByMime[mimeType] || '.png'}`
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function embedAsset(sourceUrl: string, fileType: EmbeddedAssetType, index: number): Promise<EmbeddedAsset | null> {
  if (!sourceUrl || sourceUrl.startsWith('data:'))
    return null

  try {
    const response = await fetch(new URL(sourceUrl, window.location.origin).toString(), { credentials: 'same-origin' })
    if (!response.ok)
      return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/'))
      return null
    return {
      sourceUrl,
      fileName: fileNameFromUrl(sourceUrl, index, blob.type),
      fileType,
      mimeType: blob.type,
      dataUrl: await blobToDataUrl(blob),
    }
  }
  catch {
    // Cross-origin images can remain URL-based when CORS prevents embedding.
    return null
  }
}

async function collectEmbeddedAssets(groups: IconGroup[], includePanelConfig: boolean): Promise<EmbeddedAsset[]> {
  const sources = new Map<string, EmbeddedAssetType>()
  for (const group of groups) {
    for (const item of group.children) {
      const src = item.icon?.src
      if (src)
        sources.set(src, 'icon')
    }
  }

  if (includePanelConfig) {
    if (panelState.panelConfig.logoImageSrc)
      sources.set(panelState.panelConfig.logoImageSrc, 'icon')
    if (panelState.panelConfig.faviconImageSrc)
      sources.set(panelState.panelConfig.faviconImageSrc, 'icon')
    if (panelState.panelConfig.backgroundImageSrc)
      sources.set(panelState.panelConfig.backgroundImageSrc, 'wallpaper')
  }

  const assets = await Promise.all(
    Array.from(sources.entries()).map(([sourceUrl, fileType], index) => embedAsset(sourceUrl, fileType, index)),
  )
  return assets.filter((asset): asset is EmbeddedAsset => asset !== null)
}

async function uploadEmbeddedAsset(asset: EmbeddedAsset): Promise<string> {
  const blob = await (await fetch(asset.dataUrl)).blob()
  const formData = new FormData()
  formData.append('imgfile', new File([blob], asset.fileName, { type: asset.mimeType || blob.type }))

  const response = await fetch(`/api/file/uploadImg?fileType=${asset.fileType}`, {
    method: 'POST',
    headers: {
      token: authStore.token || '',
      lang: appStore.language,
    },
    body: formData,
  })
  const result = await response.json()
  if (!response.ok || result.code !== 0 || !result.data?.imageUrl)
    throw new Error(result.msg || `Unable to restore ${asset.fileName}`)
  return result.data.imageUrl as string
}

async function restoreEmbeddedAssets() {
  restoredAssetUrls = new Map<string, string>()
  const assets = importObj.value?.getassets() || []
  for (const asset of assets) {
    try {
      restoredAssetUrls.set(asset.sourceUrl, await uploadEmbeddedAsset(asset))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      ms.warning(`${asset.fileName}: ${message}`)
    }
  }
}

function restoreIcon(icon: Panel.ItemIcon | null) {
  if (!icon)
    return null
  return {
    ...icon,
    src: icon.src ? (restoredAssetUrls.get(icon.src) || icon.src) : icon.src,
  }
}

async function detectImportedIcon(iconElement: IconGroup['children'][number]): Promise<Panel.ItemIcon | null> {
  const restored = restoreIcon(iconElement.icon)
  if (restored?.src || restored?.text || !/^https?:\/\//i.test(iconElement.url || ''))
    return restored

  try {
    const { code, data } = await getSiteFavicon<{ iconUrl?: string }>(iconElement.url)
    if (code === 0 && data.iconUrl)
      return { itemType: 2, src: data.iconUrl }
  }
  catch {
    // Keep the imported icon when the remote site blocks favicon detection.
  }
  return restored
}

async function detectImportedIcons(children: IconGroup['children']): Promise<Array<Panel.ItemIcon | null>> {
  const results: Array<Panel.ItemIcon | null> = new Array(children.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(4, children.length) }, async () => {
    while (cursor < children.length) {
      const index = cursor++
      results[index] = await detectImportedIcon(children[index])
    }
  })
  await Promise.all(workers)
  return results
}

async function importPanelConfig() {
  const importedConfig = importObj.value?.getPanelConfig()
  if (!importedConfig)
    return

  const nextConfig: Panel.panelConfig = {
    ...panelState.panelConfig,
    ...importedConfig,
    logoImageSrc: importedConfig.logoImageSrc
      ? (restoredAssetUrls.get(importedConfig.logoImageSrc) || importedConfig.logoImageSrc)
      : importedConfig.logoImageSrc,
    faviconImageSrc: importedConfig.faviconImageSrc
      ? (restoredAssetUrls.get(importedConfig.faviconImageSrc) || importedConfig.faviconImageSrc)
      : importedConfig.faviconImageSrc,
    backgroundImageSrc: importedConfig.backgroundImageSrc
      ? (restoredAssetUrls.get(importedConfig.backgroundImageSrc) || importedConfig.backgroundImageSrc)
      : importedConfig.backgroundImageSrc,
  }
  panelState.panelConfig = nextConfig
  panelState.recordState()
  const response = await setUserConfig({ panel: nextConfig })
  if (response.code !== 0)
    throw new Error(response.msg)
}

async function importIcons(): Promise<string | null> {
  const groups = importObj.value?.geticons()
  const batchSize = 50
  let tempGroupId: number | null = null

  if (!groups)
    return null

  if (importMode.value === 'overwrite') {
    try {
      const tempRes = await addGroup<Panel.ItemIconGroup>({
        title: '__IMPORT_TEMP__',
        sort: 999999,
        groupType: 'website',
      })
      if (tempRes.code === 0 && tempRes.data?.id)
        tempGroupId = tempRes.data.id as number
    }
    catch {
      // The deletion loop below will report any real failure.
    }

    async function deleteAllGroupsOnce() {
      const { code: code1, data: data1 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('website')
      const { code: code2, data: data2 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('webpage')
      const allExistingGroups: ItemGroup[] = []
      if (code1 === 0 && data1?.list)
        allExistingGroups.push(...data1.list)
      if (code2 === 0 && data2?.list)
        allExistingGroups.push(...data2.list)

      const groupIds = allExistingGroups
        .filter(group => group.title !== '__IMPORT_TEMP__')
        .map(group => Number(group.id))
        .filter(id => Number.isFinite(id) && id > 0)

      for (const groupId of groupIds) {
        const iconRes = await getListByGroupId<Common.ListResponse<Panel.ItemInfo[]>>(groupId)
        const iconIds = (iconRes.code === 0 && iconRes.data?.list)
          ? iconRes.data.list.map(item => Number(item.id)).filter(id => Number.isFinite(id) && id > 0)
          : []
        if (iconIds.length > 0)
          await deleteIcons(iconIds)
      }
      for (const groupId of groupIds)
        await deleteGroups([groupId])
      return groupIds.length
    }

    for (let round = 0; round < 3; round++) {
      if (await deleteAllGroupsOnce() === 0)
        break
    }
  }

  try {
    for (const element of groups) {
      const createGroupResponse = await addGroup<Panel.ItemIconGroup>({
        title: element.title,
        sort: element.sort,
        groupType: element.groupType || 'website',
      })
      if (createGroupResponse.code !== 0)
        return createGroupResponse.msg

      const groupId = createGroupResponse.data?.id
      if (!groupId)
        continue

      const detectedIcons = element.groupType === 'webpage'
        ? element.children.map(icon => restoreIcon(icon.icon))
        : await detectImportedIcons(element.children)
      let addIcons: Panel.ItemInfo[] = []
      for (let index = 0; index < element.children.length; index++) {
        const iconElement = element.children[index]
        addIcons.push({
          title: iconElement.title,
          sort: iconElement.sort,
          icon: detectedIcons[index],
          url: iconElement.url,
          lanUrl: iconElement.lanUrl,
          description: iconElement.description,
          openMethod: iconElement.openMethod,
          pinned: !!iconElement.pinned,
          itemIconGroupId: groupId,
        })

        if (addIcons.length === batchSize || index === element.children.length - 1) {
          const response = await addMultipleIcons(addIcons)
          if (response.code !== 0)
            return response.msg
          addIcons = []
        }
      }
    }

    if (importMode.value === 'overwrite' && tempGroupId)
      await deleteGroups([tempGroupId])
    return null
  }
  catch (error) {
    return error instanceof Error ? `${t('common.failed')}: ${error.message}` : t('common.unknownError')
  }
}

async function exportIcons(): Promise<IconGroup[]> {
  const iconGroups: IconGroup[] = []
  const { code: websiteCode, data: websiteData } = await getGroupList<Common.ListResponse<ItemGroup[]>>('website')
  const { code: webpageCode, data: webpageData } = await getGroupList<Common.ListResponse<ItemGroup[]>>('webpage')
  const allGroups: Array<ItemGroup & { groupType: 'website' | 'webpage' }> = []
  if (websiteCode === 0 && websiteData?.list)
    allGroups.push(...websiteData.list.map(group => ({ ...group, groupType: 'website' as const })))
  if (webpageCode === 0 && webpageData?.list)
    allGroups.push(...webpageData.list.map(group => ({ ...group, groupType: 'webpage' as const })))

  for (const element of allGroups) {
    const group: IconGroup = {
      title: element.title || '',
      sort: element.sort || 0,
      groupType: element.groupType,
      children: [],
    }
    const response = await getListByGroupId<Common.ListResponse<Panel.ItemInfo[]>>(element.id)
    if (response.code === 0) {
      group.children = response.data.list.map(icon => ({
        icon: icon.icon,
        sort: icon.sort || 99999,
        title: icon.title,
        url: icon.url,
        lanUrl: icon.lanUrl || '',
        description: icon.description || '',
        openMethod: icon.openMethod || 1,
        pinned: !!icon.pinned,
      }))
    }
    iconGroups.push(group)
  }
  return iconGroups
}

function handleFileChange(options: { file: UploadFileInfo; fileList: Array<UploadFileInfo> }) {
  uploadLoading.value = true
  if (!options.file.file) {
    uploadLoading.value = false
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (reader.result) {
      jsonData.value = reader.result as string
      importCheck()
    }
    else {
      ms.error(`${t('common.failed')}: ${t('common.repeatLater')}`)
    }
    uploadLoading.value = false
  }
  reader.onerror = () => {
    uploadLoading.value = false
    ms.error(t('apps.exportImport.errorConfigFileFormat'))
  }
  reader.readAsText(options.file.file)
}

function importCheck() {
  importWarning.value = []
  if (!jsonData.value) {
    ms.error(t('apps.exportImport.errorConfigFileFormat'))
    return
  }

  try {
    importObj.value = importJsonString(jsonData.value)
    if (!importObj.value)
      return
    if (!importObj.value.isPassCheckMd5())
      importWarning.value.push(t('apps.exportImport.fileModified'))
    if (!importObj.value.isPassCheckConfigVersionOld())
      importWarning.value.push(t('apps.exportImport.warnConfigFileLow'))
    if (!importObj.value.isPassCheckConfigVersionNew())
      importWarning.value.push(t('apps.exportImport.softwareVersionLow'))
    importRoundModalShow.value = true
  }
  catch (error) {
    if (error instanceof ConfigVersionLowError)
      ms.error(t('apps.exportImport.errorConfigFileLow'))
    else if (error instanceof FormatError)
      ms.error(t('apps.exportImport.errorConfigFileFormat'))
  }
}

async function handleStartExport() {
  loading.value = true
  try {
    const exportResult = exportJson(version.value)
    const iconGroups = checkedItems.value.includes('icons') ? await exportIcons() : []
    const includeStyle = checkedItems.value.includes('style')
    const assets = await collectEmbeddedAssets(iconGroups, includeStyle)
    exportResult
      .addIconsData(iconGroups)
      .addAssetsData(assets)
    if (includeStyle)
      exportResult.addPanelConfig(JSON.parse(JSON.stringify(panelState.panelConfig)))
    jsonData.value = exportResult.string()
    exportResult.exportFile()
    exportRoundModalShow.value = false
    ms.success(t('apps.exportImport.exportWithImagesSuccess', { count: assets.length }))
  }
  catch (error) {
    ms.error(error instanceof Error ? error.message : t('common.failed'))
  }
  finally {
    loading.value = false
  }
}

async function handleStartImport() {
  loading.value = true
  try {
    await restoreEmbeddedAssets()
    if (checkedItems.value.includes('icons')) {
      const errorMessage = await importIcons()
      if (errorMessage)
        throw new Error(errorMessage)
    }
    if (checkedItems.value.includes('style'))
      await importPanelConfig()
    importRoundModalShow.value = false
    ms.success(t('apps.exportImport.importWithImagesSuccess', { count: restoredAssetUrls.size }))
  }
  catch (error) {
    ms.error(error instanceof Error ? error.message : t('common.failed'))
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="pt-2">
    <NAlert type="info" :bordered="false">
      <p>{{ $t('apps.exportImport.tip') }}</p>
    </NAlert>
    <div class="flex justify-center m-[50px]">
      <div class="w-full max-w-[900px] px-4">
        <!-- 上面一行：两个导入拖拽框（允许换行，避免横向滚动条） -->
        <div class="flex flex-col md:flex-row flex-wrap gap-4 w-full">
          <!-- 追加导入：支持拖拽上传 -->
          <NUpload
            accept=".jydn-panel.json,.sun-panel.json,.sunpanel.json"
            directory-dnd
            :default-upload="false"
            :show-file-list="false"
            class="flex-1 min-w-0"
            @change="(opts: any) => handleFileChangeWithMode(opts, 'append')"
          >
            <NUploadDragger>
              <div class="text-center">
                <div class="font-medium mb-2">拖拽配置文件到这里</div>
                <div class="text-sm opacity-70 mb-3">追加导入（保留现有数据）</div>
                <NButton type="success" size="large" :loading="uploadLoading">
                  <template #icon>
                    <SvgIcon icon="fa6:solid-file-import" />
                  </template>
                  选择文件并追加导入
                </NButton>
              </div>
            </NUploadDragger>
          </NUpload>

          <!-- 覆盖导入：支持拖拽上传 -->
          <NUpload
            accept=".jydn-panel.json,.sun-panel.json,.sunpanel.json"
            directory-dnd
            :default-upload="false"
            :show-file-list="false"
            class="flex-1 min-w-0"
            @change="(opts: any) => handleFileChangeWithMode(opts, 'overwrite')"
          >
            <NUploadDragger>
              <div class="text-center">
                <div class="font-medium mb-2">拖拽配置文件到这里</div>
                <div class="text-sm opacity-70 mb-3">覆盖导入（清空后导入）</div>
                <NButton type="warning" size="large" :loading="uploadLoading">
                  <template #icon>
                    <SvgIcon icon="fa6:solid-file-import" />
                  </template>
                  选择文件并覆盖导入
                </NButton>
              </div>
            </NUploadDragger>
          </NUpload>
        </div>

        <!-- 下面一行：导出配置单独一行，避免挤出横向滚动条 -->
        <div class="flex justify-center mt-4">
          <NButton type="info" size="large" @click="exportRoundModalShow = !exportRoundModalShow">
            <template #icon>
              <SvgIcon icon="fa6:solid-file-export" />
            </template>
            {{ $t('apps.exportImport.export') }}
          </NButton>
        </div>
      </div>
    </div>

    <div class="flex justify-center">
      <a href="https://hslr-s.github.io/sun-panel-tool-page/#/" target="_blank">{{ $t('apps.exportImport.transmuteStandard') }}</a>
    </div>

    <!-- 调试模式 -->
    <div v-if="debug">
      <NButton @click="importCheck">
        检查导入
      </NButton>

      <!-- <NButton @click="exportJsonS">
      导出JSON
    </NButton> -->

      <NButton @click="jsonData = ''">
        清空导入数据
      </NButton>

      <NInput
        v-model:value="jsonData"
        type="textarea"
        placeholder="基本的 Textarea"
      />

      <div v-if="jsonData">
        <h2>JSON 数据</h2>
        <pre>{{ jsonData }}</pre>
      </div>
    </div>

    <RoundCardModal v-model:show="importRoundModalShow" style="max-width: 400px;" :title=" $t('apps.exportImport.import')">
      <div v-if="importWarning.length > 0">
        <NAlert :title="$t('common.warning')" type="warning">
          <div v-for="(text, index) in importWarning " :key="index">
            {{ text }}
          </div>
        </NAlert>
      </div>
      <NDivider title-placement="left">
        {{ $t('apps.exportImport.selectImportData') }}
      </NDivider>

      <!-- 导入模式说明 -->
      <div v-if="importMode === 'overwrite'" class="text-center text-orange-500 mb-2">
        ⚠️ 覆盖模式：导入前将清空现有所有数据
      </div>
      <div v-else class="text-center text-green-500 mb-2">
        ✓ 追加模式：保留现有数据，追加导入
      </div>

      <NSpace justify="center" style="margin-top: 20px;">
        <NCheckboxGroup v-model:value="checkedItems">
          <NCheckbox v-if="importItems.includes('icons')" value="icons" :label="$t('apps.exportImport.moduleIcon')" />
          <NCheckbox v-if="importItems.includes('style')" value="style" :label="$t('apps.exportImport.moduleStyle')" />
        </NCheckboxGroup>
      </NSpace>
      <NSpace justify="center">
        <div class="mt-[50px]">
          <NButton type="success" :disabled="checkedItems.length === 0" :loading="loading" @click="handleStartImport">
            {{ $t('common.continue') }}
          </NButton>
        </div>
      </NSpace>
    </RoundCardModal>

    <RoundCardModal v-model:show="exportRoundModalShow" style="max-width: 400px;" :title=" $t('apps.exportImport.export')">
      <NDivider title-placement="left">
        {{ $t('apps.exportImport.selectExportData') }}
      </NDivider>

      <NSpace justify="center" style="margin-top: 20px;">
        <NCheckboxGroup v-model:value="checkedItems">
          <NCheckbox v-if="importItems.includes('icons')" value="icons" :label="$t('apps.exportImport.moduleIcon')" />
          <NCheckbox v-if="importItems.includes('style')" value="style" :label="$t('apps.exportImport.moduleStyle')" />
        </NCheckboxGroup>
      </NSpace>
      <NSpace justify="center">
        <div class="mt-[50px]">
          <NButton type="success" :disabled="checkedItems.length === 0" :loading="loading" @click="handleStartExport">
            {{ $t('common.continue') }}
          </NButton>
        </div>
      </NSpace>
    </RoundCardModal>
  </div>
</template>
