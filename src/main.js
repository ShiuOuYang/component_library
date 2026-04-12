import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'material-symbols/outlined.css'
import App from './App.vue'
import router from './router'

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
