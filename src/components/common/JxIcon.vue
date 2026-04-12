<template>
  <span class="material-symbols-outlined" :style="iconStyle" :class="iconColor">
    <slot></slot>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  fill: {
    type: [Number, String],
    default: 0,
    validator: (value) => Number(value) >= 0 && Number(value) <= 1,
  },
  weight: {
    type: [Number, String],
    default: 200,
    validator: (value) => Number(value) >= 100 && Number(value) <= 700,
  },
  grade: {
    type: [Number, String],
    default: 0,
    validator: (value) => Number(value) >= -25 && Number(value) <= 200,
  },
  size: {
    type: [Number, String],
    default: 24,
    // validator: (value) => Number(value) >= 20 && Number(value) <= 48
  },
  color: {
    type: String,
    default: "black",
  },
  hoverColor: {
    type: String,
    default: "gray",
  },
  opacity: {
    type: String,
    default: "1",
  },
});

const iconColor = computed(() => {
  return `text-${props.color} hover:text-${props.hoverColor} text-opacity-${props.opacity} transition-all during-300`;
});
// const iconSize = computed(() => {
//   if (typeof props.size === 'number' || !isNaN(Number(props.size))) {
//     return `text-[${props.size}px]`
//   }
//   switch (props.size) {
//     case 'sm':
//       return 'text-sm' // 14px
//     case 'md':
//       return 'text-base' // 16px
//     case 'lg':
//       return 'text-lg' // 18px
//     case 'xl':
//       return 'text-xl' // 20px
//     default:
//       return 'text-base' // 預設值
//   }
// })

// const iconClass = computed(() => {
//   return ` ${iconColor.value}`
// })

const iconStyle = computed(() => ({
  "font-size": `${props.size}px`,
  "font-variation-settings": `'FILL' ${String(props.fill)}, 'wght' ${String(
    props.weight
  )}, 'GRAD' ${String(props.grade)}, 'opsz' 48 `,
}));
</script>
