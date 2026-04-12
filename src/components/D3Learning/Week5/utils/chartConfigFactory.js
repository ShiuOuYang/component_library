/**
 * DualAxisComboChart 配置工廠
 * 提供預設配置和常用場景的配置生成器
 */

import * as d3 from 'd3';

/**
 * 預設顏色方案
 */
export const COLOR_SCHEMES = {
  // 商業色系
  business: {
    primary: '#3b82f6',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    accent: '#ef4444',
    neutral: '#6b7280'
  },

  // 數據分析色系（色盲友好）
  colorblind: [
    '#0173B2', '#DE8F05', '#029E73', '#CC78BC',
    '#CA9161', '#FBAFE4', '#949494', '#ECE133'
  ],

  // 企業級色系
  enterprise: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
  ],

  // 熱力圖色系
  heatmap: {
    positive: d3.interpolateBlues,
    negative: d3.interpolateReds,
    diverging: d3.interpolateRdYlGn
  }
};

/**
 * 預設格式化函數
 */
export const FORMATTERS = {
  // 貨幣格式化
  currency: (decimals = 0) => (value) => {
    if (value == null || isNaN(value)) return '$0';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  },

  // 百分比格式化
  percent: (decimals = 1) => (value) => {
    if (value == null || isNaN(value)) return '0%';
    return `${value.toFixed(decimals)}%`;
  },

  // 縮寫格式化 (1K, 1M, 1B)
  abbreviated: () => (value) => {
    if (value == null || isNaN(value)) return '0';
    const numValue = Number(value);
    if (numValue >= 1e9) return `${(numValue / 1e9).toFixed(1)}B`;
    if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(1)}M`;
    if (numValue >= 1e3) return `${(numValue / 1e3).toFixed(1)}K`;
    return numValue.toString();
  },

  // 時間格式化
  time: {
    yearMonth: () => (value) => value ? d3.timeFormat('%Y-%m')(value) : '',
    monthDay: () => (value) => value ? d3.timeFormat('%m/%d')(value) : '',
    fullDate: () => (value) => value ? d3.timeFormat('%Y-%m-%d')(value) : '',
    dateTime: () => (value) => value ? d3.timeFormat('%Y-%m-%d %H:%M')(value) : ''
  },

  // 科學記號
  scientific: (decimals = 2) => (value) => {
    if (value == null || isNaN(value)) return '0';
    return value.toExponential(decimals);
  }
};

/**
 * 圖層配置構建器基類
 */
class LayerBuilder {
  constructor(type) {
    this.config = { type };
  }

  data(data) {
    this.config.data = data;
    return this;
  }

  yAxis(axis) {
    this.config.yAxis = axis;
    return this;
  }

  xValue(fn) {
    this.config.xValue = fn;
    return this;
  }

  keyFn(fn) {
    this.config.keyFn = fn;
    return this;
  }

  legend(options) {
    this.config.legend = options;
    return this;
  }

  build() {
    return this.config;
  }
}

/**
 * 堆疊長條圖配置構建器
 */
export class StackedBarLayerBuilder extends LayerBuilder {
  constructor() {
    super('stacked-bar');
  }

  stackKeys(keys) {
    this.config.stackKeys = keys;
    return this;
  }

  colorScale(scale) {
    this.config.colorScale = scale;
    return this;
  }

  /**
   * 使用預設顏色方案
   */
  useColorScheme(schemeName = 'business') {
    const scheme = COLOR_SCHEMES[schemeName];
    if (Array.isArray(scheme)) {
      this.config.colorScale = (key, index) => scheme[index % scheme.length];
    } else {
      const colors = Object.values(scheme);
      this.config.colorScale = (key, index) => colors[index % colors.length];
    }
    return this;
  }

  /**
   * 使用自定義顏色映射
   */
  colorMap(map) {
    this.config.colorScale = (key) => map[key] || '#6b7280';
    return this;
  }
}

/**
 * 折線圖配置構建器
 */
export class LineLayerBuilder extends LayerBuilder {
  constructor() {
    super('line');
  }

  yValue(fn) {
    this.config.yValue = fn;
    return this;
  }

  lineColor(color) {
    this.config.lineColor = color;
    return this;
  }

  strokeWidth(width) {
    this.config.strokeWidth = width;
    return this;
  }

  showDots(show = true) {
    this.config.showDots = show;
    return this;
  }

  curve(curveType) {
    this.config.curve = curveType;
    return this;
  }

  /**
   * 設置曲線為平滑曲線
   */
  smooth() {
    this.config.curve = d3.curveMonotoneX;
    return this;
  }

  /**
   * 設置曲線為階梯曲線
   */
  step() {
    this.config.curve = d3.curveStep;
    return this;
  }

  /**
   * 設置曲線為直線
   */
  linear() {
    this.config.curve = d3.curveLinear;
    return this;
  }
}

/**
 * 場景配置工廠
 */
export class ChartConfigFactory {
  /**
   * 銷售分析圖表配置
   * 左軸：堆疊銷售額，右軸：利潤率
   */
  static salesAnalysis(data, options = {}) {
    const {
      stackKeys = ['online', 'offline'],
      profitRateKey = 'profitRate',
      categoryKey = 'month'
    } = options;

    return [
      new StackedBarLayerBuilder()
        .data(data)
        .yAxis('left')
        .stackKeys(stackKeys)
        .xValue(d => d[categoryKey])
        .useColorScheme('business')
        .keyFn(d => d[categoryKey])
        .legend({ show: true })
        .build(),

      new LineLayerBuilder()
        .data(data)
        .yAxis('right')
        .xValue(d => d[categoryKey])
        .yValue(d => d[profitRateKey])
        .lineColor(COLOR_SCHEMES.business.accent)
        .strokeWidth(3)
        .showDots(true)
        .smooth()
        .keyFn(d => d[categoryKey])
        .legend({ show: true, label: '利潤率' })
        .build()
    ];
  }

  /**
   * 生產監控圖表配置
   * 左軸：產線產量堆疊，右軸：良率
   */
  static productionMonitoring(data, options = {}) {
    const {
      productionKeys = ['lineA', 'lineB', 'lineC'],
      yieldRateKey = 'yieldRate',
      timeKey = 'week'
    } = options;

    return [
      new StackedBarLayerBuilder()
        .data(data)
        .yAxis('left')
        .stackKeys(productionKeys)
        .xValue(d => d[timeKey])
        .useColorScheme('enterprise')
        .keyFn(d => d[timeKey])
        .legend({ show: true })
        .build(),

      new LineLayerBuilder()
        .data(data)
        .yAxis('right')
        .xValue(d => d[timeKey])
        .yValue(d => d[yieldRateKey])
        .lineColor('#10b981')
        .strokeWidth(3)
        .showDots(true)
        .smooth()
        .keyFn(d => d[timeKey])
        .legend({ show: true, label: '良率' })
        .build()
    ];
  }

  /**
   * 財務報表圖表配置
   * 左軸：收入/支出堆疊，右軸：淨利率
   */
  static financialReport(data, options = {}) {
    const {
      stackKeys = ['revenue', 'cost'],
      netMarginKey = 'netMargin',
      periodKey = 'quarter'
    } = options;

    return [
      new StackedBarLayerBuilder()
        .data(data)
        .yAxis('left')
        .stackKeys(stackKeys)
        .xValue(d => d[periodKey])
        .colorMap({
          revenue: '#10b981',
          cost: '#ef4444'
        })
        .keyFn(d => d[periodKey])
        .legend({ show: true })
        .build(),

      new LineLayerBuilder()
        .data(data)
        .yAxis('right')
        .xValue(d => d[periodKey])
        .yValue(d => d[netMarginKey])
        .lineColor('#f59e0b')
        .strokeWidth(3)
        .showDots(true)
        .smooth()
        .keyFn(d => d[periodKey])
        .legend({ show: true, label: '淨利率' })
        .build()
    ];
  }

  /**
   * 客戶分析圖表配置
   * 左軸：客戶數量堆疊，右軸：轉換率
   */
  static customerAnalysis(data, options = {}) {
    const {
      stackKeys = ['new', 'returning', 'churned'],
      conversionKey = 'conversionRate',
      periodKey = 'month'
    } = options;

    return [
      new StackedBarLayerBuilder()
        .data(data)
        .yAxis('left')
        .stackKeys(stackKeys)
        .xValue(d => d[periodKey])
        .colorMap({
          new: '#3b82f6',
          returning: '#10b981',
          churned: '#ef4444'
        })
        .keyFn(d => d[periodKey])
        .legend({ show: true })
        .build(),

      new LineLayerBuilder()
        .data(data)
        .yAxis('right')
        .xValue(d => d[periodKey])
        .yValue(d => d[conversionKey])
        .lineColor('#8b5cf6')
        .strokeWidth(3)
        .showDots(true)
        .smooth()
        .keyFn(d => d[periodKey])
        .legend({ show: true, label: '轉換率' })
        .build()
    ];
  }

  /**
   * 網站流量分析
   * 左軸：流量來源堆疊，右軸：跳出率
   */
  static webTrafficAnalysis(data, options = {}) {
    const {
      stackKeys = ['organic', 'paid', 'direct', 'referral'],
      bounceRateKey = 'bounceRate',
      dateKey = 'date'
    } = options;

    return [
      new StackedBarLayerBuilder()
        .data(data)
        .yAxis('left')
        .stackKeys(stackKeys)
        .xValue(d => d[dateKey])
        .colorMap({
          organic: '#10b981',
          paid: '#3b82f6',
          direct: '#f59e0b',
          referral: '#8b5cf6'
        })
        .keyFn(d => d[dateKey])
        .legend({ show: true })
        .build(),

      new LineLayerBuilder()
        .data(data)
        .yAxis('right')
        .xValue(d => d[dateKey])
        .yValue(d => d[bounceRateKey])
        .lineColor('#ef4444')
        .strokeWidth(2)
        .showDots(false)
        .smooth()
        .keyFn(d => d[dateKey])
        .legend({ show: true, label: '跳出率' })
        .build()
    ];
  }
}

/**
 * 軸配置構建器
 */
export class AxisConfigBuilder {
  constructor() {
    this.config = {};
  }

  scaleType(type) {
    this.config.scaleType = type;
    return this;
  }

  domain(domain) {
    this.config.domain = domain;
    return this;
  }

  label(label) {
    this.config.label = label;
    return this;
  }

  format(formatter) {
    this.config.format = formatter;
    return this;
  }

  /**
   * 使用預設格式化
   */
  useFormatter(type, ...args) {
    if (type in FORMATTERS) {
      const formatter = FORMATTERS[type];
      // 所有格式化器現在都是返回函數的函數
      if (typeof formatter === 'function') {
        this.config.format = formatter(...args);
      } else if (typeof formatter === 'object') {
        // 處理 time 對象（它的屬性是返回函數的函數）
        const subType = args[0] || 'fullDate';
        if (subType in formatter && typeof formatter[subType] === 'function') {
          this.config.format = formatter[subType]();
        }
      }
    }
    return this;
  }

  build() {
    return this.config;
  }
}

/**
 * 完整圖表配置構建器
 */
export class DualAxisChartBuilder {
  constructor() {
    this.config = {
      width: 800,
      height: 500,
      margin: { top: 60, right: 80, bottom: 60, left: 80 },
      layers: [],
      showGrid: true,
      animationDuration: 750
    };
  }

  size(width, height) {
    this.config.width = width;
    this.config.height = height;
    return this;
  }

  margin(margin) {
    this.config.margin = { ...this.config.margin, ...margin };
    return this;
  }

  title(title) {
    this.config.title = title;
    return this;
  }

  addLayer(layer) {
    this.config.layers.push(layer);
    return this;
  }

  addLayers(layers) {
    this.config.layers.push(...layers);
    return this;
  }

  xAxis(config) {
    this.config.xScaleType = config.scaleType || 'band';
    this.config.xDomain = config.domain;
    this.config.xAxisLabel = config.label;
    this.config.xAxisFormat = config.format;
    return this;
  }

  yLeftAxis(config) {
    this.config.yLeftScaleType = config.scaleType || 'linear';
    this.config.yLeftDomain = config.domain;
    this.config.yLeftAxisLabel = config.label;
    this.config.yLeftAxisFormat = config.format;
    return this;
  }

  yRightAxis(config) {
    this.config.yRightScaleType = config.scaleType || 'linear';
    this.config.yRightDomain = config.domain;
    this.config.yRightAxisLabel = config.label;
    this.config.yRightAxisFormat = config.format;
    return this;
  }

  showGrid(show = true) {
    this.config.showGrid = show;
    return this;
  }

  animationDuration(duration) {
    this.config.animationDuration = duration;
    return this;
  }

  build() {
    return this.config;
  }
}

/**
 * 快速配置函數
 */
export const quickConfig = {
  /**
   * 簡單的銷售圖表
   */
  simpleSales: (data) => {
    return new DualAxisChartBuilder()
      .size(800, 500)
      .title('銷售分析')
      .addLayers(ChartConfigFactory.salesAnalysis(data))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('銷售額')
          .useFormatter('currency')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('利潤率')
          .useFormatter('percent')
          .build()
      )
      .build();
  },

  /**
   * 簡單的生產圖表
   */
  simpleProduction: (data) => {
    return new DualAxisChartBuilder()
      .size(1000, 500)
      .title('生產監控')
      .addLayers(ChartConfigFactory.productionMonitoring(data))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('產量 (件)')
          .useFormatter('abbreviated')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('良率 (%)')
          .domain([80, 100])
          .useFormatter('percent')
          .build()
      )
      .build();
  }
};

/**
 * 使用範例：
 * 
 * // 1. 使用快速配置
 * const config = quickConfig.simpleSales(myData);
 * 
 * // 2. 使用構建器模式
 * const config = new DualAxisChartBuilder()
 *   .size(800, 500)
 *   .title('自定義圖表')
 *   .addLayer(
 *     new StackedBarLayerBuilder()
 *       .data(data)
 *       .yAxis('left')
 *       .stackKeys(['a', 'b'])
 *       .xValue(d => d.name)
 *       .useColorScheme('business')
 *       .build()
 *   )
 *   .yLeftAxis(
 *     new AxisConfigBuilder()
 *       .label('數量')
 *       .useFormatter('abbreviated')
 *       .build()
 *   )
 *   .build();
 * 
 * // 3. 使用場景工廠
 * const layers = ChartConfigFactory.salesAnalysis(myData);
 */
