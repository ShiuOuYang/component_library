<template>
  <!--
    display: contents：Provider 本身不產生版面（不會多一層 block 打亂 flex / grid），
    只在有 locale 時帶上 lang 屬性，讓螢幕閱讀器用對的語言唸內建文字。
  -->
  <div :lang="props.locale?.code" class="contents">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provideConfig, type ChptLocale, type ConfigSize } from '@/components/library/shared/config'

/**
 * ChptConfigProvider —— 一個區塊內的元件統一尺寸與內建文字
 *
 * ```vue
 * <ChptConfigProvider size="sm" :locale="enUS">
 *   <ChptTable … />   ← 「No data」「Loading」
 *   <ChptInput … />   ← 預設 sm
 * </ChptConfigProvider>
 * ```
 */
interface ChptConfigProviderProps {
  /** 表單元件與按鈕的預設尺寸（元件自己有傳 size 時以元件為準） */
  size?: ConfigSize
  /** 內建文字；可以只給部分欄位 */
  locale?: Partial<ChptLocale>
}

const props = withDefaults(defineProps<ChptConfigProviderProps>(), {
  size: undefined,
  locale: undefined,
})

provideConfig(() => ({ size: props.size, locale: props.locale }))
</script>
