<template>
  <div class="mt-5">
    <h3 class="text-base font-semibold text-neutral-800 mb-2">{{ title }}</h3>
    <div class="overflow-x-auto border border-neutral-200 rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-neutral-100">
          <tr>
            <th v-if="hasName" class="px-3 py-2 text-left font-semibold w-44">名稱</th>
            <th class="px-3 py-2 text-left font-semibold">型別 / 參數</th>
            <th v-if="hasDefault" class="px-3 py-2 text-left font-semibold w-32">預設</th>
            <th class="px-3 py-2 text-left font-semibold">說明</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100">
          <tr v-for="(row, i) in rows" :key="i">
            <td v-if="hasName" class="px-3 py-2 font-mono text-xs align-top">{{ row.name }}</td>
            <td class="px-3 py-2 font-mono text-xs text-neutral-600 align-top">{{ row.type || row.params || '—' }}</td>
            <td v-if="hasDefault" class="px-3 py-2 font-mono text-xs text-neutral-500 align-top">{{ row.def || '—' }}</td>
            <td class="px-3 py-2 text-neutral-700 align-top">{{ row.desc }}</td>
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
})

const hasName = computed(() => props.rows.some((r) => r.name))
const hasDefault = computed(() => props.rows.some((r) => 'def' in r))
</script>
