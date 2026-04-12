import { defineStore } from "pinia";
import { authApi, userApi } from "../api/services.js";

export const useUserStore = defineStore("user", {
  state: () => ({
    // 用戶資訊
    user: null,
    isAuthenticated: false,

    // 認證狀態
    token: localStorage.getItem("auth_token") || null,
    loginTime: localStorage.getItem("auth_time") || null,

    // 載入狀態
    isLoading: false,
    isLoggingIn: false,
    isVerifying: false,

    // 錯誤狀態
    error: null,
    loginError: null,
  }),

  getters: {
    // 檢查是否已登入
    isLoggedIn: (state) => {
      if (!state.token || !state.loginTime) {
        return false;
      }

      // 檢查 token 是否過期 (24 小時)
      const loginTime = parseInt(state.loginTime);
      const currentTime = Date.now();
      const hoursPassed = (currentTime - loginTime) / (1000 * 60 * 60);

      return hoursPassed <= 24;
    },

    // 獲取用戶名稱
    userName: (state) => {
      return (
        state.user?.name ||
        state.user?.username ||
        state.user?.EMPID ||
        "未知用戶"
      );
    },

    // 獲取用戶角色
    userRole: (state) => {
      return state.user?.role || state.user?.permission || "user";
    },

    // 獲取用戶部門
    userDepartment: (state) => {
      return state.user?.department || state.user?.DeptName || "未知部門";
    },

    // 檢查是否為管理員（支援 boolean 和 number）
    isAdmin: (state) => {
      const result = state.user?.isAdmin === true || 
             state.user?.isAdmin === 1 || 
             state.user?.role === "admin";
      console.log('🔍 isAdmin getter 檢查:', {
        'user.isAdmin': state.user?.isAdmin,
        'user.role': state.user?.role,
        'result': result
      });
      return result;
    },

    // 檢查特定權限
    hasPermission: (state) => (permission) => {
      // 管理員擁有所有權限（支援 boolean 和 number）
      if (state.user?.isAdmin === true || 
          state.user?.isAdmin === 1 || 
          state.user?.role === "admin") {
        return true;
      }

      // 檢查用戶權限陣列（過濾 null 值）
      const permissions = (state.user?.permissions || []).filter(p => p !== null && p !== undefined);
      return permissions.includes(permission);
    },

    // 檢查是否可編輯預估良率
    canEditPredictYield: (state) => {
      // 管理員可以編輯（支援 boolean 和 number）
      if (state.user?.isAdmin === true || 
          state.user?.isAdmin === 1 || 
          state.user?.role === "admin") {
        return true;
      }

      // 檢查特定權限（過濾 null 值）
      const permissions = (state.user?.permissions || []).filter(p => p !== null && p !== undefined);
      return permissions.includes("predict_yield_edit");
    },
    canImportPredictYield: (state) => {
      // 管理員可以編輯（支援 boolean 和 number）
      if (state.user?.isAdmin === true || 
          state.user?.isAdmin === 1 || 
          state.user?.role === "admin") {
        return true;
      }

      // 檢查特定權限（過濾 null 值）
      const permissions = (state.user?.permissions || []).filter(p => p !== null && p !== undefined);
      return permissions.includes("predict_yield_import");
    },

    // 獲取剩餘登入時間（小時）
    remainingTime: (state) => {
      if (!state.loginTime) return 0;

      const loginTime = parseInt(state.loginTime);
      const currentTime = Date.now();
      const hoursPassed = (currentTime - loginTime) / (1000 * 60 * 60);
      return Math.max(0, 24 - hoursPassed);
    },
  },

  actions: {
    // 初始化認證狀態
    initAuth() {
      const token = localStorage.getItem("auth_token");
      const time = localStorage.getItem("auth_time");
      const userInfo = localStorage.getItem("user_info");

      if (token && time) {
        this.token = token;
        this.loginTime = time;

        // 載入用戶資訊
        if (userInfo) {
          try {
            this.user = JSON.parse(userInfo);
          } catch (error) {
            console.error("❌ 解析用戶資訊失敗:", error);
            this.user = null;
          }
        }

        this.isAuthenticated = this.isLoggedIn;

        // 如果已登入，自動驗證 token
        if (this.isAuthenticated) {
          this.verifyToken();
        }
      }
    },

    // 用戶登入
    async login(credentials) {
      this.isLoggingIn = true;
      this.loginError = null;

      try {
        // console.log('🔐 開始登入流程:', credentials.username || credentials.EMPID)

        const response = await authApi.login(credentials);
        // console.log('🔐 後端響應:', response)

        if (response.status === "success" && response.token) {
          // 更新 store 狀態（配合實際後端返回格式）
          this.token = response.token;
          this.loginTime = Date.now().toString();
          this.isAuthenticated = true;

          // 統一用戶資料格式 - 根據實際回應結構
          const isAdminValue = response.user.isAdmin === true || 
                               response.user.isAdmin === 1 || 
                               response.user.admin === true || 
                               response.user.admin === 1;
          
          // 過濾掉 null 和 undefined 的權限
          const validPermissions = (response.user.permissions || [])
            .filter(p => p !== null && p !== undefined && p !== '');
          
          this.user = {
            id: response.user.id, // "A4378"
            name: response.user.name, // "歐陽緒"
            username: response.user.id, // 使用 id 作為 username
            EMPID: response.user.id, // 員工編號
            department: response.user.DeptName, // "YM|YIP|BFYIP|"
            email: response.user.email, // "Hsu_OuYang@unimicron.com"
            isAdmin: isAdminValue, // 統一轉換為 boolean
            role: isAdminValue ? "admin" : "user",
            permissions: validPermissions, // 過濾後的權限陣列
          };
          console.log('✅ 登入成功，用戶資料:', this.user)

          // 儲存到 localStorage
          localStorage.setItem("auth_token", this.token);
          localStorage.setItem("auth_time", this.loginTime);
          localStorage.setItem("user_info", JSON.stringify(this.user));

          // console.log('✅ 登入成功，用戶資料:', this.user)
          return { success: true, data: response };
        } else {
          this.loginError = response.message || "登入失敗";
          console.error("❌ 登入失敗:", response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error("❌ 登入過程發生錯誤:", error);
        // 處理不同類型的錯誤
        let errorMessage = "網路連線錯誤";

        if (error.response?.status === 401) {
          errorMessage = "用戶不存在或帳號密碼錯誤，請重新輸入";
        } else if (error.response?.status === 500) {
          errorMessage = "服務暫時無法使用，請稍後再試";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.loginError = errorMessage;
        return { success: false, error: errorMessage };
      } finally {
        this.isLoggingIn = false;
      }
    },

    // 驗證 token
    async verifyToken() {
      if (!this.token) {
        this.isAuthenticated = false;
        return false;
      }

      this.isVerifying = true;

      try {
        const response = await authApi.verify();

        if (response.status === "success") {
          this.isAuthenticated = true;
          
          // ⚠️ 重要：合併 user 資料而不是直接覆蓋
          // 保留現有的 isAdmin 和 permissions
          if (response.user) {
            // 處理 isAdmin（支援 number 和 boolean）
            const isAdminValue = response.user.isAdmin === true || 
                                 response.user.isAdmin === 1 || 
                                 response.user.admin === true || 
                                 response.user.admin === 1 ||
                                 this.user?.isAdmin === true; // 保留現有值
            
            // 過濾 null 權限
            const validPermissions = (response.user.permissions || this.user?.permissions || [])
              .filter(p => p !== null && p !== undefined && p !== '');
            
            this.user = {
              ...this.user,  // 保留現有資料
              ...response.user,  // 更新新資料
              isAdmin: isAdminValue,
              role: isAdminValue ? "admin" : "user",
              permissions: validPermissions
            };
            
            // 更新 localStorage
            localStorage.setItem("user_info", JSON.stringify(this.user));
            
            console.log('✅ Token 驗證成功，用戶資料:', this.user);
          }
          return true;
        } else {
          // Token 無效，清除認證狀態
          this.clearAuth();
          return false;
        }
      } catch (error) {
        console.error("❌ Token 驗證失敗:", error);
        this.clearAuth();
        return false;
      } finally {
        this.isVerifying = false;
      }
    },

    // 獲取用戶資訊
    async fetchUserProfile() {
      if (!this.isAuthenticated) {
        console.warn("⚠️ 用戶未登入，無法獲取資料");
        return false;
      }

      // 如果已經有用戶資料，就不需要重新獲取
      if (this.user) {
        console.log("ℹ️ 用戶資料已存在，跳過獲取");
        return true;
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await userApi.getCurrentUser();

        if (response.status === "success" && response.data) {
          this.user = response.data;
          console.log("✅ 用戶資料已更新:", this.user);
          return true;
        } else {
          console.warn(
            "⚠️ 獲取用戶資料失敗，但不影響正常使用:",
            response.message
          );
          return false;
        }
      } catch (error) {
        console.warn("⚠️ 獲取用戶資料失敗，但不影響正常使用:", error.message);
        // 不設置 error，避免影響用戶體驗
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    // 更新用戶設定
    async updateSettings(settings) {
      if (!this.isAuthenticated) {
        console.warn("⚠️ 用戶未登入，無法更新設定");
        return false;
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await userApi.updateUserSettings(settings);

        if (response.success || response.status === "success") {
          // 更新本地用戶資料
          this.user = { ...this.user, ...settings };
          console.log("✅ 用戶設定已更新");
          return true;
        } else {
          this.error = response.message || "更新設定失敗";
          return false;
        }
      } catch (error) {
        console.error("❌ 更新用戶設定失敗:", error);
        this.error = error.message || "網路連線錯誤";
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    // 用戶登出
    async logout() {
      try {
        await authApi.logout();
        console.log("✅ 登出成功");
      } catch (error) {
        console.error("❌ 登出過程發生錯誤:", error);
      } finally {
        this.clearAuth();
      }
    },

    // 清除認證狀態
    clearAuth() {
      this.user = null;
      this.token = null;
      this.loginTime = null;
      this.isAuthenticated = false;
      this.error = null;
      this.loginError = null;

      // 清除 localStorage 中的所有認證相關資料
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_time");
      localStorage.removeItem("user_info");

      console.log("🔓 認證狀態已清除");
    },

    // 檢查並刷新認證狀態
    async checkAndRefreshAuth() {
      if (!this.isLoggedIn) {
        this.clearAuth();
        return false;
      }

      // 如果快過期（剩餘不到1小時），嘗試刷新
      if (this.remainingTime < 1) {
        console.log("⏰ Token 即將過期，嘗試刷新...");
        return await this.verifyToken();
      }

      return true;
    },
  },
});
