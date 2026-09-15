<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
    <div class="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex">
      
      <!-- Left Side - Visual -->
      <div class="hidden md:flex md:w-1/2 bg-neutral-900 relative items-center justify-center p-12">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-neutral-900 via-primary-900 to-neutral-900 opacity-90"></div>
        
        <div class="relative z-10 text-center">
          <div class="w-24 h-24 bg-white/10 rounded-2xl backdrop-blur-sm mx-auto flex items-center justify-center mb-8 ring-1 ring-white/20 shadow-xl">
             <span class="text-4xl font-bold text-white tracking-widest"></span>
          </div>
          <h2 class="text-3xl font-bold text-white mb-2 tracking-wide">Y</h2>
          <p class="text-primary-200 text-sm uppercase tracking-widest font-medium">Yield Improvement Platform</p>
          
          <div class="mt-12 space-y-4 text-left">
            <div class="flex items-center text-primary-100/80 space-x-4 bg-white/5 p-4 rounded-lg border border-white/5 backdrop-blur-sm transform hover:scale-105 transition-transform duration-300">
               <div class="p-2 bg-primary-500/20 rounded-lg">
                 <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
               </div>
               <div>
                 <h4 class="font-bold text-white">Real-time Data</h4>
                 <p class="text-xs">即時監控生產數據</p>
               </div>
            </div>
            <div class="flex items-center text-primary-100/80 space-x-4 bg-white/5 p-4 rounded-lg border border-white/5 backdrop-blur-sm transform hover:scale-105 transition-transform duration-300">
               <div class="p-2 bg-secondary-500/20 rounded-lg">
                 <svg class="w-6 h-6 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               </div>
               <div>
                 <h4 class="font-bold text-white">Efficiency</h4>
                 <p class="text-xs">提升製程改善效率</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side - Login Form -->
      <div class="w-full md:w-1/2 p-8 md:p-14 bg-white flex flex-col justify-center relative">
        <div class="mb-10">
          <h3 class="text-2xl font-bold text-neutral-800">歡迎登入</h3>
          <p class="text-neutral-500 mt-2">請輸入您的帳號資訊以繼續</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          
          <!-- Employee ID Field -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">員工編號</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-primary-600 transition-colors">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <input 
                type="text" 
                v-model="formData.EMPID"
                required
                class="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all bg-neutral-50 hover:bg-white focus:bg-white"
                placeholder="請輸入工號"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">密碼</label>
            <div class="relative group">
               <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-primary-600 transition-colors">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <input 
                :type="showPassword ? 'text' : 'password'"
                v-model="formData.PWD" 
                required
                class="block w-full pl-10 pr-12 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all bg-neutral-50 hover:bg-white focus:bg-white"
                placeholder="身分證後五碼"
                :disabled="isLoading"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none"
              >
                <svg v-if="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path></svg>
              </button>
            </div>
          </div>

          <!-- Error Message -->
           <transition 
            enter-active-class="transform ease-out duration-300 transition"
            enter-from-class="translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div v-if="errorMessage" class="bg-danger-50 text-danger-600 text-sm px-4 py-3 rounded-xl flex items-center shadow-sm border border-danger-100">
               <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               {{ errorMessage }}
            </div>
          </transition>

          <!-- Submit Button -->
          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-xl hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-300 transition-all transform active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
             <span v-if="!isLoading">登入系統</span>
             <svg v-else class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          </button>
        </form>

        <div class="mt-8 text-center text-neutral-400 absolute bottom-4 left-0 right-0">
          <p class="text-xs text-neutral-400">© {{ new Date().getFullYear() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

const { login, isLoggingIn, loginError } = useAuth()

const formData = ref({
  EMPID: '',
  PWD: ''
})

const isLoading = computed(() => isLoggingIn.value)
const errorMessage = computed(() => loginError.value || '')
const showPassword = ref(false)

const handleLogin = async () => {
  if (isLoading.value) return
  try {
    await login({
      username: formData.value.EMPID.trim(),
      password: formData.value.PWD
    })
  } catch (error) {
    console.error('Login error:', error)
  }
}
</script>

<style scoped>
/* 隱藏瀏覽器原生的密碼顯示按鈕 (主要是 Edge) */
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}
</style>
