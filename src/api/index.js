import axios from "axios";
import { HTTP_STATUS, getStatusMessage } from "./httpStatus";

// 創建 axios 實例
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://10.22.94.69:3007/router",
  timeout: 120000,// 👈 120秒超時
  headers: {
    "Content-Type": "application/json",
  },
});
// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 添加認證 token（如果存在）//目的是確保每個請求都帶有最新的 token，避免使用過期的 token，未來後端的驗證部分也會根據 token 的有效性來決定是否允許訪問資源
    const token = localStorage.getItem("auth_token");
    if (token) {
      console.log("🔐 添加認證 token 到請求頭", token);
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加請求時間戳
    config.metadata = { startTime: new Date() };

    console.log(
      `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    // 計算請求時間
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    console.log(
      `✅ API Response: ${response.config.method?.toUpperCase()} ${
        response.config.url
      } (${duration}ms)`
    );
    return response;
  },
  (error) => {
    const { response, config } = error;
    // 計算請求時間
    if (config?.metadata) {
      const endTime = new Date();
      const duration = endTime - config.metadata.startTime;
      console.log(
        `❌ API Error: ${config.method?.toUpperCase()} ${
          config.url
        } (${duration}ms)`
      );
    }
    // 處理不同的錯誤狀態碼
    if (response) {
      const status = response.status;
      const statusMsg = getStatusMessage(status);
      switch (status) {
        case HTTP_STATUS.UNAUTHORIZED:
          //先寫著，未來如果後端打API的時候有驗證機制，前端就會根據這個狀態碼來處理未授權的情況，例如清除 token 並重定向到登入頁面
          localStorage.removeItem("auth_token");
          console.error("🔒 " + statusMsg + " - redirecting to login");
          break;
        case HTTP_STATUS.FORBIDDEN:
          console.error("🚫 " + statusMsg);
          break;
        case HTTP_STATUS.NOT_FOUND:
          console.error("🔍 " + statusMsg);
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          console.error("🔥 " + statusMsg);
          break;
        default:
          console.error(
            `💥 HTTP Error ${status}:`,
            statusMsg,
            response.data?.message || error.message
          );
      }
    } else if (error.request) {
      console.error("🌐 Network error - no response received");
    } else {
      console.error("⚙️ Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
