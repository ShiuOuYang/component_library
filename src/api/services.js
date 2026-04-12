import api from "./index.js";
import { mockDataManager, isMockEnabled } from "./mockData.js";

// 認證相關 API
export const authApi = {
  // 用戶登入
  login: async (credentials) => {
    try {
      console.log("🔐 發送登入請求:", credentials);
      const response = await api.post("http://10.22.94.69:3007/user/login", {
        EMPID: credentials.username,
        PWD: credentials.password,
      });

      console.log("🔐 登入回應:", response.data);

      if (response.data.status === "success" && response.data.token) {
        // 儲存 token 到 localStorage
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("auth_time", Date.now().toString()); // 使用當前時間戳
      }

      return response.data;
    } catch (error) {
      console.error("🔐 登入錯誤:", error);

      if (error.response) {
        // 後端回應的錯誤
        return error.response.data;
      } else {
        // 網路錯誤或其他錯誤
        return {
          status: "error",
          message: "網路連線錯誤，請檢查網路狀態或聯繫系統管理員",
        };
      }
    }
  },

  // 驗證 token
  verify: async () => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      return {
        status: "error",
        message: "未登入",
      };
    }

    try {
      const response = await api.get("http://10.22.94.69:3007/user/verify", {
        headers: {
          authorization: token,
        },
      });

      return response.data;
    } catch (error) {
      console.error("🔐 Token 驗證錯誤:", error);

      // Token 無效時清除 localStorage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_time");

      return {
        status: "error",
        message: "登入已過期，請重新登入",
      };
    }
  },

  // 用戶登出
  logout: async () => {
    // 清除本地存儲
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_time");

    return {
      status: "success",
      message: "登出成功",
    };
  },

  // 檢查是否已登入
  isAuthenticated: () => {
    const token = localStorage.getItem("auth_token");
    const time = localStorage.getItem("auth_time");

    if (!token || !time) {
      return false;
    }

    // 檢查 token 是否過期 (假設 24 小時過期)
    const loginTime = parseInt(time);
    const currentTime = Date.now();
    const hoursPassed = (currentTime - loginTime) / (1000 * 60 * 60);

    if (hoursPassed > 24) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_time");
      return false;
    }

    return true;
  },
};

// 用戶相關 API
export const userApi = {
  // 獲取當前用戶資訊（從 localStorage 讀取）
  getCurrentUser: async () => {
    try {
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return {
          status: "success",
          data: user,
        };
      } else {
        return {
          status: "error",
          message: "用戶資料不存在",
        };
      }
    } catch (error) {
      console.error("❌ 讀取用戶資料失敗:", error);
      return {
        status: "error",
        message: "讀取用戶資料失敗",
      };
    }
  },

  // 更新用戶設定
  updateUserSettings: async (settings) => {
    try {
      // 更新 localStorage 中的用戶資料
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        const updatedUser = { ...user, ...settings };
        localStorage.setItem("user_info", JSON.stringify(updatedUser));

        return {
          status: "success",
          data: updatedUser,
        };
      } else {
        return {
          status: "error",
          message: "用戶資料不存在",
        };
      }
    } catch (error) {
      console.error("❌ 更新用戶設定失敗:", error);
      return {
        status: "error",
        message: "更新用戶設定失敗",
      };
    }
  },
};




