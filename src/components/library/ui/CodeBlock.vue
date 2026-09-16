<template>
  <ChptCodeBlock
    :code="props.code"
    :language="props.language"
    :trim-indent="props.trimIndent"
    :tip="props.tip"
    :tip-type="props.tipType"
    :tip-title="props.tipTitle"
  />
</template>

<script setup lang="ts">
import ChptCodeBlock from './ChptCodeBlock.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * CodeBlock（@deprecated）—— 請改用 ChptCodeBlock
 *
 * 兩者 props 完全一致，此檔改為薄包裝。
 */
type TipType = 'info' | 'warning' | 'success' | 'error'

interface CodeBlockProps {
  code: string
  language?: string
  trimIndent?: boolean
  tip?: string
  tipType?: TipType
  tipTitle?: string
}

const props = withDefaults(defineProps<CodeBlockProps>(), {
  language: 'javascript',
  trimIndent: true,
  tip: '',
  tipType: 'info',
  tipTitle: '重要提示',
})

warnDeprecated('CodeBlock', 'ChptCodeBlock')
</script>
