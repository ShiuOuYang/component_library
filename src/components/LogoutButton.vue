<template>
  <div class="user-section w-full">
    <!-- 用戶資訊顯示 -->
    <div v-if="!collapsed" class="user-info mt-6 mb-4 w-full">
      <div class="flex items-center space-x-3 px-3 py-3">
        <!-- 用戶頭像 - 對齊 icon 位置 -->
        <img
          :src="getAvatarUrl()"
          :alt="userName"
          class="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />

        <!-- 用戶資訊 - 對齊文字位置 -->
        <div class="flex flex-col min-w-0 flex-1">
          <span class="text-sm font-medium text-white truncate">{{
            userName
          }}</span>
          <span class="text-xs text-gray-400 truncate">{{
            userDepartment
          }}</span>
        </div>
      </div>
    </div>

    <!-- 剩餘時間提示 -->
    <div
      v-if="remainingTime < 2"
      class="mt-2 text-xs text-orange-500 text-center"
    >
      登入剩餘: {{ formatRemainingTime() }}
    </div>

    <!-- 登出按鈕 -->
    <button
      @click="handleLogout"
      :disabled="isLoading"
      :class="[
        'group relative flex items-center transition-all duration-300 overflow-hidden w-full cursor-pointer',
        collapsed ? 'justify-center px-0 py-2' : 'px-4 py-3',
        'text-white hover:bg-slate-700/40 hover:shadow-md',
      ]"
    >
      <!-- 載入動畫 -->
      <svg
        v-if="isLoading"
        class="animate-spin h-4 w-4 text-red-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>

      <!-- 登出圖標 -->
      <svg
        v-else
        :class="[
          'transition-transform duration-300 group-hover:translate-x-2 text-gray-400 group-hover:text-white',
          collapsed ? 'h-5 w-5 justify-center overflow-visible' : 'h-5.5 w-5.5',
        ]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>

      <!-- 文字（只在非摺疊狀態顯示） -->
      <span
        v-if="!collapsed && !isLoading"
        class="ml-5 text-gray-400 group-hover:text-white"
      >
        登出
      </span>
      <span v-if="!collapsed && isLoading" class="ml-5 text-gray-400">
        登出中...
      </span>

      <!-- Tooltip（摺疊狀態時顯示） -->
      <!-- <div
        v-if="collapsed"
        class="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none"
      >
        {{ isLoading ? "登出中..." : "登出" }}
      </div> -->
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuth, useUser } from "../composables/useAuth.js";

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

// 使用 composables
const { logout, userName, userDepartment, remainingTime, formatRemainingTime } =
  useAuth();

const { getAvatarUrl } = useUser();

// 本地狀態
const isLoading = ref(false);

const handleLogout = async () => {
  if (isLoading.value) return;

  const confirmed = confirm("確定要登出嗎？");
  if (!confirmed) return;

  try {
    isLoading.value = true;
    console.log("🚪 開始登出流程...");

    await logout();
    console.log("✅ 登出成功");
  } catch (error) {
    console.error("❌ 登出失敗:", error);
    alert("登出失敗，請稍後再試");
  } finally {
    isLoading.value = false;
  }
};
</script>
