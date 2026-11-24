<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📝</span>
        <h1 class="text-4xl font-bold text-content-primary">表單驗證與上傳</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptForm / ChptFormItem（表單與驗證）、ChptUpload（檔案上傳）。
        欄位元件本身（ChptInput、ChptSelect…）見「基礎表單元件」。
      </p>
    </div>

    <!-- ============ ChptForm ============ -->
    <section id="chpt-form" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptForm / ChptFormItem 表單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>需要驗證的表單。Form 管資料與規則，FormItem 管單一欄位的標籤、錯誤訊息與驗證時機。
        放進 FormItem 的 ChptInput / ChptSelect / ChptTextarea / ChptInputNumber 會自動連線：點標籤聚焦輸入框、錯誤時變紅框並以
        aria-describedby 指向錯誤訊息。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptForm, ChptFormItem } from '@/components/library'</code>
      </p>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="text-sm text-content-secondary">標籤位置</span>
        <ChptSegmented v-model="labelPosition" :options="[{ label: '上方', value: 'top' }, { label: '左側', value: 'left' }]" aria-label="標籤位置" size="xs" />
      </div>

      <div class="rounded-lg border border-stroke-light bg-surface-secondary p-6">
        <ChptForm ref="formRef" :model="order" :rules="rules" :label-position="labelPosition" label-width="7rem" @submit="onSubmit" @invalid="onInvalid">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChptFormItem prop="orderNo" label="工單號" hint="格式 WO-年份-四碼；WO-2026-0001 已存在（模擬非同步檢查）">
              <ChptInput v-model="order.orderNo" placeholder="WO-2026-0917" full-width />
            </ChptFormItem>
            <ChptFormItem prop="part" label="料號">
              <ChptSelect v-model="order.part" :options="partOptions" placeholder="請選擇料號" full-width />
            </ChptFormItem>
            <ChptFormItem prop="qty" label="投入數量">
              <ChptInputNumber v-model="order.qty" :min="0" :max="10000" :step="10" unit="pcs" full-width />
            </ChptFormItem>
            <ChptFormItem prop="contact" label="聯絡信箱">
              <ChptInput v-model="order.contact" type="email" placeholder="name@company.com" full-width />
            </ChptFormItem>
            <ChptFormItem prop="priority" label="優先級">
              <ChptRadio v-model="order.priority" :items="priorityItems" direction="row" />
            </ChptFormItem>
            <ChptFormItem prop="due" label="交期">
              <ChptDatePicker v-model="order.due" placeholder="選擇日期" full-width />
            </ChptFormItem>
          </div>
          <ChptFormItem prop="note" label="備註">
            <ChptTextarea v-model="order.note" :rows="3" :maxlength="200" show-count full-width />
          </ChptFormItem>
          <ChptFormItem prop="files" label="附件" hint="至少一個檔案（BOM 或圖面）">
            <ChptUpload v-model="order.files" multiple accept=".pdf,.xlsx,.dwg" :max-count="3" />
          </ChptFormItem>
          <div class="flex gap-2" :class="labelPosition === 'left' ? 'sm:pl-32' : ''">
            <ChptButton type="submit" label="送出工單" color="primary" size="md" />
            <ChptButton type="reset" label="重設" color="primary" size="md" is-outline />
          </div>
        </ChptForm>
      </div>

      <p v-if="submitResult" class="mt-3 text-sm" :class="submitResult.ok ? 'text-success' : 'text-danger'" role="status">
        {{ submitResult.text }}
      </p>

      <div class="mt-6">
        <ChptCodeBlock :code="formSample" />
      </div>
      <ApiTable of="ChptForm" title="ChptForm Props" :rows="formProps" />
      <ApiTable of="ChptForm" title="ChptForm Events" :rows="formEvents" />
      <ApiTable of="ChptForm" title="ChptForm 方法（ref）" :rows="formMethods" />
      <ApiTable of="ChptFormItem" title="ChptFormItem Props" :rows="formItemProps" />
      <ApiTable of="-" title="驗證規則 FormRule" :rows="ruleRows" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>送出失敗時焦點會移到畫面上第一個錯誤欄位並捲到可見 —— 只顯示紅字而焦點留在送出鈕，
        鍵盤與螢幕閱讀器使用者不知道哪裡錯了。欄位離開時驗證；已顯示錯誤的欄位一改對就消失。
        非同步驗證只採用最後一次的結果。
      </p>
    </section>

    <!-- ============ ChptFormList ============ -->
    <section id="chpt-form-list" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptFormList 動態列</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>一筆單據裡有好幾列要輸入 —— 檢驗單的多筆量測值、工單的多個料號、出貨單的多個箱號。
        綁定一個陣列，每一列的內容由插槽決定；插槽的 <code>path('value')</code> 給出這一列欄位的路徑，
        放在 <code>ChptFormItem</code> 的 <code>prop</code> 上。規則在 ChptForm 寫一次 <code>'measures.*.value'</code>（數字索引換成 *）就套用到每一列。
        新增後自動聚焦到新的一列；<code>min</code> / <code>max</code> 限制列數；<code>sortable</code> 可上下移動。
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptForm ref="inspectRef" :model="inspection" :rules="inspectRules" label-position="top">
          <ChptFormItem prop="lot" label="批號" class="max-w-xs">
            <ChptInput v-model="inspection.lot" placeholder="例如 LOT-2611-07" />
          </ChptFormItem>
          <ChptFormList
            v-model="inspection.measures"
            prop="measures"
            label="量測值（mm）"
            :create-item="() => ({ point: '', value: null })"
            :min="1"
            :max="8"
            sortable
          >
            <template #default="{ path, index }">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ChptFormItem :prop="path('point')" label="量測點">
                  <ChptInput v-model="inspection.measures[index].point" placeholder="例如 孔徑 A" />
                </ChptFormItem>
                <ChptFormItem :prop="path('value')" label="量測值">
                  <ChptInputNumber v-model="inspection.measures[index].value" :step="0.01" :precision="2" />
                </ChptFormItem>
              </div>
            </template>
          </ChptFormList>
          <div class="mt-4 flex gap-2">
            <ChptButton color="primary" @click="submitInspection">送出</ChptButton>
            <ChptButton is-outline @click="inspectRef?.reset()">重設</ChptButton>
          </div>
        </ChptForm>
        <p class="mt-3 text-sm text-content-secondary" aria-live="polite">{{ inspectResult }}</p>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="formListSample" />
      </div>
      <ApiTable of="ChptFormList" title="Props" :rows="formListProps" />
      <ApiTable of="ChptFormList" title="Events" :rows="formListEvents" />
      <ApiTable of="ChptFormList" title="Slots" :rows="formListSlots" />
      <ApiTable of="ChptFormList" title="方法（ref）" :rows="formListMethods" />
    </section>

    <!-- ============ ChptSchemaForm ============ -->
    <section id="chpt-schema-form" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSchemaForm 依設定檔產生表單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>欄位由後端或系統設定決定（不同產品的檢驗項目、不同站別的報工欄位），
        或欄位很多但都很單純的維護畫面。用一個 <code>fields</code> 陣列描述每個欄位的種類、標籤、規則、版面與顯示條件，
        底下仍是 ChptForm + ChptFormItem，驗證、錯誤聚焦與無障礙行為都一樣。
        特殊欄位用 <code>#field-{prop}</code> 插槽自己畫，或在設定裡給 <code>component</code>。
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex items-center gap-3 text-sm text-content-secondary">
          <span aria-hidden="true">每列欄位數</span>
          <ChptSegmented v-model="schemaColumns" :options="[{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }]" aria-label="每列欄位數" size="xs" />
        </div>
        <ChptSchemaForm
          :model="abnormal"
          :fields="abnormalFields"
          :columns="schemaColumns"
          clear-hidden
          @submit="onAbnormalSubmit"
        >
          <template #field-lot="{ value, setValue, disabled }">
            <ChptInput :model-value="value" :disabled="disabled" placeholder="掃描或輸入批號" full-width @update:model-value="(v) => setValue(String(v).toUpperCase())" />
          </template>
        </ChptSchemaForm>
        <pre v-if="abnormalResult" class="mt-3 overflow-x-auto rounded bg-surface-tertiary p-3 text-xs text-content-secondary">{{ abnormalResult }}</pre>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="schemaFormSample" />
      </div>
      <ApiTable of="ChptSchemaForm" title="Props" :rows="schemaFormProps" />
      <ApiTable of="-" title="欄位設定（SchemaFormField）" :rows="schemaFieldRows" />
      <ApiTable of="ChptSchemaForm" title="Events" :rows="schemaFormEvents" />
      <ApiTable of="ChptSchemaForm" title="Slots" :rows="schemaFormSlots" />
      <ApiTable of="ChptSchemaForm" title="方法（ref）" :rows="schemaFormMethods" />
    </section>

    <!-- ============ ChptRichTextEditor ============ -->
    <section id="chpt-rich-text" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptRichTextEditor 富文字編輯器</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>異常描述、改善報告、公告這類需要粗體、清單、連結的長文字（基於 Tiptap）。v-model 是 HTML 字串，清空時是空字串，
        放在 ChptFormItem 裡就能用一般的 <code>required</code> 規則。工具列可自訂；工具列裡左右方向鍵移動、Tab 跳進編輯區。
        連結只接受 http、https、mailto 與站內路徑。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptRichTextEditor } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptForm ref="reportRef" :model="report" :rules="reportRules" @submit="reportResult = report.content">
          <ChptFormItem prop="title" label="主旨" class="max-w-md">
            <ChptInput v-model="report.title" placeholder="例如 SMT-3 吸嘴堵塞改善" />
          </ChptFormItem>
          <ChptFormItem prop="content" label="改善內容" hint="說明原因、對策與效果確認">
            <ChptRichTextEditor v-model="report.content" :max-length="500" placeholder="原因、對策、效果確認…" />
          </ChptFormItem>
          <div class="flex gap-2">
            <ChptButton type="submit">送出</ChptButton>
            <ChptButton type="reset" is-outline>重設</ChptButton>
          </div>
        </ChptForm>
        <details v-if="reportResult" class="mt-3 text-xs text-content-secondary">
          <summary class="cursor-pointer">送出的 HTML</summary>
          <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-surface-tertiary p-2">{{ reportResult }}</pre>
        </details>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="richTextSample" />
      </div>
      <ApiTable of="ChptRichTextEditor" title="Props" :rows="richTextProps" />
      <ApiTable of="ChptRichTextEditor" title="Events" :rows="richTextEvents" />
      <ApiTable of="ChptRichTextEditor" title="方法（ref）" :rows="richTextMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>安全：</strong>輸出只有 Tiptap 認得的標籤（貼上的 &lt;script&gt;、事件屬性、style 會被丟掉），連結擋掉 javascript: 這類網址。
        但前端的限制擋不住直接呼叫 API 的人 —— 要把 HTML 顯示給其他人看時，伺服器端仍要再過濾一次。
      </p>
    </section>

    <!-- ============ ChptSignaturePad ============ -->
    <section id="chpt-signature" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSignaturePad 簽名板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>簽收、點檢確認、放行簽核 —— 在平板上用手指或觸控筆簽名。線條平滑、粗細隨書寫速度（筆有壓力時隨壓力）變化；
        簽名中不會捲動頁面、多指觸控只取第一根手指。每簽完一筆更新 v-model（PNG data URL，空白為 null），也可以輸出 SVG 或只裁出有簽名的範圍。
        簽名區固定白底黑字（像一張紙），深色模式也不反轉。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSignaturePad } from '@/components/library'</code>
      </p>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="space-y-3">
          <ChptSignaturePad
            ref="signatureRef"
            v-model="signature"
            label="品保放行簽名"
            :height="180"
            trim
            :error-text="signatureError"
            @begin="signatureError = ''"
          />
          <div class="flex flex-wrap gap-2">
            <ChptButton size="sm" icon="verified" @click="releaseLot">放行</ChptButton>
            <ChptButton size="sm" is-outline icon="download" :disabled="!signature" @click="downloadSignature">下載 SVG</ChptButton>
          </div>
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-3 text-sm">
          <p class="mb-2 font-medium text-content-primary">v-model 預覽（trim）</p>
          <!-- 簽名圖是透明底深色筆跡：預覽時放在白底上 -->
          <div class="flex h-24 items-center justify-center rounded border border-stroke-light" style="background: #fff">
            <img v-if="signature" :src="signature" alt="簽名預覽" class="max-h-20 max-w-full" />
            <span v-else class="text-xs" style="color: #6b7280">尚未簽名</span>
          </div>
          <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ releaseMsg }}</p>
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="signatureSample" />
      <ApiTable of="ChptSignaturePad" title="Props" :rows="signatureProps" />
      <ApiTable of="ChptSignaturePad" title="Events" :rows="signatureEvents" />
      <ApiTable of="ChptSignaturePad" title="方法（ref）" :rows="signatureMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>簽名只能用指標（手指、筆、滑鼠）完成；無法使用指標的使用者需要另一種確認方式（例如輸入工號與密碼），
        請在流程上提供替代方案。存檔時建議存 v-model 的圖片；要做筆跡比對或之後重新編輯時，另外存 <code>getStrokes()</code> 的資料。
      </p>
    </section>

    <!-- ============ ChptChecklist ============ -->
    <section id="chpt-checklist" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptChecklist 點檢表</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>設備日常點檢、首件檢查、IPQC 巡檢 —— 平板上逐項確認、量測、拍照。目視項目選合格 / 不合格 / 不適用（大按鍵）；
        量測項目填數值後<strong>依上下限自動判定</strong>，作業員不能自己選合格。不合格時必須填原因；可以附照片。
        上方有進度與不合格數，可以只看待處理或不合格的項目。<code>validate()</code> 標出未填與缺原因的項目並捲到第一個；
        <code>#footer</code> 插槽放簽名與送出按鈕。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptChecklist } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptChecklist ref="checklistRef" v-model="checkResults" :items="checkItems" numpad allow-photos>
          <template #footer="{ summary }">
            <div class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <ChptSignaturePad v-model="checkSignature" label="點檢人員簽名" :height="120" :error-text="checkSignError" @begin="checkSignError = ''" />
              <div class="flex flex-col items-start gap-2 md:items-end">
                <ChptButton icon="task_alt" @click="submitChecklist">送出點檢（{{ summary.done }}/{{ summary.total }}）</ChptButton>
                <ChptButton size="sm" is-outline @click="checklistRef?.reset(); checkSignature = null; checkMsg = ''">清除重填</ChptButton>
              </div>
            </div>
            <p class="mt-2 text-sm text-content-secondary" aria-live="polite">{{ checkMsg }}</p>
          </template>
        </ChptChecklist>
      </div>
      <ChptCodeBlock class="mt-6" :code="checklistSample" />
      <ApiTable of="ChptChecklist" title="Props" :rows="checklistProps" />
      <ApiTable of="-" title="ChecklistItem（items 的每一筆）" :rows="checklistItemRows" />
      <ApiTable of="-" title="ChecklistResult（v-model 的每一項）" :rows="checklistResultRows" />
      <ApiTable of="ChptChecklist" title="Events" :rows="checklistEvents" />
      <ApiTable of="ChptChecklist" title="Slots" :rows="checklistSlots" />
      <ApiTable of="ChptChecklist" title="方法（ref）" :rows="checklistMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>量測項目的合格與否由上下限決定（等於界限算合格），存進 v-model 的 status 也會跟著數值重算。
        照片預設讀成 data URL 存在結果裡，檔案大時請用 <code>photo-reader</code> 先上傳、只存網址。
      </p>
    </section>

    <!-- ============ ChptWorkInstruction ============ -->
    <section id="chpt-work-instruction" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptWorkInstruction 作業指導書</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>現場一步一步照著做 —— 換線、設備保養、首件檢驗、組裝。每一步有圖片（可加編號標記）、說明、注意事項與規格；
        要勾選確認或輸入量測值（超出上下限不能下一步）才能前進，<code>minSeconds</code> 可要求至少停留幾秒。完成的步驟可以回去看，未完成的不能跳過。
        平板上左右滑動切換。紀錄（每一步的時間、量測值）用 <code>v-model:record</code> 保存，中斷後可以接著做；完成時送出 <code>complete</code>。
        ChptChecklist 是一張表一次填完；這裡是有順序、有圖的步驟。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptWorkInstruction } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptWorkInstruction
          v-model:record="wiRecord"
          v-model:current="wiCurrent"
          :steps="wiSteps"
          title="SMT 換線 SOP（PCB-A12 → B07）"
          @complete="(s) => toast.success(`換線完成，共 ${Math.round(s.durationMs / 1000)} 秒`)"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="wiSample" />
      <ApiTable of="ChptWorkInstruction" title="Props" :rows="wiProps" />
      <ApiTable of="-" title="WiStep" :rows="wiDataRows" />
      <ApiTable of="ChptWorkInstruction" title="Events" :rows="wiEvents" />
      <ApiTable of="ChptWorkInstruction" title="方法（ref）" :rows="wiMethods" />
    </section>

    <!-- ============ ChptAqlSampling ============ -->
    <section id="chpt-aql-sampling" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAqlSampling 抽樣檢驗</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>進料檢驗（IQC）、出貨檢驗（OQC）依 ANSI/ASQ Z1.4（ISO 2859-1）抽樣。輸入批量、選檢驗水準，
        每個缺點等級依 AQL 查出樣本數、允收數 Ac、拒收數 Re（表上是箭頭時依標準換方案，樣本數跟著變）。
        邊檢驗邊按 + 記錄已檢數與不良數：任一等級不良數達到 Re 立刻判定拒收，檢完樣本且都在 Ac 以內為允收。
        依最近各批結果（<code>history</code>）提示轉換規則：改為加嚴、減量、或停止檢驗。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAqlSampling } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-content-secondary">最近各批：</span>
          <ChptSegmented v-model="aqlHistoryKey" :options="aqlHistoryOptions" aria-label="最近各批結果" size="xs" />
        </div>
        <ChptAqlSampling
          v-model="aqlRecord"
          :classes="aqlClasses"
          :history="aqlHistory"
          title="IQC：電源供應器 PSU-65W"
          @verdict="(v) => (v === 'accept' ? toast.success('整批允收') : toast.error('整批拒收'))"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="aqlSample" />
      <ApiTable of="ChptAqlSampling" title="Props" :rows="aqlProps" />
      <ApiTable of="ChptAqlSampling" title="Events" :rows="aqlEvents" />
      <ApiTable of="ChptAqlSampling" title="方法（ref）" :rows="aqlMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>範圍：</strong>內建 Z1.4 表 I（樣本代字）與表 II-A（正常檢驗、單次抽樣）；加嚴與減量的方案請依標準另行查表，元件只提示何時該轉換。
        查表函式也匯出成 <code>aqlCodeLetter</code>、<code>aqlNormalPlan</code>、<code>aqlVerdict</code>、<code>aqlSwitchingAdvice</code>。
      </p>
    </section>

    <!-- ============ ChptUpload ============ -->
    <section id="chpt-upload" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptUpload 檔案上傳</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>附件、圖片、報表等一般檔案上傳（要把 Excel 讀成資料請用 ChptExcelUploader）。
        上傳方式由你的 <code>request</code> 函式決定，元件負責格式／大小／數量檢查、進度、取消與重試。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptUpload } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-2">拖放 + 自動上傳（檔名含 fail 會模擬失敗）</h3>
          <ChptUpload
            v-model="uploadFiles"
            multiple
            accept=".pdf,.xlsx,.csv,image/*"
            :max-size="20 * 1024 * 1024"
            :max-count="5"
            :request="fakeRequest"
          />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-2">按鈕樣式、只收集檔案（隨表單一起送出）</h3>
          <ChptUpload v-model="plainFiles" :drag="false" accept=".xlsx" button-text="選擇 Excel" />
          <p class="mt-2 text-xs text-content-tertiary">目前：{{ plainFiles.map((f) => f.name).join('、') || '（無）' }}</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="uploadSample" />
      </div>
      <ApiTable of="ChptUpload" title="Props" :rows="uploadProps" />
      <ApiTable of="ChptUpload" title="Events" :rows="uploadEvents" />
      <ApiTable of="ChptUpload" title="方法（ref）" :rows="uploadMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>accept</code> 只是檔案對話框的建議（使用者可以選「所有檔案」，拖放更完全不受限），
        所以元件會再檢查一次並說明拒絕原因。上傳中按 ✕ 會透過 <code>AbortSignal</code> 真的中止請求。
        檔案選擇框以 sr-only 隱藏，仍可用 Tab 聚焦、Enter 開啟。
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  ChptForm,
  ChptFormItem,
  ChptFormList,
  ChptSchemaForm,
  ChptRichTextEditor,
  ChptSignaturePad,
  ChptChecklist,
  ChptWorkInstruction,
  ChptAqlSampling,
  useToast,
  ChptInput,
  ChptSelect,
  ChptInputNumber,
  ChptRadio,
  ChptDatePicker,
  ChptTextarea,
  ChptUpload,
  ChptButton,
  ChptSegmented,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptSignaturePad ----
const signatureRef = ref(null)
const signature = ref(null)
const signatureError = ref('')
const releaseMsg = ref('')
function releaseLot() {
  if (!signature.value) {
    signatureError.value = '放行前請先簽名'
    return
  }
  releaseMsg.value = `已放行（簽名圖 ${Math.round(signature.value.length / 1024)} KB）`
}
function downloadSignature() {
  const svg = signatureRef.value?.toSVG({ trim: true })
  if (!svg) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  a.download = 'signature.svg'
  a.click()
  URL.revokeObjectURL(a.href)
}
const signatureSample = `<ChptFormItem prop="signature" label="品保放行簽名">
  <ChptSignaturePad v-model="form.signature" :height="180" trim />
</ChptFormItem>

<!-- 輸出 SVG（向量，列印清楚） / 筆跡資料（存回後端可再載入） -->
const svg = padRef.value.toSVG({ trim: true })
const strokes = padRef.value.getStrokes()`
const signatureProps = [
  { name: 'modelValue', type: 'string | null', def: 'null', desc: '簽名圖（data URL）；每簽完一筆更新，空白為 null。傳入既有圖片時顯示在底下' },
  { name: 'height', type: 'number', def: '200', desc: '簽名區高度（px）' },
  { name: 'width', type: 'string', def: "'100%'", desc: '寬度（CSS 值）' },
  { name: 'penColor', type: 'string', def: "'#111827'", desc: '筆跡顏色（簽名區固定白底，請用深色）' },
  { name: 'minWidth / maxWidth', type: 'number', def: '0.8 / 2.8', desc: '線寬範圍（px）：寫得快變細、慢變粗' },
  { name: 'trim', type: 'boolean', def: 'false', desc: 'v-model 只輸出有簽名的範圍（四周留 8px）' },
  { name: 'exportBackground', type: 'string | null', def: 'null', desc: '輸出的背景色；不給為透明' },
  { name: 'exportType', type: "'image/png' | 'image/jpeg' | 'image/webp'", def: "'image/png'", desc: 'v-model 的圖片格式（JPEG 沒有透明，請搭配 exportBackground）' },
  { name: 'label / placeholder', type: 'string', def: '語系', desc: '螢幕閱讀器念的名稱／空白時的提示' },
  { name: 'showToolbar', type: 'boolean', def: 'true', desc: '顯示提示與復原、清除按鈕' },
  { name: 'errorText', type: 'string', def: "''", desc: '錯誤訊息（邊框變紅、以 alert 念出）' },
  { name: 'disabled / readonly', type: 'boolean', def: 'false', desc: '禁用／唯讀（顯示簽名，不能再畫）' },
]
const signatureEvents = [
  { name: 'update:modelValue', params: '(value: string | null)', desc: '每簽完一筆、復原、清除時' },
  { name: 'begin', params: '()', desc: '開始一筆（可用來清掉錯誤訊息）' },
  { name: 'end', params: '(strokeCount: number)', desc: '完成一筆' },
  { name: 'clear', params: '()', desc: '清除時' },
]
const signatureMethods = [
  { name: 'toDataURL(options?)', type: '({ type, quality, trim, background }) => string', desc: '輸出圖片；空白時為空字串' },
  { name: 'toSVG(options?)', type: '({ trim, background }) => string', desc: '輸出 SVG（只含這次畫的筆跡）' },
  { name: 'getStrokes() / setStrokes(strokes)', type: 'SignatureStroke[]', desc: '取得／載入筆跡資料' },
  { name: 'undo() / clear()', type: '() => void', desc: '復原上一筆／清除' },
  { name: 'isEmpty()', type: '() => boolean', desc: '是否空白' },
]

// ---- ChptChecklist ----
const checklistRef = ref(null)
const checkItems = [
  { id: 'a1', section: '外觀與安全', label: '安全門連鎖正常', description: '打開安全門，機台應立即停止' },
  { id: 'a2', section: '外觀與安全', label: '刮刀無缺口、無殘膏' },
  { id: 'a3', section: '外觀與安全', label: '鋼板張力與清潔', description: '目視無破孔、無堵孔', allowNA: false },
  { id: 'm1', section: '量測', type: 'measure', label: '刮刀壓力', lsl: 4.5, usl: 6.5, target: 5.5, unit: 'kg', precision: 1 },
  { id: 'm2', section: '量測', type: 'measure', label: '印刷速度', lsl: 20, usl: 60, unit: 'mm/s' },
  { id: 'm3', section: '量測', type: 'measure', label: '錫膏回溫時間', lsl: 4, unit: 'h', precision: 1 },
  { id: 't1', section: '記錄', type: 'text', label: '錫膏批號' },
  { id: 't2', section: '記錄', type: 'text', label: '備註', required: false },
]
const checkResults = ref({ a1: { status: 'ok' }, m1: { value: 5.6, status: 'ok' } })
const checkSignature = ref(null)
const checkSignError = ref('')
const checkMsg = ref('')
function submitChecklist() {
  const summary = checklistRef.value.validate()
  if (!summary.complete) {
    checkMsg.value = `還有 ${summary.missing.length + summary.noteRequired.length} 項需要處理`
    return
  }
  if (!checkSignature.value) {
    checkSignError.value = '送出前請簽名'
    checkMsg.value = ''
    return
  }
  checkMsg.value = `已送出：合格 ${summary.ok}、不合格 ${summary.ng}、不適用 ${summary.na}`
}
const checklistSample = `<ChptChecklist ref="checklistRef" v-model="results" :items="items" numpad allow-photos>
  <template #footer="{ summary }">
    <ChptSignaturePad v-model="signature" label="點檢人員簽名" />
    <ChptButton @click="submit">送出（{{ summary.done }}/{{ summary.total }}）</ChptButton>
  </template>
</ChptChecklist>

const items = [
  { id: 'a1', section: '外觀與安全', label: '安全門連鎖正常' },
  { id: 'm1', section: '量測', type: 'measure', label: '刮刀壓力', lsl: 4.5, usl: 6.5, unit: 'kg', precision: 1 },
  { id: 't1', section: '記錄', type: 'text', label: '錫膏批號' },
]
function submit() {
  const summary = checklistRef.value.validate()   // 標出問題並捲到第一個
  if (summary.complete) save(results.value)
}`
const checklistProps = [
  { name: 'items', type: 'ChecklistItem[]', def: '—', desc: '點檢項目（依 section 分組）' },
  { name: 'modelValue', type: 'Record<string, ChecklistResult>', def: '{}', desc: '各項結果（v-model）' },
  { name: 'requireNoteOnNg', type: 'boolean', def: 'true', desc: '不合格時必須填寫原因' },
  { name: 'allowPhotos', type: 'boolean', def: 'false', desc: 'check 與 measure 項目可附照片（手機會開相機）；個別項目可用 photos 覆寫' },
  { name: 'photoReader', type: '(file: File) => Promise<string>', def: '讀成 data URL', desc: '改成上傳後回傳網址' },
  { name: 'numpad', type: 'boolean', def: 'false', desc: '量測項目旁邊顯示數字鍵盤按鈕' },
  { name: 'showFilter', type: 'boolean', def: 'true', desc: '顯示「全部 / 待處理 / 不合格」篩選' },
  { name: 'readonly / disabled', type: 'boolean', def: 'false', desc: '唯讀（檢視結果）／禁用' },
]
const checklistItemRows = [
  { name: 'id / label', type: 'string', def: '—', desc: '唯一鍵／項目名稱' },
  { name: 'type', type: "'check' | 'measure' | 'text'", def: "'check'", desc: '目視確認／量測值（自動判定）／文字記錄' },
  { name: 'section / description', type: 'string', def: '—', desc: '分組標題／說明（方法、判定標準）' },
  { name: 'required', type: 'boolean', def: 'true', desc: '必填' },
  { name: 'allowNA', type: 'boolean', def: 'true', desc: 'check 項目可以選「不適用」' },
  { name: 'photos', type: 'boolean', def: '依 allowPhotos', desc: '這一項可以附照片（text 項目預設不附）' },
  { name: 'lsl / usl / target', type: 'number', def: '—', desc: 'measure：下限／上限（含等於）／目標值' },
  { name: 'unit / precision', type: 'string / number', def: '—', desc: 'measure：單位／小數位數' },
]
const checklistResultRows = [
  { name: 'status', type: "'ok' | 'ng' | 'na' | null", def: '—', desc: 'check 為選擇；measure、text 依內容自動計算' },
  { name: 'value / text', type: 'number / string', def: '—', desc: 'measure 的數值／text 的內容' },
  { name: 'note', type: 'string', def: '—', desc: '備註；不合格時的原因與處置' },
  { name: 'photos', type: 'string[]', def: '—', desc: '照片（data URL 或網址）' },
  { name: 'at', type: 'string（ISO）', def: '—', desc: '最後填寫時間' },
]
const checklistEvents = [
  { name: 'update:modelValue', params: '(results)', desc: '任何一項改變時' },
  { name: 'change', params: '(itemId: string, result: ChecklistResult)', desc: '某一項改變' },
]
const checklistSlots = [{ name: 'footer', params: '{ summary, validate }', desc: '表單下方（簽名、送出按鈕）' }]
const checklistMethods = [
  { name: 'validate()', type: '() => ChecklistSummary', desc: '標出未填與缺原因的項目、捲到並聚焦第一個；回傳摘要（complete 為可送出）' },
  { name: 'focusItem(id)', type: '(id: string) => void', desc: '捲到並聚焦某一項' },
  { name: 'reset()', type: '() => void', desc: '清除所有結果' },
  { name: 'summary()', type: '() => ChecklistSummary', desc: '目前的完成數、合格／不合格／不適用數與問題清單' },
]

// ---- ChptFormList ----
const inspectRef = ref(null)
const inspection = reactive({
  lot: '',
  measures: [{ point: '孔徑 A', value: 3.02 }, { point: '', value: null }],
})
const inspectRules = {
  lot: { required: true },
  // 數字索引換成 *：每一列都套用
  'measures.*.point': { required: true, message: '請輸入量測點' },
  'measures.*.value': [{ required: true, message: '請輸入量測值' }, { type: 'number' }, { min: 0, max: 50 }],
}
const inspectResult = ref('')
async function submitInspection() {
  const { valid, errors } = await inspectRef.value.validate()
  inspectResult.value = valid ? `已送出：${inspection.measures.length} 筆量測值` : `有 ${Object.keys(errors).length} 個欄位需要修正`
}
const formListSample = `<ChptForm :model="form" :rules="rules">
  <ChptFormList
    v-model="form.measures"
    prop="measures"
    label="量測值"
    :create-item="() => ({ point: '', value: null })"
    :min="1"
    :max="8"
    sortable
  >
    <template #default="{ path, index }">
      <ChptFormItem :prop="path('value')" label="量測值">
        <ChptInputNumber v-model="form.measures[index].value" />
      </ChptFormItem>
    </template>
  </ChptFormList>
</ChptForm>

const rules = {
  // 數字索引換成 *：每一列都套用
  'measures.*.value': [{ required: true }, { type: 'number' }],
}`
const formListProps = [
  { name: 'modelValue', type: 'T[]', def: '—', desc: '陣列（v-model）' },
  { name: 'prop', type: 'string', def: "''", desc: '陣列在 ChptForm model 裡的路徑；插槽的 path() 以它為開頭' },
  { name: 'label / itemLabel', type: 'string', def: "''", desc: '整組標題（群組名稱）；每一列的名稱（螢幕閱讀器念「量測值 第 2 筆」）' },
  { name: 'createItem', type: '() => T', def: '() => ({})', desc: '新增一列時的初始值' },
  { name: 'min / max', type: 'number', def: '0 / —', desc: '最少 / 最多幾列；到達時刪除 / 新增鈕停用' },
  { name: 'sortable', type: 'boolean', def: 'false', desc: '每一列顯示上移 / 下移鈕' },
  { name: 'showIndex', type: 'boolean', def: 'true', desc: '每列左側顯示序號' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用新增、刪除、移動' },
  { name: 'addText / emptyText', type: 'string', def: '語系（繁中「新增一列」/「尚無資料…」）', desc: '新增鈕與空狀態的文字' },
]
const formListEvents = [
  { name: 'update:modelValue', params: '(value: T[])', desc: '新增、刪除、移動後的新陣列' },
  { name: 'add', params: '(item, index)', desc: '新增了一列' },
  { name: 'remove', params: '(item, index)', desc: '刪除了一列' },
]
const formListSlots = [
  { name: 'default', params: '{ item, index, path(field?), remove, moveUp, moveDown, canRemove }', desc: '每一列的內容；path("value") 為 "measures.0.value"' },
  { name: 'header', params: '{ count }', desc: '自訂標題列' },
  { name: 'empty', params: '—', desc: '沒有資料時的內容' },
]
const formListMethods = [
  { name: 'add(item?, at?)', type: '(T?, number?) => Promise<number>', desc: '新增一列（不給 item 時用 createItem），回傳索引；超過 max 時回傳 -1' },
  { name: 'remove(index) / move(index, delta)', type: '(number) => void', desc: '刪除；上下移動（delta 為 -1 / 1）' },
]

// ---- ChptRichTextEditor ----
const reportRef = ref(null)
const report = reactive({
  title: 'SMT-3 吸嘴堵塞改善',
  content: '<h2>原因</h2><p>吸嘴<strong>未依保養週期清潔</strong>，錫膏殘留造成堵塞。</p><h2>對策</h2><ul><li><p>保養週期由 7 天改為 3 天</p></li><li><p>換線時加做吸嘴檢查</p></li></ul>',
})
const reportRules = {
  title: { required: true },
  content: { required: true, message: '請填寫改善內容' },
}
const reportResult = ref('')
const richTextSample = `<ChptFormItem prop="content" label="改善內容">
  <ChptRichTextEditor v-model="form.content" :max-length="500" placeholder="原因、對策、效果確認…" />
</ChptFormItem>

<!-- 自訂工具列（'|' 是分隔線） -->
<ChptRichTextEditor v-model="note" :toolbar="['bold', 'italic', '|', 'bulletList', 'link']" :min-height="80" />`
const richTextProps = [
  { name: 'modelValue', type: 'string', def: "''", desc: 'HTML（v-model）；清空時是空字串' },
  { name: 'toolbar', type: 'RichTextTool[]', def: '全部', desc: "bold、italic、underline、strike、heading2、heading3、bulletList、orderedList、blockquote、codeBlock、link、undo、redo、clear；'|' 是分隔線；空陣列不顯示工具列" },
  { name: 'placeholder', type: 'string', def: '語系（繁中「輸入內容…」）', desc: '空白時的提示' },
  { name: 'disabled / readonly', type: 'boolean', def: 'false', desc: '停用；唯讀（不顯示工具列）' },
  { name: 'minHeight / maxHeight', type: 'number', def: '120 / —', desc: '編輯區高度（px；超過 maxHeight 時捲動）' },
  { name: 'maxLength / showCount', type: 'number / boolean', def: '— / false', desc: '字數上限（只提示、超過時標紅，不截斷）；顯示字數' },
  { name: 'ariaLabel', type: 'string', def: '—', desc: '沒有 ChptFormItem 時的名稱' },
  { name: 'errorText', type: 'string', def: '—', desc: '錯誤訊息（在 ChptFormItem 裡時由驗證決定）' },
]
const richTextEvents = [
  { name: 'update:modelValue', params: '(html: string)', desc: '內容改變' },
  { name: 'focus / blur', params: '—', desc: '編輯區取得 / 失去焦點' },
]
const richTextMethods = [
  { name: 'focus()', type: '() => void', desc: '聚焦到編輯區' },
  { name: 'getText()', type: '() => string', desc: '純文字內容' },
  { name: 'editor', type: 'ShallowRef<Editor>', desc: 'Tiptap 的 editor 實例（進階用途）' },
]

// ---- ChptSchemaForm ----
const schemaColumns = ref(2)
const machinesByLine = { 'SMT-1': ['貼片機 A', '貼片機 B', '回焊爐'], 'SMT-2': ['貼片機 C', '回焊爐'], DIP: ['波焊爐', '插件機'] }
const abnormal = reactive({})
const abnormalFields = [
  { type: 'section', label: '發生地點', hint: '機台清單依線別而定' },
  { prop: 'line', label: '線別', type: 'select', required: true, options: Object.keys(machinesByLine).map((v) => ({ label: v, value: v })) },
  {
    prop: 'machine',
    label: '機台',
    type: 'select',
    required: true,
    options: (m) => (machinesByLine[m.line] ?? []).map((v) => ({ label: v, value: v })),
    disabled: (m) => !m.line,
  },
  { prop: 'lot', label: '批號', required: true, rules: { pattern: /^[A-Z0-9-]+$/, message: '只能有英數字與 -' } },
  { prop: 'time', label: '發生時間', type: 'time' },
  { type: 'section', label: '異常內容' },
  {
    prop: 'level',
    label: '等級',
    type: 'radio',
    defaultValue: 'minor',
    options: [{ label: '輕微', value: 'minor' }, { label: '嚴重', value: 'major' }, { label: '停線', value: 'stop' }],
  },
  { prop: 'qty', label: '影響數量', type: 'number', defaultValue: 0, props: { min: 0, unit: 'pcs' }, rules: { type: 'number', min: 0 } },
  {
    prop: 'notify',
    label: '通知對象',
    type: 'checkbox',
    hint: '嚴重以上才需要通知',
    options: [{ label: '線長', value: 'leader' }, { label: '製程工程師', value: 'pe' }, { label: '品保', value: 'qa' }],
    visible: (m) => m.level !== 'minor',
    rules: { required: true, message: '請至少選一位通知對象' },
  },
  { prop: 'stopped', label: '已停機', type: 'switch', visible: (m) => m.level === 'stop' },
  { prop: 'desc', label: '現象描述', type: 'textarea', required: true, span: 'full', props: { rows: 3, maxlength: 200, showCount: true } },
]
const abnormalResult = ref('')
function onAbnormalSubmit(model) {
  abnormalResult.value = JSON.stringify(model, null, 2)
}
const schemaFormSample = `<ChptSchemaForm :model="form" :fields="fields" :columns="2" clear-hidden @submit="save">
  <!-- 特殊欄位自己畫（一樣有標籤與驗證） -->
  <template #field-lot="{ value, setValue }">
    <ChptInput :model-value="value" @update:model-value="(v) => setValue(v.toUpperCase())" />
  </template>
</ChptSchemaForm>

const form = reactive({})
const fields = [
  { type: 'section', label: '發生地點' },
  { prop: 'line', label: '線別', type: 'select', required: true, options: lineOptions },
  // 選項依目前的資料決定；沒選線別時停用
  { prop: 'machine', label: '機台', type: 'select', options: (m) => machinesOf(m.line), disabled: (m) => !m.line },
  { prop: 'lot', label: '批號', required: true },
  { prop: 'level', label: '等級', type: 'radio', options: levels, defaultValue: 'minor' },
  // 條件顯示：隱藏的欄位不驗證；clear-hidden 時一併清掉值
  { prop: 'notify', label: '通知對象', type: 'checkbox', options: people, visible: (m) => m.level !== 'minor' },
  { prop: 'desc', label: '現象描述', type: 'textarea', required: true, span: 'full' },
]`
const schemaFormProps = [
  { name: 'model', type: 'Record<string, unknown>', def: '—', desc: '表單資料（reactive 物件）；欄位值直接寫回，缺少的欄位會補上初始值' },
  { name: 'fields', type: 'SchemaFormField[]', def: '—', desc: '欄位設定（見下表）' },
  { name: 'rules', type: 'FormRules', def: '{}', desc: '額外的驗證規則（鍵是欄位路徑），與欄位自己的 rules 合併' },
  { name: 'columns', type: 'number', def: '1', desc: '一列放幾個欄位；小於 640px 時一律一欄' },
  { name: 'labelPosition / labelWidth / gap', type: "'top' | 'left' / string / 'sm' | 'md' | 'lg'", def: "'top' / '8rem' / 'md'", desc: '同 ChptForm' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用整張表單' },
  { name: 'clearHidden', type: 'boolean', def: 'false', desc: '欄位被隱藏時把值還原成 defaultValue（避免送出看不到的舊資料）' },
  { name: 'showActions', type: 'boolean', def: 'true', desc: '顯示送出 / 重設鈕' },
  { name: 'submitText / resetText', type: 'string', def: '語系（繁中「送出」/「重設」）', desc: '按鈕文字' },
]
const schemaFieldRows = [
  { name: 'prop', type: 'string', def: '—', desc: '欄位路徑（可用 a.b.c，中間物件不存在時自動建立）' },
  { name: 'label / hint', type: 'string', def: '—', desc: '標籤；說明文字（section 時顯示在標題下方）' },
  { name: 'type', type: "'input' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'switch' | 'date' | 'time' | 'section'", def: "'input'", desc: '欄位種類；section 是區段標題' },
  { name: 'component', type: 'Component', def: '—', desc: '自訂輸入元件（支援 v-model 即可），給了就不看 type' },
  { name: 'props', type: 'Record<string, unknown>', def: '—', desc: '傳給輸入元件的 props（placeholder、min、range…）' },
  { name: 'options', type: 'SchemaFieldOption[] | (model) => SchemaFieldOption[]', def: '—', desc: 'select / radio / checkbox 的選項，可依目前資料決定' },
  { name: 'required / rules', type: 'boolean / FormRule | FormRule[]', def: '—', desc: '必填；這個欄位的規則' },
  { name: 'defaultValue', type: 'unknown', def: '依種類（checkbox []、switch false…）', desc: 'model 裡沒有這個欄位時填入；重設時還原成它' },
  { name: 'span', type: "number | 'full'", def: '1', desc: '佔幾欄（不超過 columns）' },
  { name: 'visible', type: '(model) => boolean', def: '—', desc: '依資料決定是否顯示；隱藏的欄位不驗證' },
  { name: 'disabled', type: 'boolean | (model) => boolean', def: 'false', desc: '停用；可依資料決定' },
]
const schemaFormEvents = [
  { name: 'submit', params: '(model)', desc: '驗證通過後送出' },
  { name: 'invalid', params: '(errors: Record<string, string>)', desc: '驗證失敗' },
  { name: 'change', params: '(prop: string, value)', desc: '任何欄位的值改變' },
]
const schemaFormSlots = [
  { name: 'field-{prop}', params: '{ field, model, value, setValue, disabled }', desc: '自己畫某個欄位的輸入元件（外層的標籤、錯誤訊息照舊）' },
  { name: 'actions', params: '{ submitting, validate, resetFields }', desc: '取代送出 / 重設鈕' },
]
const schemaFormMethods = [
  { name: 'validate(fields?, options?)', type: 'Promise<{ valid, errors }>', desc: '同 ChptForm' },
  { name: 'validateField(field) / resetFields(fields?) / clearValidate(fields?)', type: '—', desc: '同 ChptForm' },
  { name: 'submit()', type: '() => Promise<void>', desc: '以程式送出' },
]

// ---- ChptForm ----
const formRef = ref(null)
const labelPosition = ref('top')
const order = reactive({
  orderNo: '',
  part: '',
  qty: null,
  contact: '',
  priority: 'normal',
  due: null,
  note: '',
  files: [],
})
const partOptions = ['PCB-A12-R3', 'PCB-B07-R1', 'FPC-C33-R2']
const priorityItems = [
  { label: '急件', value: 'urgent' },
  { label: '一般', value: 'normal' },
  { label: '低', value: 'low' },
]
const rules = {
  orderNo: [
    { required: true },
    { pattern: /^WO-\d{4}-\d{4}$/, message: '格式應為 WO-年份-四碼，例如 WO-2026-0917' },
    {
      // 模擬到伺服器查重複
      validator: (v) => new Promise((resolve) => setTimeout(() => resolve(v === 'WO-2026-0001' ? '此工單號已存在' : true), 400)),
    },
  ],
  part: { required: true, message: '請選擇料號' },
  qty: [{ required: true }, { min: 1, message: '投入數量至少 1 片' }],
  contact: { type: 'email' },
  due: { required: true, message: '請選擇交期' },
  note: { max: 200 },
  files: { required: true, message: '請上傳至少一個附件' },
}
const submitResult = ref(null)
function onSubmit(model) {
  submitResult.value = { ok: true, text: `已送出：${model.orderNo}（${model.part}，${model.qty} pcs）` }
}
function onInvalid(errors) {
  submitResult.value = { ok: false, text: `有 ${Object.keys(errors).length} 個欄位需要修正` }
}

const formSample = `<ChptForm :model="order" :rules="rules" @submit="save">
  <ChptFormItem prop="orderNo" label="工單號" hint="WO-年份-四碼">
    <ChptInput v-model="order.orderNo" />
  </ChptFormItem>
  <ChptFormItem prop="qty" label="投入數量">
    <ChptInputNumber v-model="order.qty" :min="0" unit="pcs" />
  </ChptFormItem>
  <ChptButton type="submit" label="送出" color="primary" />
</ChptForm>

const rules = {
  orderNo: [
    { required: true },
    { pattern: /^WO-\\d{4}-\\d{4}$/, message: '格式應為 WO-年份-四碼' },
    { validator: async (v) => (await api.exists(v)) ? '此工單號已存在' : true },
  ],
  qty: [{ required: true }, { min: 1 }],
  confirm: { validator: (v, model) => v === model.password || '兩次密碼不一致' },
}`

const formProps = [
  { name: 'model', type: 'Record<string, unknown>', def: '—', desc: '表單資料（reactive）；欄位路徑可用 a.b.c' },
  { name: 'rules', type: 'Record<string, FormRule | FormRule[]>', def: '{}', desc: '驗證規則，鍵是欄位路徑' },
  { name: 'labelPosition', type: "'top' | 'left'", def: "'top'", desc: '標籤位置（窄螢幕一律在上方）' },
  { name: 'labelWidth', type: 'string', def: "'8rem'", desc: '標籤在左側時的寬度' },
  { name: 'gap', type: "'sm' | 'md' | 'lg'", def: "'md'", desc: '欄位間距' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用整個表單（fieldset disabled）' },
]
const formEvents = [
  { name: 'submit', params: '(model)', desc: '驗證通過後送出' },
  { name: 'invalid', params: '(errors: Record<string, string>)', desc: '驗證失敗（焦點已移到第一個錯誤欄位）' },
]
const formMethods = [
  { name: 'validate', params: '(fields?) => Promise<{ valid, errors }>', desc: '驗證全部或指定欄位' },
  { name: 'validateField', params: '(field) => Promise', desc: '驗證單一欄位（不移動焦點）' },
  { name: 'resetFields', params: '(fields?)', desc: '還原成初始值並清除錯誤' },
  { name: 'clearValidate', params: '(fields?)', desc: '只清除錯誤訊息' },
  { name: 'submit', params: '()', desc: '以程式送出（等同按送出鈕）' },
]
const formItemProps = [
  { name: 'prop', type: 'string', def: '—', desc: '欄位路徑（對應 model 與 rules）' },
  { name: 'label', type: 'string', def: "''", desc: '標籤' },
  { name: 'required', type: 'boolean', def: '—', desc: '必填（不設定時看規則裡有沒有 required）' },
  { name: 'rules', type: 'FormRule | FormRule[]', def: '—', desc: '額外規則（與 Form 的 rules 合併）' },
  { name: 'hint', type: 'string', def: "''", desc: '說明文字（沒有錯誤時顯示，並連到輸入框的 aria-describedby）' },
  { name: 'labelWidth', type: 'string', def: '—', desc: '覆寫 Form 的標籤寬度' },
  { name: 'showMessage', type: 'boolean', def: 'true', desc: '是否顯示錯誤訊息文字' },
]
const ruleRows = [
  { name: 'required', type: 'boolean', def: '—', desc: '必填（空白字串、null、空陣列算沒填；0 與 false 算有填）' },
  { name: 'type', type: "'email' | 'url' | 'number' | 'integer'", def: '—', desc: '內建格式' },
  { name: 'min / max', type: 'number', def: '—', desc: '字串與陣列看長度，數字看大小' },
  { name: 'pattern', type: 'RegExp', def: '—', desc: '正規式' },
  { name: 'validator', type: '(value, model) => true | string | Promise', def: '—', desc: '自訂（可 async、可跨欄位）' },
  { name: 'message', type: 'string', def: '—', desc: '錯誤訊息（不給時用預設訊息）' },
  { name: 'trigger', type: "'blur' | 'change'", def: "'blur'", desc: 'change：值一改變就檢查' },
]

// ---- ChptUpload ----
const uploadFiles = ref([])
const plainFiles = ref([])

/** 模擬上傳：每 150ms 前進一段；檔名含 fail 時在一半失敗 */
function fakeRequest(file, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    let p = 0
    const timer = setInterval(() => {
      p += 10 + Math.random() * 15
      onProgress(Math.min(p, 100))
      if (file.name.toLowerCase().includes('fail') && p >= 50) {
        clearInterval(timer)
        reject(new Error('伺服器回應 500'))
      } else if (p >= 100) {
        clearInterval(timer)
        resolve({ id: Date.now() })
      }
    }, 150)
    signal.addEventListener('abort', () => {
      clearInterval(timer)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

const uploadSample = `<ChptUpload
  v-model="files"
  multiple
  accept=".pdf,.xlsx,image/*"
  :max-size="20 * 1024 * 1024"
  :max-count="5"
  :request="upload"
/>

// 用 fetch 或 axios 都可以；記得把 signal 傳下去，按取消才會真的中止
async function upload(file, { onProgress, signal }) {
  const body = new FormData()
  body.append('file', file)
  const res = await axios.post('/api/files', body, {
    signal,
    onUploadProgress: (e) => onProgress((e.loaded / (e.total ?? file.size)) * 100),
  })
  return res.data
}`

const uploadProps = [
  { name: 'modelValue', type: 'UploadFile[]', def: '[]', desc: '檔案清單：{ uid, name, size, status, percent?, error?, response?, raw? }' },
  { name: 'accept', type: 'string', def: "''", desc: '允許的類型（.xlsx、image/*、完整 MIME）' },
  { name: 'multiple', type: 'boolean', def: 'false', desc: '可多選；單選時新檔案取代舊的' },
  { name: 'maxSize / maxCount', type: 'number', def: '—', desc: '單檔大小上限（bytes）／清單上限' },
  { name: 'request', type: '(file, { onProgress, signal }) => Promise', def: '—', desc: '上傳函式；不給就只收集檔案' },
  { name: 'autoUpload', type: 'boolean', def: 'true', desc: '選好檔案立即上傳（false 時呼叫 submit()）' },
  { name: 'drag', type: 'boolean', def: 'true', desc: '拖放區；false 時只有一顆按鈕' },
  { name: 'label / buttonText / hint', type: 'string', def: '—', desc: '標籤／按鈕文字／說明（不給時依限制自動產生）' },
  { name: 'disabled / fullWidth', type: 'boolean', def: 'false / true', desc: '停用／全寬' },
]
const uploadEvents = [
  { name: 'update:modelValue', params: '(files)', desc: '清單變更（含進度更新）' },
  { name: 'add / remove', params: '(files) / (file)', desc: '加入通過檢查的檔案／移除' },
  { name: 'reject', params: '(file: File, reason)', desc: '被拒絕的檔案與原因' },
  { name: 'success / error', params: '(file, response | error)', desc: '上傳完成／失敗' },
]
const uploadMethods = [
  { name: 'submit', params: '() => Promise<boolean>', desc: '上傳所有還沒上傳（或失敗）的檔案' },
  { name: 'open', params: '()', desc: '開啟檔案選擇' },
  { name: 'addFiles', params: '(files: File[])', desc: '以程式加入（例如從剪貼簿貼上）' },
]
const toast = useToast()

// ---- ChptAqlSampling ----
const aqlRecord = ref({ lotSize: 1000, level: 'II', inspected: 0, defects: {} })
const aqlClasses = [
  { key: 'critical', aql: 0.065 },
  { key: 'major', aql: 1 },
  { key: 'minor', aql: 2.5 },
]
const aqlHistoryOptions = [
  { label: '最近都允收', value: 'ok' },
  { label: '5 批內 2 批拒收', value: 'bad' },
  { label: '連續 10 批允收', value: 'good' },
]
const aqlHistoryKey = ref('ok')
const aqlHistory = computed(
  () => ({ ok: [true, true, false, true, true], bad: [true, false, true, true, false], good: Array(10).fill(true) })[aqlHistoryKey.value]
)
const aqlSample = `<ChptAqlSampling
  v-model="record"
  :classes="[
    { key: 'critical', aql: 0.065 },
    { key: 'major', aql: 1.0 },
    { key: 'minor', aql: 2.5 },
  ]"
  :history="lastLots"
  @verdict="(v, record) => api.saveInspection(v, record)"
/>

// record：{ lotSize: 1000, level: 'II', inspected: 0, defects: {} }`
const aqlProps = [
  { name: 'v-model', type: 'AqlRecord', def: "{ lotSize: null, level: 'II', inspected: 0, defects: {} }", desc: '批量、檢驗水準、已檢數、各等級不良數（以及使用者改過的 AQL：aqls）' },
  { name: 'classes', type: '{ key, label?, aql }[]', def: '主要 1.0、次要 2.5', desc: "缺點等級與預設 AQL；key 為 critical / major / minor 時名稱用語系" },
  { name: 'severity', type: "'normal' | 'tightened' | 'reduced'", def: "'normal'", desc: '目前的檢驗嚴格度（只用來給轉換建議；方案一律為正常檢驗）' },
  { name: 'history', type: 'boolean[]', def: '[]', desc: '最近各批結果（舊 → 新，true = 允收）；加嚴時只放加嚴期間的批' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只看' },
]
const aqlEvents = [
  { name: 'update:modelValue', params: '(record)', desc: '批量、水準、AQL、已檢數、不良數改變' },
  { name: 'verdict', params: "(verdict: 'accept' | 'reject', record)", desc: '整批判定變成允收或拒收時' },
]
const aqlMethods = [
  { name: 'reset()', type: '() => void', desc: '清除已檢數與不良數（批量與水準保留）' },
  { name: 'rows', type: '{ cls, label, aql, plan, defects, verdict }[]', desc: '各缺點等級的方案與判定' },
  { name: 'overall', type: "'pending' | 'accept' | 'reject'", desc: '整批判定' },
]
// ---- ChptWorkInstruction ----
/** 示意圖（SVG）：一個機台面板與幾個零件 */
const wiSvg = (accent, extra = '') =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300">
<rect width="640" height="300" fill="#e5e7eb"/><rect x="40" y="40" width="560" height="220" rx="12" fill="#9ca3af"/>
<rect x="80" y="80" width="160" height="140" rx="8" fill="#374151"/><rect x="280" y="90" width="120" height="60" rx="6" fill="${accent}"/>
<circle cx="480" cy="120" r="34" fill="#1f2937"/><circle cx="480" cy="120" r="12" fill="#d1d5db"/>
<rect x="280" y="180" width="280" height="24" rx="4" fill="#4b5563"/>${extra}</svg>`)}`
const wiSteps = [
  {
    id: 'w1',
    title: '停機並掛上警示牌',
    body: '按下面板上的「停止」，確認輸送帶完全停止後，在操作面板掛上「換線中」警示牌。',
    image: wiSvg('#dc2626'),
    marks: [{ x: 0.53, y: 0.4, label: '停止按鈕' }, { x: 0.25, y: 0.5, label: '操作面板（掛警示牌）' }],
    cautions: ['輸送帶未完全停止前不可伸手進入', '需兩人確認'],
    check: { kind: 'confirm', label: '已停機並掛上警示牌' },
  },
  {
    id: 'w2',
    title: '更換吸嘴',
    body: '依新料號的吸嘴表更換 3、5、7 號吸嘴。',
    image: wiSvg('#2563eb', '<g fill="#f59e0b"><circle cx="310" cy="192" r="8"/><circle cx="380" cy="192" r="8"/><circle cx="450" cy="192" r="8"/></g>'),
    marks: [{ x: 0.48, y: 0.64 }, { x: 0.59, y: 0.64 }, { x: 0.7, y: 0.64 }],
    specs: [{ label: '吸嘴型號', value: 'N-504 / N-506 / N-508' }],
    check: { kind: 'confirm', label: '3 支吸嘴已更換並確認型號' },
  },
  {
    id: 'w3',
    title: '鎖緊固定螺絲並量測扭力',
    body: '用扭力起子鎖緊吸嘴座的 4 顆固定螺絲，量測其中一顆的扭力並記錄。',
    image: wiSvg('#16a34a', '<g fill="#111827"><circle cx="300" cy="100" r="6"/><circle cx="380" cy="100" r="6"/><circle cx="300" cy="140" r="6"/><circle cx="380" cy="140" r="6"/></g>'),
    marks: [{ x: 0.47, y: 0.33 }, { x: 0.59, y: 0.33 }, { x: 0.47, y: 0.47 }, { x: 0.59, y: 0.47 }],
    specs: [{ label: '扭力', value: '1.2 ± 0.1', unit: 'N·m' }, { label: '工具', value: '扭力起子 TD-12' }],
    check: { kind: 'measure', label: '量測扭力', unit: 'N·m', lsl: 1.1, usl: 1.3, precision: 2 },
  },
  {
    id: 'w4',
    title: '載入新程式',
    body: '在面板選擇程式 PCB-B07-R2，確認畫面上的料號與工單一致。',
    specs: [{ label: '程式', value: 'PCB-B07-R2' }, { label: '工單', value: 'WO-2611-0051' }],
    minSeconds: 5,
    check: { kind: 'confirm', label: '程式與工單料號一致' },
  },
  {
    id: 'w5',
    title: '首件量測',
    body: '生產第一片後，量測 C12 電容的錫膏高度。',
    check: { kind: 'measure', label: 'C12 錫膏高度', unit: 'µm', lsl: 100, usl: 140, precision: 0 },
  },
  {
    id: 'w6',
    title: '取下警示牌、恢復生產',
    check: { kind: 'confirm', label: '已取下警示牌並通知組長' },
  },
]
const wiRecord = ref({})
const wiCurrent = ref(0)
const wiSample = `<ChptWorkInstruction
  v-model:record="record"
  v-model:current="current"
  :steps="[
    { id: 'w1', title: '停機並掛上警示牌', image: '/sop/stop.png', marks: [{ x: 0.53, y: 0.4, label: '停止按鈕' }],
      cautions: ['輸送帶未完全停止前不可伸手進入'], check: { kind: 'confirm', label: '已停機並掛上警示牌' } },
    { id: 'w3', title: '量測扭力', specs: [{ label: '扭力', value: '1.2 ± 0.1', unit: 'N·m' }],
      check: { kind: 'measure', label: '量測扭力', unit: 'N·m', lsl: 1.1, usl: 1.3, precision: 2 } },
    { id: 'w4', title: '載入新程式', minSeconds: 5, check: { kind: 'confirm', label: '程式與工單一致' } },
  ]"
  title="SMT 換線 SOP"
  @complete="(summary) => api.saveRecord(summary)"
/>`
const wiProps = [
  { name: 'steps', type: 'WiStep[]', def: '—', desc: '步驟' },
  { name: 'v-model:record', type: 'Record<stepId, WiStepRecord>', def: '{}', desc: '每一步的紀錄（開始 / 完成時間、確認、量測值、是否合格）；存起來中斷後可以接著做' },
  { name: 'v-model:current', type: 'number', def: '0', desc: '目前第幾步（0 起算）' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只看（不能勾選、輸入、前進）' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計時用的現在時間；不給時每秒更新' },
]
const wiDataRows = [
  { name: 'WiStep', type: '{ id, title, body?, image?, imageAlt?, marks?, cautions?, specs?, check?, minSeconds? }', def: '—', desc: 'marks：圖片上的編號標記 { x, y（0–1）, label? }；specs：{ label, value, unit? }' },
  { name: 'check（確認）', type: "{ kind: 'confirm', label }", def: '—', desc: '勾選後才能下一步' },
  { name: 'check（量測）', type: "{ kind: 'measure', label, unit?, lsl?, usl?, precision? }", def: '—', desc: '輸入量測值，在上下限內才能下一步' },
  { name: 'minSeconds', type: 'number', def: '—', desc: '至少停留幾秒（避免沒看就跳過）' },
]
const wiEvents = [
  { name: 'update:record', params: '(record)', desc: '紀錄改變' },
  { name: 'update:current', params: '(index: number)', desc: '切換步驟' },
  { name: 'complete', params: '(summary: WiSummary)', desc: '最後一步完成：開始 / 完成時間、總時間、每一步的時間與量測值' },
]
const wiMethods = [
  { name: 'next() / prev() / go(i)', type: '—', desc: '前進（要符合條件）、上一步、跳到某一步（只能到已完成或第一個未完成的）' },
  { name: 'restart()', type: '() => void', desc: '清除紀錄、從頭開始' },
  { name: 'summary', type: 'WiSummary', desc: '目前的摘要' },
]
</script>
