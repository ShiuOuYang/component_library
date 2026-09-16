import axios from "axios";
import { HTTP_STATUS, getStatusMessage } from "./httpStatus";

// 創建 axios 實例
// 實際位址一律由 VITE_API_BASE_URL 提供（見 .env.example）。
// 這裡的 localhost 只是本機開發的預設值 —— 原本寫死內部 IP，
// 等於把基礎設施位址留在原始碼裡，而且換環境時很容易忘記改。
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3007/router";

/**
 * 認證端點的 base。
 *
 * 後端有兩個路徑前綴：/router（資料）與 /user（認證），而 VITE_API_BASE_URL
 * 帶的是前者，因此認證端點要把 /router 去掉。
 *
 * ⚠️ services.js 原本直接寫死一台主機的絕對網址（http://<內部IP>:3007/user/…），
 *    axios 遇到絕對網址會忽略 baseURL —— 也就是無論 VITE_API_BASE_URL
 *    指到哪裡，登入與 token 驗證都還是打那台寫死的主機。
 */
export const AUTH_BASE_URL = API_BASE_URL.replace(/\/router\/?$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
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
