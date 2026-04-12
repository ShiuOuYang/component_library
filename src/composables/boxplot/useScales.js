import { computed } from 'vue'
import * as d3 from 'd3'
import { ascending } from 'd3-array'

function createValueScales({ data, yScale, yField, valueConfig }) {
  const scaleMap = new Map()
  if (!yScale || !yField) return scaleMap
  if (!valueConfig || !valueConfig.field) return scaleMap

  const categories = yScale.domain()

  categories.forEach(category => {
    const categoryHeight = yScale.bandwidth?.() ?? 0
    if (!Number.isFinite(categoryHeight) || categoryHeight <= 0) return

    const categoryData = data.filter(d => d?.[yField] === category)
    if (!categoryData.length) return

    const multiplier = valueConfig.multiplier ?? 1
    const values = categoryData
      .map(d => Number(d?.[valueConfig.field]) * multiplier)
      .filter(v => !Number.isNaN(v))
      .sort(ascending)

    if (!values.length) return

    let minV = values[0]
    let maxV = values[values.length - 1]

    if (minV === maxV) {
      minV = Math.max(0, minV - 0.5)
      maxV = minV + 1
    }

    const range = Math.max(1, maxV - minV)
    const pad = Math.max(range * 0.1, 1)

    const domainMin = Math.max(0, minV - pad)
    const domainMax = maxV + pad

    // Use a local (row-relative) scale: 0..bandHeight.
    // The caller positions the row with a translated <g> at yScale(category).
    const scale = d3.scaleLinear()
      .domain([domainMin, domainMax])
      .range([categoryHeight, 0])

    scaleMap.set(category, { scale, domainMin, domainMax })
  })

  return scaleMap
}

export function useScales({ props, containerWidthRef, parseTime }) {
  const plotWidth = computed(() => {
    const w = Number(containerWidthRef.value) || 0
    return Math.max(0, w - props.margin.left - props.margin.right)
  })

  const plotHeight = computed(() => {
    return Math.max(0, (props.chartHeight || 0) - props.margin.top - props.margin.bottom)
  })

  const hasRightAxis = computed(() => !!(props.rightValueAxisConfig && props.rightValueAxisConfig.field))

  const yScale = computed(() => {
    const data = props.data || []
    const cfg = props.yAxisConfig
    if (!data.length || !cfg?.field) return null

    if (cfg.type === 'linear') {
      const values = data.map(d => Number(d?.[cfg.field])).filter(v => !Number.isNaN(v))
      if (!values.length) return null
      return d3.scaleLinear().domain(d3.extent(values)).range([0, plotHeight.value])
    }

    // default: band
    const categories = [...new Set(data.map(d => d?.[cfg.field]).filter(v => v !== null && v !== undefined))]
    let ordered = cfg.order && cfg.order.length
      ? categories.sort((a, b) => {
          const aIdx = cfg.order.indexOf(a)
          const bIdx = cfg.order.indexOf(b)
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
          if (aIdx !== -1) return -1
          if (bIdx !== -1) return 1
          return String(a).localeCompare(String(b))
        })
      : categories.sort((a, b) => String(a).localeCompare(String(b)))

    // stationOrder 覆蓋（若提供）
    if (props.stationOrder && props.stationOrder.length) {
      ordered = ordered.sort((a, b) => {
        const aIndex = props.stationOrder.indexOf(a)
        const bIndex = props.stationOrder.indexOf(b)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return String(a).localeCompare(String(b))
      })
    }

    return d3.scaleBand()
      .domain(ordered)
      .range([0, plotHeight.value])
      .padding(cfg.padding ?? 0.2)
  })

  const xScale = computed(() => {
    const data = props.data || []
    const cfg = props.xAxisConfig
    if (!data.length || !cfg?.field) return null

    if (cfg.type === 'linear') {
      const values = data.map(d => Number(d?.[cfg.field])).filter(v => !Number.isNaN(v))
      if (!values.length) return null
      const extent = cfg.domain || d3.extent(values)
      return d3.scaleLinear().domain(extent).range([0, plotWidth.value])
    }

    if (cfg.type === 'band') {
      const categories = [...new Set(data.map(d => d?.[cfg.field]).filter(v => v !== null && v !== undefined))]
      const ordered = cfg.order && cfg.order.length
        ? categories.sort((a, b) => {
            const aIdx = cfg.order.indexOf(a)
            const bIdx = cfg.order.indexOf(b)
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return String(a).localeCompare(String(b))
          })
        : categories.sort((a, b) => String(a).localeCompare(String(b)))

      return d3.scaleBand().domain(ordered).range([0, plotWidth.value]).padding(cfg.padding ?? 0.2)
    }

    // default: time
    const safe = data
      .map(d => ({ d, t: parseTime(d?.[cfg.field]) }))
      .filter(x => x.t)
    if (!safe.length) return null

    const extent = cfg.domain || d3.extent(safe, x => x.t)
    return d3.scaleTime().domain(extent).range([0, plotWidth.value])
  })

  const categories = computed(() => (yScale.value?.domain ? yScale.value.domain() : []))

  const categoryGrouped = computed(() => {
    const data = props.data || []
    const yField = props.yAxisConfig?.field
    if (!data.length || !yField) return new Map()
    return d3.group(data, d => d?.[yField])
  })

  const stationScaleMap = computed(() => {
    const data = props.data || []
    const y = yScale.value
    const yCfg = props.yAxisConfig
    if (!y || !yCfg?.showIndependentScale) return new Map()

    return createValueScales({
      data,
      yScale: y,
      yField: yCfg.field,
      valueConfig: props.valueAxisConfig
    })
  })

  const rightStationScaleMap = computed(() => {
    if (!hasRightAxis.value) return new Map()
    const data = props.data || []
    const y = yScale.value
    const yCfg = props.yAxisConfig
    if (!y || !yCfg?.showIndependentScale) return new Map()

    return createValueScales({
      data,
      yScale: y,
      yField: yCfg.field,
      valueConfig: props.rightValueAxisConfig
    })
  })

  return {
    plotWidth,
    plotHeight,
    hasRightAxis,
    xScale,
    yScale,
    categories,
    categoryGrouped,
    stationScaleMap,
    rightStationScaleMap
  }
}
