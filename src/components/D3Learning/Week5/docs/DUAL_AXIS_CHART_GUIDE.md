# DualAxisComboChart 企業級架構文檔

## 📋 目錄

1. [設計理念](#設計理念)
2. [核心特性](#核心特性)
3. [API 文檔](#api-文檔)
4. [圖層配置](#圖層配置)
5. [使用範例](#使用範例)
6. [最佳實踐](#最佳實踐)
7. [擴展指南](#擴展指南)

---

## 設計理念

### 企業級設計原則

#### 1. **圖層化架構 (Layered Architecture)**
```
┌─────────────────────────────────────┐
│         Title & Legend              │
├─────────────────────────────────────┤
│  Grid Layer (背景網格)              │
│  ├── Stacked Bar Layer (堆疊長條圖) │
│  ├── Line Layer (折線圖)            │
│  └── Area Layer (面積圖) [預留]     │
├─────────────────────────────────────┤
│  X/Y Axes (座標軸)                  │
└─────────────────────────────────────┘
```

#### 2. **配置驅動渲染 (Configuration-Driven Rendering)**
- 所有視覺元素通過 `layers` 配置數組控制
- 支持動態添加/移除圖層
- 每個圖層獨立配置，互不干擾

#### 3. **依賴注入 (Dependency Injection)**
```javascript
// 可注入自定義 scale factory
xScaleFactory: (context) => {
  return d3.scaleTime()
    .domain(d3.extent(context.data, d => d.date))
    .range([0, context.width]);
}
```

#### 4. **事件驅動 (Event-Driven)**
```javascript
// 統一的事件系統
emit('layer-click', { data, layer, series })
emit('layer-hover', { data, layer })
emit('tooltip-show', { position, data, layer })
```

---

## 核心特性

### ✅ 已實現功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| 堆疊長條圖 | 支持多系列數據堆疊 | ✅ |
| 折線圖 | 支持曲線、數據點、樣式配置 | ✅ |
| 雙 Y 軸 | 左右兩側獨立座標軸 | ✅ |
| 多圖層 | 任意組合不同類型圖表 | ✅ |
| 響應式動畫 | Enter/Update/Exit 動畫 | ✅ |
| 自定義 Tooltip | Vue 插槽支持 | ✅ |
| 圖例系統 | 自動生成可配置圖例 | ✅ |
| 網格線 | 可選背景網格 | ✅ |
| SVG Clip-Path | 防止圖表溢出 | ✅ |

### 🔮 擴展點 (預留接口)

```javascript
// 可擴展的圖層類型
const layerTypes = {
  'stacked-bar': renderStackedBars,
  'line': renderLines,
  'area': renderArea,          // 預留
  'scatter': renderScatter,    // 預留
  'candlestick': renderCandle  // 預留
}

// 可擴展的 scale 類型
const scaleTypes = {
  'band': d3.scaleBand,
  'linear': d3.scaleLinear,
  'time': d3.scaleTime,
  'log': d3.scaleLog,          // 已支持
  'sqrt': d3.scaleSqrt         // 已支持
}
```

---

## API 文檔

### Props

#### 基礎配置

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `width` | Number | 800 | 圖表總寬度（像素） |
| `height` | Number | 500 | 圖表總高度（像素） |
| `margin` | Object | `{ top: 60, right: 80, bottom: 60, left: 80 }` | 邊距配置 |

#### 圖層配置

| Prop | Type | Required | 說明 |
|------|------|----------|------|
| `layers` | Array | ✅ | 圖層配置數組（詳見下方） |

#### X 軸配置

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `xScaleType` | String | 'band' | 座標類型：'band' \| 'linear' \| 'time' |
| `xDomain` | Array | null | 自定義定義域 |
| `xAxisLabel` | String | '' | X 軸標籤 |
| `xAxisFormat` | Function | null | 刻度格式化函數 |

#### 左 Y 軸配置

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `yLeftScaleType` | String | 'linear' | 'linear' \| 'log' \| 'sqrt' |
| `yLeftDomain` | Array | null | 自定義定義域 |
| `yLeftAxisLabel` | String | '' | 左 Y 軸標籤 |
| `yLeftAxisFormat` | Function | null | 刻度格式化函數 |

#### 右 Y 軸配置

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `yRightScaleType` | String | 'linear' | 同上 |
| `yRightDomain` | Array | null | 自定義定義域 |
| `yRightAxisLabel` | String | '' | 右 Y 軸標籤 |
| `yRightAxisFormat` | Function | null | 刻度格式化函數 |

#### 視覺配置

| Prop | Type | Default | 說明 |
|------|------|---------|------|
| `title` | String | '' | 圖表標題 |
| `showGrid` | Boolean | true | 是否顯示網格線 |
| `animationDuration` | Number | 750 | 動畫持續時間（毫秒） |

### Events

| Event | Payload | 說明 |
|-------|---------|------|
| `layer-click` | `{ data, layer, series? }` | 圖層元素點擊 |
| `layer-hover` | `{ data, layer, series? }` | 圖層元素懸停 |
| `tooltip-show` | `{ position, data, layer, series? }` | Tooltip 顯示 |
| `tooltip-hide` | - | Tooltip 隱藏 |
| `chart-ready` | `{ scales, dimensions }` | 圖表初始化完成 |

### Slots

| Slot | Props | 說明 |
|------|-------|------|
| `tooltip` | `{ tooltipData, tooltipVisible }` | 自定義 Tooltip 模板 |

---

## 圖層配置

### 通用屬性

所有圖層類型共享的屬性：

```javascript
{
  type: String,           // 必填：'stacked-bar' | 'line' | 'area'
  yAxis: String,          // 必填：'left' | 'right'
  data: Array,            // 必填：數據數組
  xValue: Function,       // 必填：X 值訪問器
  keyFn: Function,        // 選填：數據 key 函數（用於 D3 data-join）
  legend: Object          // 選填：圖例配置 { show, label, position }
}
```

### 堆疊長條圖 (stacked-bar)

```javascript
{
  type: 'stacked-bar',
  yAxis: 'left',
  data: [
    { month: 'Jan', seriesA: 100, seriesB: 50 },
    { month: 'Feb', seriesA: 120, seriesB: 60 }
  ],
  stackKeys: ['seriesA', 'seriesB'],  // 必填：要堆疊的欄位名稱
  xValue: d => d.month,
  colorScale: (key, index) => {        // 選填：顏色映射
    return colorMap[key];
  },
  keyFn: d => d.month
}
```

**屬性說明：**

| 屬性 | Type | 說明 |
|------|------|------|
| `stackKeys` | String[] | 要堆疊的數據欄位（必填） |
| `colorScale` | Function\|Object\|Array | 顏色配置：<br>• Function: `(key, index) => color`<br>• Object: `{ seriesA: '#f00', ... }`<br>• Array: `['#f00', '#0f0', ...]` |

### 折線圖 (line)

```javascript
{
  type: 'line',
  yAxis: 'right',
  data: [
    { month: 'Jan', value: 15.2 },
    { month: 'Feb', value: 18.5 }
  ],
  xValue: d => d.month,
  yValue: d => d.value,              // 必填：Y 值訪問器
  lineColor: '#ef4444',              // 選填：線條顏色
  strokeWidth: 2,                    // 選填：線條寬度
  showDots: true,                    // 選填：是否顯示數據點
  curve: d3.curveMonotoneX,          // 選填：曲線類型
  keyFn: d => d.month
}
```

**屬性說明：**

| 屬性 | Type | Default | 說明 |
|------|------|---------|------|
| `yValue` | Function | - | Y 值訪問器（必填） |
| `lineColor` | String | '#ef4444' | 線條顏色 |
| `strokeWidth` | Number | 2 | 線條寬度 |
| `showDots` | Boolean | false | 是否顯示數據點 |
| `curve` | Function | d3.curveMonotoneX | D3 曲線類型 |

**支持的曲線類型：**
- `d3.curveLinear` - 直線
- `d3.curveMonotoneX` - 單調曲線（推薦）
- `d3.curveCatmullRom` - Catmull-Rom 曲線
- `d3.curveCardinal` - Cardinal 曲線
- `d3.curveStep` - 階梯曲線

---

## 使用範例

### 基礎用法

```vue
<template>
  <DualAxisComboChart
    :width="800"
    :height="500"
    :layers="layers"
    title="銷售數據分析"
  />
</template>

<script setup>
import DualAxisComboChart from './DualAxisComboChart.vue';

const layers = [
  {
    type: 'stacked-bar',
    yAxis: 'left',
    data: salesData,
    stackKeys: ['online', 'offline'],
    xValue: d => d.month,
    colorScale: key => key === 'online' ? '#3b82f6' : '#10b981'
  },
  {
    type: 'line',
    yAxis: 'right',
    data: salesData,
    xValue: d => d.month,
    yValue: d => d.profitRate,
    lineColor: '#ef4444',
    showDots: true
  }
];
</script>
```

### 進階用法：時間序列

```javascript
const layers = [
  {
    type: 'stacked-bar',
    yAxis: 'left',
    data: timeSeriesData,
    stackKeys: ['product1', 'product2', 'product3'],
    xValue: d => new Date(d.date),  // 轉換為 Date 對象
    colorScale: d3.scaleOrdinal(d3.schemeCategory10)
  },
  {
    type: 'line',
    yAxis: 'right',
    data: timeSeriesData,
    xValue: d => new Date(d.date),
    yValue: d => d.avgPrice,
    curve: d3.curveCatmullRom.alpha(0.5),  // 平滑曲線
    showDots: false
  }
];

// Props 配置
xScaleType="time"
:x-axis-format="d3.timeFormat('%m/%d')"
```

### 動態數據更新

```vue
<script setup>
import { ref, computed } from 'vue';

const rawData = ref([...]);
const filters = ref({ includeOnline: true, includeOffline: true });

// 響應式圖層配置
const layers = computed(() => {
  const stackKeys = [];
  if (filters.value.includeOnline) stackKeys.push('online');
  if (filters.value.includeOffline) stackKeys.push('offline');

  return [
    {
      type: 'stacked-bar',
      yAxis: 'left',
      data: rawData.value,
      stackKeys: stackKeys,
      xValue: d => d.month
    }
  ];
});
</script>
```

### 自定義 Tooltip

```vue
<template>
  <DualAxisComboChart :layers="layers">
    <template #tooltip="{ tooltipData, tooltipVisible }">
      <div 
        v-if="tooltipVisible"
        class="custom-tooltip"
      >
        <!-- 堆疊長條圖的 Tooltip -->
        <div v-if="tooltipData.seriesKey">
          <h4>{{ tooltipData.data.data.month }}</h4>
          <p>{{ tooltipData.seriesKey }}: {{ tooltipData.data.data[tooltipData.seriesKey] }}</p>
        </div>
        
        <!-- 折線圖的 Tooltip -->
        <div v-else-if="tooltipData.layer.type === 'line'">
          <h4>{{ tooltipData.data.month }}</h4>
          <p>Value: {{ tooltipData.data.value }}</p>
        </div>
      </div>
    </template>
  </DualAxisComboChart>
</template>
```

---

## 最佳實踐

### 1. 數據準備

#### ✅ 推薦做法
```javascript
// 統一數據結構
const data = [
  { category: 'A', value1: 100, value2: 50, metric: 15.5 },
  { category: 'B', value1: 120, value2: 60, metric: 18.2 }
];

// 使用訪問器適配不同結構
layers: [
  { xValue: d => d.category, stackKeys: ['value1', 'value2'] },
  { xValue: d => d.category, yValue: d => d.metric }
]
```

#### ❌ 避免做法
```javascript
// 不要在組件內部做數據轉換
// 應該在父組件完成
data.map(d => ({ ...d, transformedValue: d.value * 2 }))
```

### 2. 性能優化

#### 大數據集優化
```javascript
// 1. 使用 keyFn 確保高效更新
keyFn: d => d.id  // 使用唯一標識符

// 2. 減少動畫時間
animationDuration: 300  // 默認 750ms

// 3. 按需渲染圖層
const layers = computed(() => {
  return props.showLine ? [...barLayers, ...lineLayers] : barLayers;
});
```

#### 避免不必要的重繪
```javascript
// ✅ 使用 computed 計算圖層配置
const layers = computed(() => generateLayers(data.value));

// ❌ 直接在 template 中計算
:layers="data.map(d => ({ ... }))"  // 每次渲染都重新計算
```

### 3. 顏色配置

#### 語義化顏色
```javascript
const colorScale = (key) => {
  const colors = {
    approved: '#10b981',    // 綠色：通過
    pending: '#f59e0b',     // 黃色：待處理
    rejected: '#ef4444'     // 紅色：拒絕
  };
  return colors[key] || '#6b7280';
};
```

#### 無障礙配置
```javascript
// 使用色盲友好色板
import { schemeTableau10 } from 'd3-scale-chromatic';

colorScale: d3.scaleOrdinal(schemeTableau10)
```

### 4. 座標軸配置

#### 格式化函數
```javascript
// 貨幣格式
yLeftAxisFormat: v => `$${v.toLocaleString()}`

// 百分比格式
yRightAxisFormat: v => `${v}%`

// 時間格式
xAxisFormat: d3.timeFormat('%Y-%m-%d')

// 縮寫格式
yAxisFormat: v => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v;
}
```

### 5. 響應式設計

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const chartWidth = ref(800);
const chartHeight = ref(500);

const updateSize = () => {
  const container = document.querySelector('.chart-container');
  if (container) {
    chartWidth.value = container.clientWidth;
    chartHeight.value = container.clientHeight;
  }
};

onMounted(() => {
  updateSize();
  window.addEventListener('resize', updateSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateSize);
});
</script>
```

---

## 擴展指南

### 添加新圖層類型

#### 1. 定義圖層接口
```javascript
// types.js
export const LAYER_TYPES = {
  STACKED_BAR: 'stacked-bar',
  LINE: 'line',
  AREA: 'area',           // 新增
  SCATTER: 'scatter'      // 新增
};
```

#### 2. 創建渲染函數
```javascript
// 在 DualAxisComboChart.vue 中添加
const renderArea = () => {
  if (!areaLayerRef.value) return;

  const g = d3.select(areaLayerRef.value);
  const areaLayers = layers.value.filter(l => l.type === 'area');

  areaLayers.forEach((layer) => {
    const { data, xValue, yValue, fillColor, opacity } = layer;
    const yScale = layer.yAxis === 'left' ? yLeftScale.value : yRightScale.value;

    const areaGenerator = d3.area()
      .x(d => xScale.value(xValue(d)))
      .y0(chartHeight.value)
      .y1(d => yScale(yValue(d)))
      .curve(layer.curve || d3.curveMonotoneX);

    g.selectAll('path.area')
      .data([data])
      .join(
        enter => enter.append('path').attr('class', 'area'),
        update => update,
        exit => exit.remove()
      )
      .transition()
      .duration(props.animationDuration)
      .attr('d', areaGenerator)
      .attr('fill', fillColor || '#3b82f6')
      .attr('opacity', opacity || 0.3);
  });
};

// 添加到主渲染循環
watchEffect(() => {
  renderGrid();
  renderAxes();
  renderStackedBars();
  renderLines();
  renderArea();        // 新增
  renderTitle();
  renderLegend();
});
```

#### 3. 使用新圖層
```javascript
const layers = [
  {
    type: 'area',
    yAxis: 'left',
    data: myData,
    xValue: d => d.date,
    yValue: d => d.value,
    fillColor: '#3b82f6',
    opacity: 0.2
  }
];
```

### 添加自定義交互

#### Brush Selection
```javascript
const renderBrush = () => {
  const brush = d3.brushX()
    .extent([[0, 0], [chartWidth.value, chartHeight.value]])
    .on('end', (event) => {
      if (event.selection) {
        const [x0, x1] = event.selection;
        // 處理選擇範圍
        emit('brush-select', { range: [x0, x1] });
      }
    });

  d3.select(brushLayerRef.value).call(brush);
};
```

#### Zoom
```javascript
const setupZoom = () => {
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', (event) => {
      const newXScale = event.transform.rescaleX(xScale.value);
      // 更新圖表使用新的 scale
      emit('zoom', { transform: event.transform });
    });

  d3.select(svgRef.value).call(zoom);
};
```

---

## 測試策略

### 單元測試
```javascript
import { mount } from '@vue/test-utils';
import DualAxisComboChart from './DualAxisComboChart.vue';

describe('DualAxisComboChart', () => {
  it('renders stacked bars correctly', async () => {
    const wrapper = mount(DualAxisComboChart, {
      props: {
        layers: [
          {
            type: 'stacked-bar',
            yAxis: 'left',
            data: mockData,
            stackKeys: ['a', 'b']
          }
        ]
      }
    });

    await wrapper.vm.$nextTick();
    
    const bars = wrapper.findAll('.stacked-bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('emits layer-click event', async () => {
    const wrapper = mount(DualAxisComboChart, { props: { ... } });
    
    await wrapper.find('.stacked-bar').trigger('click');
    
    expect(wrapper.emitted('layer-click')).toBeTruthy();
  });
});
```

---

## 常見問題

### Q: 如何處理負值數據？
```javascript
// 調整 yScale 的 domain
yLeftDomain: computed(() => {
  const min = d3.min(data.value, d => d.value);
  const max = d3.max(data.value, d => d.value);
  return [min < 0 ? min * 1.1 : 0, max * 1.1];
})
```

### Q: 如何實現雙折線圖（無堆疊長條圖）？
```javascript
const layers = [
  {
    type: 'line',
    yAxis: 'left',
    data: data1,
    lineColor: '#3b82f6'
  },
  {
    type: 'line',
    yAxis: 'right',
    data: data2,
    lineColor: '#ef4444'
  }
];
```

### Q: 如何實現動態圖例位置？
```javascript
// 在 renderLegend 函數中修改
const legendPosition = layer.legend?.position || 'top-right';
const positions = {
  'top-right': { x: chartWidth.value - 200, y: -40 },
  'top-left': { x: 0, y: -40 },
  'bottom-right': { x: chartWidth.value - 200, y: chartHeight.value + 40 }
};
```

---

## 版本記錄

### v1.0.0 (2024-12-30)
- ✅ 初始發布
- ✅ 支持堆疊長條圖 + 折線圖
- ✅ 雙 Y 軸系統
- ✅ 完整的動畫系統
- ✅ 自定義 Tooltip 插槽

---

## 貢獻指南

歡迎提交 PR 添加新功能！

**開發流程：**
1. Fork 專案
2. 創建功能分支：`git checkout -b feature/scatter-plot`
3. 添加測試用例
4. 更新文檔
5. 提交 PR

**代碼規範：**
- 使用 ESLint + Prettier
- 遵循 Vue 3 Composition API 風格
- 添加 JSDoc 註釋
- 保持向後兼容

---

## 授權

MIT License
