<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">ChptFilter — type="select"</h1>
        <p class="text-lg text-neutral-600">
          原 FilterSelect 收斂進 ChptFilter；此示範展示單選下拉。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">即時示範</h2>
        <div class="flex items-center gap-6">
          <ChptFilter
            v-model="value"
            type="select"
            label="部門"
            :options="departments"
            placeholder="全部"
            show-all-option
          />
          <span class="text-sm text-neutral-600">目前值：<span class="font-mono font-semibold">{{ value }}</span></span>
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
