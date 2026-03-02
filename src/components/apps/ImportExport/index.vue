<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { UploadFileInfo } from 'naive-ui'
import { NAlert, NButton, NCheckbox, NCheckboxGroup, NDivider, NInput, NSpace, NUpload, NUploadDragger, useMessage } from 'naive-ui'
import { RoundCardModal, SvgIcon } from '@/components/common'
import type { IconGroup, ImportJsonResult } from '@/utils/jsonImportExport'
import { ConfigVersionLowError, FormatError, exportJson, importJsonString } from '@/utils/jsonImportExport'
import { get as getAbout } from '@/api/system/about'
import { edit as addGroup, deletes as deleteGroups, getList as getGroupList } from '@/api/panel/itemIconGroup'
import { addMultiple as addMultipleIcons, deletes as deleteIcons, getListByGroupId } from '@/api/panel/itemIcon'

import { t } from '@/locales'

interface ItemGroup extends Panel.ItemIconGroup {
  items?: Panel.ItemInfo[]
}

const ms = useMessage()

const jsonData = ref<string | null>(null)
const importWarning = ref<string[]>([])
const importRoundModalShow = ref(false)
const exportRoundModalShow = ref(false)
const loading = ref(false)
const uploadLoading = ref(false)
const version = ref('') // 当前软件版本
const debug = ref(false)

const importObj = ref<ImportJsonResult | null> (null)

const importItems = ref<string[]>(['icons']) // 当前软件版本支持导入导出的项目
const checkedItems = ref<string[]>(['icons']) // 当前准备导入的项目
const importMode = ref<'append' | 'overwrite'>('append') // 导入模式：追加或覆盖

// 处理文件选择，根据当前模式导入
function handleFileChangeWithMode(options: { file: UploadFileInfo; fileList: Array<UploadFileInfo> }, mode: 'append' | 'overwrite') {
  importMode.value = mode
  handleFileChange(options)
}

// 导入图标
async function importIcons(): Promise<string | null> {
  const groups = importObj.value?.geticons()
  const batchSize = 50
  let tempGroupId: number | null = null

  if (!groups)
    return null

  // 覆盖模式：先删除现有数据
  // 注意：后端可能强制“至少保留一个分组”，会导致删除最后一个分组失败（你看到的“请至少保留一个”就是这个）。
  // 所以这里先创建一个临时占位分组，确保删除过程不被“最后一个”规则卡住；导入完成后再删除该临时分组。
  if (importMode.value === 'overwrite') {
    console.log('overwrite mode: deleting existing data...')

    try {
      const tempRes = await addGroup<Panel.ItemIconGroup>({
        title: '__IMPORT_TEMP__',
        sort: 999999,
        groupType: 'website',
      })
      if (tempRes.code === 0 && tempRes.data?.id)
        tempGroupId = tempRes.data.id as number
    } catch (e) {
      // ignore
    }

    // 有些后端实现对“批量/顺序删除”可能存在偶发漏删（尤其是最后一个分组）。
    // 这里做 3 轮兜底：每轮都重新拉取当前 group 列表并删除，直到为空或达到上限。
    async function deleteAllGroupsOnce() {
      // 获取网站导航数据
      const { code: code1, data: data1 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('website')
      // 获取网页收藏数据
      const { code: code2, data: data2 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('webpage')

      const allExistingGroups: ItemGroup[] = []
      if (code1 === 0 && data1?.list) allExistingGroups.push(...data1.list)
      if (code2 === 0 && data2?.list) allExistingGroups.push(...data2.list)

      const groupIds = allExistingGroups
        // 不删除临时占位分组
        .filter(g => (g.title || '') !== '__IMPORT_TEMP__')
        .map(g => Number(g.id))
        .filter(id => Number.isFinite(id) && id > 0)

      if (groupIds.length === 0)
        return 0

      // 删除所有图标
      for (const gid of groupIds) {
        const iconRes = await getListByGroupId<Common.ListResponse<Panel.ItemInfo[]>>(gid)
        if (iconRes.code === 0 && iconRes.data?.list) {
          const iconIds = iconRes.data.list
            .map(i => Number(i.id))
            .filter(id => Number.isFinite(id) && id > 0)
          if (iconIds.length > 0) {
            await deleteIcons(iconIds)
          }
        }
      }

      // 删除所有分组（逐个删除，避免后端对批量 ids 有限制）
      for (const gid of groupIds) {
        const res: any = await deleteGroups([gid])
        if (res?.code !== 0) {
          console.error('delete group failed', gid, res?.msg)
        }
      }

      return groupIds.length
    }

    for (let round = 1; round <= 3; round++) {
      const deletedCount = await deleteAllGroupsOnce()
      console.log(`overwrite mode: delete round ${round}, groups=${deletedCount}`)
      if (deletedCount === 0)
        break
    }
  }

  try {
    for (let i = 0; i < groups.length; i++) {
      const element = groups[i]

      // 创建组得到组id
      const createGroupResponse = await addGroup<Panel.ItemIconGroup>({
        title: element.title,
        sort: element.sort,
        groupType: element.groupType || 'website',
      })

      if (createGroupResponse.code === 0) {
        const groupId = createGroupResponse.data?.id

        if (groupId) {
          let addIcons: Panel.ItemInfo[] = []

          // 批量添加子项
          for (let iconI = 0; iconI < element.children.length; iconI++) {
            const iconElement = element.children[iconI]

            addIcons.push({
              title: iconElement.title,
              sort: iconElement.sort,
              icon: iconElement.icon,
              url: iconElement.url,
              lanUrl: iconElement.lanUrl,
              description: iconElement.description,
              openMethod: iconElement.openMethod,
              pinned: !!(iconElement as any).pinned,
              itemIconGroupId: groupId,
            })

            // 每 batchSize 个添加一次
            if (addIcons.length === batchSize || iconI === element.children.length - 1) {
              const response = await addMultipleIcons(addIcons)

              if (response.code !== 0)
                return response.msg

              addIcons = []
            }
          }
        }
      }
      else {
        return createGroupResponse.msg
      }
    }

    // 覆盖模式：导入完成后删除临时占位分组
    if (importMode.value === 'overwrite' && tempGroupId) {
      const res: any = await deleteGroups([tempGroupId])
      if (res?.code !== 0)
        console.error('delete temp group failed', tempGroupId, res?.msg)
    }

    return null
  }
  catch (error) {
    if (error instanceof Error)
      return `${t('common.failed')}: ${error.message}`
    else
      return t('common.unknownError')
  }
}

// 导出图标
async function exportIcons(): Promise<IconGroup[]> {
  const iconGroups: IconGroup[] = []

  // 获取网站导航数据
  const { code: code1, data: data1 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('website')
  // 获取网页收藏数据
  const { code: code2, data: data2 } = await getGroupList<Common.ListResponse<ItemGroup[]>>('webpage')

  const allGroups = []
  if (code1 === 0 && data1?.list) {
    allGroups.push(...data1.list.map(g => ({ ...g, groupType: 'website' as const })))
  }
  if (code2 === 0 && data2?.list) {
    allGroups.push(...data2.list.map(g => ({ ...g, groupType: 'webpage' as const })))
  }

  if (allGroups.length > 0) {
    // 使用 Promise.all 等待所有异步操作完成
    await Promise.all(allGroups.map(async (element) => {
      const group: IconGroup = {
        title: element.title as string,
        sort: element.sort as 0,
        groupType: element.groupType,
        children: [],
      }

      const res = await getListByGroupId<Common.ListResponse<Panel.ItemInfo[]>>(element.id)

      if (res.code === 0) {
        for (const iconElement of res.data.list) {
          group.children.push({
            icon: iconElement.icon,
            sort: iconElement.sort || 99999,
            title: iconElement.title,
            url: iconElement.url,
            lanUrl: iconElement.lanUrl || '',
            description: iconElement.description || '',
            openMethod: iconElement.openMethod || 1,
            pinned: !!iconElement.pinned,
          })
        }
      }

      iconGroups.push(group)
    }))

    return iconGroups
  }
  else {
    return []
  }
}

onMounted(() => {
  interface Version {
    versionName: string
    versionCode: number
  }

  getAbout<Version>().then((res) => {
    if (res.code === 0)
      version.value = res.data.versionName
  })
})

function handleFileChange(options: { file: UploadFileInfo; fileList: Array<UploadFileInfo> }) {
  uploadLoading.value = true
  console.log(options.file.file)
  if (options.file.file) {
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
    reader.readAsText(options.file.file)
  }
}

// 验证导入文件
function importCheck() {
  importWarning.value = []
  if (jsonData.value) {
    try {
      importObj.value = importJsonString(jsonData.value)
      if (importObj.value) {
        if (!importObj.value.isPassCheckMd5())
          importWarning.value.push(t('apps.exportImport.fileModified'))

        if (!importObj.value.isPassCheckConfigVersionOld())
          importWarning.value.push(t('apps.exportImport.warnConfigFileLow'))

        if (!importObj.value.isPassCheckConfigVersionNew())
          importWarning.value.push(t('apps.exportImport.softwareVersionLow'))

        // （暂时不做）此处可以判断，当前的配置文件是否存在的导入项目（不存在隐藏importItems里面的值）操作变量：importItems

        // 通过了验证,打开弹窗
        importRoundModalShow.value = !importRoundModalShow.value

        // console.log(importObj.value.geticons())
      }
    }
    catch (error) {
      if (error instanceof ConfigVersionLowError) {
        ms.error(t('apps.exportImport.errorConfigFileLow'))
        console.error('The configuration file version is too low to be compatible')
      }
      else if (error instanceof FormatError) {
        ms.error(t('apps.exportImport.errorConfigFileFormat'))
        console.error('The format is incorrect and cannot be imported')
      }
    }
  }
  else {
    ms.error(t('apps.exportImport.errorConfigFileFormat'))
  }
}

// 开始导出
async function handleStartExport() {
  loading.value = true
  // console.log('要导出的项目', checkedItems.value)
  // 获取软件版本号
  const exportResult = exportJson(version.value)
  if (checkedItems.value.includes('icons')) {
    console.log('export icons ...')
    const iconGroups = await exportIcons()
    exportResult.addIconsData(iconGroups)
    console.log('export icons finish', iconGroups)
  }

  // console.log('导出结果')

  jsonData.value = exportResult.string()
  exportResult.exportFile()
  loading.value = false
  exportRoundModalShow.value = false
  // ms.success(t('common.success'))
}

// 开始导入
async function handleStartImport() {
  loading.value = true
  if (checkedItems.value.includes('icons')) {
    console.log('export icons ...')
    const errMsg = await importIcons()
    if (errMsg !== null)
      ms.success(`${t('common.failed')}:${errMsg}`)
  }

  loading.value = false
  importRoundModalShow.value = false
  ms.success(`${t('common.success')}, ${t('common.refreshPage')}`)
}
</script>

<template>
  <div class="pt-2">
    <NAlert type="info" :bordered="false">
      <p>{{ $t('apps.exportImport.tip') }}</p>
    </NAlert>
    <div class="flex justify-center m-[50px]">
      <div class="flex flex-col md:flex-row gap-4 w-full max-w-[900px] px-4">
        <!-- 追加导入：支持拖拽上传 -->
        <NUpload
          accept=".sun-panel.json,.sunpanel.json"
          directory-dnd
          :default-upload="false"
          :show-file-list="false"
          class="flex-1"
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
          accept=".sun-panel.json,.sunpanel.json"
          directory-dnd
          :default-upload="false"
          :show-file-list="false"
          class="flex-1"
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

        <div class="self-center">
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
