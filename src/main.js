import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/styles/index.css'
import 'material-symbols/outlined.css'
import { initDarkMode } from '@/components/library/shared/useDarkMode'
import App from './App.vue'
import router from './router'

// 掛載前套用使用者上次選擇的主題，避免先閃一下亮色
initDarkMode()

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

app.mount('#app')

