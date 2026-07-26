import { createRouter, createWebHistory } from "vue-router";
import { useRouteGuard } from "../composables/useRouteGuard.js";
// import ComponentLibrary from "../views/ComponentLibrary.vue";
import BoxPlotTest from "../views/BoxPlotTest.vue";
import BoxPlotTest2 from "../views/BoxPlotTest2.vue";
import ScatterPlotTest from "../views/ScatterPlotTest.vue";
import BoxPlotLegendTest from "../views/BoxPlotLegendTest.vue";
// import D3Practice from "../views/D3Practice.vue";
import Login from "../views/Login.vue";
import D3CalendarTimeLineTestView from "../views/D3CalendarTimeLineTestView.vue";
import D3BarChartDemo from "../views/D3BarChartDemo.vue";
import D3LearningView from "../views/D3Learning/D3LearningView.vue";
import D3LearningIndex from "../views/D3Learning/D3LearningIndex.vue";
import D3Week3_4View from "../views/D3Learning/D3Week3-4View.vue";
import D3Week5_6View from "../components/D3Learning/Week5/D3Week5-6View.vue";
import TestReusableBarChart from "../components/D3Learning/Week5/TestReusableBarChart.vue";
import JxFixedTableGuide from "../views/JxFixedTableGuide.vue";
import GridFacetChartTest from "../views/GridFacetChartTest.vue";

// ========== 文檔系統 ==========
import DocLayout from "../layouts/DocLayout.vue";
import DocsHome from "../views/docs/Home.vue";
import DualAxisChartDoc from "../views/docs/DualAxisChartDoc.vue";
import HeatmapDoc from "../views/docs/HeatmapDoc.vue";
import ParetoDoc from "../views/docs/ParetoDoc.vue";
import TooltipDoc from "../views/docs/TooltipDoc.vue";
import ComponentPlaceholder from "../views/docs/ComponentPlaceholder.vue";

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
  // {
  //   path: "/navigation",
  //   name: "NavigationHub",
  //   component: NavigationHub,
  //   meta: {
  //     title: "系統導覽",
  //     requiresAuth: false,
  //     icon: "apps",
  //   },
  // },
  // {
  //   path: "/yield-monitor",
  //   name: "YieldMonitor",
  //   component: YieldMonitorV2,
  //   meta: {
  //     title: "Yield Monitor",
  //     requiresAuth: true,
  //   },
  // },
  // {
  //   path: "/dashboard",
  //   name: "Dashboard",
  //   component: DashBoard,
  //   meta: {
  //     title: "儀表板",
  //     requiresAuth: true,
  //   },
  // },
  {
    path: "/d3-calendar-timeline-test",
    name: "D3CalendarTimeLineTestView",
    component: D3CalendarTimeLineTestView,
    meta: {
      title: "D3 日曆時間軸測試",
      requiresAuth: true,
    },
  },
  // {
  //   path: '/DashBoard',
  //   redirect: '/dashboard'
  // },
  {
    path: "/jx-fixed-table-guide",
    name: "JxFixedTableGuide",
    component: JxFixedTableGuide,
    meta: {
      title: "JxFixedTable 使用指南",
      requiresAuth: true,
    },
  },
  {
    path: "/grid-facet-chart-test",
    name: "GridFacetChartTest",
    component: GridFacetChartTest,
    meta: {
      title: "GridFacetChart 測試",
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
        path: "components/pie-chart",
        name: "PieChartDoc",
        component: ComponentPlaceholder,
        meta: {
          title: "圓餅圖",
        },
      },
      {
        path: "components/gauge",
        name: "GaugeDoc",
        component: ComponentPlaceholder,
        meta: {
          title: "儀表板",
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
        path: "components/gantt",
        name: "GanttDoc",
        component: ComponentPlaceholder,
        meta: {
          title: "甘特圖",
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
        component: () => import("../components/SchematicViewer.vue"),
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
        path: "components/common-table",
        name: "CommonTableDoc",
        component: () => import("../views/docs/CommonTableDoc.vue"),
        meta: {
          title: "CommonTable 表格",
        },
      },
      {
        path: "components/filter-dropdown",
        name: "FilterDropdownDoc",
        component: () => import("../views/docs/components/FilterDropdown.vue"),
        meta: {
          title: "FilterDropdown 過濾器",
        },
      },
      {
        path: "components/filter-bar",
        name: "FilterBarDoc",
        component: () => import("../views/docs/components/FilterBar.vue"),
        meta: {
          title: "FilterBar 過濾橫列",
        },
      },
      {
        path: "components/filter-select",
        name: "FilterSelectDoc",
        component: () => import("../views/docs/components/FilterSelect.vue"),
        meta: {
          title: "FilterSelect 單選器",
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
        path: "components/tag-filter-dropdown",
        name: "TagFilterDropdownDoc",
        component: () => import("../views/docs/components/TagFilterDropdown.vue"),
        meta: {
          title: "TagFilterDropdown 標籤過濾",
        },
      },
      {
        path: "components/draggable-modal",
        name: "DraggableModalDoc",
        component: () => import("../views/docs/components/DraggableModal.vue"),
        meta: {
          title: "DraggableModal 可拖曳模態框",
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
        path: "components/legend",
        name: "LegendDoc",
        component: ComponentPlaceholder,
        meta: {
          title: "Legend 圖例",
        },
      },
      {
        path: "guide/getting-started",
        name: "GettingStarted",
        component: ComponentPlaceholder,
        meta: {
          title: "快速開始",
        },
      },
      {
        path: "guide/best-practices",
        name: "BestPractices",
        component: ComponentPlaceholder,
        meta: {
          title: "最佳實踐",
        },
      },
    ],
  },
  {
    path: "/schematic-viewer",
    name: "SchematicViewer",
    component: () => import("../views/SchematicViewerView.vue"),
    meta: {
      title: "Schematic Viewer",
      requiresAuth: false,
    },
  },
  {
    path: "/box-plot-test",
    name: "BoxPlotTest",
    component: BoxPlotTest,
    meta: {
      title: "盒鬚圖測試",
      requiresAuth: true,
    },
  },
  {
    path: "/scatter-plot-test",
    name: "ScatterPlotTest",
    component: ScatterPlotTest,
    meta: {
      title: "散點圖測試",
      requiresAuth: true,
    },
  },
  {
    path: "/box-plot-legend-test",
    name: "BoxPlotLegendTest",
    component: BoxPlotLegendTest,
    meta: {
      title: "盒鬚圖圖例測試",
      requiresAuth: true,
    },
  },
  {
    path: "/box-plot-test-2",
    name: "BoxPlotTest2",
    component: BoxPlotTest2,
    meta: {
      title: "BoxPlot 組件測試頁面",
      requiresAuth: true,
    },
  },
  
  {
    path: "/d3-bar-chart-demo",
    name: "D3BarChartDemo",
    component: D3BarChartDemo,
    meta: {
      title: "D3 條狀圖範圍選取示範",
      requiresAuth: true,
      hideInMenu: false,
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

// // 設置頁面標題
// router.afterEach((to) => {
//   if (to.meta.title) {
//     document.title = `${to.meta.title} - 看板系統`
//   }
// })

export default router;
