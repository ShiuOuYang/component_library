<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ChptFilter — type="tag"</h1>
        <p class="text-lg text-content-secondary">
          原 TagFilterDropdown 收斂進 ChptFilter；此示範展示帶搜尋的緊湊多選標籤面板。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">即時示範</h2>
        <div class="flex items-start gap-6">
          <div class="w-64">
            <ChptFilter
              v-model="selected"
              type="tag"
              label="狀態標籤"
              :options="tags"
              placeholder="搜尋標籤..."
              show-all-option
            />
          </div>
          <span class="text-sm text-content-secondary">已選：<span class="font-mono font-semibold">{{ selected.join(', ') || '—' }}</span></span>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptFilter v-model="selected" type="tag" label="狀態標籤" :options="tags" />'
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
const tags = ['啟用', '停用', '審核中', '封存', '緊急', '逾期']
</script>
