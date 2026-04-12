# DualAxisChartDoc 更新說明

## 更新內容

已成功為 `DualAxisComboChart.vue` 組件添加 ResizeObserver 功能，現在需要更新文檔頁面以反映這些變化。

### 需要在 DualAxisChartDoc.vue 中添加的內容：

#### 1. 簡介部分 (第 12-19 行)
在簡介中加入「ResizeObserver 自動響應式」的描述。

#### 2. 互動操場 (第 44 行)
在 `DualAxisComboChart` 組件中添加：
```vue
:auto-resize="playgroundAutoResize"
@chart-resize="handleChartResize"
```

#### 3. 控制面板 (第 87 行之前)
添加「自動響應式」開關：
```vue
<!-- 自動響應式 -->
<div class="flex items-center justify-between">
  <label class="text-sm font-medium text-gray-700">自動響應式</label>
  <button
    @click="playgroundAutoResize = !playgroundAutoResize"
    :class="[
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
      playgroundAutoResize ? 'bg-pink-600' : 'bg-gray-300'
    ]"
  >
    <span
      :class="[
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        playgroundAutoResize ? 'translate-x-6' : 'translate-x-1'
      ]"
    />
  </button>
</div>
```

#### 4. Script 部分
添加狀態和函數：
```javascript
const playgroundAutoResize = ref(false);

const handleChartResize = (payload) => {
  addEventLog(`📏 圖表調整: ${payload.width}x${payload.height}`);
};
```

#### 5. 新增範例 C - 響應式儀表板 (在範例 B 之後)
```vue
<!-- 範例 C - 響應式儀表板 -->
<div>
  <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 C：響應式儀表板</h3>
  <p class="text-gray-600 mb-4">
    啟用 <span class="font-semibold text-pink-600">autoResize</span> 屬性，
    圖表會自動響應容器大小變化。試著調整瀏覽器視窗大小或使用開發者工具的響應式模式。
  </p>
  
  <div class="grid lg:grid-cols-2 gap-6">
    <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border-2 border-pink-200">
      <div style="width: 100%; height: 400px;">
        <DualAxisComboChart
          :auto-resize="true"
          :debounce-delay="200"
          :layers="responsiveLayers"
          title="響應式圖表（試著調整窗口大小）"
          :showGrid="true"
          :enableBrush="true"
          @chart-resize="logResize"
        />
      </div>
      <div class="mt-4 p-3 bg-white rounded-lg">
        <p class="text-sm text-gray-600 font-mono">
          {{ resizeLog || '等待調整大小...' }}
        </p>
      </div>
    </div>
    
    <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
      <pre class="text-green-400 text-sm"><code>&lt;template&gt;
  &lt;!-- 父容器設定固定或百分比尺寸 --&gt;
  &lt;div style="width: 100%; height: 400px;"&gt;
    &lt;DualAxisComboChart
      :auto-resize="true"
      :debounce-delay="200"
      :layers="chartLayers"
      @chart-resize="handleResize"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
const handleResize = ({ width, height }) =&gt; {
  console.log(`圖表調整為: ${width}x${height}`);
};
&lt;/script&gt;</code></pre>
      <div class="mt-4 p-3 bg-yellow-900/30 rounded border border-yellow-600">
        <p class="text-yellow-200 text-xs">
          ⚠️ <strong>重要提示：</strong><br>
          啟用 autoResize 時，圖表會忽略 width 和 height props，
          改為使用父容器的實際尺寸。
        </p>
      </div>
    </div>
  </div>
</div>
```

#### 6. Script - 添加響應式範例數據
```javascript
const responsiveLayers = [
  {
    type: 'stacked-bar',
    data: [
      { week: 'W1', desktop: 450, mobile: 320 },
      { week: 'W2', desktop: 480, mobile: 350 },
      { week: 'W3', desktop: 520, mobile: 380 },
      { week: 'W4', desktop: 500, mobile: 360 }
    ],
    yAxis: 'left',
    stackKeys: ['desktop', 'mobile'],
    xValue: d => d.week,
    colorScale: (key) => key === 'desktop' ? '#8b5cf6' : '#ec4899',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { week: 'W1', conversion: 3.2 },
      { week: 'W2', conversion: 3.5 },
      { week: 'W3', conversion: 3.8 },
      { week: 'W4', conversion: 3.6 }
    ],
    yAxis: 'right',
    xValue: d => d.week,
    yValue: d => d.conversion,
    lineColor: '#14b8a6',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '轉換率 (%)' }
  }
];

const resizeLog = ref('');

const logResize = (payload) => {
  resizeLog.value = `📏 當前尺寸: ${payload.width}px × ${payload.height}px | 繪圖區域: ${payload.chartWidth}px × ${payload.chartHeight}px`;
};
```

#### 7. Props 文檔
在 height 之後添加：
```javascript
{
  name: 'autoResize',
  type: 'Boolean',
  default: 'false',
  description: '啟用自動響應容器大小變化（使用 ResizeObserver）'
},
{
  name: 'debounceDelay',
  type: 'Number',
  default: '150',
  description: 'ResizeObserver 防抖延遲時間（毫秒）'
},
```

#### 8. Events 文檔
在 chart-ready 之後添加：
```javascript
{
  name: 'chart-resize',
  params: '{ width, height, chartWidth, chartHeight }',
  description: '當圖表尺寸變化時觸發（僅在 autoResize 為 true 時）'
}
```

## 手動更新步驟

由於自動替換遇到格式問題，請手動在文檔中添加上述內容，或者我可以為您生成一個完整的新版本文件。需要我生成完整文件嗎？
