<template>
  <div class="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-purple-800">⚛️ Vue + D3 整合（現代框架整合）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-purple-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>理解 Vue 與 D3 的權責分離：<strong>D3 負責計算，Vue 負責渲染</strong></li>
        <li>掌握三種整合模式：<strong>純 D3 渲染、混合模式、純 Vue 渲染</strong></li>
        <li>學會使用 <code class="bg-purple-100 px-2 py-1 rounded">ref</code> 和 <code class="bg-purple-100 px-2 py-1 rounded">watchEffect</code></li>
        <li>以「Frame + Layers」封裝可重用圖表（延展到多 series / 混合圖）</li>
        <li>用 enter/update/exit（data join）做增量更新，避免全清空重畫</li>
        <li>標準化事件 payload（click/hover/tooltip position 多座標系）並用 Teleport 統一 Tooltip UI</li>
        <li>掌握企業級最佳實踐（關注點分離、可替換 renderer）</li>
      </ul>
    </section>

    <!-- 第一部分：整合哲學 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">1️⃣ 整合哲學：誰該負責什麼？</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          Vue 和 D3 都有強大的 DOM 操作能力，但讓它們<strong>同時控制同一片 DOM 會導致衝突</strong>。
          企業級專案的關鍵是<strong>明確劃分職責</strong>。
        </p>

        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
          <p class="font-semibold text-yellow-800 mb-2">⚠️ 常見錯誤：雙重控制</p>
          <div class="text-sm text-yellow-700">
            讓 Vue 的響應式系統和 D3 的 DOM 操作同時作用在相同元素上，會導致：
            <ul class="list-disc list-inside mt-2">
              <li>元素突然消失或重複</li>
              <li>動畫卡頓或閃爍</li>
              <li>狀態不同步</li>
              <li>效能問題</li>
            </ul>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-blue-50 border-2 border-blue-500 p-4 rounded">
            <h4 class="font-bold text-blue-800 mb-2">🎨 Vue 擅長的</h4>
            <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>響應式資料管理</li>
              <li>元件化與狀態管理</li>
              <li>條件渲染與列表渲染</li>
              <li>使用者事件處理</li>
              <li>生命週期管理</li>
            </ul>
          </div>

          <div class="bg-green-50 border-2 border-green-500 p-4 rounded">
            <h4 class="font-bold text-green-800 mb-2">📊 D3 擅長的</h4>
            <ul class="list-disc list-inside text-sm text-green-700 space-y-1">
              <li>數學計算（比例尺、座標轉換）</li>
              <li>路徑生成（line, area, arc）</li>
              <li>資料轉換與聚合</li>
              <li>複雜的 SVG 動畫</li>
              <li>特殊佈局演算法</li>
            </ul>
          </div>
        </div>

        <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
          <p class="font-semibold text-purple-800 mb-3">✅ 黃金法則：權責分離</p>
          <div class="grid md:grid-cols-3 gap-3 text-sm">
            <div class="bg-white p-3 rounded border border-purple-200">
              <div class="font-bold text-purple-700 mb-1">模式 1️⃣：純 D3 渲染</div>
              <div class="text-gray-600 text-xs">Vue 提供容器，D3 完全控制 DOM</div>
              <div class="text-green-600 text-xs mt-1">✓ 適合複雜動畫</div>
            </div>
            <div class="bg-white p-3 rounded border border-purple-200">
              <div class="font-bold text-purple-700 mb-1">模式 2️⃣：混合模式</div>
              <div class="text-gray-600 text-xs">D3 計算，Vue 渲染靜態部分</div>
              <div class="text-green-600 text-xs mt-1">✓ 平衡易用性</div>
            </div>
            <div class="bg-white p-3 rounded border border-purple-200">
              <div class="font-bold text-purple-700 mb-1">模式 3️⃣：純 Vue 渲染</div>
              <div class="text-gray-600 text-xs">D3 只做計算，Vue 全權渲染</div>
              <div class="text-green-600 text-xs mt-1">✓ 聲明式最佳</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 第二部分：模式 1 - 純 D3 渲染 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">2️⃣ 模式 1：純 D3 渲染（傳統方式）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          Vue 只提供一個空的 <code>&lt;svg&gt;</code> 容器，所有渲染邏輯由 D3 處理。
          這是最接近純 D3 的寫法，適合需要<strong>複雜動畫或特殊互動</strong>的場景。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>&lt;template&gt;
  &lt;!-- Vue 只提供容器 --&gt;
  &lt;svg ref="chartRef" width="600" height="300"&gt;&lt;/svg&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, watchEffect, onMounted } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true }
});

const chartRef = ref(null);

// 使用 watchEffect 監聽資料變化
watchEffect(() => {
  if (!chartRef.value || !props.data.length) return;
  
  const svg = d3.select(chartRef.value);
  const width = 600;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  
  // ⚠️ 教學示範常見寫法：全清空重畫。
  // 企業級延展架構中通常不把它當預設，改用：
  // - persistent scaffold（root/layers 建一次）
  // - data join（enter/update/exit）更新
  // 這樣才能維持互動狀態、避免閃爍、也更好擴充。
  svg.selectAll('*').remove();
  
  const g = svg.append('g')
    .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
  
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // D3 比例尺
  const xScale = d3.scaleBand()
    .domain(props.data.map(d => d.name))
    .range([0, chartWidth])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(props.data, d => d.value)])
    .range([chartHeight, 0])
    .nice();
  
  // D3 繪製長條
  g.selectAll('.bar')
    .data(props.data)
    .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name))
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => chartHeight - yScale(d.value))
      .attr('fill', 'steelblue')
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('fill', 'orange');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('fill', 'steelblue');
    });
  
  // D3 繪製座標軸
  g.append('g')
    .attr('transform', \`translate(0, \${chartHeight})\`)
    .call(d3.axisBottom(xScale));
  
  g.append('g')
    .call(d3.axisLeft(yScale));
});
&lt;/script&gt;</code></pre>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-green-50 border-l-4 border-green-500 p-3">
            <p class="font-semibold text-green-800 mb-1 text-sm">✅ 優點</p>
            <ul class="list-disc list-inside text-xs text-green-700">
              <li>D3 完全控制，動畫流暢</li>
              <li>適合複雜互動</li>
              <li>程式碼接近原生 D3</li>
            </ul>
          </div>
          <div class="bg-red-50 border-l-4 border-red-500 p-3">
            <p class="font-semibold text-red-800 mb-1 text-sm">❌ 缺點</p>
            <ul class="list-disc list-inside text-xs text-red-700">
              <li>需要手動清除 DOM</li>
              <li>難以整合 Vue 生態</li>
              <li>可讀性較差</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 互動範例 1：純 D3 渲染 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：純 D3 渲染模式</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="updateMode1Data" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            更新資料
          </button>
          <button type="button" @click="resetMode1" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="mode1Svg" width="100%" height="300" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>說明：</strong>滑鼠移到長條上會變色（D3 事件處理），資料更新時會重新渲染
        </div>
      </div>
    </section>

    <!-- 第三部分：模式 2 - 混合模式 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">3️⃣ 模式 2：混合模式（推薦）⭐</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <strong>D3 負責計算</strong>（比例尺、路徑生成），<strong>Vue 負責渲染</strong>（:attr 綁定）。
          這是企業級專案最推薦的模式，兼顧效能與可維護性。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>&lt;template&gt;
  &lt;svg width="600" height="300"&gt;
    &lt;g :transform="\`translate(\${margin.left}, \${margin.top})\`"&gt;
      &lt;!-- Vue 渲染長條 --&gt;
      &lt;rect
        v-for="d in data"
        :key="d.name"
        :x="xScale(d.name)"
        :y="yScale(d.value)"
        :width="xScale.bandwidth()"
        :height="chartHeight - yScale(d.value)"
        :fill="hoveredBar === d.name ? 'orange' : 'steelblue'"
        @mouseenter="hoveredBar = d.name"
        @mouseleave="hoveredBar = null"
      /&gt;
      
      &lt;!-- D3 渲染座標軸（複雜部分） --&gt;
      &lt;g ref="xAxisRef" :transform="\`translate(0, \${chartHeight})\`"&gt;&lt;/g&gt;
      &lt;g ref="yAxisRef"&gt;&lt;/g&gt;
    &lt;/g&gt;
  &lt;/svg&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true }
});

const margin = { top: 20, right: 20, bottom: 40, left: 40 };
const chartWidth = 600 - margin.left - margin.right;
const chartHeight = 300 - margin.top - margin.bottom;

const hoveredBar = ref(null);
const xAxisRef = ref(null);
const yAxisRef = ref(null);

// D3 計算比例尺（computed 自動響應資料變化）
const xScale = computed(() => 
  d3.scaleBand()
    .domain(props.data.map(d => d.name))
    .range([0, chartWidth])
    .padding(0.2)
);

const yScale = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(props.data, d => d.value) || 100])
    .range([chartHeight, 0])
    .nice()
);

// 使用 D3 渲染座標軸（因為 Vue 不擅長這個）
watchEffect(() => {
  if (xAxisRef.value) {
    d3.select(xAxisRef.value).call(d3.axisBottom(xScale.value));
  }
  if (yAxisRef.value) {
    d3.select(yAxisRef.value).call(d3.axisLeft(yScale.value));
  }
});
&lt;/script&gt;</code></pre>
        </div>

        <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
          <p class="font-semibold text-purple-800 mb-2">🔑 關鍵優勢</p>
          <ul class="list-disc list-inside text-sm text-purple-700 space-y-1">
            <li><code>computed</code> 讓比例尺自動響應資料變化</li>
            <li>Vue 的 <code>v-for</code> 自動處理 Enter-Update-Exit</li>
            <li>不需要手動清除 DOM</li>
            <li>可以使用 Vue 的事件系統（@mouseenter）</li>
            <li>程式碼聲明式，易於理解和維護</li>
          </ul>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-green-50 border-l-4 border-green-500 p-3">
            <p class="font-semibold text-green-800 mb-1 text-sm">✅ 優點</p>
            <ul class="list-disc list-inside text-xs text-green-700">
              <li>聲明式，易於理解</li>
              <li>自動響應式更新</li>
              <li>整合 Vue 生態</li>
              <li>易於測試</li>
            </ul>
          </div>
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-3">
            <p class="font-semibold text-yellow-800 mb-1 text-sm">⚠️ 注意</p>
            <ul class="list-disc list-inside text-xs text-yellow-700">
              <li>複雜動畫需額外處理</li>
              <li>座標軸仍需 D3 渲染</li>
              <li>大量資料可能影響效能</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 互動範例 2：混合模式 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：混合模式（推薦）</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="updateMode2Data" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            更新資料
          </button>
          <button type="button" @click="addMode2Bar" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            新增長條
          </button>
          <button type="button" @click="removeMode2Bar" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            刪除長條
          </button>
          <button type="button" @click="resetMode2" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        
        <!-- 這裡使用混合模式渲染 -->
        <svg width="600" height="300" class="bg-white rounded border">
          <g :transform="`translate(${mode2Margin.left}, ${mode2Margin.top})`">
            <!-- Vue 渲染長條 -->
            <rect
              v-for="d in mode2Data"
              :key="d.name"
              :x="mode2XScale(d.name)"
              :y="mode2YScale(d.value)"
              :width="mode2XScale.bandwidth()"
              :height="mode2ChartHeight - mode2YScale(d.value)"
              :fill="mode2HoveredBar === d.name ? 'orange' : 'steelblue'"
              class="transition-all duration-300"
              @mouseenter="mode2HoveredBar = d.name"
              @mouseleave="mode2HoveredBar = null"
            />
            
            <!-- 座標軸由 D3 渲染 -->
            <g ref="mode2XAxisRef" :transform="`translate(0, ${mode2ChartHeight})`"></g>
            <g ref="mode2YAxisRef"></g>
          </g>
        </svg>
        
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>說明：</strong>長條由 Vue 渲染（聲明式），座標軸由 D3 渲染（程式化）
        </div>
      </div>
    </section>

    <!-- 第四部分：模式 3 - 純 Vue 渲染 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">4️⃣ 模式 3：純 Vue 渲染（極簡）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 只用於<strong>計算</strong>（比例尺、路徑生成），完全不接觸 DOM。
          所有渲染由 Vue 負責，適合<strong>簡單圖表或需要高度整合 Vue 生態</strong>的場景。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>&lt;template&gt;
  &lt;svg width="600" height="300"&gt;
    &lt;g :transform="\`translate(\${margin.left}, \${margin.top})\`"&gt;
      &lt;!-- 長條 --&gt;
      &lt;rect
        v-for="d in data"
        :key="d.name"
        :x="xScale(d.name)"
        :y="yScale(d.value)"
        :width="xScale.bandwidth()"
        :height="chartHeight - yScale(d.value)"
        fill="steelblue"
      /&gt;
      
      &lt;!-- 座標軸也由 Vue 渲染 --&gt;
      &lt;g :transform="\`translate(0, \${chartHeight})\`"&gt;
        &lt;line :x2="chartWidth" stroke="black" /&gt;
        &lt;text
          v-for="tick in xScale.domain()"
          :key="tick"
          :x="xScale(tick) + xScale.bandwidth() / 2"
          :y="20"
          text-anchor="middle"
          font-size="12"
        &gt;{{ tick }}&lt;/text&gt;
      &lt;/g&gt;
      
      &lt;g&gt;
        &lt;line :y2="chartHeight" stroke="black" /&gt;
        &lt;text
          v-for="tick in yTicks"
          :key="tick"
          :y="yScale(tick)"
          x="-10"
          text-anchor="end"
          dominant-baseline="middle"
          font-size="12"
        &gt;{{ tick }}&lt;/text&gt;
      &lt;/g&gt;
    &lt;/g&gt;
  &lt;/svg&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { computed } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true }
});

const margin = { top: 20, right: 20, bottom: 40, left: 40 };
const chartWidth = 600 - margin.left - margin.right;
const chartHeight = 300 - margin.top - margin.bottom;

// D3 只用於計算
const xScale = computed(() =>
  d3.scaleBand()
    .domain(props.data.map(d => d.name))
    .range([0, chartWidth])
    .padding(0.2)
);

const yScale = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(props.data, d => d.value) || 100])
    .range([chartHeight, 0])
    .nice()
);

const yTicks = computed(() => yScale.value.ticks(5));
&lt;/script&gt;</code></pre>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-green-50 border-l-4 border-green-500 p-3">
            <p class="font-semibold text-green-800 mb-1 text-sm">✅ 優點</p>
            <ul class="list-disc list-inside text-xs text-green-700">
              <li>完全聲明式</li>
              <li>易於理解和維護</li>
              <li>整合 Vue DevTools</li>
              <li>SSR 友善</li>
            </ul>
          </div>
          <div class="bg-red-50 border-l-4 border-red-500 p-3">
            <p class="font-semibold text-red-800 mb-1 text-sm">❌ 缺點</p>
            <ul class="list-disc list-inside text-xs text-red-700">
              <li>座標軸需手動實作</li>
              <li>複雜圖表程式碼冗長</li>
              <li>動畫需額外處理</li>
              <li>效能較差（大量資料）</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 互動範例 3：純 Vue 渲染 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：純 Vue 渲染模式</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="updateMode3Data" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            更新資料
          </button>
          <button type="button" @click="resetMode3" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        
        <svg width="600" height="300" class="bg-white rounded border">
          <g :transform="`translate(${mode3Margin.left}, ${mode3Margin.top})`">
            <rect
              v-for="d in mode3Data"
              :key="d.name"
              :x="mode3XScale(d.name)"
              :y="mode3YScale(d.value)"
              :width="mode3XScale.bandwidth()"
              :height="mode3ChartHeight - mode3YScale(d.value)"
              fill="steelblue"
              class="transition-all duration-500"
            />
            
            <!-- 簡化的座標軸 -->
            <g :transform="`translate(0, ${mode3ChartHeight})`">
              <line :x2="mode3ChartWidth" stroke="black" />
              <text
                v-for="tick in mode3XScale.domain()"
                :key="tick"
                :x="mode3XScale(tick) + mode3XScale.bandwidth() / 2"
                :y="20"
                text-anchor="middle"
                font-size="12"
              >{{ tick }}</text>
            </g>
          </g>
        </svg>
        
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>說明：</strong>完全由 Vue 渲染，D3 只用於計算比例尺
        </div>
      </div>
    </section>

    <!-- 第五部分：封裝可重用元件 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">5️⃣ 封裝可重用元件（企業級實踐）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          企業專案中，圖表應該封裝成<strong>可配置、可重用的元件</strong>。
          以下是完整的元件設計範例：
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>&lt;!-- BarChart.vue --&gt;
&lt;template&gt;
  &lt;div class="bar-chart-container"&gt;
    &lt;svg :width="width" :height="height"&gt;
      &lt;g :transform="\`translate(\${margin.left}, \${margin.top})\`"&gt;
        &lt;rect
          v-for="d in data"
          :key="keyFn(d)"
          :x="xScale(xValue(d))"
          :y="yScale(yValue(d))"
          :width="xScale.bandwidth()"
          :height="chartHeight - yScale(yValue(d))"
          :fill="colorScale(xValue(d))"
          class="transition-all duration-300"
          @mouseenter="emit('bar-hover', d)"
          @mouseleave="emit('bar-leave', d)"
          @click="emit('bar-click', d)"
        /&gt;
        
        &lt;g ref="xAxisRef" :transform="\`translate(0, \${chartHeight})\`"&gt;&lt;/g&gt;
        &lt;g ref="yAxisRef"&gt;&lt;/g&gt;
      &lt;/g&gt;
    &lt;/svg&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

// Props 設計
const props = defineProps({
  data: { type: Array, required: true },
  width: { type: Number, default: 600 },
  height: { type: Number, default: 400 },
  margin: { 
    type: Object, 
    default: () => ({ top: 20, right: 20, bottom: 40, left: 60 })
  },
  xValue: { type: Function, default: d => d.name },
  yValue: { type: Function, default: d => d.value },
  keyFn: { type: Function, default: d => d.name },
  colorScheme: { type: String, default: 'steelblue' }
});

const emit = defineEmits(['bar-hover', 'bar-leave', 'bar-click']);

const xAxisRef = ref(null);
const yAxisRef = ref(null);

const chartWidth = computed(() => props.width - props.margin.left - props.margin.right);
const chartHeight = computed(() => props.height - props.margin.top - props.margin.bottom);

const xScale = computed(() =>
  d3.scaleBand()
    .domain(props.data.map(props.xValue))
    .range([0, chartWidth.value])
    .padding(0.2)
);

const yScale = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(props.data, props.yValue) || 100])
    .range([chartHeight.value, 0])
    .nice()
);

const colorScale = computed(() => {
  if (props.colorScheme === 'category') {
    return d3.scaleOrdinal(d3.schemeCategory10)
      .domain(props.data.map(props.xValue));
  }
  return () => props.colorScheme;
});

watchEffect(() => {
  if (xAxisRef.value) {
    d3.select(xAxisRef.value).call(d3.axisBottom(xScale.value));
  }
  if (yAxisRef.value) {
    d3.select(yAxisRef.value).call(d3.axisLeft(yScale.value));
  }
});
&lt;/script&gt;

&lt;!-- 使用範例 --&gt;
&lt;BarChart
  :data="salesData"
  :xValue="d => d.month"
  :yValue="d => d.revenue"
  :keyFn="d => d.id"
  colorScheme="category"
  @bar-click="handleBarClick"
/&gt;</code></pre>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🎯 設計原則</p>
          <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li><strong>Props 設計</strong>：提供靈活的配置選項（寬高、邊距、資料存取器）</li>
            <li><strong>事件發射</strong>：透過 emit 讓父元件處理互動（點擊、懸停）</li>
            <li><strong>插槽支援</strong>：允許自訂 Tooltip、圖例等</li>
            <li><strong>響應式更新</strong>：使用 computed 和 watchEffect 自動響應資料變化</li>
            <li><strong>TypeScript 支援</strong>：定義清晰的型別介面</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-purple-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-purple-700 mb-2">🎯 三種整合模式</h4>
          <ul class="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li>純 D3：完全控制 DOM</li>
            <li>混合：D3 計算 + Vue 渲染</li>
            <li>純 Vue：D3 只做數學</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-pink-700 mb-2">⭐ 推薦做法</h4>
          <ul class="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li>簡單圖表：混合模式</li>
            <li>複雜動畫：純 D3</li>
            <li>SSR 需求：純 Vue</li>
            <li>企業專案：封裝元件</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-indigo-700 mb-2">🚀 下一步</h4>
          <ul class="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li>學習複雜圖表（折線、圓餅）</li>
            <li>實作 Tooltip 與互動</li>
            <li>響應式設計（RWD）</li>
            <li>效能優化</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

// ========== 模式 1：純 D3 渲染 ==========
const mode1Svg = ref(null);
const mode1Data = ref([
  { name: 'A', value: 30 },
  { name: 'B', value: 50 },
  { name: 'C', value: 40 },
  { name: 'D', value: 60 }
]);

watchEffect(() => {
  if (!mode1Svg.value) return;
  
  const svg = d3.select(mode1Svg.value);
  const width = 600;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  
  svg.selectAll('*').remove();
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const xScale = d3.scaleBand()
    .domain(mode1Data.value.map(d => d.name))
    .range([0, chartWidth])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(mode1Data.value, d => d.value)])
    .range([chartHeight, 0])
    .nice();
  
  g.selectAll('.bar')
    .data(mode1Data.value)
    .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name))
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => chartHeight - yScale(d.value))
      .attr('fill', 'steelblue')
    .on('mouseenter', function() {
      d3.select(this).attr('fill', 'orange');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('fill', 'steelblue');
    });
  
  g.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale));
  
  g.append('g')
    .call(d3.axisLeft(yScale));
});

const updateMode1Data = () => {
  mode1Data.value = mode1Data.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 60) + 20
  }));
};

const resetMode1 = () => {
  mode1Data.value = [
    { name: 'A', value: 30 },
    { name: 'B', value: 50 },
    { name: 'C', value: 40 },
    { name: 'D', value: 60 }
  ];
};

// ========== 模式 2：混合模式 ==========
const mode2Data = ref([
  { name: 'A', value: 30 },
  { name: 'B', value: 50 },
  { name: 'C', value: 40 }
]);

const mode2HoveredBar = ref(null);
const mode2XAxisRef = ref(null);
const mode2YAxisRef = ref(null);

const mode2Margin = { top: 20, right: 20, bottom: 40, left: 60 };
const mode2ChartWidth = 600 - mode2Margin.left - mode2Margin.right;
const mode2ChartHeight = 300 - mode2Margin.top - mode2Margin.bottom;

const mode2XScale = computed(() =>
  d3.scaleBand()
    .domain(mode2Data.value.map(d => d.name))
    .range([0, mode2ChartWidth])
    .padding(0.2)
);

const mode2YScale = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(mode2Data.value, d => d.value) || 100])
    .range([mode2ChartHeight, 0])
    .nice()
);

watchEffect(() => {
  if (mode2XAxisRef.value) {
    d3.select(mode2XAxisRef.value).call(d3.axisBottom(mode2XScale.value));
  }
  if (mode2YAxisRef.value) {
    d3.select(mode2YAxisRef.value).call(d3.axisLeft(mode2YScale.value));
  }
});

const updateMode2Data = () => {
  mode2Data.value = mode2Data.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 60) + 20
  }));
};

let mode2IdCounter = 4;
const addMode2Bar = () => {
  mode2Data.value.push({
    name: String.fromCharCode(64 + mode2IdCounter++),
    value: Math.floor(Math.random() * 60) + 20
  });
};

const removeMode2Bar = () => {
  if (mode2Data.value.length > 1) {
    mode2Data.value.pop();
  }
};

const resetMode2 = () => {
  mode2IdCounter = 4;
  mode2Data.value = [
    { name: 'A', value: 30 },
    { name: 'B', value: 50 },
    { name: 'C', value: 40 }
  ];
};

// ========== 模式 3：純 Vue 渲染 ==========
const mode3Data = ref([
  { name: 'A', value: 30 },
  { name: 'B', value: 50 },
  { name: 'C', value: 40 },
  { name: 'D', value: 60 }
]);

const mode3Margin = { top: 20, right: 20, bottom: 40, left: 60 };
const mode3ChartWidth = 600 - mode3Margin.left - mode3Margin.right;
const mode3ChartHeight = 300 - mode3Margin.top - mode3Margin.bottom;

const mode3XScale = computed(() =>
  d3.scaleBand()
    .domain(mode3Data.value.map(d => d.name))
    .range([0, mode3ChartWidth])
    .padding(0.2)
);

const mode3YScale = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(mode3Data.value, d => d.value) || 100])
    .range([mode3ChartHeight, 0])
    .nice()
);

const updateMode3Data = () => {
  mode3Data.value = mode3Data.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 60) + 20
  }));
};

const resetMode3 = () => {
  mode3Data.value = [
    { name: 'A', value: 30 },
    { name: 'B', value: 50 },
    { name: 'C', value: 40 },
    { name: 'D', value: 60 }
  ];
};
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

pre code {
  font-size: 0.85em;
  line-height: 1.5;
}

.bar-chart-container {
  display: inline-block;
}
</style>
