<script setup lang="ts">
import { NButton, NColorPicker, NGrid, NGridItem, NInput, NRadio, NSpin, NUpload, NUploadDragger } from 'naive-ui'
import type { UploadFileInfo } from 'naive-ui'
import { computed, defineProps, ref } from 'vue'
import { ItemIcon, RoundCardModal } from '@/components/common'
import { useAuthStore } from '@/store'
import { getList } from '@/api/system/file'
import { apiRespErrMsg } from '@/utils/request/apiMessage'

const props = defineProps<{
  itemIcon: Panel.ItemIcon | null
}>()
const emit = defineEmits<{
  (e: 'update:itemIcon', visible: Panel.ItemIcon): void // 定义修改父组件（prop内）的值的事件
}>()
const authStore = useAuthStore()

const iconPickerShow = ref(false)
const iconPickerLoading = ref(false)
const iconList = ref<File.Info[]>([])

async function loadIconList() {
  iconPickerLoading.value = true
  try {
    const { data } = await getList<Common.ListResponse<File.Info[]>>('icon')
    iconList.value = data.list || []
  }
  finally {
    iconPickerLoading.value = false
  }
}

function openIconPicker() {
  iconPickerShow.value = true
  if (iconList.value.length === 0)
    loadIconList()
}

function handlePickIcon(src: string) {
  itemIconInfo.value.src = src
  emit('update:itemIcon', itemIconInfo.value || null)
  iconPickerShow.value = false
}

// 默认图标背景色
const defautSwatchesBackground = [
  '#00000000',
  '#000000',
  '#ffffff',
  '#18A058',
  '#2080F0',
  '#F0A020',
  'rgba(208, 48, 80, 1)',
  '#C418D1FF',
]

const initData: Panel.ItemIcon = {
  itemType: 2,
  backgroundColor: '#2a2a2a6b',
}

const itemIconInfo = computed({
  get() {
    const v = {
      ...initData,
      ...props.itemIcon,
      backgroundColor: props.itemIcon?.backgroundColor || initData.backgroundColor,
    }
    return v
  },
  set() {
    handleChange()
  },
})

function handleIconTypeRadioChange(type: number) {
  // checkedValueRef.value = type
  itemIconInfo.value.itemType = type
  handleChange()
}

function handleChange() {
  emit('update:itemIcon', itemIconInfo.value || null)
}

function handleResetBackgroundColor() {
  itemIconInfo.value.backgroundColor = initData.backgroundColor
  handleChange()
}

const handleUploadFinish = ({
  file,
  event,
}: {
  file: UploadFileInfo
  event?: ProgressEvent
}) => {
  const res = JSON.parse((event?.target as XMLHttpRequest).response)
  if (res.code === 0) {
    const imageUrl = res.data.imageUrl
    itemIconInfo.value.src = imageUrl
    emit('update:itemIcon', itemIconInfo.value || null)
  }
  else {
    apiRespErrMsg(res)
    // ms.error(`${t('common.uploadFail')}:${res.msg}`)
  }

  return file
}
</script>

<template>
  <div>
    <div class="mb-[10px]">
      <NRadio
        :checked="itemIconInfo.itemType === 1 "
        :value="1"
        name="iconType"
        @change="handleIconTypeRadioChange(1)"
      >
        {{ $t('common.text') }}
      </NRadio>

      <NRadio
        :checked="itemIconInfo.itemType === 2"
        :value="2"
        name="iconType"
        @change="handleIconTypeRadioChange(2)"
      >
        {{ $t('common.image') }}
      </NRadio>

      <NRadio
        :checked="itemIconInfo.itemType === 3"
        :value="3"
        name="iconType"
        @change="handleIconTypeRadioChange(3)"
      >
        {{ $t('iconItem.onlineIcon') }}
      </NRadio>
    </div>

    <div class="mb-[10px]">
      <div class="flex">
        <div>
          <div class="border rounded-2xl bg-slate-200 overflow-hidden rounded-2xl transparent-grid">
            <ItemIcon :item-icon="itemIconInfo" />
          </div>
        </div>
        <!-- 文字 -->
        <div class="ml-[20px]">
          <!-- <NImage :src="model.icon" preview-disabled /> -->
          <div v-if="itemIconInfo.itemType === 1">
            <NInput v-model:value="itemIconInfo.text" class="mb-[5px]" size="small" type="text" @input="handleChange" />
          </div>

          <div v-if="itemIconInfo.itemType === 3">
            <div>
              <NInput v-model:value="itemIconInfo.text" class="mb-[5px]" size="small" type="text" :placeholder="$t('iconItem.inputIconName')" @input="handleChange" />

              <NButton quaternary type="info">
                <a target="_blank" href="https://icon-sets.iconify.design/">{{ $t('iconItem.onlineIconLibrary') }}</a>
              </NButton>
            </div>
          </div>

          <!-- 图片 -->
          <div v-if="itemIconInfo.itemType === 2">
            <NInput v-model:value="itemIconInfo.src" class="mb-[5px] w-full" size="small" type="text" :placeholder="$t('iconItem.inputIconUrlOrUpload')" @input="handleChange" />

            <div class="flex flex-col gap-2">
              <NUpload
                action="/api/file/uploadImg?fileType=icon"
                :show-file-list="false"
                name="imgfile"
                accept="image/*"
                :headers="{
                  token: authStore.token as string,
                }"
                @finish="handleUploadFinish"
              >
                <NUploadDragger>
                  <div class="upload-drop-zone">
                    <NButton size="small" type="primary" ghost>
                      {{ $t('iconItem.selectUpload') }}
                    </NButton>
                    <span class="ml-2 text-xs text-slate-500">或拖拽图片到这里</span>
                  </div>
                </NUploadDragger>
              </NUpload>

              <NButton size="small" quaternary type="info" @click="openIconPicker" block>
                选择已上传
              </NButton>
            </div>

            <RoundCardModal v-model:show="iconPickerShow" style="max-width: 720px;" size="small" title="选择已上传图标">
              <div class="min-h-[160px]">
                <NSpin v-show="iconPickerLoading" size="small" />
                <div v-if="!iconPickerLoading && iconList.length === 0" class="text-slate-500 text-sm">
                  暂无已上传图标
                </div>

                <NGrid v-else cols="2 400:4 700:6" :x-gap="8" :y-gap="8">
                  <NGridItem v-for="(it, idx) in iconList" :key="`icon-pick-${idx}`">
                    <div class="pick-card" @click="handlePickIcon(it.src)">
                      <div class="pick-thumb transparent-grid">
                        <img :src="it.src" class="pick-img" alt="icon">
                      </div>
                      <div class="pick-name">{{ it.fileName }}</div>
                    </div>
                  </NGridItem>
                </NGrid>
              </div>
            </RoundCardModal>
          </div>
        </div>
      </div>

      <div class="flex items-center mt-[10px]">
        <div class="w-auto text-slate-500 mr-[10px]">
          {{ $t('common.backgroundColor') }}
        </div>
        <div class="w-[150px] flex items-center mr-[10px]">
          <NColorPicker
            v-model:value="itemIconInfo.backgroundColor"
            size="small"
            :modes="['hex']"
            :swatches="defautSwatchesBackground"
            @complete="handleChange"
            @update-value="handleChange"
          />
        </div>
        <div v-if="itemIconInfo.backgroundColor !== initData.backgroundColor" class="w-auto text-slate-500 mr-[10px] cursor-pointer">
          <NButton quaternary type="info" @click="handleResetBackgroundColor">
            {{ $t('common.reset') }}
          </NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transparent-grid {
    background-image: linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%),
                      linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%);
    background-size: 16px 16px;
    background-position: 0 0, 8px 8px;
}

.upload-drop-zone {
    border: 1px dashed #94a3b8;
    border-radius: 8px;
    padding: 8px 10px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.pick-card {
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.7);
}

.pick-thumb {
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pick-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
}

.pick-name {
    padding: 6px 8px;
    font-size: 12px;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
