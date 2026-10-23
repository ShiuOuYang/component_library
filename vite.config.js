import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  /*
   * dev 的依賴預打包（pre-bundle）清單。
   *
   * qrcode-generator 只被「資料展示元件」文件頁（/docs/components/data-display）
   * 間接用到，而那個頁面是延遲載入的。冷啟動時若沒把它收進預打包，第一次進
   * 那個頁面 Vite 才會臨時重跑 optimizer —— 於是產生新的 dep 檔名與新的 ?v=
   * 雜湊，已經載入的分頁仍拿著舊雜湊去要檔案，得到
   * `504 (Outdated Optimize Dep)`；而失敗發生在動態 import()，Vite 的整頁
   * 重載救援不會觸發，畫面就直接壞掉。
   *
   * 寫在這裡讓它冷啟動就預打包、雜湊保持穩定。只影響 dev，不影響 build。
   */
  optimizeDeps: {
    include: ["qrcode-generator"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      /*
       * 組件庫的 .vue 視為「沒有副作用」。
       *
       * ⚠️ Vite 把每個 SFC 都當成有副作用（它會 import 自己的 CSS），於是只要
       *    `import { ChptCodeBlock } from '@/components/library'`，入口桶檔 re-export 的
       *    所有元件 —— 連同圖表的 d3、每個元件的 CSS —— 全部被留下來打進同一包。
       *    文件首頁只用到一個 ChptCodeBlock，入口卻預載了 281 KB 的 d3。
       *
       * 設成 false 後，元件沒被用到時整個（含 CSS 與它 import 的 d3）被搖掉；
       * 有用到時照常保留它的樣式。樣式子模組（?vue&type=style）本身仍是有副作用的。
       */
      treeshake: {
        moduleSideEffects(id) {
          if (/\/src\/components\/library\/.+\.vue$/.test(id)) return false;
          return true;
        },
      },
      output: {
        /*
         * d3 單獨一包：d3-transition 會修改 selection 的 prototype（有副作用），
         * 沒有明確分包時 Rollup 會把它與 d3-selection 提到入口檔 ——
         * 沒有用到圖表的頁面（包含文件首頁）也要先下載。
         */
        manualChunks(id) {
          if (/node_modules\/(vue|@vue|vue-router|pinia)\//.test(id)) return "vue-vendor";
          if (id.includes("node_modules/@vueuse/")) return "ui-vendor";
          if (/node_modules\/(d3|d3-[a-z-]+|delaunator|robust-predicates|internmap)\//.test(id)) return "d3-vendor";
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0", // 允許外部訪問
    port: 4000,
  },
});
