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

<script setup>
import ChptCodeBlock from './ChptCodeBlock.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * CodeBlock（@deprecated）—— 請改用 ChptCodeBlock
 *
 * 兩者 props 完全一致，此檔改為薄包裝。
 */
const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  trimIndent: { type: Boolean, default: true },
  tip: { type: String, default: '' },
  tipType: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'warning', 'success', 'error'].includes(value),
  },
  tipTitle: { type: String, default: '重要提示' },
})

warnDeprecated('CodeBlock', 'ChptCodeBlock')
</script>
