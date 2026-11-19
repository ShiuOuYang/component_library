<template>
  <ChptForm
    ref="formRef"
    :model="props.model"
    :rules="props.rules"
    :label-position="props.labelPosition"
    :label-width="props.labelWidth"
    :gap="props.gap"
    :disabled="props.disabled"
    @submit="emit('submit', $event)"
    @invalid="emit('invalid', $event)"
  >
    <template #default="{ submitting, validate, resetFields }">
      <div class="chpt-schema-form" :class="gapClass" :style="{ '--chpt-schema-cols': columnCount }">
        <template v-for="field in visibleFields" :key="field.prop || field.label">
          <!-- 區段標題：佔滿整列 -->
          <div v-if="field.type === 'section'" class="chpt-schema-section" :style="{ '--chpt-schema-span': columnCount }">
            <h3 class="text-sm font-semibold text-content-primary">{{ field.label }}</h3>
            <p v-if="field.hint" class="mt-0.5 text-xs text-content-tertiary">{{ field.hint }}</p>
          </div>

          <div v-else class="chpt-schema-cell min-w-0" :style="{ '--chpt-schema-span': spanOf(field) }" :data-prop="field.prop">
            <ChptFormItem
              :prop="field.prop"
              :label="field.label"
              :required="field.required"
              :rules="rulesOf(field)"
              :hint="field.hint"
            >
              <slot
                v-if="$slots[slotNameOf(field)]"
                :name="slotNameOf(field)"
                :field="field"
                :model="props.model"
                :value="valueOf(field)"
                :set-value="(v: unknown) => setValue(field, v)"
                :disabled="isDisabled(field)"
              ></slot>
              <component
                :is="componentOf(field)"
                v-else
                v-bind="controlProps(field)"
                :model-value="valueOf(field)"
                @update:model-value="(v: unknown) => setValue(field, v)"
              ></component>
            </ChptFormItem>
          </div>
        </template>
      </div>

      <div v-if="props.showActions" class="flex flex-wrap items-center gap-2" :class="props.labelPosition === 'left' ? 'sm:pl-[calc(var(--chpt-label-width,8rem)+1rem)]' : ''" :style="{ '--chpt-label-width': props.labelWidth }">
        <slot name="actions" :submitting="submitting" :validate="validate" :reset-fields="resetFields">
          <ChptButton type="submit" :loading="submitting">{{ props.submitText ?? t.schemaForm.submit }}</ChptButton>
          <ChptButton type="reset" is-outline>{{ props.resetText ?? t.schemaForm.reset }}</ChptButton>
        </slot>
      </div>
    </template>
  </ChptForm>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch, type Component } from 'vue'
import ChptForm from './ChptForm.vue'
import ChptFormItem from './ChptFormItem.vue'
import ChptButton from './ChptButton.vue'
import ChptInput from './ChptInput.vue'
import ChptInputNumber from './ChptInputNumber.vue'
import ChptTextarea from './ChptTextarea.vue'
import ChptSelect from './ChptSelect.vue'
import ChptRadio from './ChptRadio.vue'
import ChptCheckbox from './ChptCheckbox.vue'
import ChptSwitch from './ChptSwitch.vue'
import ChptDatePicker from './ChptDatePicker.vue'
import ChptTimePicker from './ChptTimePicker.vue'
import { getByPath, setByPath, toRuleList, type FormRule, type FormRules } from '../shared/formValidation'
import type { SelectOption } from '../shared/types/ui.types'
import { useLocale } from '../shared/config'

/**
 * ChptSchemaForm（CHPT 主題） - 依設定檔產生表單
 *
 * 用一份欄位設定（陣列）產生整張表單：標籤、輸入元件、驗證規則、版面、條件顯示。
 * 適合欄位由後端或系統設定決定的情境（不同產品的檢驗項目、不同站別的報工欄位…），
 * 也適合欄位多但都很單純的維護畫面。
 *
 * 底下仍是 ChptForm + ChptFormItem，所以驗證、錯誤聚焦、無障礙行為都一樣；
 * 特殊欄位可以用 #field-{prop} 插槽自己畫，或在設定裡給 component。
 */

/** 內建的欄位種類 */
export type SchemaFieldType =
  | 'input'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'time'
  /** 區段標題（不是輸入欄位，佔滿整列） */
  | 'section'

export type SchemaFieldOption = SelectOption<string | number | boolean>

export interface SchemaFormField {
  /** 欄位路徑（對應 model，可用 a.b.c）；section 可省略 */
  prop?: string
  label?: string
  /** 欄位種類，預設 input */
  type?: SchemaFieldType
  /** 自訂輸入元件（給了就不看 type）；需支援 v-model（modelValue / update:modelValue） */
  component?: Component
  /** 傳給輸入元件的其他 props（placeholder、min、max、range…） */
  props?: Record<string, unknown>
  /** select / radio / checkbox 的選項；可依目前的資料決定（例如依線別列出機台） */
  options?: SchemaFieldOption[] | ((model: Record<string, unknown>) => SchemaFieldOption[])
  /** 必填 */
  required?: boolean
  /** 這個欄位的驗證規則（與 ChptSchemaForm 的 rules 合併） */
  rules?: FormRule | FormRule[]
  /** 說明文字；section 時顯示在標題下方 */
  hint?: string
  /** 初始值：model 裡沒有這個欄位（undefined）時填入 */
  defaultValue?: unknown
  /** 佔幾欄（columns > 1 時）；'full' 佔滿整列 */
  span?: number | 'full'
  /** 依目前的資料決定是否顯示（隱藏的欄位不驗證） */
  visible?: (model: Record<string, unknown>) => boolean
  /** 停用；可依目前的資料決定 */
  disabled?: boolean | ((model: Record<string, unknown>) => boolean)
}

interface ChptSchemaFormProps {
  /** 表單資料（reactive 物件）；欄位值直接寫回這個物件 */
  model: Record<string, unknown>
  /** 欄位設定 */
  fields: SchemaFormField[]
  /** 額外的驗證規則（鍵是欄位路徑，與欄位自己的 rules 合併） */
  rules?: FormRules
  /** 一列放幾個欄位（小螢幕一律一欄） */
  columns?: number
  labelPosition?: 'top' | 'left'
  labelWidth?: string
  gap?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  /** 欄位被隱藏時清掉它的值（還原成 defaultValue）；避免送出看不到的舊資料 */
  clearHidden?: boolean
  /** 顯示送出 / 重設鈕 */
  showActions?: boolean
  submitText?: string
  resetText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptSchemaFormProps>(), {
  rules: () => ({}),
  columns: 1,
  labelPosition: 'top',
  labelWidth: '8rem',
  gap: 'md',
  disabled: false,
  clearHidden: false,
  showActions: true,
  submitText: undefined,
  resetText: undefined,
})

const emit = defineEmits<{
  (e: 'submit', model: Record<string, unknown>): void
  (e: 'invalid', errors: Record<string, string>): void
  /** 任何欄位的值改變（prop 是欄位路徑） */
  (e: 'change', prop: string, value: unknown): void
}>()

type FormApi = {
  validate: (fields?: string | string[], options?: { focus?: boolean }) => Promise<{ valid: boolean; errors: Record<string, string> }>
  validateField: (field: string) => Promise<{ valid: boolean; errors: Record<string, string> }>
  resetFields: (fields?: string | string[]) => void
  clearValidate: (fields?: string | string[]) => void
  submit: () => Promise<void>
}
const formRef = useTemplateRef<FormApi>('formRef')

const COMPONENTS: Record<Exclude<SchemaFieldType, 'section'>, Component> = {
  input: ChptInput,
  number: ChptInputNumber,
  textarea: ChptTextarea,
  select: ChptSelect,
  radio: ChptRadio,
  checkbox: ChptCheckbox,
  switch: ChptSwitch,
  date: ChptDatePicker,
  time: ChptTimePicker,
}

const columnCount = computed(() => Math.max(1, Math.floor(props.columns)))
const gapClass = computed(() => ({ sm: 'gap-3', md: 'gap-4', lg: 'gap-6' })[props.gap] ?? 'gap-4')

const isVisible = (field: SchemaFormField) => !field.visible || field.visible(props.model)
const visibleFields = computed(() => props.fields.filter(isVisible))

function spanOf(field: SchemaFormField): number {
  if (field.span === 'full') return columnCount.value
  return Math.max(1, Math.min(columnCount.value, Math.floor(field.span ?? 1)))
}

const slotNameOf = (field: SchemaFormField) => `field-${field.prop ?? ''}`

function componentOf(field: SchemaFormField): Component {
  if (field.component) return field.component
  return COMPONENTS[(field.type ?? 'input') as keyof typeof COMPONENTS] ?? ChptInput
}

/** 用選的欄位（下拉、單選、複選、日期、時間）必填訊息說「請選擇」而不是「請輸入」 */
const CHOICE_TYPES = new Set<SchemaFieldType>(['select', 'radio', 'checkbox', 'date', 'time'])
function rulesOf(field: SchemaFormField): FormRule[] {
  const own = toRuleList(field.rules)
  if (!field.required || !CHOICE_TYPES.has(field.type ?? 'input') || own.some((r) => r.required)) return own
  return [{ required: true, message: t.value.schemaForm.requiredSelect(field.label ?? t.value.validation.field) }, ...own]
}

function isDisabled(field: SchemaFormField): boolean {
  if (props.disabled) return true
  return typeof field.disabled === 'function' ? field.disabled(props.model) : !!field.disabled
}

function optionsOf(field: SchemaFormField): SchemaFieldOption[] {
  const list = typeof field.options === 'function' ? field.options(props.model) : field.options
  return list ?? []
}

/** 每種元件吃的 props 名稱不同（選項：options / items；停用：radio、checkbox 沒有 disabled，改停用每個選項） */
function controlProps(field: SchemaFormField): Record<string, unknown> {
  const disabled = isDisabled(field)
  const type = field.component ? undefined : (field.type ?? 'input')
  const base: Record<string, unknown> = { ...field.props }
  if (type === 'radio' || type === 'checkbox') {
    base.items = optionsOf(field).map((o) => ({ ...o, disabled: disabled || o.disabled }))
    return base
  }
  if (type === 'select') base.options = optionsOf(field)
  else if (field.options !== undefined) base.options = optionsOf(field)
  if (type !== 'switch' && base.fullWidth === undefined && field.component === undefined) base.fullWidth = true
  base.disabled = disabled || !!base.disabled
  return base
}

/** 沒有設定 defaultValue 時的空值（checkbox 要陣列、switch 要布林） */
function emptyOf(field: SchemaFormField): unknown {
  if (field.defaultValue !== undefined) return cloneDefault(field.defaultValue)
  if (field.type === 'checkbox') return []
  if (field.type === 'switch') return false
  if (field.type === 'number' || field.type === 'date' || field.type === 'time') return null
  if (field.type === 'select' || field.type === 'radio') return undefined
  return ''
}

/** 陣列 / 物件的預設值複製一份，避免多張表單共用同一個參考 */
function cloneDefault<V>(value: V): V {
  if (Array.isArray(value)) return [...value] as V
  if (value && typeof value === 'object' && !(value instanceof Date)) return { ...(value as object) } as V
  return value
}

const valueOf = (field: SchemaFormField) => (field.prop ? getByPath(props.model, field.prop) : undefined)

/** 寫入欄位值；巢狀路徑（a.b.c）的中間物件不存在時先建立 */
function writePath(path: string, value: unknown): void {
  const keys = path.split('.')
  let o = props.model
  for (const k of keys.slice(0, -1)) {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {}
    o = o[k] as Record<string, unknown>
  }
  setByPath(o, keys[keys.length - 1], value)
}

function setValue(field: SchemaFormField, value: unknown): void {
  if (!field.prop) return
  writePath(field.prop, value)
  emit('change', field.prop, value)
}

/** 把 model 裡還沒有的欄位補上初始值（ChptFormItem 掛載時記下這個值，重設時還原成它） */
function fillDefaults(): void {
  for (const field of props.fields) {
    if (!field.prop || field.type === 'section') continue
    if (getByPath(props.model, field.prop) === undefined) {
      const initial = emptyOf(field)
      if (initial !== undefined) writePath(field.prop, initial)
    }
  }
}
watch(() => props.fields, fillDefaults, { immediate: true })

// 欄位被隱藏時清掉值（clearHidden）
watch(
  () => props.fields.filter((f) => f.prop && f.type !== 'section' && !isVisible(f)).map((f) => f.prop!),
  (hidden, before) => {
    if (!props.clearHidden) return
    const was = new Set(before)
    for (const prop of hidden) {
      if (was.has(prop)) continue
      const field = props.fields.find((f) => f.prop === prop)!
      writePath(prop, emptyOf(field))
    }
  }
)

defineExpose({
  validate: (fields?: string | string[], options?: { focus?: boolean }) => formRef.value!.validate(fields, options),
  validateField: (field: string) => formRef.value!.validateField(field),
  resetFields: (fields?: string | string[]) => formRef.value?.resetFields(fields),
  clearValidate: (fields?: string | string[]) => formRef.value?.clearValidate(fields),
  submit: () => formRef.value!.submit(),
})
</script>

<style scoped>
.chpt-schema-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 640px) {
  .chpt-schema-form {
    grid-template-columns: repeat(var(--chpt-schema-cols, 1), minmax(0, 1fr));
  }

  .chpt-schema-cell,
  .chpt-schema-section {
    grid-column: span var(--chpt-schema-span, 1) / span var(--chpt-schema-span, 1);
  }
}

.chpt-schema-section {
  border-bottom: 1px solid rgb(var(--t-stroke-light));
  padding-bottom: 0.25rem;
}

.chpt-schema-section:not(:first-child) {
  margin-top: 0.5rem;
}
</style>
