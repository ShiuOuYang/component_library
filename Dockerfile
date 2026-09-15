# 使用多階段構建 - Vue.js 3 + Vite + Tailwind CSS 優化版本
FROM node:18 AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝所有依賴（包括開發依賴用於 Vue.js 3 + Vite 建置）
# 用 npm ci 而非 npm install：專案有 package-lock.json，
# npm install 會忽略鎖定版本並可能改寫 lockfile，建置就不可重現了。
RUN npm ci

# 複製所有必要的 Vue.js 3 專案檔案
COPY . .

# 檢查關鍵檔案是否存在
RUN ls -la && echo "Checking key files:" && ls -la index.html vite.config.js || true

# 建置 Vue.js 3 + Vite + Tailwind CSS 應用
RUN npm run build

# 驗證建置結果
RUN ls -la dist/ && echo "Vue.js Dashboard build completed"

# 生產階段
FROM node:18 AS production

# 安裝 PM2
RUN npm install pm2 -g

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 只安裝生產依賴（--only=production 已棄用，改用 --omit=dev）
RUN npm ci --omit=dev

# 從構建階段複製打包後的文件
COPY --from=builder /app/dist ./dist

# 複製服務器文件
COPY server.js .

# 暴露端口
EXPOSE 5000

# 創建非 root 用戶
RUN groupadd -g 1001 nodejs \
    && useradd -u 1001 -g nodejs -m nextjs
USER nextjs

# 使用 PM2 啟動服務
CMD ["pm2-runtime", "server.js"]
