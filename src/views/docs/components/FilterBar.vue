<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ChptFilterBar 過濾橫列</h1>
        <p class="text-lg text-content-secondary">
          原 FilterBar 收斂進 ChptFilterBar：以單一 filters 設定多欄過濾器，單一物件 modelValue 雙向綁定。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">即時示範</h2>
        <div class="border border-stroke-light rounded-lg p-4">
          <ChptFilterBar
            :filters="filters"
            v-model="model"
            :show-count="true"
            :count="123"
            count-label="筆"
          />
        </div>
        <p class="text-sm text-content-secondary mt-3">
          目前條件：<span class="font-mono font-semibold">{{ JSON.stringify(model) }}</span>
        </p>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptFilterBar :filters="filters" v-model="model" :count="123" />'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptFilterBar, ChptCodeBlock } from '@/components/library'

const model = ref({})

const filters = [
  {
    key: 'department',
    label: '部門',
    allLabel: '全部部門',
    allCount: 123,
    options: [
      { value: 'rd', label: '研發部', count: 40 },
      { value: 'qa', label: '品保部', count: 22 },
      { value: 'mf', label: '製造部', count: 35 },
      { value: 'it', label: '資訊部', count: 15 },
    ],
  },
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用', count: 90 },
      { value: 'disabled', label: '停用', count: 33 },
    ],
  },
]
</script>
