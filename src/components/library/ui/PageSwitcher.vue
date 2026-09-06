<script>
/** PageSwitcher（相容別名） - re-export ChptPageSwitcher */
export { default } from './ChptPageSwitcher.vue'
</script>

<style scoped>
/* 滑入滑出動畫 */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateX(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}

/* 按鈕懸停效果 */
button {
  position: relative;
  overflow: hidden;
}

button::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
  transition: width 0.3s ease;
}

button:hover::before {
  width: 100%;
}
</style>
