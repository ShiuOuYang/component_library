/**
 * Pure utilities for BoxPlotChart components.
 * Keep these functions side-effect free to enable unit testing.
 */

export function normalizeAxisSide(rawSide) {
  const s = String(rawSide ?? '').toLowerCase()
  return s === 'right' || s === 'r' ? 'right' : 'left'
}

export function getPointValueMeta({
  datum,
  sideField,
  hasRightAxis,
  leftConfig,
  rightConfig,
  leftScale,
  rightScale
}) {
  const side = normalizeAxisSide(sideField ? datum?.[sideField] : '')

  if (side === 'right' && hasRightAxis && rightConfig?.field && rightScale) {
    const multiplier = rightConfig.multiplier ?? 1
    const raw = Number(datum?.[rightConfig.field])
    const value = raw * multiplier
    return { side: 'right', config: rightConfig, scale: rightScale, value }
  }

  const multiplier = leftConfig?.multiplier ?? 1
  const raw = Number(datum?.[leftConfig?.field])
  const value = raw * multiplier
  return { side: 'left', config: leftConfig, scale: leftScale, value }
}

export function buildDataClickPayload({ datum, yField, meta }) {
  return {
    ...datum,
    station: datum?.[yField] ?? datum?.station,
    valueAxis: meta?.side,
    valueField: meta?.config?.field,
    value: meta?.value,
    valueUnit: meta?.config?.unit ?? '',
    layer: datum?.raw?.layer || datum?.raw?.layerName || datum?.layer || null,
    lotnum: datum?.raw?.lotnum || datum?.lotnum || null
  }
}

export function buildTooltipData({
  datum,
  yField,
  xField,
  meta,
  color,
  extra,
  legacyFields = true
}) {
  const station = datum?.[yField] ?? datum?.station
  const lotnum = datum?.raw?.lotnum || datum?.lotnum || null
  const layerName = datum?.raw?.layer || datum?.raw?.layerName || datum?.layer || null
  const status = datum?.status ?? 'unknown'

  const unit = meta?.config?.unit ?? ''
  const valueNumber = Number(meta?.value)
  const valueDisplay = Number.isFinite(valueNumber) ? `${valueNumber.toFixed(1)}${unit}` : `N/A${unit}`

  const data = {
    station,
    valueAxis: meta?.side,
    valueField: meta?.config?.field,
    value: meta?.value,
    valueUnit: unit,
    valueDisplay,
    xField,
    xRaw: datum?.[xField],
    lotnum,
    layerName,
    status,
    color,
    raw: datum?.raw ?? null,
    extra
  }

  if (legacyFields && meta?.config?.field) {
    // keep old dynamic shape: { [yField], [valueField], [xField] }
    data[yField] = station
    data[meta.config.field] = valueDisplay
    data[xField] = datum?.[xField]
  }

  return data
}
