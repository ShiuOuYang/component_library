---
alwaysApply: true
---

New reusable components must be placed in the `src/components/common/` folder and registered in `src/components/common/index.js` (barrel export) with a category comment header. Use the existing `Chpt*` naming convention for form/atomic components, Tailwind CSS for styling, and follow the existing TypeScript patterns (`withDefaults(defineProps<Props>())` + `defineEmits`) used by ChptButton.vue and ChptDatePicker.vue. Reuse shared types from `src/components/common/types/ui.types.ts`.