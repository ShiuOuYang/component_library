<template>
  <div class="mt-5">
    <h3 v-if="title" class="text-base font-semibold text-content-primary mb-2">{{ title }}</h3>
    <div class="overflow-x-auto border border-stroke-light rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-surface-tertiary">
          <tr>
            <th v-if="hasName" class="px-3 py-2 text-left font-semibold w-44">名稱</th>
            <th class="px-3 py-2 text-left font-semibold">型別 / 參數</th>
            <th v-if="hasDefault" class="px-3 py-2 text-left font-semibold w-32">預設</th>
            <th class="px-3 py-2 text-left font-semibold">說明</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stroke-light">
          <tr v-for="(row, i) in rows" :key="i">
            <td v-if="hasName" class="px-3 py-2 font-mono text-xs align-top">{{ row.name }}</td>
            <td class="px-3 py-2 font-mono text-xs text-content-secondary align-top">{{ row.type || row.params || '—' }}</td>
            <td v-if="hasDefault" class="px-3 py-2 font-mono text-xs text-content-tertiary align-top">{{ row.def || '—' }}</td>
            <td class="px-3 py-2 text-content-primary align-top">{{ row.desc }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  // 這張表在說明哪個元件（空白分隔可列多個）；不是元件 API 的表格寫 '-'。
  // 不顯示在畫面上，給 scripts/check-doc-api.mjs 比對文件與元件實際的 props / events / slots / expose
  of: { type: String, default: '' },
})

const hasName = computed(() => props.rows.some((r) => r.name))
const hasDefault = computed(() => props.rows.some((r) => 'def' in r))
</script>
