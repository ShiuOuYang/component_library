import * as d3 from 'd3'

export function renderXAxis({ layerAxes, xScale, height, xAxisConfig }) {
  if (!layerAxes || !xScale) return

  let axis = d3.axisBottom(xScale)

  if (xAxisConfig?.type === 'time' && xAxisConfig.format) {
    axis = axis.tickFormat(d3.timeFormat(xAxisConfig.format))
  }

  if (xAxisConfig?.tickCount) {
    axis = axis.ticks(xAxisConfig.tickCount)
  }

  const xAxisGroup = layerAxes
    .selectAll('g.x-axis')
    .data([null])
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(axis)

  xAxisGroup.selectAll('text')
    .style('text-anchor', 'end')
    .style('font-size', '10px')
    .style('fill', '#4b5563')
    .style('font-weight', '500')
    .attr('transform', `rotate(${xAxisConfig?.rotation ?? -50})`)
    .attr('dx', '-0.8em')
    .attr('dy', '0.15em')

  xAxisGroup.select('.domain')
    .style('stroke', '#6b7280')
    .style('stroke-width', '1px')

  xAxisGroup.selectAll('.tick line')
    .style('stroke', '#9ca3af')
    .style('stroke-width', '1px')
}

export function renderValueAxesLeft({ layerAxes, categories, yScale, stationScaleMap, valueAxisConfig, cssify }) {
  if (!layerAxes || !yScale) return

  const leftAxisLayer = layerAxes
    .selectAll('g.left-axes')
    .data([null])
    .join('g')
    .attr('class', 'left-axes')

  const leftAxisGroups = leftAxisLayer
    .selectAll('g.station-yield-axis')
    .data(categories, d => d)
    .join('g')
    .attr('class', d => `station-yield-axis station-yield-axis-${cssify(d)}`)
    .attr('transform', d => `translate(0, ${yScale(d) ?? 0})`)

  leftAxisGroups.each(function(category) {
    const scaleInfo = stationScaleMap.get(category)
    if (!scaleInfo) return

    const { scale } = scaleInfo
    const categoryHeight = yScale.bandwidth?.() ?? 0
    const axis = d3.axisLeft(scale)
      .tickFormat(d => `${(+d).toFixed(1)}${valueAxisConfig?.unit || ''}`)
      .ticks(Math.max(3, Math.min(5, Math.ceil(categoryHeight / 20))))

    const gAxis = d3.select(this)
    gAxis.call(axis)

    gAxis.selectAll('text')
      .style('font-size', '10.5px')
      .style('fill', '#4b5563')
      .style('font-weight', '500')

    gAxis.select('.domain')
      .style('stroke', '#6b7280')
      .style('stroke-width', '1px')

    gAxis.selectAll('.tick line')
      .style('stroke', '#6b7280')
      .style('stroke-width', '1px')
      .style('stroke-dasharray', '2,2')
  })
}

export function renderValueAxesRight({ layerAxes, categories, yScale, width, rightStationScaleMap, rightValueAxisConfig, cssify }) {
  if (!layerAxes || !yScale) return

  if (!rightValueAxisConfig?.field) {
    layerAxes.selectAll('g.right-axes').remove()
    return
  }

  const rightAxisLayer = layerAxes
    .selectAll('g.right-axes')
    .data([null])
    .join('g')
    .attr('class', 'right-axes')

  const rightAxisGroups = rightAxisLayer
    .selectAll('g.station-yield-axis-right')
    .data(categories, d => d)
    .join('g')
    .attr('class', d => `station-yield-axis-right station-yield-axis-right-${cssify(d)}`)
    .attr('transform', d => `translate(${width}, ${yScale(d) ?? 0})`)

  rightAxisGroups.each(function(category) {
    const scaleInfo = rightStationScaleMap.get(category)
    if (!scaleInfo) return

    const { scale } = scaleInfo
    const categoryHeight = yScale.bandwidth?.() ?? 0
    const axis = d3.axisRight(scale)
      .tickFormat(d => `${(+d).toFixed(1)}${rightValueAxisConfig?.unit || ''}`)
      .ticks(Math.max(3, Math.min(5, Math.ceil(categoryHeight / 20))))

    const gAxis = d3.select(this)
    gAxis.call(axis)

    gAxis.selectAll('text')
      .style('font-size', '10.5px')
      .style('fill', '#4b5563')
      .style('font-weight', '500')

    gAxis.select('.domain')
      .style('stroke', '#6b7280')
      .style('stroke-width', '1px')

    gAxis.selectAll('.tick line')
      .style('stroke', '#6b7280')
      .style('stroke-width', '1px')
      .style('stroke-dasharray', '2,2')
  })
}
