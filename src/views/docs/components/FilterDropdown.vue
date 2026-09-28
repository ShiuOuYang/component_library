<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ChptFilter — type="dropdown"</h1>
        <p class="text-lg text-content-secondary">
          原 FilterDropdown 收斂進 ChptFilter；此示範展示多選下拉（全選＋複選）。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">即時示範</h2>
        <div class="flex items-center gap-6">
          <ChptFilter
            v-model="selected"
            type="dropdown"
            label="職稱"
            :options="positions"
            placeholder="全部"
            show-all-option
          />
          <span class="text-sm text-content-secondary">已選：<span class="font-mono font-semibold">{{ selected.join(', ') || '—' }}</span></span>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptFilter v-model="selected" type="dropdown" label="職稱" :options="opts" />'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptFilter, ChptCodeBlock } from '@/components/library'

const selected = ref([])
const positions = ['前端工程師', '後端工程師', '測試工程師', '製程工程師', '設備工程師', 'UI 設計師']
</script>
