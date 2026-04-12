import { defineStore } from "pinia";
import { ref } from "vue";

export const useNavigationStore = defineStore("navigation", () => {
  const menuItems = ref([
    {
      id: "dashboard",
      label: "儀表板",
      icon: "fa-solid fa-chart-column",
      active: false,
      route: "/",
      hidden: false,
    },
    // {
    //   id: 'yield-monitor',
    //   label: '良率監控',
    //   icon: 'fas fa-chart-line',
    //   active: false,
    //   route: '/yield-monitor',
    //   hidden: false
    // },
    {
      id: "yield-monitor-v2",
      label: "良率監控 V2",
      icon: "fa-solid fa-chart-line",
      active: true,
      route: "/yield-monitor-v2",
      hidden: false,
    },
    {
      id: "gantt",
      label: "甘特圖",
      icon: "fas fa-chart-bar",
      active: false,
      route: "/gantt",
      hidden: true,
    },
    {
      id: "multi-project-gantt",
      label: "多專案甘特圖",
      icon: "fas fa-sitemap",
      active: false,
      route: "/multi-project-gantt",
      hidden: true,
    },
    {
      id: "component-library",
      label: "組件庫",
      icon: "fas fa-cubes",
      active: false,
      route: "/component-library",
      hidden: true,
    },
    {
      id: "api-test",
      label: "API 測試",
      icon: "fas fa-code",
      active: false,
      route: "/api-test",
      hidden: true, // 隱藏 API 測試頁面
    },
    {
      id: "test",
      label: "測試頁面",
      icon: "fas fa-vial",
      active: false,
      route: "/test",
      hidden: true,
    },
    {
      id: "box-plot-test",
      label: "盒鬚圖測試",
      icon: "fas fa-chart-area",
      active: false,
      route: "/box-plot-test",
      hidden: false,
    },
    {
      id: "box-plot-test-2",
      label: "BoxPlot 組件測試",
      icon: "fas fa-flask",
      active: false,
      route: "/box-plot-test-2",
      hidden: false,
    },
  ]);

  const sidebarCollapsed = ref(false);
  const activeMenu = ref("dashboard");
  const currentRoute = ref("/");

  const setActiveMenuItem = (id) => {
    console.log("設定活躍選單項目:", id);
    menuItems.value.forEach((item) => {
      item.active = item.id === id;
    });
    activeMenu.value = id;
  };

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  const setActiveItem = (id) => {
    menuItems.value.forEach((item) => {
      item.active = item.id === id;
    });
  };

  const toggleItemVisibility = (id) => {
    const item = menuItems.value.find((item) => item.id === id);
    if (item) {
      item.hidden = !item.hidden;
    }
  };

  const addMenuItem = (item) => {
    menuItems.value.push(item);
  };

  const removeMenuItem = (id) => {
    const index = menuItems.value.findIndex((item) => item.id === id);
    if (index > -1) {
      menuItems.value.splice(index, 1);
    }
  };

  const updateRoute = (route) => {
    currentRoute.value = route;
  };

  return {
    menuItems,
    activeMenu,
    sidebarCollapsed,
    currentRoute,
    setActiveMenuItem,
    toggleSidebar,
    setActiveItem,
    toggleItemVisibility,
    addMenuItem,
    removeMenuItem,
    updateRoute,
  };
});
