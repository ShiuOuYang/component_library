import { createRouter, createWebHistory } from "vue-router";
import { useRouteGuard } from "../composables/useRouteGuard.js";
// import ComponentLibrary from "../views/ComponentLibrary.vue";
// import D3Practice from "../views/D3Practice.vue";
import Login from "../views/Login.vue";
import D3LearningView from "../views/D3Learning/D3LearningView.vue";
import D3LearningIndex from "../views/D3Learning/D3LearningIndex.vue";
import D3Week3_4View from "../views/D3Learning/D3Week3-4View.vue";
import D3Week5_6View from "../components/D3Learning/Week5/D3Week5-6View.vue";
import TestReusableBarChart from "../components/D3Learning/Week5/TestReusableBarChart.vue";

import ChptTableGuide from "../views/ChptTableGuide.vue";

// ========== 文檔系統 ==========
import DocLayout from "../layouts/DocLayout.vue";
import DocsHome from "../views/docs/Home.vue";
import DualAxisChartDoc from "../views/docs/DualAxisChartDoc.vue";
import HeatmapDoc from "../views/docs/HeatmapDoc.vue";
import ParetoDoc from "../views/docs/ParetoDoc.vue";
import TooltipDoc from "../views/docs/TooltipDoc.vue";

const routes = [
    {
    path: "/login",
    name: "Login",
    component: Login,
    meta: {
      title: "系統登入",
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: "/",
    redirect: "/docs",
  },
  {
    path: "/chpt-table-guide",
    name: "ChptTableGuide",
    component: ChptTableGuide,
    meta: {
      title: "ChptFixedTable 使用指南",
      requiresAuth: true,
    },
  },
  
  // ========== 組件庫文檔系統 ==========
  {
    path: "/docs",
    component: DocLayout,
    meta: {
      title: "組件庫文檔",
      requiresAuth: false,
    },
    children: [
      {
        path: "",
        name: "DocsHome",
        component: DocsHome,
        meta: {
          title: "組件庫首頁",
        },
      },
      {
        path: "components/dual-axis-chart",
        name: "DualAxisChartDoc",
        component: DualAxisChartDoc,
        meta: {
          title: "雙軸組合圖",
        },
      },
      {
        path: "components/pareto",
        name: "ParetoDoc",
        component: ParetoDoc,
        meta: {
          title: "柏拉圖",
        },
      },
      {
        path: "components/heatmap",
        name: "HeatmapDoc",
        component: HeatmapDoc,
        meta: {
          title: "熱力圖",
        },
      },
      {
        path: "components/gerber-viewer",
        name: "GerberViewerDoc",
        component: () => import("../views/docs/GerberViewerDoc.vue"),
        meta: {
          title: "Gerber 檢視器",
        },
      },
      {
        path: "components/pcb-layout",
        name: "PcbLayoutDoc",
        component: () => import("../views/docs/PcbLayoutDoc.vue"),
        meta: {
          title: "PCB Layout",
        },
      },
      {
        path: "components/schematic-viewer",
        name: "SchematicViewerDoc",
        // 原本直接指向元件本身，與其他文件頁不一致（而且 SchematicViewer
        // 是自帶 header 的整頁應用，直接塞進 DocLayout 會有兩層版面）。
        component: () => import("../views/docs/SchematicViewerDoc.vue"),
        meta: {
          title: "Schematic Viewer",
        },
      },
      {
        path: "components/tooltip",
        name: "TooltipDoc",
        component: TooltipDoc,
        meta: {
          title: "Tooltip 提示框",
        },
      },
            {
        path: "components/form-atoms",
        name: "FormAtomsDoc",
        component: () => import("../views/docs/components/FormAtoms.vue"),
        meta: {
          title: "基礎表單元件",
        },
      },
            {
        path: "components/feedback",
        name: "FeedbackDoc",
        component: () => import("../views/docs/components/FeedbackDocs.vue"),
        meta: {
          title: "反饋元件",
        },
      },
      {
        path: "components/interactive",
        name: "InteractiveDoc",
        component: () => import("../views/docs/components/InteractiveDocs.vue"),
        meta: {
          title: "互動元件",
        },
      },
      {
        path: "components/overlay",
        name: "OverlayDoc",
        component: () => import("../views/docs/components/OverlayDocs.vue"),
        meta: {
          title: "浮層元件",
        },
      },
            {
              path: "components/layout-nav",
              name: "LayoutNavDoc",
              component: () => import("../views/docs/components/LayoutNavDocs.vue"),
              meta: {
                title: "佈局與流程元件",
              },
            },
            {
              path: "components/data-filter",
              name: "DataFilterDoc",
              component: () => import("../views/docs/components/DataFilterDocs.vue"),
              meta: {
                title: "資料呈現與過濾元件",
              },
            },
            {
              path: "components/theme-tools",
              name: "ThemeToolsDoc",
              component: () => import("../views/docs/components/ThemeToolsDocs.vue"),
              meta: {
                title: "主題與工具元件",
              },
            },
            {
              path: "components/excel-editor",
              name: "ExcelEditorDoc",
              component: () => import("../views/docs/components/ExcelEditorDocs.vue"),
              meta: {
                title: "Excel 編輯器",
              },
            },
      {
        path: "components/whiteboard",
        name: "WhiteboardDoc",
        component: () => import("../views/docs/WhiteboardDoc.vue"),
        meta: {
          title: "Whiteboard 白板",
        },
      },
      {
        path: "guide/getting-started",
        name: "GettingStarted",
        component: () => import("../views/docs/guide/GettingStarted.vue"),
        meta: {
          title: "快速開始",
        },
      },
      {
        path: "guide/best-practices",
        name: "BestPractices",
        component: () => import("../views/docs/guide/BestPractices.vue"),
        meta: {
          title: "最佳實踐",
        },
      },
    ],
  },
  // 未匹配的路徑原本會渲染成白畫面（沒有 catch-all 路由）
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
    meta: {
      title: "找不到頁面",
      requiresAuth: false,
    },
  },
  {
    path: "/d3-learning",
    name: "D3Learning",
    component: D3LearningIndex,
    meta: {
      title: "D3 學習路線圖",
      requiresAuth: false,
      icon: "school",
    },
  },
  {
    path: "/d3-learning/week1",
    name: "D3LearningWeek1",
    component: D3LearningView,
    meta: {
      title: "D3 學習 - Week 1-2",
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: "/d3-learning/week3-4",
    name: "D3LearningWeek3-4",
    component: D3Week3_4View,
    meta: {
      title: "D3 學習 - Week 3-4",
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: "/d3-learning/week5-6",
    name: "D3LearningWeek5-6",
    component: D3Week5_6View,
    meta: {
      title: "D3 學習 - Week 5-6",
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: "/d3-learning/week5-test",
    name: "TestReusableBarChart",
    component: TestReusableBarChart,
    meta: {
      title: "D3 Week 5 Test",
      requiresAuth: false,
      hideInMenu: true,
    },
  },

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守衛
// ✅ 使用 useRouteGuard Composable 簡化路由守衛邏輯
router.beforeEach(async (to, from, next) => {
  const { checkAuth, checkLoginPageRedirect } = useRouteGuard();

  // 開發模式：可選擇跳過登入檢查
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('🔧 開發模式，跳過登入檢查');
  //   next();
  //   return;
  // }

  // 如果是登入頁面，檢查是否已經登入
  if (to.path === "/login") {
    if (checkLoginPageRedirect()) {
      next("/");  // 已登入則導向首頁（會自動重定向到 /redisual）
      return;
    } else {
      next();
      return;
    }
  }

  // 檢查路由是否需要認證
  if (to.meta.requiresAuth !== false) {
    const result = await checkAuth(to);
    
    if (result.allowed) {
      next();
    } else {
      // 根據失敗原因決定重定向位置
      if (result.redirectTo) {
        next(result.redirectTo);
      } else {
        next(false); // 取消導航，停留原頁面
      }
    }
  } else {
    // 不需要認證的路由
    next();
  }
});

// 設置頁面標題
// 原本這段被整段註解掉，所以不論切到哪一頁，分頁標題都停在 index.html 的
// 「組件庫文檔」不會變。
const BASE_TITLE = '組件庫文檔'
router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${BASE_TITLE}` : BASE_TITLE
})

export default router;
