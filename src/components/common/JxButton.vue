<template>
  <button
    :type="type"
    @click="handleClick"
    :class="[
      'flex items-center transition-all duration-300 focus:outline-none',
      sizeClass,
      colorClass,
      roundedClass,
      { 'flex-row-reverse': iconPosition === 'right' },
      { 'opacity-50 cursor-not-allowed': disabled || loading },
      { 'cursor-progress': loading },
      { relative: hasBadge },
    ]"
  >
    <JxIcon v-if="icon" :color="iconColor" :class="iconClass">{{
      icon
    }}</JxIcon>
    <span v-if="text && !loading" :class="textClass">{{ text }}</span>
    <span v-if="loading" class="flex items-center">
      <i class="fas fa-spinner fa-spin mr-2"></i>
      <span :class="textClass">{{ text }}</span>
    </span>
    <span
      v-if="hasBadge && (badgeText === 0 || badgeText) && badgeBgColor"
      class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2"
      :class="[
        badgeClass,
        {
          'rounded-full': String(badgeText).length,
          ' rounded-xl': String(badgeText).length > 1,
        },
      ]"
    >
      <p class="transition-all text-xs px-2 py-1" :class="animationClass">
        {{ displayedBadgeText }}
      </p>
    </span>
    <slot></slot>
  </button>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import JxIcon from "./JxIcon.vue";

const props = defineProps({
  textWidth: {
    type: String,
    default: "auto",
  },
  size: {
    type: String,
    default: "md",
  },
  color: {
    type: String,
    default: "primary",
  },
  rounded: {
    type: String,
    default: "md",
  },
  type: {
    type: String,
    default: "button",
    validator: (value) => ["button", "submit"].includes(value),
  },
  isOutline: {
    type: Boolean,
    default: false,
  },
  iconPosition: {
    type: String,
    default: "left",
    validator: (value) => ["left", "right"].includes(value),
  },
  icon: {
    type: String,
    default: "",
  },
  iconColor: {
    type: String,
    default: "",
  },
  text: {
    type: String,
    default: "",
  },
  textColor: {
    type: String,
    default: "white",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasBadge: {
    type: Boolean,
    default: false,
  },
  badgeText: {
    type: [String, Number],
    default: 0,
  },
  badgeBgColor: {
    type: String,
    default: "error-light",
  },
  badgeTextColor: {
    type: String,
    default: "white",
  },
});

const roundedClass = computed(() => {
  const roundedMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  return roundedMap[props.rounded] || 'rounded-md';
});

const sizeClass = computed(() => {
  switch (props.size) {
    case "3xs":
      return "px-0.5 py-0 text-[6px] h-[8px] leading-none min-w-[12px]";
    case "2xs":
      return "px-1 py-0 text-[8px] h-[10px] leading-none min-w-[16px]";
    case "xs":
      return "px-1.5 py-0 text-[10px] h-4 leading-tight";
    case "sm":
      return "px-2 py-0.5 text-xs h-6";
    case "md":
      return "px-4 py-2 text-base h-10";
    case "lg":
      return "px-6 py-3 text-lg h-12";
    default:
      return "px-4 py-2 text-base h-10";
  }
});

const colorClass = computed(() => {
  // 使用完整的 class 名稱，而不是動態拼接
  const colorMap = {
    primary: {
      solid: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
      outline: 'bg-white/80 backdrop-blur-sm text-blue-600 border border-blue-500 hover:bg-blue-500 hover:text-white active:bg-blue-600'
    },
    secondary: {
      solid: 'bg-gray-500 border-gray-500 text-white hover:bg-gray-600 active:bg-gray-700',
      outline: 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-500 hover:bg-gray-500 hover:text-white active:bg-gray-600'
    },
    success: {
      solid: 'bg-green-500 border-green-500 text-white hover:bg-green-600 active:bg-green-700',
      outline: 'bg-white/80 backdrop-blur-sm text-green-600 border border-green-500 hover:bg-green-500 hover:text-white active:bg-green-600'
    },
    danger: {
      solid: 'bg-red-500 border-red-500 text-white hover:bg-red-600 active:bg-red-700',
      outline: 'bg-white/80 backdrop-blur-sm text-red-600 border border-red-500 hover:bg-red-500 hover:text-white active:bg-red-600'
    },
    warning: {
      solid: 'bg-yellow-500 border-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700',
      outline: 'bg-white/80 backdrop-blur-sm text-yellow-600 border border-yellow-500 hover:bg-yellow-500 hover:text-white active:bg-yellow-600'
    }
  };
  
  const colorType = props.isOutline ? 'outline' : 'solid';
  return colorMap[props.color]?.[colorType] || colorMap.primary[colorType];
});

const iconClass = computed(() => {
  // 如果只有icon，則不需要margin
  return props.text ? (props.iconPosition === "left" ? "mr-2" : "ml-2") : "";
});

const textClass = computed(() => {
  const textMargin = props.icon
    ? props.iconPosition === "left"
      ? "ml-2"
      : "mr-2"
    : "";
  return textMargin;
});

const badgeClass = computed(() => {
  // 使用完整的 class 名稱
  const bgColorMap = {
    'error-light': 'bg-red-400',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'success': 'bg-green-500',
    'info': 'bg-blue-500'
  };
  
  const textColorMap = {
    'white': 'text-white',
    'black': 'text-black'
  };
  
  const bgClass = bgColorMap[props.badgeBgColor] || 'bg-red-400';
  const textClass = textColorMap[props.badgeTextColor] || 'text-white';
  
  return `${bgClass} ${textClass}`;
});

const displayedBadgeText = ref(props.badgeText);
const animationClass = ref("");

watch(
  () => props.badgeText,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      animationClass.value = "opacity-0 -translate-y-1/2";

      setTimeout(() => {
        displayedBadgeText.value = newValue;
        animationClass.value = "opacity-100";
      }, 200);
    }
  }
);

const emit = defineEmits(["click"]);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
};
</script>
