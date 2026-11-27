<template>
  <div class="fmea-table flex flex-col gap-3 text-sm">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <label class="relative">
        <span class="sr-only">{{ t.fmea.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.fmea.search"
          class="h-control-sm w-56 max-w-full rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        />
      </label>
      <div class="inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.fmea.priorityFilter">
        <button
          v-for="p in priorityOptions"
          :key="p"
          type="button"
          class="h-control-sm px-2.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="priority === p ? 'bg-accent-subtle text-accent-on-subtle' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="priority === p"
          @click="priority = p"
        >
          {{ p === 'all' ? t.fmea.all : `AP ${p}` }}
        </button>
      </div>
      <label class="inline-flex items-center gap-1.5 text-content-secondary">
        {{ t.fmea.sortBy }}
        <select v-model="sortKey" class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus">
          <option v-for="k in sortKeys" :key="k" :value="k">{{ t.fmea.sorts[k] }}</option>
        </select>
      </label>
      <div class="ml-auto flex flex-wrap gap-2">
        <ChptButton size="sm" color="secondary" is-outline icon="download" :disabled="!rows.length" @click="exportCsv()">{{ t.fmea.exportCsv }}</ChptButton>
        <ChptButton v-if="props.editable" size="sm" icon="add" @click="addRow()">{{ t.fmea.add }}</ChptButton>
      </div>
    </div>

    <!-- 摘要 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <span v-for="p in PRIORITIES" :key="p" class="inline-flex items-center gap-1 tabular-nums">
        <span class="inline-block size-2.5 rounded-full" :style="{ background: role(PRIORITY_TONE[p] + '-solid') }" aria-hidden="true"></span>
        {{ t.fmea.countByPriority(p, summary.byPriority[p]) }}
      </span>
      <span v-if="Number.isFinite(props.threshold)" class="tabular-nums">{{ t.fmea.overThreshold(summary.overThreshold, props.threshold) }}</span>
      <span v-if="summary.openActions" class="tabular-nums">{{ t.fmea.openActions(summary.openActions) }}</span>
      <span v-if="summary.overdueActions" class="font-medium tabular-nums" :style="{ color: role('danger') }">{{ t.fmea.overdueActions(summary.overdueActions) }}</span>
      <span v-if="summary.highWithoutAction" class="font-medium tabular-nums" :style="{ color: role('danger') }">{{ t.fmea.highWithoutAction(summary.highWithoutAction) }}</span>
      <span v-if="summary.rpnBefore" class="tabular-nums" :style="{ color: role('success') }">{{ t.fmea.reduction(summary.rpnBefore, summary.rpnAfter, reductionPct) }}</span>
    </div>

    <!-- 表格：欄位多，外框可左右捲動（可用鍵盤捲） -->
    <div
      ref="scrollRef"
      class="overflow-auto rounded-lg border border-stroke-light focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }"
      tabindex="0"
      role="region"
      :aria-label="props.title || t.fmea.title"
    >
      <table class="w-full min-w-[1100px] border-collapse">
        <thead class="sticky top-0 z-10 bg-surface-secondary text-xs text-content-secondary">
          <tr>
            <th scope="col" class="w-8 bg-surface-secondary px-1 py-2"><span class="sr-only">{{ t.fmea.details }}</span></th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.item }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.failureMode }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.effect }}</th>
            <th scope="col" class="bg-surface-secondary px-1 py-2 text-center font-medium" :title="t.fmea.ratingNames.severity"><abbr :title="t.fmea.ratingNames.severity" class="no-underline">{{ t.fmea.columns.severity }}</abbr></th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.cause }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.prevention }}</th>
            <th scope="col" class="bg-surface-secondary px-1 py-2 text-center font-medium"><abbr :title="t.fmea.ratingNames.occurrence" class="no-underline">{{ t.fmea.columns.occurrence }}</abbr></th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.detectionControl }}</th>
            <th scope="col" class="bg-surface-secondary px-1 py-2 text-center font-medium"><abbr :title="t.fmea.ratingNames.detection" class="no-underline">{{ t.fmea.columns.detection }}</abbr></th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-right font-medium">{{ t.fmea.columns.rpn }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-center font-medium">{{ t.fmea.columns.ap }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.actions }}</th>
            <th scope="col" class="bg-surface-secondary px-2 py-2 text-left font-medium">{{ t.fmea.columns.revised }}</th>
          </tr>
        </thead>
        <tbody v-for="(r, i) in visible" :key="r.id" class="border-t border-stroke-light" :data-row="r.id">
          <tr class="align-top" :class="expanded.has(r.id) ? 'bg-surface-secondary/60' : ''">
            <td class="px-1 py-1.5 text-center">
              <button
                type="button"
                class="inline-flex size-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :aria-expanded="expanded.has(r.id)"
                :aria-controls="`${uid}-d-${r.id}`"
                :aria-label="expanded.has(r.id) ? t.fmea.collapse(nameOf(r)) : t.fmea.expand(nameOf(r))"
                @click="toggle(r.id)"
              >
                <span class="material-symbols-outlined text-lg transition-transform" :class="expanded.has(r.id) ? 'rotate-90' : ''" aria-hidden="true">chevron_right</span>
              </button>
            </td>
            <td class="px-2 py-1.5 text-content-primary">
              <span v-if="sameAsPrev(i)" class="sr-only">{{ t.fmea.sameItem(r.item) }}</span>
              <span v-else class="font-medium">{{ r.item || t.fmea.untitled }}</span>
            </td>
            <td class="px-2 py-1.5 text-content-primary">
              {{ r.failureMode || t.fmea.untitled }}
              <span
                v-if="r.special"
                class="ml-1 rounded px-1 text-[11px] font-semibold"
                :class="r.special === 'CC' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'"
                :title="t.fmea.special[r.special]"
              >{{ r.special }}<span class="sr-only">{{ t.fmea.note(t.fmea.special[r.special]) }}</span></span>
            </td>
            <td class="px-2 py-1.5 text-content-secondary">{{ r.effect }}</td>
            <td class="px-1 py-1.5 text-center">
              <select
                v-if="props.editable"
                :value="clampRating(r['severity'])"
                :aria-label="ratingLabel(r, 'severity')"
                :title="highSev(r) ? t.fmea.highSeverity : undefined"
                class="h-7 w-12 rounded border border-stroke-default bg-surface-primary px-1 text-center text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="highSev(r) ? 'font-semibold' : 'text-content-primary'"
                :style="highSev(r) ? { color: role('danger') } : undefined"
                @change="setRating(r, 'severity', Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
              </select>
              <span v-else class="tabular-nums" :class="highSev(r) ? 'font-semibold' : 'text-content-primary'" :style="highSev(r) ? { color: role('danger') } : undefined" :title="highSev(r) ? t.fmea.highSeverity : undefined">
                {{ clampRating(r['severity']) }}<span v-if="highSev(r)" class="sr-only">{{ t.fmea.note(t.fmea.highSeverity) }}</span>
              </span>
            </td>
            <td class="px-2 py-1.5 text-content-secondary">{{ r.cause }}</td>
            <td class="px-2 py-1.5 text-content-secondary">{{ r.prevention }}</td>
            <td class="px-1 py-1.5 text-center">
              <select
                v-if="props.editable"
                :value="clampRating(r['occurrence'])"
                :aria-label="ratingLabel(r, 'occurrence')"
                :title="false ? t.fmea.highSeverity : undefined"
                class="h-7 w-12 rounded border border-stroke-default bg-surface-primary px-1 text-center text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="false ? 'font-semibold' : 'text-content-primary'"
                :style="false ? { color: role('danger') } : undefined"
                @change="setRating(r, 'occurrence', Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
              </select>
              <span v-else class="tabular-nums" :class="false ? 'font-semibold' : 'text-content-primary'" :style="false ? { color: role('danger') } : undefined" :title="false ? t.fmea.highSeverity : undefined">
                {{ clampRating(r['occurrence']) }}<span v-if="false" class="sr-only">{{ t.fmea.note(t.fmea.highSeverity) }}</span>
              </span>
            </td>
            <td class="px-2 py-1.5 text-content-secondary">{{ r.detectionControl }}</td>
            <td class="px-1 py-1.5 text-center">
              <select
                v-if="props.editable"
                :value="clampRating(r['detection'])"
                :aria-label="ratingLabel(r, 'detection')"
                :title="false ? t.fmea.highSeverity : undefined"
                class="h-7 w-12 rounded border border-stroke-default bg-surface-primary px-1 text-center text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="false ? 'font-semibold' : 'text-content-primary'"
                :style="false ? { color: role('danger') } : undefined"
                @change="setRating(r, 'detection', Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
              </select>
              <span v-else class="tabular-nums" :class="false ? 'font-semibold' : 'text-content-primary'" :style="false ? { color: role('danger') } : undefined" :title="false ? t.fmea.highSeverity : undefined">
                {{ clampRating(r['detection']) }}<span v-if="false" class="sr-only">{{ t.fmea.note(t.fmea.highSeverity) }}</span>
              </span>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums" :class="rpnOver(r) ? 'font-semibold' : 'text-content-primary'" :style="rpnOver(r) ? { color: role('danger') } : undefined">
              {{ rpnOf(r) }}<span v-if="rpnOver(r)" class="sr-only">{{ t.fmea.note(t.fmea.rpnOver(props.threshold)) }}</span>
            </td>
            <td class="px-2 py-1.5 text-center">
              <span class="inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-xs font-semibold" :class="AP_CLASS[actionPriority(r)]" :title="t.fmea.apBadge(actionPriority(r), t.fmea.priorities[actionPriority(r)])">{{ actionPriority(r) }}<span class="sr-only">{{ t.fmea.note(t.fmea.priorities[actionPriority(r)]) }}</span></span>
            </td>
            <td class="px-2 py-1.5">
              <span class="inline-flex items-center gap-1 text-xs" :style="{ color: stateColor(r) }">
                <span class="material-symbols-outlined text-base" aria-hidden="true">{{ STATE_ICON[actionState(r, props.today)] }}</span>
                <template v-if="(r.actions ?? []).length">{{ t.fmea.actionProgress(doneCount(r), (r.actions ?? []).length) }}</template>
                <span :class="(r.actions ?? []).length ? 'sr-only' : ''">{{ t.fmea.actionStates[actionState(r, props.today)] }}</span>
              </span>
            </td>
            <td class="px-2 py-1.5 whitespace-nowrap text-xs">
              <template v-if="r.revised">
                <span class="tabular-nums text-content-primary">{{ t.fmea.revisedSummary(rpnOf(r), rpnOf(r.revised)) }}</span>
                <span class="ml-1 inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-xs font-semibold" :class="AP_CLASS[actionPriority(r.revised)]" :title="t.fmea.apBadge(actionPriority(r.revised), t.fmea.priorities[actionPriority(r.revised)])">{{ actionPriority(r.revised) }}<span class="sr-only">{{ t.fmea.note(t.fmea.priorities[actionPriority(r.revised)]) }}</span></span>
              </template>
              <span v-else class="text-content-tertiary">—<span class="sr-only">{{ t.fmea.notRevised }}</span></span>
            </td>
          </tr>

          <!-- 詳細內容（展開） -->
          <tr v-if="expanded.has(r.id)" :id="`${uid}-d-${r.id}`" class="bg-surface-secondary/60">
            <td colspan="14" class="p-0">
              <!-- 表格比畫面寬：詳細內容固定在看得到的寬度裡，不跟著表格一起被捲出去 -->
              <div class="sticky left-0 px-3 pb-4 pt-1 sm:pl-11" :style="panelStyle">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label v-for="f in TEXT_FIELDS" :key="f" class="flex flex-col gap-1 text-xs text-content-secondary">
                  {{ t.fmea.columns[f] }}
                  <textarea
                    v-if="props.editable"
                    :value="r[f] ?? ''"
                    rows="2"
                    :data-field="f"
                    class="resize-y rounded-md border border-stroke-default bg-surface-primary px-2 py-1 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                    @change="patch(r.id, { [f]: ($event.target as HTMLTextAreaElement).value })"
                  ></textarea>
                  <span v-else class="whitespace-pre-wrap text-sm text-content-primary">{{ r[f] || '—' }}</span>
                </label>
                <label v-if="props.editable" class="flex flex-col gap-1 text-xs text-content-secondary">
                  {{ t.fmea.specialLabel }}
                  <select
                    :value="r.special ?? ''"
                    class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                    @change="patch(r.id, { special: (($event.target as HTMLSelectElement).value || null) as FmeaRow['special'] })"
                  >
                    <option value="">{{ t.fmea.specialNone }}</option>
                    <option value="CC">CC {{ t.fmea.special.CC }}</option>
                    <option value="SC">SC {{ t.fmea.special.SC }}</option>
                  </select>
                </label>
              </div>

              <!-- 對策 -->
              <h4 class="mb-1.5 mt-4 text-xs font-semibold text-content-primary">{{ t.fmea.columns.actions }}</h4>
              <p v-if="!(r.actions ?? []).length" class="text-xs text-content-tertiary">{{ t.fmea.noActions }}</p>
              <ul class="flex flex-col gap-2">
                <li v-for="a in r.actions ?? []" :key="a.id" class="flex flex-wrap items-center gap-2 rounded-md border border-stroke-light bg-surface-primary px-2 py-1.5" :data-action="a.id">
                  <template v-if="props.editable">
                    <label class="inline-flex items-center gap-1 text-xs text-content-secondary">
                      <input type="checkbox" :checked="!!a.done" class="rounded border-stroke-default" @change="patchAction(r, a.id, { done: ($event.target as HTMLInputElement).checked })" />
                      {{ t.fmea.done }}
                    </label>
                    <input
                      :value="a.text"
                      :aria-label="t.fmea.actionText"
                      :placeholder="t.fmea.actionText"
                      class="h-control-sm min-w-48 flex-1 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                      @change="patchAction(r, a.id, { text: ($event.target as HTMLInputElement).value })"
                    />
                    <input
                      :value="a.owner ?? ''"
                      :aria-label="t.fmea.owner"
                      :placeholder="t.fmea.owner"
                      class="h-control-sm w-28 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                      @change="patchAction(r, a.id, { owner: ($event.target as HTMLInputElement).value })"
                    />
                    <input
                      type="date"
                      :value="dateInput(a.due)"
                      :aria-label="t.fmea.due"
                      class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                      @change="patchAction(r, a.id, { due: ($event.target as HTMLInputElement).value || null })"
                    />
                    <button
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded-md text-content-secondary hover:bg-danger-subtle hover:text-danger-on-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                      :aria-label="t.fmea.removeAction(a.text || t.fmea.untitled)"
                      @click="removeAction(r, a.id)"
                    >
                      <span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                    </button>
                  </template>
                  <template v-else>
                    <span class="material-symbols-outlined text-base" :style="{ color: actionColor(a) }" aria-hidden="true">{{ a.done ? 'check_circle' : actionOverdue(a, props.today) ? 'error' : 'radio_button_unchecked' }}</span>
                    <span class="flex-1 text-sm text-content-primary" :class="a.done ? 'line-through decoration-content-tertiary' : ''">{{ a.text }}</span>
                    <span v-if="a.owner" class="text-xs text-content-secondary">{{ t.fmea.labeled(t.fmea.owner, a.owner) }}</span>
                    <span v-if="dateInput(a.due)" class="text-xs tabular-nums" :style="{ color: actionOverdue(a, props.today) ? role('danger') : undefined }">
                      {{ t.fmea.labeled(t.fmea.due, dateInput(a.due)) }}<span v-if="actionOverdue(a, props.today)">{{ t.fmea.note(t.fmea.actionStates.overdue) }}</span>
                    </span>
                    <span class="sr-only">{{ a.done ? t.fmea.actionStates.done : actionOverdue(a, props.today) ? t.fmea.actionStates.overdue : t.fmea.actionStates.open }}</span>
                  </template>
                </li>
              </ul>
              <ChptButton v-if="props.editable" class="mt-2" size="xs" color="secondary" is-outline icon="add" @click="addAction(r)">{{ t.fmea.addAction }}</ChptButton>

              <!-- 改善後重新評分 -->
              <h4 class="mb-1.5 mt-4 text-xs font-semibold text-content-primary">{{ t.fmea.revisedTitle }}</h4>
              <div v-if="r.revised" class="flex flex-wrap items-center gap-3 text-xs text-content-secondary">
                <span v-for="f in RATINGS" :key="f" class="inline-flex items-center gap-1.5">
                  {{ t.fmea.ratingNames[f] }}
                  <select
                    v-if="props.editable"
                    :value="clampRating(r.revised[f])"
                    :aria-label="t.fmea.labeled(t.fmea.revisedTitle, t.fmea.ratingNames[f])"
                    :title="false ? t.fmea.highSeverity : undefined"
                    class="h-7 w-12 rounded border border-stroke-default bg-surface-primary px-1 text-center text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                    :class="false ? 'font-semibold' : 'text-content-primary'"
                    :style="false ? { color: role('danger') } : undefined"
                    @change="setRevised(r, f, Number(($event.target as HTMLSelectElement).value))"
                  >
                    <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                  </select>
                  <span v-else class="tabular-nums" :class="false ? 'font-semibold' : 'text-content-primary'" :style="false ? { color: role('danger') } : undefined" :title="false ? t.fmea.highSeverity : undefined">
                    {{ clampRating(r.revised[f]) }}<span v-if="false" class="sr-only">{{ t.fmea.note(t.fmea.highSeverity) }}</span>
                  </span>
                </span>
                <span class="tabular-nums text-content-primary">{{ t.fmea.revisedSummary(rpnOf(r), rpnOf(r.revised)) }}</span>
                <span class="inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-xs font-semibold" :class="AP_CLASS[actionPriority(r.revised)]" :title="t.fmea.apBadge(actionPriority(r.revised), t.fmea.priorities[actionPriority(r.revised)])">{{ actionPriority(r.revised) }}<span class="sr-only">{{ t.fmea.note(t.fmea.priorities[actionPriority(r.revised)]) }}</span></span>
                <ChptButton v-if="props.editable" size="xs" color="secondary" is-outline @click="patch(r.id, { revised: null })">{{ t.fmea.clearRevised }}</ChptButton>
              </div>
              <div v-else class="flex items-center gap-2 text-xs text-content-tertiary">
                {{ t.fmea.notRevised }}
                <ChptButton v-if="props.editable" size="xs" color="secondary" is-outline @click="patch(r.id, { revised: { severity: r.severity, occurrence: r.occurrence, detection: r.detection } })">{{ t.fmea.revise }}</ChptButton>
              </div>

              <div v-if="props.editable" class="mt-4 border-t border-stroke-light pt-3">
                <ChptButton size="xs" color="danger" is-outline icon="delete" @click="removeRow(r)">{{ t.fmea.removeRow }}</ChptButton>
              </div>
              </div>
            </td>
          </tr>
        </tbody>
        <tbody v-if="!visible.length">
          <tr><td colspan="14" class="px-3 py-6 text-center text-content-tertiary">{{ t.fmea.empty }}</td></tr>
        </tbody>
      </table>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptFmeaTable FMEA 分析表 —— 製程 / 設計失效模式與效應分析。
 *
 * 每列一個失效模式，評嚴重度 S、發生度 O、偵測度 D（1–10），算出 RPN 與 AIAG-VDA 的處置優先等級 AP（H / M / L）。
 * 展開一列可以編輯影響、原因、管制、特殊特性、改善對策（負責人、期限、完成），以及對策完成後的重新評分。
 * 可依 AP 篩選、依 AP / RPN / 嚴重度排序、搜尋；匯出 CSV。v-model 是 FmeaRow[]。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob, type CsvColumn } from '../charts/utils/chartExport'
import {
  actionOverdue,
  actionPriority,
  actionState,
  clampRating,
  createFmeaRow,
  filterFmea,
  fmeaExportRows,
  fmeaId,
  fmeaSummary,
  localDayKey,
  rpnOf,
  sortFmea,
  updateFmeaRow,
  type FmeaAction,
  type FmeaActionState,
  type FmeaPriority,
  type FmeaRow,
  type FmeaSortKey,
} from '../shared/fmea'

export interface ChptFmeaTableProps {
  /** FMEA 項目（v-model） */
  modelValue?: FmeaRow[]
  /** 可編輯：評分下拉、展開後編輯文字與對策、新增 / 刪除項目 */
  editable?: boolean
  /** 標題 */
  title?: string
  /** RPN 達此值時標紅；Infinity 表示不用 RPN 門檻（只看 AP） */
  threshold?: number
  /** 判斷對策逾期的「今天」（預設現在；測試或報表用） */
  today?: number | string | Date
  /** 初始排序 */
  defaultSort?: FmeaSortKey
  /** 表格最大高度（px），超過時捲動、表頭固定 */
  maxHeight?: number
  /** 匯出檔名（不含副檔名） */
  filename?: string
}

const props = withDefaults(defineProps<ChptFmeaTableProps>(), {
  modelValue: () => [],
  editable: false,
  title: '',
  threshold: 100,
  today: undefined,
  defaultSort: 'none',
  maxHeight: undefined,
  filename: 'fmea',
})

const emit = defineEmits<{
  'update:modelValue': [rows: FmeaRow[]]
}>()

const t = useLocale()
const uid = useId()
const role = (name: string) => `rgb(var(--t-${name}))`

const PRIORITIES: FmeaPriority[] = ['H', 'M', 'L']
const PRIORITY_TONE: Record<FmeaPriority, string> = { H: 'danger', M: 'warning', L: 'success' }
const RATINGS = ['severity', 'occurrence', 'detection'] as const
type RatingField = (typeof RATINGS)[number]
const TEXT_FIELDS = ['item', 'failureMode', 'effect', 'cause', 'prevention', 'detectionControl'] as const
const STATE_ICON: Record<FmeaActionState, string> = { none: 'remove', open: 'pending', overdue: 'error', done: 'check_circle' }
const sortKeys: FmeaSortKey[] = ['none', 'ap', 'rpn', 'severity']
const priorityOptions = ['all', ...PRIORITIES] as const

const rows = computed(() => props.modelValue ?? [])
const query = ref('')
const priority = ref<'all' | FmeaPriority>('all')
const sortKey = ref<FmeaSortKey>(props.defaultSort)
const expanded = reactive(new Set<string>())
const announcement = ref('')

/** 捲動外框的可見寬度：展開的詳細內容用這個寬度（sticky），不會超出畫面 */
const scrollRef = ref<HTMLElement | null>(null)
const viewWidth = ref(0)
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  const el = scrollRef.value
  if (!el) return
  viewWidth.value = el.clientWidth
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => (viewWidth.value = el.clientWidth))
    resizeObserver.observe(el)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())
const panelStyle = computed(() => (viewWidth.value > 0 ? { width: `${viewWidth.value}px` } : undefined))

const visible = computed(() =>
  sortFmea(filterFmea(rows.value, { query: query.value, priorities: priority.value === 'all' ? undefined : [priority.value] }), sortKey.value),
)
const summary = computed(() => fmeaSummary(rows.value, { threshold: props.threshold, today: props.today }))
const reductionPct = computed(() => (summary.value.rpnBefore ? Math.round((1 - summary.value.rpnAfter / summary.value.rpnBefore) * 100) : 0))

/** 連續相同的步驟只顯示第一列（像 FMEA 表單的合併儲存格），報讀器仍會讀到「同上」 */
const sameAsPrev = (i: number) => i > 0 && !!visible.value[i].item && visible.value[i].item === visible.value[i - 1].item
const nameOf = (r: FmeaRow) => r.failureMode || r.item || t.value.fmea.untitled
const ratingLabel = (r: FmeaRow, f: RatingField) => t.value.fmea.ratingLabel(nameOf(r), t.value.fmea.ratingNames[f])
const rpnOver = (r: FmeaRow) => rpnOf(r) >= props.threshold
/** 嚴重度 9–10：涉及安全或法規，標紅 */
const highSev = (r: FmeaRow) => clampRating(r.severity) >= 9
/** AP 標籤：成對的 subtle 底 / on-subtle 字（兩個主題都夠對比） */
const AP_CLASS: Record<FmeaPriority, string> = {
  H: 'bg-danger-subtle text-danger-on-subtle',
  M: 'bg-warning-subtle text-warning-on-subtle',
  L: 'bg-success-subtle text-success-on-subtle',
}
const doneCount = (r: FmeaRow) => (r.actions ?? []).filter((a) => a.done).length
function stateColor(r: FmeaRow): string {
  const st = actionState(r, props.today)
  if (st === 'overdue' || (st === 'none' && actionPriority(r) === 'H')) return role('danger')
  if (st === 'done') return role('success')
  return role('content-secondary')
}
const actionColor = (a: FmeaAction) => (a.done ? role('success') : actionOverdue(a, props.today) ? role('danger') : role('content-tertiary'))

/** 期限 → input[type=date] 的值（YYYY-MM-DD，當地日期） */
function dateInput(v: FmeaAction['due']): string {
  const k = localDayKey(v)
  if (k === null) return ''
  const s = String(k)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function commit(next: FmeaRow[]) {
  emit('update:modelValue', next)
}
function patch(id: string, p: Partial<FmeaRow>) {
  commit(updateFmeaRow(rows.value, id, p))
}
function setRating(r: FmeaRow, field: RatingField, value: number) {
  patch(r.id, { [field]: value })
  announcement.value = t.value.fmea.changed(nameOf(r), t.value.fmea.ratingNames[field], String(value))
}
function setRevised(r: FmeaRow, field: RatingField, value: number) {
  if (!r.revised) return
  patch(r.id, { revised: { ...r.revised, [field]: value } })
}
function patchAction(r: FmeaRow, actionId: string, p: Partial<FmeaAction>) {
  patch(r.id, { actions: (r.actions ?? []).map((a) => (a.id === actionId ? { ...a, ...p } : a)) })
}
async function addAction(r: FmeaRow) {
  const a: FmeaAction = { id: fmeaId('a'), text: '', owner: '', due: null, done: false }
  patch(r.id, { actions: [...(r.actions ?? []), a] })
  await nextTick()
  rootQuery<HTMLInputElement>(`[data-action="${a.id}"] input:not([type])`)?.focus()
}
function removeAction(r: FmeaRow, actionId: string) {
  patch(r.id, { actions: (r.actions ?? []).filter((a) => a.id !== actionId) })
}

function toggle(id: string) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}

const rootQuery = <T extends Element>(sel: string) => (typeof document === 'undefined' ? null : document.querySelector<T>(sel))

/** 新增一列：清掉篩選讓它看得到，展開並聚焦第一個欄位 */
async function addRow(partial: Partial<FmeaRow> = {}): Promise<FmeaRow> {
  const row = createFmeaRow(partial)
  query.value = ''
  priority.value = 'all'
  commit([...rows.value, row])
  expanded.add(row.id)
  announcement.value = t.value.fmea.rowAdded
  await nextTick()
  rootQuery<HTMLTextAreaElement>(`[data-row="${row.id}"] textarea[data-field="item"]`)?.focus()
  return row
}
function removeRow(r: FmeaRow) {
  expanded.delete(r.id)
  commit(rows.value.filter((x) => x.id !== r.id))
  announcement.value = t.value.fmea.rowRemoved(nameOf(r))
}

/** 匯出目前篩選 / 排序後的列（CSV，含 BOM，Excel 開中文不會亂碼） */
function exportCsv(filename = props.filename): void {
  const c = t.value.fmea.columns
  const csv = t.value.fmea.csv
  const columns: CsvColumn[] = [
    { key: 'item', title: c.item },
    { key: 'failureMode', title: c.failureMode },
    { key: 'effect', title: c.effect },
    { key: 'special', title: csv.special },
    { key: 'severity', title: c.severity },
    { key: 'cause', title: c.cause },
    { key: 'prevention', title: c.prevention },
    { key: 'occurrence', title: c.occurrence },
    { key: 'detectionControl', title: c.detectionControl },
    { key: 'detection', title: c.detection },
    { key: 'rpn', title: c.rpn },
    { key: 'ap', title: c.ap },
    { key: 'actions', title: c.actions },
    { key: 'revisedSeverity', title: csv.revisedSeverity },
    { key: 'revisedOccurrence', title: csv.revisedOccurrence },
    { key: 'revisedDetection', title: csv.revisedDetection },
    { key: 'revisedRpn', title: csv.revisedRpn },
    { key: 'revisedAp', title: csv.revisedAp },
  ]
  downloadBlob(csvBlob(fmeaExportRows(visible.value, dateInput), columns), `${filename}.csv`)
}

defineExpose({
  /** 新增一列（回傳新列）；會清掉篩選、展開並聚焦 */
  addRow,
  /** 匯出目前顯示的列為 CSV */
  exportCsv,
  /** 展開全部 / 收合全部 */
  expandAll: () => rows.value.forEach((r) => expanded.add(r.id)),
  collapseAll: () => expanded.clear(),
})
</script>
