<script setup>
/**
 * 應用程式外殼：只提供路由出口
 *
 * 認證狀態不在這裡初始化 —— 文件站的頁面都不需要登入，原本在這裡呼叫 useAuth()，
 * 每次打開文件站都會載入使用者 store 與 axios，瀏覽器存著舊 token 時還會打一次後端驗證。
 * 需要登入的頁面由路由守衛（useRouteGuard）延遲載入並初始化，登入頁自己的 useAuth() 也會初始化。
 */
</script>

<template>
  <router-view />
</template>
