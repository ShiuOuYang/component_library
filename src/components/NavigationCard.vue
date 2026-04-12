<template>
  <a
    :href="url"
    target="_blank"
    class="group relative bg-white/80 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-white/40 flex flex-col"
  >
    <!-- Hover Gradient Background -->
    <div 
      class="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500"
      :class="themeClasses.gradient"
    ></div>
    
    <!-- Decorative Blur Circle -->
    <div 
      class="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl transition-all duration-500 group-hover:scale-150 opacity-40"
      :class="themeClasses.blur"
    ></div>

    <div class="relative p-7 flex flex-col h-full">
      <div class="flex items-start justify-between mb-6">
        <!-- Main Icon -->
        <div 
          class="w-14 h-14 bg-gradient-to-br rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-md group-hover:shadow-lg flex-shrink-0"
          :class="themeClasses.iconBg"
        >
          <span class="material-symbols-outlined text-white text-3xl leading-none">{{ icon }}</span>
        </div>
        
        <!-- External Link Icon (Visible on Hover) -->
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0"
          :class="themeClasses.smallIconBg"
        >
          <span 
            class="material-symbols-outlined text-xl leading-none"
            :class="themeClasses.textColor"
          >click</span>
        </div>
      </div>

      <h2 
        class="text-2xl font-bold text-gray-800 mb-3 transition-colors tracking-tight"
        :class="`group-hover:${themeClasses.textColor}`"
      >{{ title }}</h2>
      
      <p class="text-gray-600 mb-6 leading-relaxed text-base flex-grow">{{ description }}</p>
      
      <div class="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span class="w-2 h-2 rounded-full" :class="themeClasses.dotColor"></span>
          <span class="font-mono text-xs opacity-75 truncate max-w-[120px]">{{ displayUrl }}</span>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-400 group-hover:text-gray-600 transition-colors">
          前往系統
        </span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  displayUrl: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    default: 'blue',
    validator: (value) => ['blue', 'emerald', 'rose', 'violet', 'amber'].includes(value)
  }
});

const themes = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    blur: 'bg-blue-500/10',
    iconBg: 'from-blue-500 to-blue-600',
    smallIconBg: 'bg-blue-50 group-hover:bg-blue-100',
    textColor: 'text-blue-600',
    dotColor: 'bg-blue-500'
  },
  emerald: {
    gradient: 'from-emerald-500 to-green-600',
    blur: 'bg-emerald-500/10',
    iconBg: 'from-emerald-500 to-green-600',
    smallIconBg: 'bg-emerald-50 group-hover:bg-emerald-100',
    textColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500'
  },
  rose: {
    gradient: 'from-rose-500 to-red-600',
    blur: 'bg-rose-500/10',
    iconBg: 'from-rose-500 to-red-600',
    smallIconBg: 'bg-rose-50 group-hover:bg-rose-100',
    textColor: 'text-rose-600',
    dotColor: 'bg-rose-500'
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    blur: 'bg-violet-500/10',
    iconBg: 'from-violet-500 to-purple-600',
    smallIconBg: 'bg-violet-50 group-hover:bg-violet-100',
    textColor: 'text-violet-600',
    dotColor: 'bg-violet-500'
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    blur: 'bg-amber-500/10',
    iconBg: 'from-amber-500 to-orange-600',
    smallIconBg: 'bg-amber-50 group-hover:bg-amber-100',
    textColor: 'text-amber-600',
    dotColor: 'bg-amber-500'
  }
};

const themeClasses = computed(() => themes[props.theme]);
</script>