import { computed, onMounted } from "vue";
import { useUserStore } from "../stores/user.js";
import { useNavigationStore } from "../stores/navigation.js";
import { useRouter } from "vue-router";

export function useAuth() {
  const userStore = useUserStore();
  const navigationStore = useNavigationStore();
  const router = useRouter();

  // 計算屬性
  const isAuthenticated = computed(() => userStore.isAuthenticated);
  const isLoggedIn = computed(() => userStore.isLoggedIn);
  const user = computed(() => userStore.user);
  const userName = computed(() => userStore.userName);
  const userDepartment = computed(() => userStore.userDepartment);
  const isLoggingIn = computed(() => userStore.isLoggingIn);
  const loginError = computed(() => userStore.loginError);

  // 登入
  async function login(credentials) {
    const result = await userStore.login(credentials);

    if (result.success) {
      await router.push("/");
    }

    return result;
  }

  // 登出
  async function logout() {
    await userStore.logout();
    // 導向登入頁面
    router.push("/login");
  }

  // 獲取用戶頭像 URL
  function getAvatarUrl() {
    if (user.value?.avatar) {
      return user.value.avatar;
    }

    // 使用用戶名生成預設頭像
    const name = userName.value || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=9333ea&color=ffffff`; // purple-600 背景，白色文字
  }

  // 生命週期管理
  onMounted(() => {
    // 初始化認證狀態
    userStore.initAuth();
  });

  return {
    // 狀態
    isAuthenticated,
    isLoggedIn,
    user,
    userName,
    userDepartment,
    isLoggingIn,
    loginError,

    // 方法
    login,
    logout,
    getAvatarUrl,
  };
}

// 用戶資料管理 composable
export function useUser() {
  const userStore = useUserStore();

  // 計算屬性
  const user = computed(() => userStore.user);
  const userName = computed(() => userStore.userName);
  const userDepartment = computed(() => userStore.userDepartment);

  // 獲取用戶頭像 URL
  function getAvatarUrl() {
    if (user.value?.avatar) {
      return user.value.avatar;
    }

    // 使用用戶名生成預設頭像
    const name = userName.value || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random`;
  }

  return {
    // 狀態
    user,
    userName,
    userDepartment,

    // 方法
    getAvatarUrl,
  };
}
