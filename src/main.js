import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/styles/index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
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

// 註：原本這裡註冊了全域的 v-click-outside 指令，唯一的使用者是組件庫的
// FilterDropdown。組件庫不該相依應用程式註冊的全域指令（沒註冊時只會靜默失效），
// 該元件已改用 @vueuse/core 的 onClickOutside 自給自足，這個指令因此不再有人使用。

app.mount('#app')

