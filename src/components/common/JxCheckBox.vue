<template>
  <div class="flex gap-4" :class="directionClass">
    <label
      v-for="item in items"
      :key="item.value"
      class="flex items-center gap-2 cursor-pointer"
      :class="getLabelClasses(item)"
    >
      <div 
        class="relative flex items-center justify-center rounded border-2"
        :class="[
          `w-${props.size} h-${props.size}`,
          isChecked(item) ? `bg-${props.bgColor} border-${props.bgColor}` : 'bg-white border-gray-300',
          item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
      >
        <input
          type="checkbox"
          :value="item.value"
          v-model="innerModelValue"
          :disabled="item.disabled"
          class="absolute opacity-0 w-0 h-0"
          :aria-label="item.label"
        />

        <!-- 簡單的 SVG 打勾 -->
        <svg
          v-if="isChecked(item)"
          class="w-3 h-3 text-black fill-current pointer-events-none"
          viewBox="0 0 12 10"
        >
          <path d="M4.5 7.5L1.5 4.5L0.5 5.5L4.5 9.5L11.5 2.5L10.5 1.5L4.5 7.5Z"/>
        </svg>
      </div>
      <span v-if="isLabelShow" :class="['select-none', { 'text-gray-500': item.disabled }]">{{
        item.label
      }}</span>
    </label>
  </div>
  <div v-if="errors.length" class="flex items-center ml-2 mt-1">
    <JxIcon class="mr-1" :size="20" :weight="300" :grade="-25" color="text-error-light"
      >info</JxIcon
    >
    <p class="text-error-light text-sm">
      {{ errors[0] }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import JxIcon from './JxIcon.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
    default: () => []
  },
  items: {
    type: Array,
    required: true,
    default: () => [],
    validator: (value) => value.every((item) => 'value' in item && 'label' in item)
  },
  size: {
    type: String,
    default: '4'
  },
  bgColor: {
    type: String,
    default: 'primary'
  },
  icon: {
    type: String,
    default: 'check'
  },
  iconColor: {
    type: String,
    default: 'white'
  },
  borderColor: {
    type: String,
    default: 'primary'
  },
  errors: {
    type: Array,
    default: () => []
  },
  isLabelShow: {
    type: Boolean,
    default: true
  },
  labelSize: {
    type: String,
    default: 'text-sm'
  },
  labelColor: {
    type: String,
    default: 'text-gray-700'
  },
  direction: {
    type: String,
    default: 'row'
  }
})

const emit = defineEmits(['update:modelValue', 'click'])

const innerModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasErrors = computed(() => props.errors.length > 0)

const isChecked = (item) => innerModelValue.value.includes(item.value) && !item.disabled

const getLabelClasses = (item) => ({
  'hover:opacity-80': !item.disabled,
  'opacity-50 cursor-not-allowed': item.disabled,
  [props.labelSize]: true,
  [props.labelColor]: true
})

const directionClass = computed(() => {
  return props.direction === 'row' ? 'flex-row items-center' : 'flex-col '
})
</script>

<style scoped>
/* 打勾彈出動畫 */
.check-pop-enter-active {
  transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.check-pop-leave-active {
  transition: all 0.15s ease-out;
}

.check-pop-enter-from {
  opacity: 0;
  transform: scale(0);
}

.check-pop-enter-to {
  opacity: 1;
  transform: scale(1);
}

.check-pop-leave-from {
  opacity: 1;
  transform: scale(1);
}

.check-pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
