<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ChptFilter — type="select"</h1>
        <p class="text-lg text-content-secondary">
          原 FilterSelect 收斂進 ChptFilter；此示範展示單選下拉。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">即時示範</h2>
        <div class="flex items-center gap-6">
          <ChptFilter
            v-model="value"
            type="select"
            label="部門"
            :options="departments"
            placeholder="全部"
            show-all-option
          />
          <span class="text-sm text-content-secondary">目前值：<span class="font-mono font-semibold">{{ value }}</span></span>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptFilter v-model="v" type="select" label="部門" :options="opts" placeholder="全部" />'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptFilter, ChptCodeBlock } from '@/components/library'

const value = ref('')
const departments = ['研發部', '品保部', '製造部', '資訊部', '設備部']
</script>
