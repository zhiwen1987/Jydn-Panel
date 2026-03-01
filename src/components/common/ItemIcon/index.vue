<script setup lang="ts">
import { NAvatar } from 'naive-ui'
import { ref, withDefaults } from 'vue'
import { SvgIconOnline } from '@/components/common'

interface Prop {
  itemIcon?: Panel.ItemIcon | null
  size?: number // 默认70
  forceBackground?: string // 强制背景色
}

const props = withDefaults(defineProps<Prop>(), { size: 70 })
const defaultBackground = '#2a2a2a6b'
const defaultStyle = ref({
  width: `${props.size}px`,
  height: `${props.size}px`,
})
</script>

<template>
  <div class="item-icon" :style="defaultStyle">
    <slot>
      <template v-if="itemIcon">
        <template v-if="itemIcon?.itemType === 1">
          <NAvatar :size="props.size" :style="{ backgroundColor: (forceBackground ?? itemIcon?.backgroundColor) || defaultBackground }">
            {{ itemIcon.text }}
          </NAvatar>
        </template>

        <template v-else-if="itemIcon?.itemType === 2">
          <div
            class="icon-img-wrapper"
            :style="{ backgroundColor: (forceBackground ?? itemIcon?.backgroundColor) || defaultBackground, ...defaultStyle }"
          >
            <img :src="itemIcon?.src" class="icon-img" alt="icon">
          </div>
        </template>

        <template v-else-if="itemIcon?.itemType === 3">
          <NAvatar :size="props.size" :style="{ backgroundColor: (forceBackground ?? itemIcon?.backgroundColor) || defaultBackground }">
            <SvgIconOnline style="font-size: 35px;" :icon="itemIcon.text" />
          </NAvatar>
        </template>
      </template>

      <template v-else>
        <NAvatar :size="props.size" />
      </template>
    </slot>
  </div>
</template>

<style scoped>
.item-icon {
  display: inline-flex;
}

/* 图片图标：保持原比例（contain），不够的留空；背景与在线图标一致；留白宽度与在线图标观感一致 */
.icon-img-wrapper {
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 10px;
}

.icon-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
</style>
