<template>
  <div class="w-full h-full flex">
    <!-- 側邊欄 -->
    <div
      :class="[
        'fixed left-0 top-0 h-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 text-white shadow-2xl transition-all duration-300 ease-in-out z-40',
        isCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <!-- 背景裝飾層 -->
      <!-- <div
        class="absolute inset-0 bg-gradient-to-br from-teal-600/15 to-blue-600/10"
      ></div>
      <div
        class="absolute top-0 right-0 w-20 h-20 bg-teal-500/8 rounded-full -mr-10 -mt-10"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/8 rounded-full -ml-8 -mb-8"
      ></div>
      <div
        class="absolute top-1/2 right-0 w-12 h-12 bg-purple-500/5 rounded-full -mr-6"
      ></div> -->

      <!-- 折疊按鈕 -->
      <button
        @click="toggleSidebar"
        class="absolute -right-3 top-8 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors duration-200 z-50 border-2 border-slate-600 hover:cursor-pointer"
      >
        <i
          :class="[
            'text-slate-400 text-xs transition-transform duration-300',
            isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left',
          ]"
        ></i>
      </button>

      <!-- 標題區域 -->
      <div
        class="relative border-b border-slate-700/60 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center"
        :class="isCollapsed ? 'p-0 h-20' : 'p-6'"
        style="min-height: 80px"
      >
        <div class="flex flex-col items-center w-full">
          <template v-if="isCollapsed">
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-xl my-auto"
            >
              <i class="fas fa-chart-bar text-white text-lg"></i>
            </div>
          </template>
          <!-- <div
            class="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-xl my-auto"
          >
            <i class="fas fa-chart-bar text-white text-lg"></i>
          </div> -->
          <template v-else>
            <h1 class="text-xl font-bold tracking-tight text-white mt-3">
              YM WIP
            </h1>
            <div class="flex items-center space-x-2 mt-2 mb-3">
              <div
                class="w-8 h-0.5 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full"
              ></div>
              <span class="text-xs text-slate-400 font-medium tracking-wider"
                >SYSTEM</span
              >
            </div>
          </template>
        </div>
      </div>

      <!-- 主要導航選單 -->
      <div class="mt-4">
        <div :class="isCollapsed ? 'px-2 py-2' : 'py-4'" class="relative">
          <div class="flex flex-col w-full space-y-3">
            <router-link
              v-for="item in visibleMenuItems"
              :key="item.id"
              :to="item.route"
              @click.prevent="handleMenuClick(item.id, item.route)"
              :class="[
                'group flex items-center transition-all duration-300 relative overflow-hidden',
                isCollapsed ? 'justify-center px-0 py-2' : 'px-4 py-3',
                item.active
                  ? 'bg-slate-700 text-white'
                  : 'text-white hover:bg-slate-700/40 hover:shadow-md',
              ]"
            >
              <!-- 活躍指示器 -->
              <div
                v-if="item.active"
                class="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-600 to-purple-600"
              ></div>

              <!-- 圖標背景 -->
              <!-- <div
                :class="[
                  'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300',
                  isCollapsed ? 'mr-0' : 'mr-4',
                  item.active
                    ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg'
                    : 'bg-slate-700/60 text-slate-400 group-hover:bg-slate-600/80 group-hover:text-white',
                ]"
              >
                <i :class="item.icon" class="text-lg"></i>
              </div> -->

              <i
                :class="[
                  item.icon,
                  'text-lg transition-all duration-300 relative z-10',
                  isCollapsed ? 'mr-0' : 'mr-4',
                  item.active
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-white',
                ]"
              ></i>

              <!-- 標籤 -->
              <span
                v-show="!isCollapsed"
                :class="[
                  'font-medium text-base flex-1 transition-opacity duration-300',
                  item.active ? 'text-white' : 'text-slate-400',
                ]"
              >
                {{ item.label }}
              </span>

              <!-- 活躍指示器圓點 -->
              <!-- <div v-if="item.active && !isCollapsed" class="ml-auto">
                <div class="w-3 h-3 bg-teal-400 rounded-full shadow-lg"></div>
              </div> -->

              <!-- 懸停發光效果 -->
              <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
              ></div>

              <!-- 收合時的懸停提示 -->
              <div
                v-if="isCollapsed"
                class="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-black text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none"
              >
                {{ item.label }}
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- 底部登出按鈕 -->
      <div
        :class="[
          'absolute border-t border-slate-700/60  transition-all duration-300',
          isCollapsed
            ? 'bottom-20 left-1/2 -translate-x-1/2 w-12'
            : 'bottom-20 left-0 right-0',
        ]"
      >
        <LogoutButton :collapsed="isCollapsed" />
      </div>

      <!-- 底部快速操作區域 -->
      <div
        v-if="!isCollapsed"
        class="absolute bottom-6 left-6 right-6 transition-opacity duration-300"
      >
        <QuickActions />
      </div>
      <div
        v-else
        class="absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-300 flex flex-col items-center"
      >
        <!-- 只顯示圖標或簡化版的 QuickActions，假設 QuickActions 支援 isCollapsed prop -->
        <QuickActions :collapsed="true" />
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div
      :class="[
        'transition-all duration-300 ease-in-out w-full h-full flex-1 overflow-x-auto',
        isCollapsed ? 'ml-16' : 'ml-64',
      ]"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import QuickActions from "./QuickActions.vue";
import LogoutButton from "./LogoutButton.vue";
import { useApp } from "../composables/useStores";

// 路由實例
const router = useRouter();

// 使用組合式函數獲取導航狀態
const { menuItems, setActiveMenuItem, sidebarCollapsed, toggleSidebar } =
  useApp();

// 計算屬性
const isCollapsed = computed(() => sidebarCollapsed.value);

// 只顯示可見的選單項目（使用 hidden 屬性控制）
const visibleMenuItems = computed(() => {
  console.log("Visible Menu Items:", menuItems.value);
  return menuItems.value.filter((item) => !item.hidden);
});

// 處理選單點擊
const handleMenuClick = async (itemId, route) => {
  try {
    console.log("點擊選單項目:", itemId, route);
    setActiveMenuItem(itemId);
    await router.push(route);
  } catch (error) {
    console.error("導航錯誤:", error);
  }
};
</script>

<style scoped>
/* 確保懸停提示不會被截斷 */
.group:hover .absolute.left-full {
  z-index: 50;
}
</style>
