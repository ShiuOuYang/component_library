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

// 添加點擊外部關閉指令
app.directive('click-outside', {
  beforeMount(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
})

app.mount('#app')

