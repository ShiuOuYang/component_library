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
      <p class="text-sm text-content-secondary mb-4">
        <strong>延遲載入：</strong>Tiptap 約 340 kB。只有少數頁面用得到時，可以用
        <code class="bg-surface-tertiary px-1 py-0.5 rounded">defineAsyncComponent(() =&gt; import('@/components/library/ui/ChptRichTextEditor.vue'))</code>
        讓它在畫面真的出現時才下載（本頁就是這樣做的）。
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

    <!-- ============ ChptQueryBuilder ============ -->
    <section id="chpt-query-builder" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptQueryBuilder 條件建構器</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>讓使用者自己組查詢條件，例如報表篩選、警報規則、資料匯出條件。AND / OR 群組可以巢狀，
        欄位依型別給對應的運算子與輸入（數字、日期的「介於」、選項的「屬於」可複選）；條目可以拖曳排序或拖到別的群組。
        <code>v-model</code> 是條件的 JSON，交給後端轉成 SQL / API 參數；前端篩選可以直接用 <code>evaluateQuery</code>。
        ChptFilterBar 是固定欄位的快速篩選；這裡是任意組合的條件。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptQueryBuilder, evaluateQuery } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptQueryBuilder ref="qbRef" v-model="qbQuery" :fields="qbFields" allow-not title="工單篩選條件" />
        <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <ChptButton size="xs" is-outline icon="rule" @click="qbValid = qbRef?.validate()">檢查條件</ChptButton>
          <span v-if="qbValid !== null" :class="qbValid ? 'text-success' : 'text-danger'">{{ qbValid ? '條件完整' : '有條件沒填完整' }}</span>
          <span class="ml-auto text-content-secondary">符合 {{ qbMatched.length }} / {{ qbRows.length }} 張工單</span>
        </div>
        <div class="mt-2 overflow-x-auto rounded-md border border-stroke-light">
          <table class="w-full whitespace-nowrap text-xs">
            <thead class="bg-surface-secondary text-left text-content-secondary">
              <tr><th class="px-2 py-1.5 font-medium">工單</th><th class="px-2 py-1.5 font-medium">線別</th><th class="px-2 py-1.5 font-medium">狀態</th><th class="px-2 py-1.5 text-right font-medium">良率</th><th class="px-2 py-1.5 text-right font-medium">數量</th><th class="px-2 py-1.5 font-medium">交期</th><th class="px-2 py-1.5 font-medium">急單</th></tr>
            </thead>
            <tbody class="divide-y divide-stroke-light bg-surface-primary text-content-primary">
              <tr v-for="r in qbMatched" :key="r.orderNo"><td class="px-2 py-1 font-mono">{{ r.orderNo }}</td><td class="px-2 py-1">{{ r.line }}</td><td class="px-2 py-1">{{ qbStatusLabel(r.status) }}</td><td class="px-2 py-1 text-right tabular-nums">{{ r.yield }}</td><td class="px-2 py-1 text-right tabular-nums">{{ r.qty }}</td><td class="px-2 py-1 tabular-nums">{{ r.due }}</td><td class="px-2 py-1">{{ r.urgent ? '是' : '' }}</td></tr>
              <tr v-if="!qbMatched.length"><td colspan="7" class="px-2 py-3 text-center text-content-tertiary">沒有符合的工單</td></tr>
            </tbody>
          </table>
        </div>
        <details class="mt-3 rounded-md border border-stroke-light bg-surface-primary">
          <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-content-primary">條件 JSON（v-model）</summary>
          <ChptCodeBlock class="m-2" :code="qbJson" />
        </details>
      </div>
      <ChptCodeBlock class="mt-6" :code="qbSample" />
      <ApiTable of="ChptQueryBuilder" title="Props" :rows="qbProps" />
      <ApiTable of="-" title="各型別的運算子" :rows="qbOps" />
      <ApiTable of="ChptQueryBuilder" title="Events" :rows="qbEvents" />
      <ApiTable of="ChptQueryBuilder" title="方法（ref）" :rows="qbMethods" />
    </section>

    <!-- ============ ChptCronInput ============ -->
    <section id="chpt-cron-input" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCronInput 排程設定</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>設定報表寄送、資料同步、設備巡檢這類定期工作。選「每 N 分鐘 / 每小時 / 每天 / 每週 / 每月」再點選時間，
        或直接改 cron 表達式（5 欄：分 時 日 月 週），兩邊同步；下方用文字說明並列出接下來幾次執行時間（瀏覽器的時區）。
        表達式寫錯時指出是哪一欄；像 <code>*/10 9-17 * * 1-5</code> 這種簡易設定表達不了的，會切到「自訂」。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCronInput } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-content-secondary">範例：</span>
          <ChptButton v-for="c in cronPresets" :key="c.expr" size="xs" is-outline @click="cronExpr = c.expr">{{ c.label }}</ChptButton>
        </div>
        <ChptCronInput v-model="cronExpr" />
        <p class="mt-3 text-xs text-content-secondary">v-model：<code>{{ cronExpr }}</code></p>
      </div>
      <ChptCodeBlock class="mt-6" :code="cronSample" />
      <ApiTable of="ChptCronInput" title="Props" :rows="cronProps" />
      <ApiTable of="-" title="表達式語法" :rows="cronSyntax" />
      <ApiTable of="ChptCronInput" title="Events" :rows="cronEvents" />
      <ApiTable of="ChptCronInput" title="方法（ref）" :rows="cronMethods" />
    </section>

    <!-- ============ ChptImageCropper ============ -->
    <section id="chpt-image-cropper" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptImageCropper 圖片裁切</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>大頭照、缺陷照片、設備銘牌照片上傳前先裁好需要的範圍。拖曳框移動、拉 8 個把手調整大小、在框外拖曳重畫一個；
        可固定比例、轉 90°、翻轉，滾輪（或雙指）縮放畫面、中鍵拖曳平移。按「裁切」用 <code>getBlob()</code> / <code>getDataURL()</code> 取得結果，
        可指定輸出大小（例如大頭照固定 256 × 256）。鍵盤：Tab 到裁切框後方向鍵移動（Shift 加快）、+ / − 調整大小。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptImageCropper } from '@/components/library'</code>
      </p>
      <div class="mb-3 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
        <label class="inline-flex items-center gap-2">
          <span>換一張圖：</span>
          <input type="file" accept="image/*" class="text-xs" @change="cropPick" />
        </label>
        <ChptSwitch v-model="cropCircle" label="圓形（大頭照）" />
      </div>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptImageCropper
          ref="cropperRef"
          v-model="cropRect"
          v-model:aspect="cropAspect"
          :src="cropSrc"
          :aspect-options="cropAspectOptions"
          :shape="cropCircle ? 'circle' : 'rect'"
          :height="340"
          preview
        />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <ChptButton size="sm" icon="crop" @click="cropDo">裁切</ChptButton>
          <span class="text-xs text-content-secondary" aria-live="polite">框：{{ cropRect ? `${cropRect.x}, ${cropRect.y}，${cropRect.width} × ${cropRect.height}` : '—' }}</span>
          <template v-if="cropResult">
            <img :src="cropResult.url" alt="裁切結果" class="h-16 border border-stroke-default" :class="cropCircle ? 'rounded-full' : 'rounded-md'" />
            <span class="text-xs text-content-secondary">{{ cropResult.text }}</span>
          </template>
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="cropSample" />
      <ApiTable of="ChptImageCropper" title="Props" :rows="cropProps" />
      <ApiTable of="ChptImageCropper" title="Events" :rows="cropEvents" />
      <ApiTable of="ChptImageCropper" title="方法（ref）" :rows="cropMethods" />
      <ApiTable of="-" title="CropOutputOptions（getCanvas / getBlob / getDataURL 的參數）" :rows="cropOutputRows" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>裁切框的座標是「轉過 / 翻過之後」看到的圖片像素；轉 90° 時框會跟著內容一起轉。
        跨網域的圖片要伺服器允許 CORS 並設定 <code>cross-origin="anonymous"</code>，否則瀏覽器不允許讀出裁切結果。
        輸出 JPEG 沒有透明，圓形以外與空白處會填 <code>background</code>（預設黑色）。
      </p>
    </section>

    <!-- ============ ChptMentionInput ============ -->
    <section id="chpt-mention-input" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptMentionInput 提及輸入</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>交接紀錄、異常回報、留言裡 <code>@人員</code>、<code>#工單</code> / <code>#設備</code>。輸入觸發字元後列出候選（可以接 API 非同步搜尋），
        ↑↓ 選擇、Enter 或 Tab 確定、Esc 關閉；提及顯示成有底色的標籤，刪除時整個一起刪掉，在名字中間打字則變回一般文字。Ctrl / ⌘ + Enter 送出。
        <code>v-model</code> 是帶標記的字串（存檔用），<code>change</code> / <code>submit</code> 另外給純文字與提及清單（通知被提及的人）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptMentionInput } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptMentionInput
          v-model="mentionValue"
          :triggers="mentionTriggers"
          :max-length="300"
          label="交接紀錄"
          placeholder="例如：@王 請協助確認 #WO 的首件"
          @submit="mentionSubmit"
        />
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <ChptButton size="sm" icon="send" @click="mentionSubmit(null)">送出</ChptButton>
          <span class="text-xs text-content-secondary">被提及：{{ mentionPeople || '—' }}</span>
        </div>
        <div class="mt-3 rounded-md border border-stroke-light bg-surface-primary p-2 text-xs">
          <div class="text-content-tertiary mb-1">v-model（存檔的值）</div>
          <code class="break-all text-content-primary">{{ mentionValue || '（空）' }}</code>
        </div>
        <ul v-if="mentionPosts.length" class="mt-3 flex flex-col gap-1 text-sm">
          <li v-for="(p, i) in mentionPosts" :key="i" class="rounded-md border border-stroke-light bg-surface-primary px-3 py-2 text-content-primary">
            <template v-for="(seg, k) in p" :key="k">
              <span v-if="seg.mention" class="rounded px-0.5 text-accent-on-subtle bg-accent-subtle">{{ seg.text }}</span>
              <template v-else>{{ seg.text }}</template>
            </template>
          </li>
        </ul>
      </div>
      <ChptCodeBlock class="mt-6" :code="mentionSample" />
      <ApiTable of="ChptMentionInput" title="Props" :rows="mentionProps" />
      <ApiTable of="-" title="MentionTrigger（triggers 的每一項）" :rows="mentionTriggerRows" />
      <ApiTable of="ChptMentionInput" title="Events" :rows="mentionEvents" />
      <ApiTable of="ChptMentionInput" title="Slots" :rows="mentionSlots" />
      <ApiTable of="ChptMentionInput" title="方法（ref）" :rows="mentionMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>顯示存好的內容時，用 <code>parseMentions(value, ['@', '#'])</code> 拆出純文字與提及位置，自己決定怎麼畫（例如連到人員頁）。
        觸發字元前面要是開頭、空白或標點，<code>a@b.com</code> 這種 email 不會跳出候選。輸入法組字中不會改動輸入框。
      </p>
    </section>

    <!-- ============ ChptMaskedInput ============ -->
    <section id="chpt-masked-input" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptMaskedInput 格式化輸入</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>序號、MAC 位址、IP、電話、料號、日期碼這類固定格式。分隔符號自動補上（自己打也可以），不合格式的字元直接擋掉並提示；
        貼上 <code>aa bb cc dd ee ff</code> 這種帶空白的字串會自動整理；Backspace / Delete 會跳過分隔符號。聚焦時用底線顯示還沒填的位置。
        掃描槍也能用（多數掃描槍最後會送 Enter，可接 <code>@enter</code>）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptMaskedInput, MASK_PRESETS, validIPv4 } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <ChptMaskedInput v-model="maskSerial" mask="SN-####-AAAA" uppercase clearable label="產品序號" prefix-icon="qr_code_2" @complete="maskLog(`序號填完：${$event.masked}`)" @enter="maskLog(`Enter：${$event.masked}`)" />
            <p class="mt-1 text-xs text-content-tertiary">v-model：<code>{{ maskSerial || '（空）' }}</code></p>
          </div>
          <div>
            <ChptMaskedInput v-model="maskMac" :mask="MASK_PRESETS.mac" uppercase label="設備 MAC 位址" />
            <p class="mt-1 text-xs text-content-tertiary">試試貼上 <code>00 1a 2b 3c 4d 5e</code></p>
          </div>
          <div>
            <ChptMaskedInput v-model="maskIp" :mask="MASK_PRESETS.ipv4" :validate="validIPv4" label="PLC IP" :error-text="maskIpError" />
            <p class="mt-1 text-xs text-content-tertiary">每段 1～3 位數，打 <code>.</code> 跳下一段；超過 255 時標紅</p>
          </div>
          <div>
            <ChptMaskedInput v-model="maskPhone" :mask="['####-####', '(##) ####-####']" unmask label="聯絡電話" />
            <p class="mt-1 text-xs text-content-tertiary">8 碼 / 含區碼 10 碼依長度自動選；<code>unmask</code> 只存數字：<code>{{ maskPhone || '（空）' }}</code></p>
          </div>
        </div>
        <ul v-if="maskEvents.length" class="mt-3 text-xs text-content-secondary list-disc pl-5">
          <li v-for="(e, i) in maskEvents" :key="i">{{ e }}</li>
        </ul>
      </div>
      <ChptCodeBlock class="mt-6" :code="maskSample" />
      <ApiTable of="ChptMaskedInput" title="Props" :rows="maskProps" />
      <ApiTable of="-" title="格式語法" :rows="maskSyntaxRows" />
      <ApiTable of="ChptMaskedInput" title="Events" :rows="maskEventRows" />
      <ApiTable of="ChptMaskedInput" title="方法（ref）" :rows="maskMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>在中間插入字元時後面的字會往後擠，擠到型別不符的位置（例如數字擠到字母位置）會被丟掉。有可省略位置（例如 IP）時，
        <code>unmask</code> 的值無法還原分段（<code>192168110</code> 不知道怎麼切），這類格式請用格式化後的值。只想格式化顯示（例如表格裡）可以用 <code>formatMask(value, mask)</code>。
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
import { computed, defineAsyncComponent, h, reactive, ref, useTemplateRef } from 'vue'
import {
  ChptForm,
  ChptFormItem,
  ChptFormList,
  ChptSchemaForm,
  ChptSignaturePad,
  ChptChecklist,
  ChptWorkInstruction,
  ChptAqlSampling,
  ChptQueryBuilder,
  ChptCronInput,
  evaluateQuery,
  useToast,
  ChptInput,
  ChptSelect,
  ChptInputNumber,
  ChptRadio,
  ChptDatePicker,
  ChptTextarea,
  ChptUpload,
  ChptMaskedInput,
  MASK_PRESETS,
  validIPv4,
  ChptMentionInput,
  parseMentions,
  ChptImageCropper,
  ChptSwitch,
  ChptButton,
  ChptSegmented,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

/**
 * 富文字編輯器（Tiptap，約 400 kB）改成用到才載入：原本跟著整個表單頁一起打包，
 * 進這一頁要先下載 541 kB。載入前放一塊與範例同高（260px）的佔位，避免版面跳動。
 */
const ChptRichTextEditor = defineAsyncComponent({
  loader: () => import('@/components/library/ui/ChptRichTextEditor.vue'),
  loadingComponent: { render: () => h('div', { class: 'h-[260px] animate-pulse rounded-md border border-stroke-default bg-surface-secondary', 'aria-hidden': 'true' }) },
  delay: 0,
})

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

// ---- ChptImageCropper ----
// 範例圖：一張產生出來的電路板照片（SVG）
const cropSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
<rect width="960" height="640" fill="#0f5132"/>
<g fill="none" stroke="#c9a227" stroke-width="6" stroke-linecap="round">
<path d="M60 120 H420 V260 H700"/><path d="M60 520 H300 V380 H860"/><path d="M500 60 V560"/><path d="M780 100 V600"/></g>
<rect x="360" y="220" width="260" height="200" rx="10" fill="#1f2937"/>
<text x="490" y="330" fill="#e5e7eb" font-family="monospace" font-size="34" text-anchor="middle">MCU-128</text>
<g fill="#d1d5db">${Array.from({ length: 12 }, (_, i) => `<rect x="${372 + i * 21}" y="204" width="10" height="16"/><rect x="${372 + i * 21}" y="420" width="10" height="16"/>`).join('')}</g>
<g fill="#7c2d12">${Array.from({ length: 6 }, (_, i) => `<rect x="${120 + i * 40}" y="300" width="22" height="50" rx="4"/>`).join('')}</g>
<circle cx="760" cy="470" r="46" fill="#334155"/><circle cx="760" cy="470" r="18" fill="#94a3b8"/>
<circle cx="250" cy="200" r="14" fill="none" stroke="#ef4444" stroke-width="5"/>
</svg>`
const cropDefault = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cropSvg)}`
const cropSrc = ref(cropDefault)
const cropRect = ref(null)
const cropAspect = ref(null)
const cropCircle = ref(false)
const cropResult = ref(null)
const cropperRef = useTemplateRef('cropperRef')
const cropAspectOptions = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
]
let cropObjectUrl = null
function cropPick(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl)
  cropObjectUrl = URL.createObjectURL(f)
  cropSrc.value = cropObjectUrl
  cropResult.value = null
}
function cropDo() {
  const opts = cropCircle.value ? { width: 256, height: 256 } : { maxWidth: 800 }
  const url = cropperRef.value?.getDataURL(opts)
  const canvas = cropperRef.value?.getCanvas(opts)
  if (url && canvas) cropResult.value = { url, text: `輸出 ${canvas.width} × ${canvas.height} px` }
}
const cropSample = `<ChptImageCropper
  ref="cropper"
  v-model="rect"
  v-model:aspect="aspect"
  :src="imageUrl"
  :aspect-options="[{ label: '自由', value: null }, { label: '1:1', value: 1 }, { label: '4:3', value: 4 / 3 }]"
  shape="circle"
  preview
/>

// 大頭照：固定輸出 256 × 256 的 PNG
const blob = await cropper.value.getBlob({ width: 256, height: 256 })
// 照片：最寬 1600px 的 JPEG
const jpeg = await cropper.value.getBlob({ maxWidth: 1600, type: 'image/jpeg', quality: 0.85, background: '#fff' })`
const cropProps = [
  { name: 'src', type: 'string | null', def: 'null', desc: '圖片網址、DataURL 或 URL.createObjectURL 的結果' },
  { name: 'modelValue', type: 'CropRect | null', def: 'null', desc: '裁切框 { x, y, width, height }（v-model；轉過 / 翻過後的圖片像素）' },
  { name: 'aspect', type: 'number | null', def: 'null', desc: '寬 ÷ 高；null 為自由（v-model:aspect）' },
  { name: 'aspectOptions', type: '{ label, value }[]', def: '[]', desc: '工具列的比例選項（空陣列不顯示）' },
  { name: 'shape', type: "'rect' | 'circle'", def: "'rect'", desc: '圓形遮罩；輸出 PNG 時圓外透明' },
  { name: 'minSize', type: 'number', def: '16', desc: '框的最小邊長（圖片像素）' },
  { name: 'height', type: 'number | string', def: '360', desc: '舞台高度' },
  { name: 'toolbar', type: 'boolean', def: 'true', desc: '工具列（比例、旋轉、翻轉、縮放、重設）' },
  { name: 'preview / previewSize', type: 'boolean / number', def: 'false / 120', desc: '裁切結果的即時預覽與其最大邊長' },
  { name: 'guides', type: 'boolean', def: 'true', desc: '三分線' },
  { name: 'maxZoom', type: 'number', def: '8', desc: '最大放大倍率（相對全覽）' },
  { name: 'crossOrigin', type: "'anonymous' | 'use-credentials' | null", def: 'null', desc: '跨網域圖片要讀出結果時設定' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用' },
]
const cropEvents = [
  { name: 'update:modelValue', params: '(rect: CropRect)', desc: '框改變（拖曳中持續送出）' },
  { name: 'update:aspect', params: '(aspect: number | null)', desc: '在工具列換比例' },
  { name: 'change', params: '(state: { rect, rotation, flipX, flipY })', desc: '一次操作結束（放開、按鈕、鍵盤）' },
  { name: 'load', params: '({ width, height })', desc: '圖片載入完成（原始大小）' },
  { name: 'error', params: '()', desc: '圖片載入失敗' },
]
const cropMethods = [
  { name: 'getCanvas(opts?)', type: '(o?: CropOutputOptions) => HTMLCanvasElement | null', desc: '裁切後的 canvas' },
  { name: 'getBlob(opts?)', type: '(o?: CropOutputOptions) => Promise<Blob | null>', desc: '裁切後的檔案（預設 PNG）' },
  { name: 'getDataURL(opts?)', type: '(o?: CropOutputOptions) => string | null', desc: '裁切後的 DataURL' },
  { name: 'rotate(dir) / flip(axis)', type: "(1 | -1) / ('x' | 'y')", desc: '轉 90°（1 = 順時針）／翻轉' },
  { name: 'zoom(factor)', type: '(factor: number) => void', desc: '放大縮小畫面（不改框）' },
  { name: 'reset()', type: '() => void', desc: '回到初始狀態' },
  { name: 'state', type: 'CropState | null', desc: '目前的框、旋轉、翻轉' },
]
const cropOutputRows = [
  { name: 'width / height', type: 'number', def: '框的大小', desc: '輸出大小；只給一邊時依框的比例算另一邊' },
  { name: 'maxWidth / maxHeight', type: 'number', def: '—', desc: '超過時等比縮小（不放大）' },
  { name: 'type / quality', type: 'string / number', def: "'image/png' / —", desc: "'image/jpeg'、'image/webp' 與品質 0–1" },
  { name: 'background', type: 'string | null', def: 'null', desc: '底色（JPEG 沒給時為黑色）' },
]

// ---- ChptMentionInput ----
const mentionPeople0 = [
  { id: 'u01', label: '王小明', description: 'SMT 一線．領班' },
  { id: 'u02', label: '陳怡君', description: '品保．IPQC' },
  { id: 'u03', label: '林志豪', description: '設備課' },
  { id: 'u04', label: '黃淑芬', description: '生管' },
  { id: 'u05', label: '張家豪', description: 'SMT 二線．技術員' },
  { id: 'u06', label: 'Alex Wu', description: '製程工程' },
]
const mentionOrders = Array.from({ length: 40 }, (_, i) => ({ id: `wo-${1001 + i}`, label: `WO-${1001 + i}`, description: ['主機板', '電源板', 'LED 驅動板', '控制板'][i % 4] + `．${(i % 5) * 200 + 300} 片` }))
const mentionTriggers = [
  { char: '@', options: mentionPeople0, label: '人員' },
  {
    char: '#',
    label: '工單',
    color: 'warning',
    // 模擬 API：300ms 後回傳
    search: (q) => new Promise((resolve) => setTimeout(() => resolve(mentionOrders.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()) || o.description.includes(q))), 300)),
  },
]
const mentionValue = ref('@[陳怡君](u02) 請協助確認 #[WO-1003](wo-1003) 的首件，錫膏厚度偏高')
const mentionPosts = ref([])
const mentionPeople = computed(() => [...new Set(parseMentions(mentionValue.value, ['@', '#']).mentions.filter((m) => m.trigger === '@').map((m) => m.label))].join('、'))
function mentionSubmit() {
  const { plain, mentions } = parseMentions(mentionValue.value, ['@', '#'])
  if (!plain.trim()) return
  const segs = []
  let last = 0
  for (const m of mentions) {
    if (m.start > last) segs.push({ text: plain.slice(last, m.start) })
    segs.push({ text: plain.slice(m.start, m.end), mention: true })
    last = m.end
  }
  if (last < plain.length) segs.push({ text: plain.slice(last) })
  mentionPosts.value = [segs, ...mentionPosts.value].slice(0, 5)
  mentionValue.value = ''
}
const mentionSample = `<ChptMentionInput
  v-model="note"
  :triggers="[
    { char: '@', options: people, label: '人員' },
    { char: '#', search: (q) => api.searchOrders(q), label: '工單', color: 'warning' },
  ]"
  :max-length="300"
  @submit="({ text, mentions }) => post(text, mentions)"
/>

// v-model：'@[陳怡君](u02) 請確認 #[WO-1003](wo-1003) 的首件'
// 顯示時：const { plain, mentions } = parseMentions(note, ['@', '#'])`
const mentionProps = [
  { name: 'modelValue', type: 'string', def: "''", desc: '帶標記的字串：一般文字 + @[名稱](id)（v-model）' },
  { name: 'triggers', type: 'MentionTrigger[]', def: "[{ char: '@' }]", desc: '觸發字元與各自的候選來源' },
  { name: 'placeholder', type: 'string', def: "''", desc: '提示文字' },
  { name: 'rows / maxRows', type: 'number', def: '3 / 8', desc: '初始行數／自動長高的上限' },
  { name: 'maxLength', type: 'number | null', def: 'null', desc: '字數上限（純文字），顯示計數，超過時標紅且不能送出' },
  { name: 'allowSpaces', type: 'boolean', def: 'false', desc: '查詢字可以有空白（英文全名）' },
  { name: 'limit', type: 'number', def: '8', desc: '最多列出幾個候選' },
  { name: 'label', type: 'string', def: "''", desc: '輸入框名稱（螢幕閱讀器）' },
  { name: 'disabled / readonly', type: 'boolean', def: 'false', desc: '停用／唯讀' },
]
const mentionTriggerRows = [
  { name: 'char', type: 'string', def: '—', desc: "觸發字元，例如 '@'、'#'" },
  { name: 'options', type: 'MentionOption[]', def: '—', desc: '固定的候選（依名稱、id、說明過濾）；{ id, label, description? }' },
  { name: 'search', type: '(q) => MentionOption[] | Promise<MentionOption[]>', def: '—', desc: '自訂搜尋（非同步時有 120ms 防抖、過期結果會丟掉）' },
  { name: 'label', type: 'string', def: '—', desc: '候選清單名稱（螢幕閱讀器）' },
  { name: 'color', type: "'accent' | 'info' | 'success' | 'warning' | 'danger'", def: '第一個 accent，其餘 info', desc: '標籤底色' },
]
const mentionEvents = [
  { name: 'update:modelValue', params: '(value: string)', desc: '內容改變' },
  { name: 'change', params: '({ value, text, mentions })', desc: '內容改變，附純文字與提及清單' },
  { name: 'select', params: '({ trigger, option })', desc: '從候選選了一個' },
  { name: 'mention-add / mention-remove', params: '(mentions: Mention[])', desc: '新增／移除了哪些提及' },
  { name: 'submit', params: '({ value, text, mentions })', desc: 'Ctrl / ⌘ + Enter（超過字數時不送）' },
]
const mentionSlots = [{ name: 'option', params: '{ option, trigger, active }', desc: '自訂候選的樣子（預設為縮寫圓圈 + 名稱 + 說明）' }]
const mentionMethods = [
  { name: 'focus()', type: '() => void', desc: '聚焦' },
  { name: 'clear()', type: '() => void', desc: '清空' },
  { name: 'insertTrigger(char?)', type: '(char?: string) => void', desc: '在游標處插入觸發字元並開啟候選（工具列的 @ 按鈕）' },
  { name: 'text / mentions', type: 'string / Mention[]', desc: '目前的純文字與提及' },
]

// ---- ChptMaskedInput ----
const maskSerial = ref('SN-2611-')
const maskMac = ref('')
const maskIp = ref('192.168.10.25')
const maskPhone = ref('0227881234')
const maskEvents = ref([])
const maskIpError = computed(() => (maskIp.value && maskIp.value.split('.').some((p) => Number(p) > 255) ? '每段要在 0～255 之間' : ''))
function maskLog(msg) {
  maskEvents.value = [msg, ...maskEvents.value].slice(0, 4)
}
const maskSample = `<ChptMaskedInput v-model="sn" mask="SN-####-AAAA" uppercase @complete="({ masked }) => lookup(masked)" />
<ChptMaskedInput v-model="mac" :mask="MASK_PRESETS.mac" uppercase />
<ChptMaskedInput v-model="ip" :mask="MASK_PRESETS.ipv4" :validate="validIPv4" />
<ChptMaskedInput v-model="phone" :mask="['####-####', '(##) ####-####']" unmask />

// 自訂格式字元：料號 = 2 碼廠別（大寫）+ 6 碼流水號
<ChptMaskedInput mask="PP-######" :tokens="{ P: { pattern: /[A-Z]/i, transform: 'upper', kind: '廠別代碼' } }" />

// 只格式化顯示
formatMask('0212345678', ['####-####', '(##) ####-####']).value // '(02) 1234-5678'`
const maskProps = [
  { name: 'modelValue', type: 'string', def: "''", desc: '格式化後的值（v-model）；unmask 時為只有填入字元的值' },
  { name: 'mask', type: 'string | string[]', def: '—', desc: '格式；陣列時依輸入長度自動選放得下最多字元的那個' },
  { name: 'tokens', type: 'Record<string, MaskTokenDef>', def: '—', desc: '自訂 / 覆寫格式字元：{ pattern, transform?, kind? }' },
  { name: 'unmask', type: 'boolean', def: 'false', desc: 'v-model 只存填入的字元（電話只存數字）' },
  { name: 'uppercase', type: 'boolean', def: 'false', desc: '英文字母轉大寫' },
  { name: 'validate', type: '(masked, raw) => boolean', def: '—', desc: '填完後的額外檢查（例如 validIPv4）；不通過時標紅、不送 complete' },
  { name: 'showMask', type: 'boolean', def: 'true', desc: '聚焦或有值時顯示還沒填的位置；沒給 placeholder 時以格式樣板當 placeholder' },
  { name: 'placeholderChar', type: 'string', def: "'_'", desc: '還沒填的位置用的字元' },
  { name: 'mono', type: 'boolean', def: 'true', desc: '等寬字型' },
  { name: 'label / placeholder / size', type: 'string / string / ComponentSize', def: "'' / 樣板 / 'sm'", desc: '同 ChptInput' },
  { name: 'clearable / prefixIcon / fullWidth', type: 'boolean / string / boolean', def: "false / '' / false", desc: '同 ChptInput' },
  { name: 'disabled / readonly / errorText', type: 'boolean / boolean / string', def: "false / false / ''", desc: '同 ChptInput；放在 ChptFormItem 裡會接上表單驗證' },
]
const maskSyntaxRows = [
  { name: '#', type: '數字', def: '0-9', desc: 'MASK_PRESETS：ipv4、mac、date、time、twMobile、twId' },
  { name: 'A / X / H', type: '字母 / 英數 / 十六進位', def: '—', desc: '搭配 uppercase 轉大寫' },
  { name: '*', type: '任意非空白字元', def: '—', desc: '' },
  { name: '?', type: '接在格式字元後面', def: '—', desc: '可省略，例如 IP 每段 ##?#?（1～3 位數），打分隔符號就跳到下一段' },
  { name: '\\', type: '跳脫', def: '—', desc: '\\# 是固定的 # 字元' },
  { name: '其他字元', type: '固定字元', def: '—', desc: '自動補上，要等後面有字才出現（刪除時不會卡住）；結尾的固定字元在填完時補上' },
]
const maskEventRows = [
  { name: 'update:modelValue', params: '(value: string)', desc: '值改變' },
  { name: 'accept', params: '({ masked, raw, complete })', desc: '使用者每次改動' },
  { name: 'complete', params: '({ masked, raw, complete })', desc: '剛填完（且通過 validate）' },
  { name: 'reject', params: '({ char, kind })', desc: '新打的字有不符合格式的（螢幕閱讀器也會念出可以輸入什麼）' },
  { name: 'enter', params: '({ masked, raw, complete })', desc: '按 Enter（掃描槍）' },
  { name: 'clear / focus / blur', params: '— / (FocusEvent)', desc: '清除／聚焦／失焦' },
]
const maskMethods = [
  { name: 'focus() / clear()', type: '() => void', desc: '聚焦／清空' },
  { name: 'value()', type: '() => { masked, raw, complete }', desc: '目前的值' },
  { name: 'maskIndex()', type: '() => number', desc: '多個格式時目前用的是第幾個' },
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

// ---- ChptCronInput ----
const cronExpr = ref('30 8 * * 1-5')
const cronPresets = [
  { label: '每 5 分鐘', expr: '*/5 * * * *' },
  { label: '平日 08:30', expr: '30 8 * * 1-5' },
  { label: '每月 1、15 日 02:00', expr: '0 2 1,15 * *' },
  { label: '上班時間每 10 分鐘', expr: '*/10 9-17 * * 1-5' },
  { label: '每季第一天', expr: '0 0 1 1,4,7,10 *' },
]
const cronSample = `<ChptCronInput v-model="schedule" :show-next="5" />

// schedule：'30 8 * * 1-5'（平日 08:30）`
const cronProps = [
  { name: 'v-model', type: 'string', def: "'0 8 * * *'", desc: 'cron 表達式（5 欄：分 時 日 月 週）；只有格式正確時才更新' },
  { name: 'showNext', type: 'number', def: '5', desc: '列出接下來幾次執行時間（0 不列）' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算下次執行的起點；不給時用現在（每分鐘更新）' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只看' },
]
const cronSyntax = [
  { name: '*', type: '全部', def: '—', desc: '每分 / 每時 / 每日…' },
  { name: '5、1-5、1,15', type: '數字、範圍、清單', def: '—', desc: '可以混用：1-5,10' },
  { name: '*/15、9-17/2', type: '間隔', def: '—', desc: '每 15、9 到 17 每 2' },
  { name: 'JAN–DEC、SUN–SAT', type: '名稱', def: '—', desc: '月與週可用英文縮寫；週的 0 與 7 都是星期日' },
  { name: '日與週', type: '其一符合', def: '—', desc: '日、週都有限制時，兩者符合其一就執行（與 Linux cron 相同）' },
]
const cronEvents = [{ name: 'update:modelValue', params: '(expr: string)', desc: '改了設定或表達式（只送出正確的表達式）' }]
const cronMethods = [
  { name: 'valid', type: 'boolean', desc: '目前的表達式是否正確' },
  { name: 'description', type: 'string', desc: '可讀說明' },
]
// ---- ChptQueryBuilder ----
const qbFields = [
  { key: 'orderNo', label: '工單', type: 'text' },
  { key: 'line', label: '線別', type: 'select', options: ['SMT-1', 'SMT-2', 'SMT-3', 'DIP-1'].map((v) => ({ label: v, value: v })) },
  { key: 'status', label: '狀態', type: 'select', options: [{ label: '生產中', value: 'run' }, { label: '暫停', value: 'hold' }, { label: '異常', value: 'alarm' }, { label: '完工', value: 'done' }] },
  { key: 'yield', label: '良率（%）', type: 'number' },
  { key: 'qty', label: '數量', type: 'number' },
  { key: 'due', label: '交期', type: 'date' },
  { key: 'urgent', label: '急單', type: 'boolean' },
]
const qbRows = [
  ['WO-2611-001', 'SMT-1', 'run', 98.6, 1200, '2026-11-28', false],
  ['WO-2611-002', 'SMT-2', 'alarm', 91.2, 800, '2026-11-26', true],
  ['WO-2611-003', 'SMT-1', 'hold', 96.4, 500, '2026-12-02', false],
  ['WO-2611-004', 'DIP-1', 'run', 94.1, 300, '2026-11-27', true],
  ['WO-2611-005', 'SMT-3', 'done', 99.2, 2000, '2026-11-24', false],
  ['WO-2611-006', 'SMT-2', 'run', 97.8, 1500, '2026-11-30', false],
  ['WO-2611-007', 'SMT-3', 'alarm', 88.5, 600, '2026-11-25', true],
  ['WO-2611-008', 'DIP-1', 'hold', 95.0, 450, '2026-12-05', false],
].map(([orderNo, line, status, y, qty, due, urgent]) => ({ orderNo, line, status, yield: y, qty, due, urgent }))
const qbQuery = ref({
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'status', op: 'neq', value: 'done' },
    {
      id: 'g1',
      combinator: 'or',
      rules: [
        { id: 'r2', field: 'yield', op: 'lt', value: 95 },
        { id: 'r3', field: 'urgent', op: 'eq', value: true },
      ],
    },
  ],
})
const qbRef = useTemplateRef('qbRef')
const qbValid = ref(null)
const qbMatched = computed(() => qbRows.filter((r) => evaluateQuery(qbQuery.value, r, qbFields)))
const qbStatusLabel = (v) => qbFields[2].options.find((o) => o.value === v)?.label ?? v
const qbJson = computed(() => JSON.stringify(qbQuery.value, null, 2))
const qbSample = `<ChptQueryBuilder v-model="query" :fields="fields" :max-depth="3" />

// fields：{ key, label, type: 'text' | 'number' | 'date' | 'select' | 'boolean', options? }
// 前端篩選：
import { evaluateQuery } from '@/components/library'
const matched = rows.filter((row) => evaluateQuery(query.value, row, fields))`
const qbProps = [
  { name: 'fields', type: 'QbField[]', def: '—', desc: "可用欄位：{ key, label, type, options?, operators? }；type 為 text / number / date / select / boolean" },
  { name: 'v-model', type: 'QbGroup | null', def: 'null', desc: "條件 JSON：{ id, combinator: 'and' | 'or', not?, rules: (QbRule | QbGroup)[] }；規則為 { id, field, op, value }" },
  { name: 'maxDepth', type: 'number', def: '3', desc: '最多幾層群組（根 = 1）' },
  { name: 'allowNot', type: 'boolean', def: 'false', desc: '允許整組取反（NOT）' },
  { name: 'showText', type: 'boolean', def: 'true', desc: '在下方顯示可讀的條件文字' },
  { name: 'showErrors', type: 'boolean', def: 'false', desc: '一直顯示錯誤；否則等呼叫 validate() 後才顯示' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只看' },
  { name: 'title', type: 'string', def: "''", desc: '無障礙名稱' },
]
const qbOps = [
  { name: 'text', type: '等於、不等於、包含、不包含、開頭是、結尾是、是空的、不是空的', def: '—', desc: '不分大小寫' },
  { name: 'number / date', type: '等於、不等於、大於、大於等於、小於、小於等於、介於、是空的、不是空的', def: '—', desc: '介於包含兩端' },
  { name: 'select', type: '等於、不等於、屬於、不屬於、是空的、不是空的', def: '—', desc: '屬於 / 不屬於可以複選' },
  { name: 'boolean', type: '等於', def: '—', desc: '是 / 否' },
]
const qbEvents = [{ name: 'update:modelValue', params: '(query: QbGroup)', desc: '新增、刪除、修改、拖曳排序' }]
const qbMethods = [
  { name: 'validate()', type: '() => boolean', desc: '驗證並顯示錯誤（沒填值、介於的起點大於終點、空群組）' },
  { name: 'errors', type: 'Map<id, QbError>', desc: '目前的錯誤' },
  { name: 'text', type: 'string', desc: '可讀的條件文字' },
]
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
