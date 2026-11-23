/**
 * 組件庫內建文字（語系檔）
 *
 * 元件裡所有使用者看得到、或螢幕閱讀器會念出來的文字都從這裡來：
 * 按鈕文字、預設 placeholder、aria-label、title 提示、即時播報（aria-live）、錯誤訊息…
 * 透過 <ChptConfigProvider :locale="enUS"> 切換；也可以只覆寫部分欄位：
 *
 * ```vue
 * <ChptConfigProvider :locale="{ modal: { close: '關閉視窗' } }">
 * ```
 *
 * 規則
 *   - 元件的 prop 有傳值時一律以 prop 為準，沒傳才用這裡的文字（原本的預設值都搬到這裡）
 *   - 新增文字時 zhTW 與 enUS 都要補（型別會擋），並且不要在元件裡寫死中文 ——
 *     `npm run check:i18n` 會掃出來
 *   - 帶參數的文字寫成函式，語序交給各語系自己決定（中文「共 3 筆」、英文「3 items」）
 *   - 日期、數字格式一律用 Intl 搭配 `code`，不要自己拼「年 / 月」
 */

/** BCP 47 語系代碼 + 元件內建文字 */
export interface ChptLocale {
  /** BCP 47 語系代碼，給 Intl / lang 屬性用 */
  code: string

  // ===== 通用（早期就有的平面欄位，保留原名以相容既有的覆寫寫法） =====
  empty: string
  loading: string
  searchPlaceholder: string
  noData: string
  selectedCount: (n: number) => string
  clear: string
  selectPage: string
  select: string
  expandRow: string
  collapseRow: string
  pagination: {
    nav: string
    /** 同一個頁面上下各一個分頁時的名稱（landmark 名稱要唯一） */
    navTop: string
    navBottom: string
    prev: string
    next: string
    first: string
    last: string
    page: (n: number) => string
    current: string
    perPageBefore: string
    perPageAfter: string
    perPageLabel: string
    pageSizeOption: (n: number) => string
    total: (n: number) => string
    range: (start: number, end: number, total: number) => string
  }

  /** 各元件共用的短字 */
  common: {
    close: string
    confirm: string
    cancel: string
    search: string
    searchEllipsis: string
    pleaseSelect: string
    /** 清單類元件沒有資料時 */
    noData: string
    /** 帶刪節號的「載入中…」 */
    loadingEllipsis: string
    selectAll: string
    all: string
    prev: string
    next: string
    /** 數量 + 單位：「3 筆」/「3 items」 */
    count: (n: number) => string
    noMatch: string
    pleaseSelectEllipsis: string
  }

  validation: {
    /** 沒有 label 時，必填訊息裡的欄位名稱 */
    field: string
    required: (label: string) => string
    failed: string
    email: string
    url: string
    number: string
    integer: string
    minItems: (n: number) => string
    minLength: (n: number) => string
    minValue: (n: number) => string
    maxItems: (n: number) => string
    maxLength: (n: number) => string
    maxValue: (n: number) => string
    pattern: string
  }

  confirm: {
    ok: string
    /** requireText：「請輸入 X 以確認」—— X 會用粗體另外顯示，所以拆成前後兩段 */
    requireBefore: string
    requireAfter: string
  }

  alert: { close: string }
  anchor: { label: string }
  autocomplete: {
    empty: string
    count: (n: number) => string
    label: string
  }
  avatar: { fallback: string }
  backTop: { label: string }
  calendar: {
    today: string
    prevYear: string
    prevMonth: string
    nextMonth: string
    nextYear: string
    weekdaysShort: string[]
    weekdaysLong: string[]
    monthTitle: (year: number, month: number) => string
    fullDate: (year: number, month: number, day: number, weekday: string) => string
  }
  carousel: { prev: string; next: string; pause: string; play: string; slide: (n: number) => string }
  cascader: {
    hasChildren: string
    level: (n: number) => string
    choose: (label: string) => string
    chooseItem: string
  }
  codeBlock: { tipTitle: string; label: string; labelWithLang: (lang: string) => string; colon: string }
  colorPicker: {
    custom: string
    hex: string
    presets: string
    clearColor: string
    invalidHex: string
    choose: (label: string) => string
    chooseColor: string
    unset: string
  }
  copy: { copy: string; copied: string; copySubject: (subject: string) => string; copiedSubject: (subject: string) => string; failed: string }
  countdown: {
    finished: string
    days: (n: number) => string
    hours: (n: number) => string
    minutes: (n: number) => string
    seconds: (n: number) => string
    remaining: (parts: string) => string
    titled: (title: string, spoken: string) => string
  }
  darkMode: {
    toLight: string
    toDark: string
    followSystem: string
  }
  dataTooltip: { clickToClose: string }
  datePicker: { placeholder: string; presets: { today: string; yesterday: string; thisWeek: string; lastWeek: string; last7Days: string; last30Days: string; thisMonth: string; lastMonth: string; thisQuarter: string; thisYear: string }; currentShift: (name: string) => string; previousShift: (name: string) => string; dayShift: string; nightShift: string }
  drawer: { label: string }
  ellipsis: { expand: string; collapse: string }
  filter: {
    clearAll: string
    noOptions: string
    clear: string
    selected: (n: number) => string
    label: string
  }
  filterBar: {
    countLabel: string
    /** 「共 {n} 筆{label}」：數字會加粗另外顯示，所以拆成前後兩段 */
    totalBefore: string
    totalAfter: string
  }
  logout: {
    label: string
    loading: string
    title: string
    confirmMessage: string
  }
  imageViewer: {
    label: string
    labelWithAlt: (alt: string) => string
    closeHint: string
    thumbnails: string
    zoomOut: string
    zoomIn: string
    reset: string
    rotate: string
    item: (n: number, alt: string) => string
  }
  inputNumber: { decrease: string; increase: string }
  storage: {
    search: string
    searchPlaceholder: string
    found: (n: number) => string
    prevHit: string
    nextHit: string
    colorBy: string
    modes: { utilization: string; item: string; expiry: string }
    used: (used: number, total: number) => string
    utilization: (pct: string) => string
    expiredCount: (n: number) => string
    soonCount: (n: number, days: number) => string
    blockedCount: (n: number) => string
    legend: string
    empty: string
    filled: string
    over: string
    others: string
    expiryState: { ok: string; soon: string; expired: string }
    mixed: (n: number) => string
    daysShort: (days: number) => string
    levelShort: (level: number) => string
    cellLabel: (parts: string[]) => string
    noBins: string
    detail: string
    pickBin: string
    where: (zone: string, rack: string, level: number, position: number) => string
    blocked: string
    capacity: string
    capacityUsage: (qty: string, capacity: string, pct: string) => string
    lot: (lot: string) => string
    expiredAgo: (days: number) => string
    expiresIn: (days: number) => string
    emptyBin: string
    move: string
    moveOne: (item: string) => string
    moveAll: string
    pickTarget: (what: string) => string
    cancel: string
    moved: (to: string) => string
    reject: { blocked: (to: string) => string; overCapacity: (to: string) => string; unknown: (to: string) => string }
  }
  workInstruction: {
    label: string
    progress: (n: number, total: number) => string
    progressLabel: string
    stepsLabel: string
    total: (time: string) => string
    stepTime: (time: string) => string
    stepButton: (n: number, title: string, done: boolean) => string
    caution: string
    pass: string
    fail: string
    range: (lo: string, hi: string) => string
    min: (lo: string) => string
    max: (hi: string) => string
    prev: string
    next: string
    finish: string
    finished: string
    doneTitle: (time: string) => string
    restart: string
    block: { confirm: string; measure: string; outOfSpec: string; wait: (seconds: number) => string }
    sep: string
    announceStep: (n: number, title: string) => string
    hint: string
  }
  andon: {
    type: Record<'maintenance' | 'material' | 'quality' | 'supervisor', string>
    normal: string
    calling: string
    handling: string
    waiting: (by: string) => string
    responding: (who: string) => string
    respond: string
    resolve: string
    raise: (station: string, type: string) => string
    raiseFor: (station: string) => string
    stationNormal: (station: string) => string
    stationCalls: (station: string, calls: string[]) => string
    callLabel: (type: string, state: string, time: string) => string
    newCall: (station: string, type: string) => string
    escalated: (station: string, type: string) => string
    mute: string
    unmute: string
    fullscreen: string
    exitFullscreen: string
  }
  pivot: {
    label: string
    configure: string
    expandAll: string
    collapseAll: string
    heatmap: string
    exportCsv: string
    summary: (records: number, rows: number, cols: number) => string
    zone: Record<'available' | 'rows' | 'cols' | 'values', string>
    zoneShort: Record<'rows' | 'cols' | 'values', string>
    dropHere: string
    addTo: (field: string, zone: string) => string
    aggFor: (field: string) => string
    moveEarlier: (field: string) => string
    moveLater: (field: string) => string
    remove: (field: string) => string
    agg: Record<'sum' | 'avg' | 'count' | 'min' | 'max' | 'countDistinct', string>
    valueLabel: (agg: string, field: string) => string
    total: string
    grandTotal: string
    blank: string
    noValues: string
    empty: string
  }
  timeScrubber: {
    label: string
    play: string
    pause: string
    prevEvent: string
    nextEvent: string
    speed: string
    speedOption: (x: number) => string
    playhead: string
    rangeStart: string
    rangeEnd: string
    range: (from: string, to: string) => string
    clearRange: string
    eventLabel: (time: string, label: string) => string
    hint: string
  }
  approval: {
    label: string
    flow: Record<'approved' | 'rejected' | 'in-progress', string>
    submitted: (who: string, time: string) => string
    elapsed: (duration: string) => string
    total: (duration: string) => string
    mode: Record<'single' | 'all' | 'any', string>
    step: Record<'approved' | 'rejected' | 'current' | 'upcoming' | 'cancelled', string>
    waiting: (duration: string) => string
    took: (duration: string) => string
    overdue: (hours: number) => string
    delegatedTo: (name: string) => string
    approver: Record<'approved' | 'rejected' | 'pending' | 'waiting' | 'skipped', string>
    yourTurn: string
    actOnBehalf: (name: string) => string
    comment: string
    commentPlaceholder: string
    approve: string
    reject: string
    delegate: string
    delegatePick: string
    rejectNeedsComment: string
    approvedAnnounce: string
    rejectedAnnounce: string
    delegatedAnnounce: (name: string) => string
  }
  diffViewer: {
    label: string
    filterLabel: string
    status: Record<'changed' | 'added' | 'removed' | 'within' | 'same', string>
    onlyDiff: string
    expandAll: string
    collapseAll: string
    search: string
    param: string
    left: string
    right: string
    diff: string
    groupChanges: (n: number) => string
    empty: string
    noDiff: string
    noMatch: string
  }
  imageCompare: {
    label: string
    before: string
    after: string
    modeLabel: string
    mode: Record<'slider' | 'side' | 'overlay', string>
    opacity: string
    difference: string
    diffTag: (before: string, after: string) => string
    zoomIn: string
    zoomOut: string
    fit: string
    divider: string
    loadError: (name: string) => string
    hint: string
  }
  alarm: {
    label: string
    filterLabel: string
    viewLabel: string
    view: Record<'open' | 'unacked' | 'shelved' | 'all', string>
    severity: Record<'critical' | 'major' | 'minor' | 'info', string>
    state: Record<'unacked' | 'acked' | 'shelved' | 'closed', string>
    search: string
    empty: string
    noMatch: string
    ack: string
    ackAll: (n: number) => string
    shelve: string
    shelveFor: (minutes: number) => string
    cancel: string
    unshelve: string
    escalate: string
    escalatedN: (n: number) => string
    cleared: string
    mute: string
    unmute: string
    since: (duration: string) => string
    raisedAt: (time: string) => string
    ackedBy: (who: string, time: string) => string
    clearedAt: (time: string) => string
    shelvedUntil: (time: string) => string
    ackedN: (n: number) => string
    shelvedN: (n: number, minutes: number) => string
    escalatedAnnounce: (n: number) => string
    newAlarm: (severity: string, source: string, title: string, n: number) => string
    hint: string
  }
  shiftRoster: {
    label: string
    mode: string
    fill: string
    swap: string
    brush: string
    clear: string
    person: string
    stats: string
    none: string
    workDays: (n: number) => string
    coverageLabel: (date: string, shift: string, have: number, need: number) => string
    restWarning: (name: string, date: string, hours: number) => string
    consecutiveWarning: (name: string, date: string, days: number) => string
    allGood: string
    summary: (short: number, warn: number) => string
    more: (n: number) => string
    hintFill: string
    hintSwap: string
    assigned: (name: string, date: string, shift: string) => string
    filled: (name: string, from: string, to: string, shift: string) => string
    swapped: (a: string, b: string, date: string) => string
    picked: (name: string, date: string) => string
    cancelled: string
  }
  floorPlan: {
    label: string
    hint: string
    zoomIn: string
    zoomOut: string
    fit: string
    close: string
  }
  logViewer: {
    label: string
    levels: string
    level: { debug: string; info: string; warn: string; error: string; fatal: string }
    search: string
    searchPlaceholder: string
    regexError: (msg: string) => string
    follow: string
    paused: string
    copy: string
    copyOne: string
    download: string
    copied: (n: number) => string
    copyFailed: string
    empty: string
    noMatch: string
    newEntries: (n: number) => string
    showing: (shown: number, total: number) => string
    announce: (n: number, message: string) => string
  }
  lotTrace: {
    direction: string
    backward: string
    both: string
    forward: string
    view: string
    graph: string
    list: string
    search: string
    upstream: string
    downstream: string
    legend: string
    hold: string
    suspect: string
    repeat: string
    root: string
    upLevel: (n: number) => string
    downLevel: (n: number) => string
    graphLabel: (root: string) => string
    summary: (up: number, down: number, hold: number) => string
  }
  checklist: {
    status: { ok: string; ng: string; na: string }
    progress: (done: number, total: number) => string
    progressLabel: string
    ngCount: (n: number) => string
    naCount: (n: number) => string
    filterLabel: string
    filterAll: string
    filterTodo: string
    filterNg: string
    required: string
    requiredSr: string
    value: string
    spec: (range: string) => string
    specWithTarget: (range: string, target: string) => string
    inSpec: string
    outOfSpec: string
    numpadFor: (label: string) => string
    ngReason: string
    note: string
    notePlaceholder: string
    addPhoto: string
    photoAlt: (label: string, n: number) => string
    removePhoto: (label: string, n: number) => string
    missing: string
    noteRequired: string
    allDone: string
    noNg: string
    issues: (n: number) => string
  }
  equipment: {
    status: { run: string; idle: string; maintenance: string; down: string; offline: string }
    filterLabel: string
    search: string
    avgUtilization: string
    empty: string
    ungrouped: string
    since: (status: string, duration: string) => string
    duration: (d: number, h: number, m: number) => string
    workOrder: string
    utilization: string
    changed: (name: string, status: string, alarm: string) => string
    separator: string
  }
  defect: {
    regionLabel: string
    regionWithAlt: (alt: string) => string
    hint: string
    hintRect: string
    tool: string
    toolPoint: string
    toolRect: string
    typeLabel: string
    defaultType: string
    mark: (n: number, type: string, note: string) => string
    added: (n: number, type: string) => string
    removed: (n: number) => string
    remove: string
    removeN: (n: number) => string
    listLabel: string
    count: (n: number) => string
    empty: string
    notePlaceholder: string
    noteLabel: (n: number) => string
  }
  signature: {
    label: string
    placeholder: string
    hint: string
    undo: string
    clear: string
    empty: string
    signed: string
    status: (label: string, state: string) => string
  }
  numpad: {
    label: string
    backspace: string
    clear: string
    confirm: string
    negate: string
    decimal: string
    range: (min: string, max: string) => string
    min: (min: string) => string
    max: (max: string) => string
    below: (min: string) => string
    above: (max: string) => string
    empty: string
  }
  inputTag: {
    placeholder: string
    hint: string
    max: (n: number) => string
    duplicate: string
    added: (items: string[]) => string
    rejected: (items: string[]) => string
    removed: (item: string) => string
    backspaceAgain: (item: string) => string
    list: (label: string, n: number) => string
    remove: (tag: string) => string
    rejectedItem: (value: string, reason: string) => string
  }
  list: { loadMore: string }
  menu: { label: string }
  modal: {
    label: string
    drag: string
    minimize: string
    maximize: string
    restore: string
  }
  modalDock: { restore: string; close: string }
  notification: { label: string; close: (title: string) => string }
  pageSwitcher: { title: string; footerHint: string }
  popconfirm: { message: string }
  progress: { label: string }
  qrcode: {
    generating: string
    regenerate: string
    expired: string
    tooLong: string
    empty: string
    label: (value: string) => string
  }
  rate: {
    label: string
    star: (n: number) => string
  }
  result: {
    success: string
    error: string
    warning: string
    info: string
    forbidden: string
    notFound: string
    serverError: string
  }
  splitter: { label: string }
  statistic: {
    up: (delta: string) => string
    down: (delta: string) => string
    flat: string
    better: string
    worse: string
  }
  steps: {
    done: string
    process: string
    pending: string
    error: string
  }
  table: {
    expand: string
    row: (n: number) => string
    resize: (title: string) => string
    selectRow: (label: string) => string
    summary: string
    columns: string
    columnSettings: string
    resetColumns: string
  }
  timePicker: {
    now: string
    hour: string
    minute: string
    second: string
    choose: (label: string) => string
    chooseTime: string
  }
  toast: { label: string; close: string }
  tour: {
    close: string
    prev: string
    finish: string
    step: (current: number, total: number, title: string) => string
    next: string
  }
  transfer: {
    source: string
    target: string
    add: string
    remove: string
    moved: (n: number, to: string) => string
    selectAll: (title: string) => string
    search: (title: string) => string
  }
  upload: {
    drop: string
    dragBefore: string
    clickToSelect: string
    fileList: string
    button: string
    /** 多個項目之間的分隔（「、」/「, 」） */
    listSeparator: string
    accept: (types: string) => string
    maxSize: (size: string) => string
    reachedMaxCount: (n: number) => string
    maxCount: (n: number) => string
    invalidType: (accept: string) => string
    tooLarge: (size: string) => string
    tooMany: (n: number) => string
    failed: string
    retry: (name: string) => string
    cancelUpload: (name: string) => string
    remove: (name: string) => string
    progress: (name: string) => string
    hintSeparator: string
  }
  image: {
    failed: string
    failedWithAlt: (alt: string) => string
    preview: string
    previewWithAlt: (alt: string) => string
  }
  tag: {
    close: string
    closeWithLabel: (label: string) => string
  }
  fixedTable: {
    selectAll: string
  }
  treeSelect: {
    options: string
  }
  chart: {
    noData: string
    resetZoom: string
    legend: string
    legendToggle: string
    statusLegend: string
    others: string
    target: string
    mean: string
    total: string
    show: (label: string) => string
    hide: (label: string) => string
    titled: (name: string, text: string) => string
    empty: (name: string) => string
    records: (n: number) => string
    items: (n: number) => string
    othersCount: (label: string, n: number) => string
    membersTotal: (n: number) => string
    listSeparator: string
    clauseSeparator: string
    range: (from: string, to: string) => string
    outOfSpec: string
    days: (n: number) => string
    hours: (n: number) => string
    minutes: (n: number) => string
    hoursDecimal: (n: string) => string
    timeFormat: { monthOfYear: string; month: string; year: string }
    layerTypes: Record<string, string>
    faceted: string
    gridFaceted: string
    facet: (n: number) => string
  }
  boxPlot: {
    title: string
    summary: (groups: number, widest: string, iqr: string) => string
    n: string
    max: string
    median: string
    min: string
    sd: string
    iqr: string
    outliers: string
    outlierCount: (n: number) => string
    outlierMark: string
    group: (n: number, median: string, q1: string, q3: string, outliers: number) => string
  }
  capability: {
    title: string
    good: string
    warning: string
    critical: string
    n: string
    sigmaOverall: string
    sigmaWithin: string
    ppmObserved: string
    ppmExpected: string
    summary: (n: number, mean: string, cpk: string, status: string, ppk: string) => string
    bin: (from: string, to: string, count: number, outOfSpec: boolean) => string
  }
  controlChart: {
    title: (type: string) => string
    types: Record<string, [string, string]>
    rule: (n: number, text: string) => string
    rules: Record<number, string>
    summary: (n: number, cl: string, ucl: string, lcl: string, outCount: number) => string
    sampleSize: (n: number) => string
    subgroupSize: (n: number) => string
    violations: (rules: number[]) => string
  }
  pareto: {
    loading: string
    empty: string
    statistics: string
    totalCount: string
    types: string
    max: string
    count: string
    cumulative: string
    cumulativeAxis: string
    threshold: string
    thresholdSetting: string
    top3: string
  }
  horizontalBar: {
    title: string
    summary: (n: number, first: string, value: string) => string
    rank: (n: number) => string
    share: (pct: string) => string
  }
  pie: {
    title: string
  }
  sparkline: {
    title: string
    summary: (n: number, first: string, last: string, max: string, min: string) => string
  }
  gauge: {
    title: string
  }
  gantt: {
    title: string
    empty: string
    today: string
    help: string
    helpRows: string
    helpEnd: string
    statuses: { planned: string; running: string; done: string; delayed: string }
    summary: (rows: number, tasks: number) => string
    span: (start: string, end: string) => string
    row: string
    status: string
    time: string
    start: string
    end: string
    duration: string
    progress: string
  }
  stateTimeline: {
    title: string
    states: { run: string; idle: string; maintenance: string; down: string }
    unknown: string
    utilization: string
    downtime: string
    good: string
    warning: string
    critical: string
    downCount: (duration: string, n: number) => string
    summary: (machines: number, worst: string) => string
    worst: (row: string, pct: string) => string
    ongoing: string
    segment: (row: string, state: string, range: string, duration: string) => string
  }
  statusScatter: {
    title: string
  }
  waterfall: {
    title: string
    increase: string
    decrease: string
    startTotal: string
    subtotal: string
    summary: (from: string, to: string, biggest: string) => string
    biggest: (label: string, value: string) => string
    shareOfStart: (pct: string) => string
    change: (from: string, to: string) => string
  }
  viewer: {
    layers: (n: number) => string
    layer: (n: number) => string
    shapes: (n: number) => string
    zoom: (pct: string) => string
    mm: string
    inch: string
    zoomIn: string
    zoomOut: string
    resetView: string
    toggleMoves: string
    retry: string
    loading: string
    loadingLayers: (n: number) => string
    rendering: string
    missingSource: string
    noCoordinates: string
    noInput: string
    allFailed: string
    notMounted: string
    zeroSize: string
    gerberBehaviors: { region: string; draw: string; flash: string; drill: string; slot: string; move: string }
    pcbTypes: { outline: string; trace: string; pad: string; via: string; region: string; silk: string; component: string }
  }
  excelExporter: {
    button: string
    noData: string
    exportFile: string
    exporting: string
    settings: string
    filename: string
    filenamePlaceholder: string
    sheetName: string
    sheetNamePlaceholder: string
    columns: string
    deselectAll: string
    selected: (n: number, total: number) => string
    confirm: string
  }
  excelUploader: {
    button: string
    uploading: string
    notExcel: string
    noSheets: string
    readFailed: string
  }
  excelEditor: {
    functions: Record<string, string>
    title: string
    undo: string
    redo: string
    cut: string
    copy: string
    paste: string
    bold: string
    italic: string
    underline: string
    alignLeft: string
    alignCenter: string
    alignRight: string
    insertRow: string
    insertRowShort: string
    insertColumn: string
    insertColumnShort: string
    deleteRow: string
    deleteRowShort: string
    deleteColumn: string
    deleteColumnShort: string
    merge: string
    sortAsc: string
    sortDesc: string
    clear: string
    freeze: string
    freezeShort: string
    unfreeze: string
    unfreezeShort: string
    applyFormat: string
    numberFormat: string
    activeCell: string
    insertFunction: string
    formulaPlaceholder: string
    chooseFunction: string
    addSheet: string
    removeSheet: string
    formats: { general: string; integer: string; decimal2: string; thousands: string; thousandsDecimal: string; percent: string; percentDecimal: string; date: string; dateTime: string; time: string }
  }
  chartFrame: {
    export: string
    exporting: string
    png: string
    svg: string
    csv: string
    exportFailed: string
    error: string
    retry: string
  }
  kpiCard: {
    good: string
    warning: string
    critical: string
    target: (value: string) => string
    trend: (title: string, label: string) => string
  }
  scanInput: {
    placeholder: string
    submit: string
    ok: (value: string) => string
    duplicateWarn: (value: string) => string
    duplicate: (value: string) => string
    invalid: (value: string) => string
    tooShort: (n: number) => string
    manualNotAllowed: string
    imeHint: string
    history: string
    historyCount: (n: number) => string
    clearHistory: string
    scanner: string
    manual: string
    status: { ok: string; duplicate: string; rejected: string }
  }
  formList: {
    add: string
    empty: string
    item: (label: string, n: number) => string
    remove: (n: number) => string
    moveUp: (n: number) => string
    moveDown: (n: number) => string
    added: (n: number) => string
    removed: (n: number) => string
    moved: (from: number, to: number) => string
    max: (n: number) => string
  }
  schemaForm: {
    submit: string
    reset: string
    requiredSelect: (label: string) => string
  }
  waferMap: {
    yieldLabel: string
    yieldCount: (pass: number, total: number) => string
    ringYield: string
    ring: (i: number, n: number) => string
    coord: (x: number, y: number) => string
    bin: string
    value: string
    pass: string
    empty: string
    legend: string
    ariaLabel: (total: number, yieldText: string) => string
  }
  bullet: {
    title: string
    target: (value: string) => string
  }
  sankey: {
    title: string
    empty: string
    source: string
    target: string
    value: string
    inflow: (v: string) => string
    outflow: (v: string) => string
    share: (source: string, pct: string) => string
  }
  scatter: {
    title: string
    empty: string
    legend: string
    point: string
    all: string
    group: string
    equation: string
    clearSelection: string
    selected: (n: number, meanX: string, meanY: string) => string
    axisTitle: (label: string, unit: string) => string
    fitText: (group: string | null, equation: string, r2: string, n: number) => string
    tipLine: (name: string, value: string) => string
    statsCaption: (title: string) => string
    ariaLabel: (title: string, n: number, x: string, y: string, fits: string[]) => string
  }
  treemap: {
    title: string
    empty: string
    breadcrumb: string
    hint: string
    name: string
    value: string
    share: string
    metric: string
    center: (value: string) => string
    drillable: (n: number) => string
    valueShare: (value: string, share: string) => string
    metricLine: (label: string, value: string) => string
    ariaLabel: (title: string, path: string, n: number, total: string) => string
  }
  parallel: {
    title: string
    empty: string
    selected: (n: number, total: number) => string
    clear: string
    hint: string
    axis: (label: string, lo: string, hi: string, brushed: string) => string
    brushed: (lo: string, hi: string) => string
    row: (n: number) => string
    value: (name: string, value: string) => string
    ariaLabel: (title: string, axes: string[], n: number, selected: number) => string
  }
  correlation: {
    title: string
    empty: string
    method: string
    pearson: string
    spearman: string
    cluster: string
    faded: (alpha: number) => string
    self: (name: string) => string
    noData: (a: string, b: string, n: number) => string
    cell: (a: string, b: string, r: string, n: number, p: string, significant: boolean) => string
    pair: (x: string, y: string) => string
    closePair: string
  }
  radar: {
    title: string
    empty: string
    legend: string
    metric: string
    lowerIsBetterLabel: (label: string) => string
    point: (axis: string, value: string) => string
    ariaLabel: (title: string, axes: string[], series: string[]) => string
  }
  calendarHeatmap: {
    legend: string
    less: string
    more: string
    noData: string
    range: (from: string | null, to: string | null) => string
    cell: (date: string, value: string) => string
    ariaLabel: (title: string, start: string, end: string, days: number) => string
  }
  funnel: {
    title: string
    rty: string
    stepYield: string
    cumulative: string
    loss: (n: string) => string
    worst: string
    empty: string
  }
  commandPalette: {
    title: string
    placeholder: string
    empty: string
    recent: string
    results: (n: number) => string
    navigate: string
    run: string
    close: string
  }
  dashboardGrid: {
    label: string
    drag: (title: string) => string
    resize: (title: string) => string
    moved: (title: string, x: number, y: number) => string
    resized: (title: string, w: number, h: number) => string
    untitled: string
  }
  kanban: {
    label: string
    empty: string
    overLimit: (limit: number) => string
    help: string
    grabbed: (title: string, column: string, pos: number, total: number) => string
    moved: (title: string, column: string, pos: number, total: number) => string
    dropped: (title: string, column: string, pos: number) => string
    cancelled: (title: string) => string
    blocked: (title: string, column: string) => string
    card: string
  }
  richText: {
    toolbar: string
    placeholder: string
    bold: string
    italic: string
    underline: string
    strike: string
    heading: (level: number) => string
    bulletList: string
    orderedList: string
    blockquote: string
    codeBlock: string
    link: string
    linkUrl: string
    apply: string
    unlink: string
    invalidUrl: string
    undo: string
    redo: string
    clear: string
    count: (n: number, max?: number) => string
    overLimit: (max: number) => string
  }
  barcode: {
    label: (value: string) => string
    empty: string
    invalid: (chars: string) => string
  }
  cameraScanner: {
    title: string
    starting: string
    hint: string
    hintQrOnly: string
    scanned: (value: string) => string
    start: string
    stop: string
    switchCamera: string
    retry: string
    stopped: string
    errors: { denied: string; notFound: string; inUse: string; insecure: string; unsupported: string; unknown: string }
  }
}

export const zhTW: ChptLocale = {
  code: 'zh-TW',
  empty: '暫無資料',
  loading: '載入中',
  searchPlaceholder: '輸入關鍵字搜尋...',
  noData: '無資料',
  selectedCount: (n) => `已選 ${n} 筆`,
  clear: '清除',
  selectPage: '全選本頁',
  select: '選取',
  expandRow: '展開明細',
  collapseRow: '收合明細',
  pagination: {
    nav: '分頁導航',
    navTop: '上方分頁導航',
    navBottom: '下方分頁導航',
    prev: '上一頁',
    next: '下一頁',
    first: '第一頁',
    last: '最後一頁',
    page: (n) => `第 ${n} 頁`,
    current: '目前頁碼',
    perPageBefore: '每頁',
    perPageAfter: '筆',
    perPageLabel: '每頁筆數',
    pageSizeOption: (n) => `${n} 筆/頁`,
    total: (n) => `共 ${n} 筆`,
    range: (a, b, t) => `顯示第 ${a} 至 ${b} 項結果，共 ${t} 項`,
  },

  common: {
    close: '關閉',
    confirm: '確定',
    cancel: '取消',
    search: '搜尋',
    searchEllipsis: '搜尋...',
    pleaseSelect: '請選擇',
    noData: '沒有資料',
    loadingEllipsis: '載入中…',
    selectAll: '全選',
    all: '全部',
    prev: '上一張',
    next: '下一張',
    count: (n) => `${n} 筆`,
    noMatch: '找不到符合的項目',
    pleaseSelectEllipsis: '請選擇...',
  },

  validation: {
    field: '此欄位',
    required: (label) => `請輸入${label}`,
    failed: '驗證失敗',
    email: '電子郵件格式不正確',
    url: '網址格式不正確（需以 http:// 或 https:// 開頭）',
    number: '請輸入數字',
    integer: '請輸入整數',
    minItems: (n) => `至少選擇 ${n} 項`,
    minLength: (n) => `至少 ${n} 個字`,
    minValue: (n) => `不能小於 ${n}`,
    maxItems: (n) => `最多選擇 ${n} 項`,
    maxLength: (n) => `最多 ${n} 個字`,
    maxValue: (n) => `不能大於 ${n}`,
    pattern: '格式不正確',
  },

  confirm: { ok: '知道了', requireBefore: '請輸入', requireAfter: '以確認' },

  alert: { close: '關閉提示' },
  anchor: { label: '本頁內容' },
  autocomplete: {
    empty: '沒有符合的建議',
    count: (n) => `有 ${n} 個建議，用上下鍵選擇`,
    label: '建議',
  },
  avatar: { fallback: '使用者' },
  backTop: { label: '回到頂端' },
  calendar: {
    today: '今天',
    prevYear: '上一年',
    prevMonth: '上個月',
    nextMonth: '下個月',
    nextYear: '下一年',
    weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'],
    weekdaysLong: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    monthTitle: (y, m) => `${y} 年 ${m} 月`,
    fullDate: (y, m, d, w) => `${y} 年 ${m} 月 ${d} 日 ${w}`,
  },
  carousel: { prev: '上一張', next: '下一張', pause: '暫停自動播放', play: '開始自動播放', slide: (n) => `第 ${n} 張` },
  cascader: {
    hasChildren: '（有下一層）',
    level: (n) => `第 ${n} 層`,
    choose: (label) => `選擇${label}`,
    chooseItem: '選擇項目',
  },
  codeBlock: { tipTitle: '重要提示', label: '程式碼', labelWithLang: (lang) => `${lang} 程式碼`, colon: '：' },
  colorPicker: {
    custom: '自訂顏色',
    hex: '色碼',
    presets: '預設顏色',
    clearColor: '清除顏色',
    invalidHex: '請輸入 #RGB 或 #RRGGBB',
    choose: (label) => `選擇${label}`,
    chooseColor: '選擇顏色',
    unset: '未設定',
  },
  copy: { copy: '複製', copied: '已複製', copySubject: (s) => `複製：${s}`, copiedSubject: (s) => `已複製：${s}`, failed: '複製失敗' },
  countdown: {
    finished: '時間到',
    days: (n) => `${n} 天`,
    hours: (n) => `${n} 小時`,
    minutes: (n) => `${n} 分`,
    seconds: (n) => `${n} 秒`,
    remaining: (parts) => `剩餘 ${parts}`,
    titled: (title, spoken) => `${title}：${spoken}`,
  },
  darkMode: {
    toLight: '切換為淺色模式',
    toDark: '切換為深色模式',
    followSystem: '跟隨系統',
  },
  dataTooltip: { clickToClose: '點擊關閉' },
  datePicker: { placeholder: '選擇日期', presets: { today: '今天', yesterday: '昨天', thisWeek: '本週', lastWeek: '上週', last7Days: '近 7 天', last30Days: '近 30 天', thisMonth: '本月', lastMonth: '上月', thisQuarter: '本季', thisYear: '今年' }, currentShift: (name) => `本班（${name}）`, previousShift: (name) => `上一班（${name}）`, dayShift: '早班', nightShift: '晚班' },
  drawer: { label: '側邊面板' },
  ellipsis: { expand: '展開', collapse: '收起' },
  filter: {
    clearAll: '清空篩選',
    noOptions: '無選項',
    clear: '清空',
    selected: (n) => `已選擇 ${n} 項`,
    label: '篩選',
  },
  filterBar: { countLabel: '項目', totalBefore: '共', totalAfter: '筆' },
  logout: {
    label: '登出',
    loading: '登出…',
    title: '登出系統',
    confirmMessage: '確定要登出嗎？',
  },
  imageViewer: {
    label: '圖片檢視',
    labelWithAlt: (alt) => `圖片檢視：${alt}`,
    closeHint: '關閉（Esc）',
    thumbnails: '縮圖',
    zoomOut: '縮小',
    zoomIn: '放大',
    reset: '重設',
    rotate: '旋轉',
    item: (n, alt) => `第 ${n} 張${alt ? `：${alt}` : ''}`,
  },
  inputNumber: { decrease: '減少', increase: '增加' },
  storage: {
    search: '搜尋儲位、料號、批號',
    searchPlaceholder: '搜尋儲位 / 料號 / 品名 / 批號',
    found: (n) => (Number(n) ? `找到 ${n} 個儲位` : '找不到'),
    prevHit: '上一個',
    nextHit: '下一個',
    colorBy: '上色方式',
    modes: { utilization: '使用率', item: '料號', expiry: '效期' },
    used: (used, total) => `使用中 ${used} / ${total} 格`,
    utilization: (pct) => `使用率 ${pct}`,
    expiredCount: (n) => `已過期 ${n} 筆`,
    soonCount: (n, days) => `${days} 天內到期 ${n} 筆`,
    blockedCount: (n) => `停用 ${n} 格`,
    legend: '圖例',
    empty: '空',
    filled: '使用中（高度 = 使用率）',
    over: '超過容量',
    others: '其他',
    expiryState: { ok: '效期正常', soon: '快到期', expired: '已過期' },
    mixed: (n) => `${n} 種`,
    daysShort: (days) => (Number(days) <= 0 ? '過期' : `${days} 天`),
    levelShort: (level) => `${level}F`,
    cellLabel: (parts) => parts.join('，'),
    noBins: '沒有儲位',
    detail: '儲位明細',
    pickBin: '點選儲位查看庫存',
    where: (zone, rack, level, position) => `${zone} · ${rack} · 第 ${level} 層第 ${position} 格`,
    blocked: '停用',
    capacity: '容量',
    capacityUsage: (qty, capacity, pct) => `${qty} / ${capacity}（${pct}）`,
    lot: (lot) => `批號 ${lot}`,
    expiredAgo: (days) => (Number(days) <= 0 ? '今天到期' : `已過期 ${days} 天`),
    expiresIn: (days) => `${days} 天後到期`,
    emptyBin: '空儲位',
    move: '移動',
    moveOne: (item) => `移動 ${item}`,
    moveAll: '整格移動',
    pickTarget: (what) => `移動 ${what}：請點選目的儲位（Esc 取消），也可以直接拖曳`,
    cancel: '取消',
    moved: (to) => `已移到 ${to}`,
    reject: {
      blocked: (to) => `${to} 已停用，不能移入`,
      overCapacity: (to) => `${to} 容量不足`,
      unknown: (to) => `找不到儲位 ${to}`,
    },
  },
  workInstruction: {
    label: '作業指導書',
    progress: (n, total) => `步驟 ${n} / ${total}`,
    progressLabel: '完成進度',
    stepsLabel: '步驟',
    total: (time) => `總計 ${time}`,
    stepTime: (time) => `本步驟 ${time}`,
    stepButton: (n, title, done) => `第 ${n} 步：${title}${done ? '（已完成）' : ''}`,
    caution: '注意',
    pass: '合格',
    fail: '超出規格',
    range: (lo, hi) => `規格 ${lo} ～ ${hi}`,
    min: (lo) => `至少 ${lo}`,
    max: (hi) => `最多 ${hi}`,
    prev: '上一步',
    next: '下一步',
    finish: '完成',
    finished: '全部完成',
    doneTitle: (time) => `全部完成，共 ${time}`,
    restart: '重新開始',
    block: { confirm: '請先勾選確認', measure: '請輸入量測值', outOfSpec: '量測值超出規格', wait: (s) => `請再看 ${s} 秒` },
    sep: '；',
    announceStep: (n, title) => `第 ${n} 步：${title}`,
    hint: '平板上左右滑動切換步驟；鍵盤 ← → 或 PageUp / PageDown',
  },
  andon: {
    type: { maintenance: '維修', material: '缺料', quality: '品質', supervisor: '主管' },
    normal: '正常',
    calling: '呼叫中',
    handling: '處理中',
    waiting: (by) => `等待回應${by ? `（${by} 呼叫）` : ''}`,
    responding: (who) => `${who || '已回應'}處理中`,
    respond: '回應',
    resolve: '完成',
    raise: (station, type) => `${station}：呼叫${type}`,
    raiseFor: (station) => `${station}的呼叫按鈕`,
    stationNormal: (station) => `${station}：正常`,
    stationCalls: (station, calls) => `${station}：${calls.join('；')}`,
    callLabel: (type, state, time) => `${type}${state} ${time}`,
    newCall: (station, type) => `${station} 呼叫${type}`,
    escalated: (station, type) => `${station} 的${type}呼叫等太久了`,
    mute: '靜音',
    unmute: '取消靜音',
    fullscreen: '全螢幕',
    exitFullscreen: '離開全螢幕',
  },
  pivot: {
    label: '樞紐分析表',
    configure: '欄位設定',
    expandAll: '全部展開',
    collapseAll: '全部收合',
    heatmap: '熱度',
    exportCsv: '匯出 CSV',
    summary: (records, rows, cols) => `${records.toLocaleString()} 筆資料 · ${rows} 列${cols ? ` × ${cols} 欄` : ''}`,
    zone: { available: '可用欄位', rows: '列', cols: '欄', values: '值' },
    zoneShort: { rows: '列', cols: '欄', values: '值' },
    dropHere: '把欄位拖到這裡',
    addTo: (field, zone) => `把「${field}」加到${zone}`,
    aggFor: (field) => `「${field}」的彙總方式`,
    moveEarlier: (field) => `「${field}」往前移`,
    moveLater: (field) => `「${field}」往後移`,
    remove: (field) => `移除「${field}」`,
    agg: { sum: '加總', avg: '平均', count: '計數', min: '最小', max: '最大', countDistinct: '不重複計數' },
    valueLabel: (agg, field) => `${field}（${agg}）`,
    total: '總計',
    grandTotal: '總計',
    blank: '（空白）',
    noValues: '把欄位拖到「值」開始分析',
    empty: '沒有資料',
  },
  timeScrubber: {
    label: '時間軸回放',
    play: '播放',
    pause: '暫停',
    prevEvent: '上一個事件',
    nextEvent: '下一個事件',
    speed: '播放倍速',
    speedOption: (x) => `${x}×`,
    playhead: '目前時間',
    rangeStart: '範圍開始',
    rangeEnd: '範圍結束',
    range: (from, to) => `範圍 ${from} – ${to}`,
    clearRange: '看全部',
    eventLabel: (time, label) => `${time} ${label}`,
    hint: '拖曳或點軌道跳到某個時間、拖兩端把手只看一段；播放頭可用 ←→（Shift 加大）、PageUp / PageDown 跳事件、空白鍵播放',
  },
  approval: {
    label: '簽核流程',
    flow: { approved: '已核准', rejected: '已退回', 'in-progress': '簽核中' },
    submitted: (who, time) => `${who ? `${who} ` : ''}送出於 ${time}`,
    elapsed: (d) => `已進行 ${d}`,
    total: (d) => `共花了 ${d}`,
    mode: { single: '單人', all: '會簽（全部同意）', any: '或簽（一人同意即可）' },
    step: { approved: '已通過', rejected: '已退回', current: '簽核中', upcoming: '未開始', cancelled: '不需簽核' },
    waiting: (d) => `已等 ${d}`,
    took: (d) => `花了 ${d}`,
    overdue: (h) => `逾時（時限 ${h} 小時）`,
    delegatedTo: (name) => `${name}（代理）`,
    approver: { approved: '同意', rejected: '退回', pending: '待簽', waiting: '尚未輪到', skipped: '不需簽' },
    yourTurn: '輪到你簽核',
    actOnBehalf: (name) => `代理 ${name} 簽核`,
    comment: '意見',
    commentPlaceholder: '同意可以不寫；退回請寫原因',
    approve: '同意',
    reject: '退回',
    delegate: '委託',
    delegatePick: '委託給：',
    rejectNeedsComment: '退回請寫原因',
    approvedAnnounce: '已同意',
    rejectedAnnounce: '已退回',
    delegatedAnnounce: (name) => `已委託給 ${name}`,
  },
  diffViewer: {
    label: '參數比對',
    filterLabel: '依狀態篩選',
    status: { changed: '變更', added: '新增', removed: '刪除', within: '容許內', same: '相同' },
    onlyDiff: '只顯示差異',
    expandAll: '全部展開',
    collapseAll: '全部摺疊',
    search: '搜尋參數或值',
    param: '參數',
    left: '基準',
    right: '比對',
    diff: '差異',
    groupChanges: (n) => `${n} 處不同`,
    empty: '沒有參數',
    noDiff: '兩邊完全相同',
    noMatch: '沒有符合條件的參數',
  },
  imageCompare: {
    label: '影像比對',
    before: '基準',
    after: '比對',
    modeLabel: '比對方式',
    mode: { slider: '滑桿', side: '並排', overlay: '疊圖' },
    opacity: '透明度',
    difference: '差異',
    diffTag: (b, a) => `${b}與${a}的差異`,
    zoomIn: '放大',
    zoomOut: '縮小',
    fit: '顯示整張',
    divider: '分隔線位置',
    loadError: (name) => `${name}影像載入失敗`,
    hint: '拖曳移動分隔線、雙擊放大 / 還原、Ctrl + 滾輪或兩指縮放、放大後拖曳平移；鍵盤 + / − / 0 縮放、方向鍵平移',
  },
  alarm: {
    label: '警報',
    filterLabel: '依嚴重度篩選',
    viewLabel: '顯示',
    view: { open: '未處理', unacked: '未確認', shelved: '暫停', all: '全部' },
    severity: { critical: '嚴重', major: '重要', minor: '次要', info: '提示' },
    state: { unacked: '未確認', acked: '已確認', shelved: '暫停中', closed: '已結束' },
    search: '搜尋訊息、代碼、來源',
    empty: '目前沒有警報',
    noMatch: '沒有符合條件的警報',
    ack: '確認',
    ackAll: (n) => (n ? `全部確認（${n}）` : '全部確認'),
    shelve: '暫停',
    shelveFor: (m) => (m >= 60 && m % 60 === 0 ? `暫停 ${m / 60} 小時` : `暫停 ${m} 分鐘`),
    cancel: '取消',
    unshelve: '恢復提醒',
    escalate: '升級',
    escalatedN: (n) => (n > 1 ? `已升級 ${n} 次` : '已升級'),
    cleared: '已恢復',
    mute: '靜音',
    unmute: '取消靜音',
    since: (d) => `${d}前`,
    raisedAt: (time) => `發生：${time}`,
    ackedBy: (who, time) => `確認：${who ? `${who}，` : ''}${time}`,
    clearedAt: (time) => `恢復：${time}`,
    shelvedUntil: (time) => `暫停到：${time}`,
    ackedN: (n) => `已確認 ${n} 筆警報`,
    shelvedN: (n, m) => `已暫停 ${n} 筆警報 ${m} 分鐘`,
    escalatedAnnounce: (n) => `已升級 ${n} 筆警報`,
    newAlarm: (sev, src, title, n) => `新${sev}警報：${src ? `${src} ` : ''}${title}${n > 1 ? `，另有 ${n - 1} 筆` : ''}`,
    hint: '↑↓ 移動、A 確認、S 暫停、E 升級、Enter 展開說明',
  },
  shiftRoster: {
    label: '排班表',
    mode: '操作方式',
    fill: '填入',
    swap: '交換',
    brush: '要填入的班別',
    clear: '清除',
    person: '人員',
    stats: '統計',
    none: '未排班',
    workDays: (n) => `上班 ${n} 天`,
    coverageLabel: (date, shift, have, need) => (need ? `${date} ${shift}：${have} / ${need} 人${have < need ? '，不足' : ''}` : `${date} ${shift}：${have} 人`),
    restWarning: (name, date, hours) => `${name} ${date}：與前一班只隔 ${hours} 小時`,
    consecutiveWarning: (name, date, days) => `${name} ${date}：已連續上班 ${days} 天`,
    allGood: '人力足夠，沒有規則提醒',
    summary: (short, warn) => [short ? `人力不足 ${short} 格` : '', warn ? `規則提醒 ${warn} 項` : ''].filter(Boolean).join(' · '),
    more: (n) => `還有 ${n} 項`,
    hintFill: '選好班別後點格子；按住拖曳填一整段，Shift + 點填到上一次點的位置。鍵盤：方向鍵移動、按班別快捷鍵或空白鍵填入、Delete 清除',
    hintSwap: '把一格拖到同一天另一個人身上互換班別。鍵盤：空白鍵拿起、上下移動、空白鍵放下，Esc 取消',
    assigned: (name, date, shift) => `${name} ${date}：${shift}`,
    filled: (name, from, to, shift) => `${name} ${from} 到 ${to}：${shift}`,
    swapped: (a, b, date) => `${date} ${a} 與 ${b} 已互換`,
    picked: (name, date) => `已拿起 ${name} ${date}，上下移到要交換的人再按空白鍵`,
    cancelled: '已取消',
  },
  floorPlan: {
    label: '廠區配置圖',
    hint: 'Ctrl + 滾輪或兩指縮放、拖曳平移；Tab 進入後方向鍵移動、Enter 看明細',
    zoomIn: '放大',
    zoomOut: '縮小',
    fit: '顯示整張',
    close: '關閉明細',
  },
  logViewer: {
    label: '日誌',
    levels: '依等級篩選',
    level: { debug: '除錯', info: '資訊', warn: '警告', error: '錯誤', fatal: '嚴重' },
    search: '搜尋日誌',
    searchPlaceholder: '搜尋…（/正規式/i）',
    regexError: (msg) => `正規式有誤，改用一般文字搜尋：${msg}`,
    follow: '跟隨最新',
    paused: '已暫停跟隨（捲到最下面就會繼續）',
    copy: '複製',
    copyOne: '複製這筆',
    download: '下載',
    copied: (n) => `已複製 ${n} 筆`,
    copyFailed: '無法複製（瀏覽器不允許存取剪貼簿）',
    empty: '還沒有紀錄',
    noMatch: '沒有符合條件的紀錄',
    newEntries: (n) => `${n} 筆新紀錄`,
    showing: (shown, total) => `顯示 ${shown.toLocaleString()} / 共 ${total.toLocaleString()} 筆`,
    announce: (n, message) => (n > 1 ? `${n} 筆新的錯誤，最新：${message}` : `新的錯誤：${message}`),
  },
  lotTrace: {
    direction: '追溯方向',
    backward: '上游',
    both: '雙向',
    forward: '下游',
    view: '檢視方式',
    graph: '圖形',
    list: '清單',
    search: '搜尋批號',
    upstream: '上游（用了哪些料）',
    downstream: '下游（做成了什麼）',
    legend: '種類',
    hold: '隔離',
    suspect: '可疑',
    repeat: '（循環，已在上層出現）',
    root: '查詢的批號',
    upLevel: (n) => `上游第 ${n} 層`,
    downLevel: (n) => `下游第 ${n} 層`,
    graphLabel: (root) => `${root} 的追溯圖`,
    summary: (up, down, hold) => `上游 ${up} 個、下游 ${down} 個批號${hold ? `，隔離 ${hold} 個` : ''}`,
  },
  checklist: {
    status: { ok: '合格', ng: '不合格', na: '不適用' },
    progress: (done, total) => `已完成 ${done} / ${total}`,
    progressLabel: '點檢進度',
    ngCount: (n) => `不合格 ${n}`,
    naCount: (n) => `不適用 ${n}`,
    filterLabel: '顯示項目',
    filterAll: '全部',
    filterTodo: '待處理',
    filterNg: '不合格',
    required: '必填',
    requiredSr: '（必填）',
    value: '量測值',
    spec: (range) => `規格 ${range}`,
    specWithTarget: (range, target) => `規格 ${range}（目標 ${target}）`,
    inSpec: '規格內',
    outOfSpec: '超出規格',
    numpadFor: (label) => `用數字鍵盤輸入：${label}`,
    ngReason: '不合格原因 / 處置',
    note: '備註',
    notePlaceholder: '例如：皮帶磨損，已通知保養',
    addPhoto: '拍照 / 加入照片',
    photoAlt: (label, n) => `${label} 的照片 ${n}`,
    removePhoto: (label, n) => `移除 ${label} 的照片 ${n}`,
    missing: '尚未填寫',
    noteRequired: '不合格需要填寫原因',
    allDone: '全部完成',
    noNg: '沒有不合格的項目',
    issues: (n) => `還有 ${n} 項需要處理`,
  },
  equipment: {
    status: { run: '運轉', idle: '待機', maintenance: '保養', down: '停機', offline: '離線' },
    filterLabel: '依狀態篩選',
    search: '搜尋機台、工單、料號',
    avgUtilization: '平均稼動率',
    empty: '沒有符合條件的機台',
    ungrouped: '未分組',
    since: (status, duration) => `已${status} ${duration}`,
    duration: (d, h, m) => (d ? `${d} 天 ${h} 小時` : h ? `${h} 小時 ${m} 分` : m ? `${m} 分` : '不到 1 分'),
    workOrder: '工單',
    utilization: '稼動率',
    changed: (name, status, alarm) => `${name} ${status}${alarm ? `：${alarm}` : ''}`,
    separator: '；',
  },
  defect: {
    regionLabel: '缺陷標註區',
    regionWithAlt: (alt) => `缺陷標註區：${alt}`,
    hint: '點一下新增標記，拖曳標記可移動。鍵盤：在標註區按 Enter 於中央新增，選取標記後方向鍵微調（Shift 加大）、Delete 刪除',
    hintRect: '拖曳拉出範圍新增框，拖曳編號可移動。鍵盤：在標註區按 Enter 於中央新增，選取標記後方向鍵微調（Shift 加大）、Delete 刪除',
    tool: '標記方式',
    toolPoint: '點',
    toolRect: '框',
    typeLabel: '缺陷類型',
    defaultType: '缺陷',
    mark: (n, type, note) => `第 ${n} 處：${type}${note ? `，${note}` : ''}`,
    added: (n, type) => `已新增第 ${n} 處：${type}`,
    removed: (n) => `已刪除第 ${n} 處`,
    remove: '刪除',
    removeN: (n) => `刪除第 ${n} 處`,
    listLabel: '標記清單',
    count: (n) => `共 ${n} 處`,
    empty: '尚未標記',
    notePlaceholder: '備註',
    noteLabel: (n) => `第 ${n} 處的備註`,
  },
  signature: {
    label: '簽名',
    placeholder: '請在此簽名',
    hint: '用手指、觸控筆或滑鼠簽名',
    undo: '復原上一筆',
    clear: '清除',
    empty: '尚未簽名',
    signed: '已簽名',
    status: (label, state) => `${label}：${state}`,
  },
  numpad: {
    label: '數字鍵盤',
    backspace: '刪除一位',
    clear: '清除',
    confirm: '確定',
    negate: '正負號',
    decimal: '小數點',
    range: (min, max) => `範圍 ${min} – ${max}`,
    min: (min) => `最小 ${min}`,
    max: (max) => `最大 ${max}`,
    below: (min) => `不能小於 ${min}`,
    above: (max) => `不能大於 ${max}`,
    empty: '請輸入數值',
  },
  inputTag: {
    placeholder: '輸入後按 Enter',
    hint: '按 Enter 或逗號加入，Backspace 刪除最後一個',
    max: (n) => `最多 ${n} 個`,
    duplicate: '已經有了',
    added: (items) => `已加入 ${items.join('、')}`,
    rejected: (items) => `未加入 ${items.join('；')}`,
    removed: (item) => `已移除 ${item}`,
    backspaceAgain: (item) => `再按一次 Backspace 移除 ${item}`,
    list: (label, n) => `${label || '標籤'}（${n} 個）`,
    remove: (tag) => `移除 ${tag}`,
    rejectedItem: (v, r) => `${v}：${r}`,
  },
  list: { loadMore: '載入更多' },
  menu: { label: '主選單' },
  modal: {
    label: '對話方塊',
    drag: '拖曳移動',
    minimize: '縮小到口袋',
    maximize: '最大化',
    restore: '還原',
  },
  modalDock: { restore: '還原視窗', close: '關閉視窗' },
  notification: { label: '通知', close: (title) => `關閉通知：${title}` },
  pageSwitcher: { title: '頁面切換', footerHint: '滑鼠移開自動收起' },
  popconfirm: { message: '確定要執行此操作嗎？' },
  progress: { label: '進度' },
  qrcode: {
    generating: '產生中',
    regenerate: '重新產生',
    expired: 'QR Code 已過期',
    tooLong: '內容太長，無法產生 QR Code',
    empty: '沒有內容',
    label: (v) => `QR Code：${v}`,
  },
  rate: { label: '評分', star: (n) => `${n} 星` },
  result: {
    success: '操作成功',
    error: '操作失敗',
    warning: '請注意',
    info: '提示',
    forbidden: '沒有存取權限',
    notFound: '找不到這個頁面',
    serverError: '伺服器發生錯誤',
  },
  splitter: { label: '調整面板大小' },
  statistic: {
    up: (d) => `上升 ${d}`,
    down: (d) => `下降 ${d}`,
    flat: '持平',
    better: '（表現較佳）',
    worse: '（表現較差）',
  },
  steps: { done: '已完成', process: '進行中', pending: '尚未開始', error: '發生錯誤' },
  table: { expand: '展開', row: (n) => `第 ${n} 列`, resize: (title) => `調整「${title}」欄寬`, selectRow: (label) => `選取 ${label}`, summary: '合計', columns: '欄位', columnSettings: '顯示的欄位', resetColumns: '重設' },
  timePicker: { now: '現在', hour: '時', minute: '分', second: '秒', choose: (label) => `選擇${label}`, chooseTime: '選擇時間' },
  toast: { label: '通知訊息', close: '關閉提示' },
  tour: {
    close: '關閉導覽',
    prev: '上一步',
    finish: '完成',
    step: (c, t, title) => `第 ${c} 步，共 ${t} 步：${title}`,
    next: '下一步',
  },
  transfer: {
    source: '可選項目',
    target: '已選項目',
    add: '加入',
    remove: '移除',
    moved: (n, to) => `已將 ${n} 項移到${to}`,
    selectAll: (title) => `全選${title}`,
    search: (title) => `搜尋${title}`,
  },
  upload: {
    drop: '放開以加入檔案',
    dragBefore: '拖曳檔案到這裡，或',
    clickToSelect: '點擊選擇',
    fileList: '已選擇的檔案',
    button: '選擇檔案',
    listSeparator: '、',
    accept: (types) => `格式：${types}`,
    maxSize: (size) => `單檔上限 ${size}`,
    reachedMaxCount: (n) => `已達 ${n} 個檔案上限`,
    maxCount: (n) => `最多 ${n} 個檔案`,
    invalidType: (accept) => `格式不符（允許 ${accept}）`,
    tooLarge: (size) => `超過大小上限 ${size}`,
    tooMany: (n) => `超過 ${n} 個檔案上限`,
    failed: '上傳失敗',
    retry: (name) => `重試上傳 ${name}`,
    cancelUpload: (name) => `取消上傳 ${name}`,
    remove: (name) => `移除 ${name}`,
    progress: (name) => `${name} 上傳進度`,
    hintSeparator: '，',
  },
  image: {
    failed: '圖片無法載入',
    failedWithAlt: (alt) => `${alt}（圖片無法載入）`,
    preview: '放大檢視圖片',
    previewWithAlt: (alt) => `放大檢視：${alt}`,
  },
  tag: {
    close: '關閉標籤',
    closeWithLabel: (label) => `關閉 ${label}`,
  },
  fixedTable: {
    selectAll: '全選',
  },
  treeSelect: {
    options: '選項',
  },
  chart: {
    noData: '沒有資料',
    resetZoom: '重設縮放',
    legend: '圖例',
    legendToggle: '圖例（點選可隱藏或顯示系列）',
    statusLegend: '狀態圖例',
    others: '其他',
    target: '目標',
    mean: '平均',
    total: '總計',
    show: (l) => `顯示 ${l}`,
    hide: (l) => `隱藏 ${l}`,
    titled: (name, text) => `${name}：${text}`,
    empty: (name) => `${name}：沒有資料`,
    records: (n) => `${n} 筆`,
    items: (n) => `${n} 項`,
    othersCount: (label, n) => `${label}（${n} 項）`,
    membersTotal: (n) => `合計 ${n} 項`,
    listSeparator: '、',
    clauseSeparator: '，',
    range: (a, b) => `${a} 到 ${b}`,
    outOfSpec: '超出規格',
    days: (n) => `${n} 天`,
    hours: (n) => `${n} 小時`,
    minutes: (n) => `${n} 分`,
    hoursDecimal: (n) => `${n} 小時`,
    timeFormat: { monthOfYear: '%Y 年 %-m 月', month: '%-m 月', year: '%Y 年' },
    layerTypes: { bar: '長條', 'stacked-bar': '堆疊長條', line: '折線', area: '面積', scatter: '散點', 'trigger-line': '參考線' },
    faceted: '分面圖',
    gridFaceted: '網格分面圖',
    facet: (n) => `分面 ${n}`,
  },
  boxPlot: {
    title: '箱型圖',
    summary: (n, w, iqr) => `${n} 組，四分位距最大的是 ${w}（${iqr}）。可用左右鍵逐組查看`,
    n: '筆數',
    max: '最大',
    median: '中位數',
    min: '最小',
    sd: '標準差',
    iqr: '四分位距',
    outliers: '離群值',
    outlierCount: (n) => `${n} 個`,
    outlierMark: '・離群值',
    group: (n, m, q1, q3, o) => `${n} 筆，中位數 ${m}，Q1 ${q1}，Q3 ${q3}${o ? `，離群值 ${o} 個` : ''}`,
  },
  capability: {
    title: '製程能力直方圖',
    good: '達標',
    warning: '尚可',
    critical: '不足',
    n: '樣本數',
    sigmaOverall: '標準差（整體）',
    sigmaWithin: '標準差（組內）',
    ppmObserved: '規格外 PPM（實際）',
    ppmExpected: '規格外 PPM（預估）',
    summary: (n, mean, cpk, status, ppk) => `${n} 筆，平均 ${mean}，Cpk ${cpk}${status ? `（${status}）` : ''}，Ppk ${ppk}。可用方向鍵逐組查看`,
    bin: (a, b, n, out) => `${a} 到 ${b}：${n} 筆${out ? '，超出規格' : ''}`,
  },
  controlChart: {
    title: (type) => `管制圖（${type}）`,
    types: {
      imr: ['個別值（I）', '移動全距（MR）'],
      'xbar-r': ['平均（X̄）', '全距（R）'],
      'xbar-s': ['平均（X̄）', '標準差（S）'],
      p: ['不良率（p）', ''],
      u: ['單位缺點數（u）', ''],
    },
    rule: (n, text) => `規則 ${n}：${text}`,
    rules: {
      1: '1 點超出管制界限（±3σ）',
      2: '連續 9 點在中心線同一側',
      3: '連續 6 點持續上升或下降',
      4: '連續 14 點上下交錯',
      5: '連續 3 點中有 2 點在同一側的 2σ 之外',
      6: '連續 5 點中有 4 點在同一側的 1σ 之外',
      7: '連續 15 點都在 1σ 之內（變異太小、可能分層）',
      8: '連續 8 點都在 1σ 之外（兩側都有，可能混合）',
    },
    summary: (n, cl, ucl, lcl, out) => `${n} 點，CL ${cl}、UCL ${ucl}、LCL ${lcl}；${out ? `${out} 點異常` : '沒有異常點'}。可用方向鍵逐點查看`,
    sampleSize: (n) => `樣本數：${n}`,
    subgroupSize: (n) => `子組大小：${n}`,
    violations: (rules) => `，異常（規則 ${rules.join('、')}）`,
  },
  pareto: {
    loading: '載入 Pareto 數據...',
    empty: '暫無數據',
    statistics: '統計資訊',
    totalCount: '總數量',
    types: '類型數',
    max: '最大項',
    count: '數量',
    cumulative: '累積百分比',
    cumulativeAxis: '累積百分比 (%)',
    threshold: '閾值',
    thresholdSetting: '閾值設定',
    top3: 'Top3佔比',
  },
  horizontalBar: {
    title: '水平長條圖',
    summary: (n, first, v) => `共 ${n} 項，第一名 ${first} ${v}`,
    rank: (n) => `第 ${n} 名`,
    share: (p) => `佔總數 ${p}`,
  },
  pie: {
    title: '圓餅圖',
  },
  sparkline: {
    title: '趨勢',
    summary: (n, a, b, max, min) => `${n} 筆，從 ${a} 到 ${b}，最高 ${max}，最低 ${min}`,
  },
  gauge: {
    title: '儀表',
  },
  gantt: {
    title: '甘特圖',
    empty: '沒有任務',
    today: '今天',
    help: '拖曳或用方向鍵移動任務；Shift + 方向鍵調整結束時間，Alt + 方向鍵調整開始時間',
    helpRows: '；上下鍵換到別的列',
    helpEnd: '。',
    statuses: { planned: '計畫', running: '進行中', done: '完成', delayed: '延遲' },
    summary: (r, n) => `${r} 列、${n} 筆任務`,
    span: (a, b) => `${a} 至 ${b}`,
    row: '列',
    status: '狀態',
    time: '時間',
    start: '開始',
    end: '結束',
    duration: '工期',
    progress: '進度',
  },
  stateTimeline: {
    title: '機台狀態時間軸',
    states: { run: '運轉', idle: '待機', maintenance: '保養', down: '故障' },
    unknown: '（未知）',
    utilization: '稼動率',
    downtime: '停機',
    good: '達標',
    warning: '尚可',
    critical: '偏低',
    downCount: (d, n) => `${d}（${n} 次）`,
    summary: (n, worst) => `${n} 台機台${worst}。可用上下鍵切換機台、左右鍵逐段查看`,
    worst: (row, pct) => `，稼動率最低的是 ${row}（${pct}）`,
    ongoing: '（仍在進行中）',
    segment: (row, state, range, d) => `${row}，${state}，${range}，共 ${d}`,
  },
  statusScatter: {
    title: '狀態散佈圖',
  },
  waterfall: {
    title: '瀑布圖',
    increase: '增加',
    decrease: '減少',
    startTotal: '起點／合計',
    subtotal: '小計',
    summary: (a, b, big) => `從 ${a} 到 ${b}${big}。可用左右鍵逐項查看`,
    biggest: (l, v) => `，變化最大的是 ${l}（${v}）`,
    shareOfStart: (p) => `佔起點 ${p}`,
    change: (a, b) => `，${a} 到 ${b}`,
  },
  viewer: {
    layers: (n) => `圖層 (${n})`,
    layer: (n) => `圖層 ${n}`,
    shapes: (n) => `${n} 個圖形`,
    zoom: (p) => `縮放: ${p}%`,
    mm: '公厘',
    inch: '英寸',
    zoomIn: '放大',
    zoomOut: '縮小',
    resetView: '重置視角',
    toggleMoves: '切換 D02 移動軌跡顯示',
    retry: '重試',
    loading: '載入中...',
    loadingLayers: (n) => `載入 ${n} 個圖層...`,
    rendering: '渲染圖形...',
    missingSource: '缺少 src 或 gerberText',
    noCoordinates: '無有效 Gerber 座標資料',
    noInput: '請提供 src、gerberText 或 layers 屬性',
    allFailed: '所有圖層均載入失敗',
    notMounted: '容器尚未掛載',
    zeroSize: '容器尺寸為 0，請確認父元素有設定高度',
    gerberBehaviors: { region: 'Region (G36/G37)', draw: '線條 (D01)', flash: '焊盤 (D03)', drill: '鑽孔', slot: '槽孔 (G85)', move: '移動軌跡 (D02)' },
    pcbTypes: { outline: '板框 (Outline)', trace: '走線 (Trace)', pad: '焊盤 (Pad)', via: '過孔 (Via)', region: '銅箔區域 (Region)', silk: '絲印 (Silk)', component: '元件外框 (Component)' },
  },
  excelExporter: {
    button: '匯出 Excel',
    noData: '沒有資料可匯出',
    exportFile: '匯出 Excel 檔案',
    exporting: '匯出中...',
    settings: 'Excel 匯出設定',
    filename: '檔案名稱',
    filenamePlaceholder: '輸入檔案名稱...',
    sheetName: '工作表名稱',
    sheetNamePlaceholder: '輸入工作表名稱...',
    columns: '匯出欄位',
    deselectAll: '取消全選',
    selected: (n, t) => `已選 ${n} / ${t}`,
    confirm: '確認匯出',
  },
  excelUploader: {
    button: '匯入 Excel',
    uploading: '上傳中...',
    notExcel: '檔案格式不是 Excel（僅支援 .xlsx 與 .xls）',
    noSheets: '這個 Excel 檔沒有任何工作表',
    readFailed: '讀取檔案失敗',
  },
  excelEditor: {
    functions: {
      SUM: '加總',
      AVERAGE: '平均',
      MIN: '最小值',
      MAX: '最大值',
      COUNT: '數字個數',
      COUNTA: '非空白個數',
      IF: '條件判斷',
      IFS: '多重條件',
      IFERROR: '錯誤時改用',
      AND: '全部成立',
      OR: '任一成立',
      NOT: '反轉',
      SUMIF: '條件加總',
      SUMIFS: '多條件加總',
      COUNTIF: '條件計數',
      COUNTIFS: '多條件計數',
      AVERAGEIF: '條件平均',
      AVERAGEIFS: '多條件平均',
      VLOOKUP: '垂直查閱',
      HLOOKUP: '水平查閱',
      XLOOKUP: '查閱',
      INDEX: '依位置取值',
      MATCH: '找出位置',
      ROUND: '四捨五入',
      ROUNDUP: '無條件進位',
      ROUNDDOWN: '無條件捨去',
      INT: '取整數',
      ABS: '絕對值',
      MOD: '餘數',
      SUMPRODUCT: '乘積加總',
      MEDIAN: '中位數',
      LARGE: '第 k 大',
      SMALL: '第 k 小',
      RANK: '排名',
      LEN: '字元數',
      LEFT: '左邊字元',
      RIGHT: '右邊字元',
      MID: '中間字元',
      TRIM: '去除多餘空白',
      UPPER: '轉大寫',
      LOWER: '轉小寫',
      CONCAT: '串接文字',
      TEXTJOIN: '以分隔符號串接',
      SUBSTITUTE: '取代文字',
      FIND: '尋找（分大小寫）',
      SEARCH: '尋找（不分大小寫）',
      TEXT: '數字轉格式文字',
      VALUE: '文字轉數字',
      ISBLANK: '是否空白',
      ISNUMBER: '是否為數字',
      ISERROR: '是否為錯誤',
      TODAY: '今天的日期',
      NOW: '現在的日期與時間',
      DATE: '年月日組成日期',
      TIME: '時分秒組成時間',
      YEAR: '取出年',
      MONTH: '取出月',
      DAY: '取出日',
      WEEKDAY: '星期幾',
      WEEKNUM: '一年中的第幾週',
      EDATE: '幾個月後的同一天',
      EOMONTH: '幾個月後的月底',
      DATEDIF: '兩個日期相差（年 / 月 / 日）',
      DAYS: '相差天數',
      NETWORKDAYS: '工作天數（排除週末與假日）',
      WORKDAY: '幾個工作天後的日期',
      DATEVALUE: '日期文字轉日期',
    },
    title: 'Excel 編輯器',
    undo: '復原 (Ctrl+Z)',
    redo: '重做 (Ctrl+Y)',
    cut: '剪下 (Ctrl+X)',
    copy: '複製 (Ctrl+C)',
    paste: '貼上 (Ctrl+V)',
    bold: '粗體 (Ctrl+B)',
    italic: '斜體 (Ctrl+I)',
    underline: '底線 (Ctrl+U)',
    alignLeft: '靠左',
    alignCenter: '置中',
    alignRight: '靠右',
    insertRow: '上方插入列',
    insertRowShort: '↑列',
    insertColumn: '左側插入欄',
    insertColumnShort: '+欄',
    deleteRow: '刪除列',
    deleteRowShort: '−列',
    deleteColumn: '刪除欄',
    deleteColumnShort: '−欄',
    merge: '合併儲存格',
    sortAsc: '依選取範圍升冪排序',
    sortDesc: '依選取範圍降冪排序',
    clear: '清除選取內容 (Delete)',
    freeze: '凍結到目前儲存格左上方',
    freezeShort: '凍結',
    unfreeze: '取消凍結',
    unfreezeShort: '解凍',
    applyFormat: '套用數字格式',
    numberFormat: '數字格式',
    activeCell: '目前儲存格',
    insertFunction: '插入函式',
    formulaPlaceholder: '輸入數值或公式，如 =SUM(A1:A3)',
    chooseFunction: '選擇函式',
    addSheet: '新增工作表',
    removeSheet: '刪除工作表',
    formats: { general: '一般格式', integer: '整數', decimal2: '小數 2 位', thousands: '千分位整數', thousandsDecimal: '千分位小數', percent: '百分比整數', percentDecimal: '百分比小數', date: '日期', dateTime: '日期時間', time: '時間' },
  },
  chartFrame: {
    export: '匯出',
    exporting: '匯出中…',
    png: '下載 PNG 圖片',
    svg: '下載 SVG 向量圖',
    csv: '下載 CSV 資料',
    exportFailed: '匯出失敗，請再試一次',
    error: '圖表載入失敗',
    retry: '重試',
  },
  kpiCard: {
    good: '達標',
    warning: '接近目標',
    critical: '未達標',
    target: (v) => `目標 ${v}`,
    trend: (title, label) => `${title}趨勢${label ? `（${label}）` : ''}`,
  },
  scanInput: {
    placeholder: '掃描或輸入條碼',
    submit: '送出',
    ok: (v) => `已掃描 ${v}`,
    duplicateWarn: (v) => `${v} 已經掃過（仍已加入）`,
    duplicate: (v) => `重複：${v} 已經掃過`,
    invalid: (v) => `格式不符：${v}`,
    tooShort: (n) => `條碼至少 ${n} 碼`,
    manualNotAllowed: '請使用掃描器，不接受手動輸入',
    imeHint: '偵測到中文輸入法：掃描前請切換為英數輸入，否則條碼會被輸入法吃掉',
    history: '掃描紀錄',
    historyCount: (n) => `掃描紀錄（${n}）`,
    clearHistory: '清除紀錄',
    scanner: '掃描',
    manual: '手動',
    status: { ok: '已接受', duplicate: '重複（已接受）', rejected: '已拒絕' },
  },
  formList: {
    add: '新增一列',
    empty: '尚無資料，按「新增一列」加入',
    item: (label, n) => `${label ? `${label} ` : ''}第 ${n} 筆`,
    remove: (n) => `刪除第 ${n} 筆`,
    moveUp: (n) => `第 ${n} 筆上移`,
    moveDown: (n) => `第 ${n} 筆下移`,
    added: (n) => `已新增第 ${n} 筆`,
    removed: (n) => `已刪除第 ${n} 筆`,
    moved: (a, b) => `第 ${a} 筆已移到第 ${b} 筆`,
    max: (n) => `最多 ${n} 筆`,
  },
  schemaForm: {
    submit: '送出',
    reset: '重設',
    requiredSelect: (label) => `請選擇${label}`,
  },
  waferMap: {
    yieldLabel: '良率',
    yieldCount: (pass, total) => `（${pass.toLocaleString()} / ${total.toLocaleString()} 顆）`,
    ringYield: '分區良率',
    ring: (i, n) => (i === 1 ? '中心' : i === n ? '外圈' : `第 ${i} 圈`),
    coord: (x, y) => `座標 (${x}, ${y})`,
    bin: 'Bin',
    value: '數值',
    pass: '良品',
    empty: '沒有晶粒資料',
    legend: 'Bin 圖例（點一下淡化 / 恢復）',
    ariaLabel: (total, yieldText) => `晶圓圖，${total.toLocaleString()} 顆晶粒${yieldText ? `，良率 ${yieldText}` : ''}。方向鍵逐顆移動，Enter 選取`,
  },
  bullet: {
    title: '子彈圖',
    target: (value) => `目標 ${value}`,
  },
  sankey: {
    title: '流向圖',
    empty: '沒有資料',
    source: '來源',
    target: '去向',
    value: '數量',
    inflow: (v) => `流入 ${v}`,
    outflow: (v) => `流出 ${v}`,
    share: (source, pct) => `佔 ${source} 流出的 ${pct}`,
  },
  scatter: {
    title: '散佈圖',
    empty: '沒有資料',
    legend: '分類',
    point: '資料點',
    all: '全部',
    group: '分組',
    equation: '迴歸式',
    clearSelection: '取消選取',
    selected: (n, mx, my) => `已選取 ${n} 點（平均 ${mx}，${my}）`,
    axisTitle: (label, unit) => (label && unit ? `${label}（${unit}）` : label || unit),
    fitText: (g, eq, r2, n) => `${g ? `${g}：` : ''}${eq}，R² = ${r2}，n = ${n}`,
    tipLine: (name, value) => `${name}：${value}`,
    statsCaption: (title) => `${title}的迴歸統計`,
    ariaLabel: (title, n, x, y, fits) => `${title}：${n} 個點，X 軸 ${x}、Y 軸 ${y}${fits.length ? `；${fits.join('、')}` : ''}`,
  },
  treemap: {
    title: '矩形樹圖',
    empty: '沒有資料',
    breadcrumb: '目前位置',
    hint: '點方塊往下一層、點上方路徑回上層；鍵盤方向鍵移動、Enter 往下、Esc 回上層',
    name: '名稱',
    value: '數量',
    share: '佔比',
    metric: '指標',
    center: (v) => `中心 ${v}`,
    drillable: (n) => `有 ${n} 項，可往下看`,
    valueShare: (v, share) => `${v}（${share}）`,
    metricLine: (label, v) => `${label}：${v}`,
    ariaLabel: (title, path, n, total) => `${title}：${path}，${n} 項，合計 ${total}。數值見下方資料表`,
  },
  parallel: {
    title: '平行座標圖',
    empty: '沒有資料（至少要兩條軸）',
    selected: (n, total) => (n === total ? `共 ${total} 筆` : `選到 ${n} / ${total} 筆`),
    clear: '清除框選',
    hint: '在軸上拖曳框選範圍、拖動框選區平移、點一下軸清除；拖曳軸名稱換位置（鍵盤：←→ 換位置、Delete 清除框選）',
    axis: (label, lo, hi, b) => `${label}，範圍 ${lo} 到 ${hi}${b ? `，${b}` : ''}`,
    brushed: (lo, hi) => `已框選 ${lo} 到 ${hi}`,
    row: (n) => `第 ${n} 筆`,
    value: (name, v) => `${name}：${v}`,
    ariaLabel: (title, axes, n, sel) => `${title}：${axes.join('、')}，${n} 筆資料${sel < n ? `，框選後 ${sel} 筆` : ''}`,
  },
  correlation: {
    title: '相關矩陣',
    empty: '沒有資料（至少要兩個參數）',
    method: '相關係數',
    pearson: 'Pearson（線性）',
    spearman: 'Spearman（等級）',
    cluster: '依相關性排序',
    faded: (alpha) => `淡色：不顯著（p ≥ ${alpha}）`,
    self: (name) => `${name}（自己）`,
    noData: (a, b, n) => `${a} 與 ${b}：資料不足（n = ${n}）`,
    cell: (a, b, r, n, p, sig) => `${a} 與 ${b}：r = ${r}，n = ${n}，p ${String(p).startsWith('<') ? p : `= ${p}`}${sig ? '' : '（不顯著）'}`,
    pair: (x, y) => `${y} 對 ${x}`,
    closePair: '關閉',
  },
  radar: {
    title: '雷達圖',
    empty: '沒有資料',
    legend: '圖例（點選顯示 / 隱藏）',
    metric: '指標',
    lowerIsBetterLabel: (label) => `${label}（越小越好）`,
    point: (axis, value) => `${axis}：${value}`,
    ariaLabel: (title, axes, series) => `${title}：比較 ${series.join('、')} 的 ${axes.join('、')}。數值見下方資料表`,
  },
  calendarHeatmap: {
    legend: '圖例',
    less: '少',
    more: '多',
    noData: '無資料',
    range: (from, to) => (from === null && to === null ? '全部' : from === null ? `小於 ${to}` : to === null ? `${from} 以上` : `${from} – ${to}`),
    cell: (date, value) => `${date}：${value}`,
    ariaLabel: (title, start, end, days) => `${title || '日曆熱圖'}：${start} 至 ${end}，${days} 天有資料。方向鍵逐日移動`,
  },
  funnel: {
    title: '良率漏斗',
    rty: '直通率',
    stepYield: '站良率',
    cumulative: '累計',
    loss: (n) => `損失 ${n}`,
    worst: '最大損失',
    empty: '沒有資料',
  },
  commandPalette: {
    title: '指令面板',
    placeholder: '搜尋指令或頁面…',
    empty: '找不到符合的指令',
    recent: '最近使用',
    results: (n) => `${n} 個結果`,
    navigate: '選擇',
    run: '執行',
    close: '關閉',
  },
  dashboardGrid: {
    label: '儀表板',
    drag: (title) => `移動或調整「${title}」：方向鍵移動、Shift + 方向鍵調整大小`,
    resize: (title) => `調整「${title}」的大小`,
    moved: (title, x, y) => `「${title}」移到第 ${x} 欄、第 ${y} 列`,
    resized: (title, w, h) => `「${title}」大小 ${w} × ${h}`,
    untitled: '區塊',
  },
  kanban: {
    label: '看板',
    empty: '沒有卡片',
    overLimit: (limit) => `超過在製上限 ${limit}`,
    help: '空白鍵拿起卡片，方向鍵移動，再按空白鍵放下；Escape 取消；Enter 開啟',
    grabbed: (title, column, pos, total) => `已拿起「${title}」：「${column}」第 ${pos} 張，共 ${total} 張`,
    moved: (title, column, pos, total) => `「${title}」：「${column}」第 ${pos} 張，共 ${total} 張`,
    dropped: (title, column, pos) => `「${title}」已放到「${column}」第 ${pos} 張`,
    cancelled: (title) => `取消移動「${title}」`,
    blocked: (title, column) => `「${title}」不能移到「${column}」`,
    card: '卡片',
  },
  richText: {
    toolbar: '格式工具列',
    placeholder: '輸入內容…',
    bold: '粗體',
    italic: '斜體',
    underline: '底線',
    strike: '刪除線',
    heading: (level) => `標題 ${level}`,
    bulletList: '項目清單',
    orderedList: '編號清單',
    blockquote: '引用',
    codeBlock: '程式碼區塊',
    link: '連結',
    linkUrl: '連結網址',
    apply: '套用',
    unlink: '移除連結',
    invalidUrl: '只接受 http、https 或 mailto 開頭的網址',
    undo: '復原',
    redo: '重做',
    clear: '清除格式',
    count: (n, max) => (max ? `${n} / ${max} 字` : `${n} 字`),
    overLimit: (max) => `超過 ${max} 字`,
  },
  barcode: {
    label: (value) => `條碼：${value}`,
    empty: '沒有內容',
    invalid: (chars) => `含有無法編碼的字元：${chars}`,
  },
  cameraScanner: {
    title: '相機掃碼',
    starting: '正在開啟相機…',
    hint: '把條碼或 QR Code 對準框內',
    hintQrOnly: '把 QR Code 對準框內（這個瀏覽器只能讀 QR Code）',
    scanned: (value) => `已掃到 ${value}`,
    start: '開啟相機',
    stop: '關閉相機',
    switchCamera: '切換鏡頭',
    retry: '重試',
    stopped: '相機已關閉',
    errors: {
      denied: '沒有相機權限：請在瀏覽器的網站設定允許這個網頁使用相機',
      notFound: '找不到相機',
      inUse: '相機正被其他程式使用，請先關閉該程式',
      insecure: '相機只能在 HTTPS（或 localhost）的網頁使用',
      unsupported: '這個瀏覽器不支援相機掃碼',
      unknown: '無法開啟相機',
    },
  },
}

export const enUS: ChptLocale = {
  code: 'en-US',
  empty: 'No data',
  loading: 'Loading',
  searchPlaceholder: 'Search…',
  noData: 'No data',
  selectedCount: (n) => `${n} selected`,
  clear: 'Clear',
  selectPage: 'Select all on this page',
  select: 'Select',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  pagination: {
    nav: 'Pagination',
    navTop: 'Pagination (top)',
    navBottom: 'Pagination (bottom)',
    prev: 'Previous page',
    next: 'Next page',
    first: 'First page',
    last: 'Last page',
    page: (n) => `Page ${n}`,
    current: 'Current page',
    perPageBefore: 'Show',
    perPageAfter: 'per page',
    perPageLabel: 'Items per page',
    pageSizeOption: (n) => `${n} / page`,
    total: (n) => `${n} items`,
    range: (a, b, t) => `Showing ${a}–${b} of ${t}`,
  },

  common: {
    close: 'Close',
    confirm: 'OK',
    cancel: 'Cancel',
    search: 'Search',
    searchEllipsis: 'Search…',
    pleaseSelect: 'Select',
    noData: 'No data',
    loadingEllipsis: 'Loading…',
    selectAll: 'Select all',
    all: 'All',
    prev: 'Previous',
    next: 'Next',
    count: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    noMatch: 'No matching items',
    pleaseSelectEllipsis: 'Select…',
  },

  validation: {
    field: 'This field',
    required: (label) => `${label} is required`,
    failed: 'Validation failed',
    email: 'Invalid email address',
    url: 'Invalid URL (must start with http:// or https://)',
    number: 'Please enter a number',
    integer: 'Please enter a whole number',
    minItems: (n) => `Select at least ${n}`,
    minLength: (n) => `At least ${n} characters`,
    minValue: (n) => `Must be at least ${n}`,
    maxItems: (n) => `Select at most ${n}`,
    maxLength: (n) => `At most ${n} characters`,
    maxValue: (n) => `Must be at most ${n}`,
    pattern: 'Invalid format',
  },

  confirm: { ok: 'Got it', requireBefore: 'Type', requireAfter: 'to confirm' },

  alert: { close: 'Dismiss' },
  anchor: { label: 'On this page' },
  autocomplete: {
    empty: 'No matching suggestions',
    count: (n) => `${n} ${n === 1 ? 'suggestion' : 'suggestions'}, use up and down arrows to choose`,
    label: 'Suggestions',
  },
  avatar: { fallback: 'User' },
  backTop: { label: 'Back to top' },
  calendar: {
    today: 'Today',
    prevYear: 'Previous year',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    nextYear: 'Next year',
    weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthTitle: (y, m) => `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`,
    fullDate: (y, m, d, w) => `${w}, ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${d}, ${y}`,
  },
  carousel: { prev: 'Previous slide', next: 'Next slide', pause: 'Pause autoplay', play: 'Start autoplay', slide: (n) => `Slide ${n}` },
  cascader: {
    hasChildren: '(has submenu)',
    level: (n) => `Level ${n}`,
    choose: (label) => `Choose ${label}`,
    chooseItem: 'Choose an item',
  },
  codeBlock: { tipTitle: 'Note', label: 'Code', labelWithLang: (lang) => `${lang} code`, colon: ': ' },
  colorPicker: {
    custom: 'Custom color',
    hex: 'Hex',
    presets: 'Preset colors',
    clearColor: 'Clear color',
    invalidHex: 'Enter #RGB or #RRGGBB',
    choose: (label) => `Choose ${label}`,
    chooseColor: 'Choose color',
    unset: 'Not set',
  },
  copy: { copy: 'Copy', copied: 'Copied', copySubject: (s) => `Copy: ${s}`, copiedSubject: (s) => `Copied: ${s}`, failed: 'Copy failed' },
  countdown: {
    finished: "Time's up",
    days: (n) => `${n} ${n === 1 ? 'day' : 'days'}`,
    hours: (n) => `${n} ${n === 1 ? 'hour' : 'hours'}`,
    minutes: (n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`,
    seconds: (n) => `${n} ${n === 1 ? 'second' : 'seconds'}`,
    remaining: (parts) => `${parts} remaining`,
    titled: (title, spoken) => `${title}: ${spoken}`,
  },
  darkMode: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    followSystem: 'Use system setting',
  },
  dataTooltip: { clickToClose: 'Click to close' },
  datePicker: { placeholder: 'Select date', presets: { today: 'Today', yesterday: 'Yesterday', thisWeek: 'This week', lastWeek: 'Last week', last7Days: 'Last 7 days', last30Days: 'Last 30 days', thisMonth: 'This month', lastMonth: 'Last month', thisQuarter: 'This quarter', thisYear: 'This year' }, currentShift: (name) => `Current shift (${name})`, previousShift: (name) => `Previous shift (${name})`, dayShift: 'Day', nightShift: 'Night' },
  drawer: { label: 'Side panel' },
  ellipsis: { expand: 'More', collapse: 'Less' },
  filter: {
    clearAll: 'Clear filters',
    noOptions: 'No options',
    clear: 'Clear',
    selected: (n) => `${n} selected`,
    label: 'Filter',
  },
  filterBar: { countLabel: '', totalBefore: 'Total', totalAfter: '' },
  logout: {
    label: 'Sign out',
    loading: 'Signing out…',
    title: 'Sign out',
    confirmMessage: 'Are you sure you want to sign out?',
  },
  imageViewer: {
    label: 'Image viewer',
    labelWithAlt: (alt) => `Image viewer: ${alt}`,
    closeHint: 'Close (Esc)',
    thumbnails: 'Thumbnails',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    reset: 'Reset',
    rotate: 'Rotate',
    item: (n, alt) => `Image ${n}${alt ? `: ${alt}` : ''}`,
  },
  inputNumber: { decrease: 'Decrease', increase: 'Increase' },
  storage: {
    search: 'Search bins, parts, lots',
    searchPlaceholder: 'Search bin / part / name / lot',
    found: (n) => (Number(n) ? `${n} bin${Number(n) === 1 ? '' : 's'} found` : 'No match'),
    prevHit: 'Previous',
    nextHit: 'Next',
    colorBy: 'Color by',
    modes: { utilization: 'Utilization', item: 'Part', expiry: 'Expiry' },
    used: (used, total) => `${used} / ${total} bins in use`,
    utilization: (pct) => `${pct} full`,
    expiredCount: (n) => `${n} expired`,
    soonCount: (n, days) => `${n} expiring within ${days} days`,
    blockedCount: (n) => `${n} blocked`,
    legend: 'Legend',
    empty: 'Empty',
    filled: 'In use (height = utilization)',
    over: 'Over capacity',
    others: 'Others',
    expiryState: { ok: 'In date', soon: 'Expiring soon', expired: 'Expired' },
    mixed: (n) => `${n} parts`,
    daysShort: (days) => (Number(days) <= 0 ? 'Exp.' : `${days}d`),
    levelShort: (level) => `L${level}`,
    cellLabel: (parts) => parts.join(', '),
    noBins: 'No bins',
    detail: 'Bin details',
    pickBin: 'Select a bin to see its stock',
    where: (zone, rack, level, position) => `${zone} · ${rack} · level ${level}, position ${position}`,
    blocked: 'Blocked',
    capacity: 'Capacity',
    capacityUsage: (qty, capacity, pct) => `${qty} / ${capacity} (${pct})`,
    lot: (lot) => `Lot ${lot}`,
    expiredAgo: (days) => (Number(days) <= 0 ? 'Expires today' : `Expired ${days} days ago`),
    expiresIn: (days) => `Expires in ${days} days`,
    emptyBin: 'Empty bin',
    move: 'Move',
    moveOne: (item) => `Move ${item}`,
    moveAll: 'Move all',
    pickTarget: (what) => `Moving ${what}: select the target bin (Esc to cancel), or drag it there`,
    cancel: 'Cancel',
    moved: (to) => `Moved to ${to}`,
    reject: {
      blocked: (to) => `${to} is blocked`,
      overCapacity: (to) => `${to} does not have enough room`,
      unknown: (to) => `Bin ${to} not found`,
    },
  },
  workInstruction: {
    label: 'Work instruction',
    progress: (n, total) => `Step ${n} of ${total}`,
    progressLabel: 'Progress',
    stepsLabel: 'Steps',
    total: (time) => `Total ${time}`,
    stepTime: (time) => `This step ${time}`,
    stepButton: (n, title, done) => `Step ${n}: ${title}${done ? ' (done)' : ''}`,
    caution: 'Caution',
    pass: 'Pass',
    fail: 'Out of spec',
    range: (lo, hi) => `Spec ${lo} – ${hi}`,
    min: (lo) => `At least ${lo}`,
    max: (hi) => `At most ${hi}`,
    prev: 'Previous',
    next: 'Next',
    finish: 'Finish',
    finished: 'All done',
    doneTitle: (time) => `All done in ${time}`,
    restart: 'Start over',
    block: { confirm: 'Please confirm first', measure: 'Please enter the measurement', outOfSpec: 'Measurement is out of spec', wait: (s) => `Please review for ${s} more seconds` },
    sep: '; ',
    announceStep: (n, title) => `Step ${n}: ${title}`,
    hint: 'Swipe left or right on a tablet; keyboard ← → or PageUp / PageDown',
  },
  andon: {
    type: { maintenance: 'Maintenance', material: 'Material', quality: 'Quality', supervisor: 'Supervisor' },
    normal: 'Normal',
    calling: 'Calling',
    handling: 'In progress',
    waiting: (by) => `Waiting for response${by ? ` (called by ${by})` : ''}`,
    responding: (who) => (who ? `${who} is handling it` : 'Being handled'),
    respond: 'Respond',
    resolve: 'Resolve',
    raise: (station, type) => `${station}: call ${type}`,
    raiseFor: (station) => `Call buttons for ${station}`,
    stationNormal: (station) => `${station}: normal`,
    stationCalls: (station, calls) => `${station}: ${calls.join('; ')}`,
    callLabel: (type, state, time) => `${type} ${String(state).toLowerCase()} ${time}`,
    newCall: (station, type) => `${station} called ${type}`,
    escalated: (station, type) => `${type} call at ${station} is overdue`,
    mute: 'Mute',
    unmute: 'Unmute',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
  },
  pivot: {
    label: 'Pivot table',
    configure: 'Fields',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    heatmap: 'Heat',
    exportCsv: 'Export CSV',
    summary: (records, rows, cols) => `${records.toLocaleString()} records · ${rows} rows${cols ? ` × ${cols} columns` : ''}`,
    zone: { available: 'Fields', rows: 'Rows', cols: 'Columns', values: 'Values' },
    zoneShort: { rows: 'Row', cols: 'Col', values: 'Val' },
    dropHere: 'Drop fields here',
    addTo: (field, zone) => `Add "${field}" to ${zone}`,
    aggFor: (field) => `Aggregation for "${field}"`,
    moveEarlier: (field) => `Move "${field}" earlier`,
    moveLater: (field) => `Move "${field}" later`,
    remove: (field) => `Remove "${field}"`,
    agg: { sum: 'Sum', avg: 'Average', count: 'Count', min: 'Min', max: 'Max', countDistinct: 'Distinct count' },
    valueLabel: (agg, field) => `${agg} of ${field}`,
    total: 'Total',
    grandTotal: 'Grand total',
    blank: '(blank)',
    noValues: 'Drag a field to "Values" to start',
    empty: 'No data',
  },
  timeScrubber: {
    label: 'Timeline playback',
    play: 'Play',
    pause: 'Pause',
    prevEvent: 'Previous event',
    nextEvent: 'Next event',
    speed: 'Playback speed',
    speedOption: (x) => `${x}×`,
    playhead: 'Current time',
    rangeStart: 'Range start',
    rangeEnd: 'Range end',
    range: (from, to) => `Range ${from} – ${to}`,
    clearRange: 'Show all',
    eventLabel: (time, label) => `${time} ${label}`,
    hint: 'Drag or click the track to seek, drag the end handles to focus on a range; on the playhead use ←→ (Shift for bigger steps), PageUp / PageDown for events, Space to play',
  },
  approval: {
    label: 'Approval flow',
    flow: { approved: 'Approved', rejected: 'Rejected', 'in-progress': 'In progress' },
    submitted: (who, time) => `${who ? `Submitted by ${who}` : 'Submitted'} on ${time}`,
    elapsed: (d) => `in progress for ${d}`,
    total: (d) => `took ${d} in total`,
    mode: { single: 'Single', all: 'All must approve', any: 'Any one approves' },
    step: { approved: 'Approved', rejected: 'Rejected', current: 'In review', upcoming: 'Not started', cancelled: 'Not needed' },
    waiting: (d) => `waiting ${d}`,
    took: (d) => `took ${d}`,
    overdue: (h) => `Overdue (${h} h SLA)`,
    delegatedTo: (name) => `${name} (delegate)`,
    approver: { approved: 'Approved', rejected: 'Rejected', pending: 'Pending', waiting: 'Not yet', skipped: 'Not needed' },
    yourTurn: 'Your approval is needed',
    actOnBehalf: (name) => `Acting on behalf of ${name}`,
    comment: 'Comment',
    commentPlaceholder: 'Optional when approving; required when rejecting',
    approve: 'Approve',
    reject: 'Reject',
    delegate: 'Delegate',
    delegatePick: 'Delegate to:',
    rejectNeedsComment: 'Please give a reason for rejecting',
    approvedAnnounce: 'Approved',
    rejectedAnnounce: 'Rejected',
    delegatedAnnounce: (name) => `Delegated to ${name}`,
  },
  diffViewer: {
    label: 'Parameter comparison',
    filterLabel: 'Filter by status',
    status: { changed: 'Changed', added: 'Added', removed: 'Removed', within: 'Within tolerance', same: 'Same' },
    onlyDiff: 'Differences only',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    search: 'Search parameter or value',
    param: 'Parameter',
    left: 'Reference',
    right: 'Compared',
    diff: 'Difference',
    groupChanges: (n) => `${n} difference${n === 1 ? '' : 's'}`,
    empty: 'No parameters',
    noDiff: 'Both sides are identical',
    noMatch: 'No matching parameters',
  },
  imageCompare: {
    label: 'Image comparison',
    before: 'Reference',
    after: 'Sample',
    modeLabel: 'Compare mode',
    mode: { slider: 'Slider', side: 'Side by side', overlay: 'Overlay' },
    opacity: 'Opacity',
    difference: 'Difference',
    diffTag: (b, a) => `Difference: ${b} vs ${a}`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to view',
    divider: 'Divider position',
    loadError: (name) => `${name} image failed to load`,
    hint: 'Drag to move the divider, double-click to zoom / reset, Ctrl + wheel or pinch to zoom, drag to pan when zoomed; keys + / − / 0 zoom, arrows pan',
  },
  alarm: {
    label: 'Alarms',
    filterLabel: 'Filter by severity',
    viewLabel: 'Show',
    view: { open: 'Open', unacked: 'Unacked', shelved: 'Shelved', all: 'All' },
    severity: { critical: 'Critical', major: 'Major', minor: 'Minor', info: 'Info' },
    state: { unacked: 'Unacked', acked: 'Acked', shelved: 'Shelved', closed: 'Closed' },
    search: 'Search message, code, source',
    empty: 'No alarms',
    noMatch: 'No matching alarms',
    ack: 'Ack',
    ackAll: (n) => (n ? `Ack all (${n})` : 'Ack all'),
    shelve: 'Shelve',
    shelveFor: (m) => (m >= 60 && m % 60 === 0 ? `Shelve ${m / 60} h` : `Shelve ${m} min`),
    cancel: 'Cancel',
    unshelve: 'Unshelve',
    escalate: 'Escalate',
    escalatedN: (n) => (n > 1 ? `Escalated ×${n}` : 'Escalated'),
    cleared: 'Cleared',
    mute: 'Mute',
    unmute: 'Unmute',
    since: (d) => `${d} ago`,
    raisedAt: (time) => `Raised: ${time}`,
    ackedBy: (who, time) => `Acked: ${who ? `${who}, ` : ''}${time}`,
    clearedAt: (time) => `Cleared: ${time}`,
    shelvedUntil: (time) => `Shelved until: ${time}`,
    ackedN: (n) => `Acknowledged ${n} alarm${n === 1 ? '' : 's'}`,
    shelvedN: (n, m) => `Shelved ${n} alarm${n === 1 ? '' : 's'} for ${m} min`,
    escalatedAnnounce: (n) => `Escalated ${n} alarm${n === 1 ? '' : 's'}`,
    newAlarm: (sev, src, title, n) => `New ${String(sev).toLowerCase()} alarm: ${src ? `${src} ` : ''}${title}${n > 1 ? `, and ${n - 1} more` : ''}`,
    hint: '↑↓ move, A ack, S shelve, E escalate, Enter details',
  },
  shiftRoster: {
    label: 'Shift roster',
    mode: 'Editing mode',
    fill: 'Fill',
    swap: 'Swap',
    brush: 'Shift to fill',
    clear: 'Clear',
    person: 'Person',
    stats: 'Stats',
    none: 'Unassigned',
    workDays: (n) => `${n} work days`,
    coverageLabel: (date, shift, have, need) => (need ? `${date} ${shift}: ${have} of ${need}${have < need ? ', short' : ''}` : `${date} ${shift}: ${have}`),
    restWarning: (name, date, hours) => `${name} ${date}: only ${hours} h since the previous shift`,
    consecutiveWarning: (name, date, days) => `${name} ${date}: ${days} days in a row`,
    allGood: 'Fully staffed, no rule warnings',
    summary: (short, warn) => [short ? `${short} short` : '', warn ? `${warn} rule warning(s)` : ''].filter(Boolean).join(' · '),
    more: (n) => `${n} more`,
    hintFill: 'Pick a shift, then click cells; drag to fill a range, Shift + click to fill from the last cell. Keyboard: arrows to move, shift key or Space to fill, Delete to clear',
    hintSwap: 'Drag a cell onto another person on the same day to swap. Keyboard: Space to pick up, Up/Down to move, Space to drop, Esc to cancel',
    assigned: (name, date, shift) => `${name} ${date}: ${shift}`,
    filled: (name, from, to, shift) => `${name} ${from} to ${to}: ${shift}`,
    swapped: (a, b, date) => `${date}: swapped ${a} and ${b}`,
    picked: (name, date) => `Picked up ${name} ${date}; move up or down and press Space to swap`,
    cancelled: 'Cancelled',
  },
  floorPlan: {
    label: 'Floor plan',
    hint: 'Ctrl + wheel or pinch to zoom, drag to pan; Tab in, then arrow keys to move and Enter for details',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to view',
    close: 'Close details',
  },
  logViewer: {
    label: 'Log',
    levels: 'Filter by level',
    level: { debug: 'Debug', info: 'Info', warn: 'Warn', error: 'Error', fatal: 'Fatal' },
    search: 'Search log',
    searchPlaceholder: 'Search… (/regex/i)',
    regexError: (msg) => `Invalid regex, searching as plain text: ${msg}`,
    follow: 'Follow latest',
    paused: 'Following paused (scroll to the bottom to resume)',
    copy: 'Copy',
    copyOne: 'Copy entry',
    download: 'Download',
    copied: (n) => `Copied ${n} ${n === 1 ? 'entry' : 'entries'}`,
    copyFailed: "Couldn't copy (clipboard access was blocked)",
    empty: 'No entries yet',
    noMatch: 'No matching entries',
    newEntries: (n) => `${n} new`,
    showing: (shown, total) => `Showing ${shown.toLocaleString()} of ${total.toLocaleString()}`,
    announce: (n, message) => (n > 1 ? `${n} new errors, latest: ${message}` : `New error: ${message}`),
  },
  lotTrace: {
    direction: 'Trace direction',
    backward: 'Upstream',
    both: 'Both',
    forward: 'Downstream',
    view: 'View',
    graph: 'Graph',
    list: 'List',
    search: 'Search lots',
    upstream: 'Upstream (what went in)',
    downstream: 'Downstream (what it became)',
    legend: 'Kinds',
    hold: 'Hold',
    suspect: 'Suspect',
    repeat: '(cycle, shown above)',
    root: 'Queried lot',
    upLevel: (n) => `Upstream level ${n}`,
    downLevel: (n) => `Downstream level ${n}`,
    graphLabel: (root) => `Trace graph of ${root}`,
    summary: (up, down, hold) => `${up} upstream, ${down} downstream lots${hold ? `, ${hold} on hold` : ''}`,
  },
  checklist: {
    status: { ok: 'OK', ng: 'NG', na: 'N/A' },
    progress: (done, total) => `${done} / ${total} done`,
    progressLabel: 'Checklist progress',
    ngCount: (n) => `${n} NG`,
    naCount: (n) => `${n} N/A`,
    filterLabel: 'Show items',
    filterAll: 'All',
    filterTodo: 'To do',
    filterNg: 'NG',
    required: 'Required',
    requiredSr: '(required)',
    value: 'Value',
    spec: (range) => `Spec ${range}`,
    specWithTarget: (range, target) => `Spec ${range} (target ${target})`,
    inSpec: 'In spec',
    outOfSpec: 'Out of spec',
    numpadFor: (label) => `Enter with number pad: ${label}`,
    ngReason: 'NG reason / action',
    note: 'Note',
    notePlaceholder: 'e.g. Belt worn, maintenance notified',
    addPhoto: 'Take / add photo',
    photoAlt: (label, n) => `Photo ${n} of ${label}`,
    removePhoto: (label, n) => `Remove photo ${n} of ${label}`,
    missing: 'Not filled in',
    noteRequired: 'NG items need a reason',
    allDone: 'All done',
    noNg: 'No NG items',
    issues: (n) => `${n} item(s) need attention`,
  },
  equipment: {
    status: { run: 'Running', idle: 'Idle', maintenance: 'Maintenance', down: 'Down', offline: 'Offline' },
    filterLabel: 'Filter by status',
    search: 'Search machine, work order, part',
    avgUtilization: 'Avg. utilization',
    empty: 'No machines match',
    ungrouped: 'Ungrouped',
    since: (status, duration) => `${status} for ${duration}`,
    duration: (d, h, m) => (d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m} min` : 'under 1 min'),
    workOrder: 'WO',
    utilization: 'Utilization',
    changed: (name, status, alarm) => `${name} ${status}${alarm ? `: ${alarm}` : ''}`,
    separator: '; ',
  },
  defect: {
    regionLabel: 'Defect annotation area',
    regionWithAlt: (alt) => `Defect annotation area: ${alt}`,
    hint: 'Click to add a mark, drag a mark to move it. Keyboard: press Enter in the area to add one at the center; with a mark selected, arrow keys nudge it (Shift for larger steps) and Delete removes it',
    hintRect: 'Drag to draw a box, drag a number to move it. Keyboard: press Enter in the area to add one at the center; with a mark selected, arrow keys nudge it (Shift for larger steps) and Delete removes it',
    tool: 'Marking tool',
    toolPoint: 'Point',
    toolRect: 'Box',
    typeLabel: 'Defect type',
    defaultType: 'Defect',
    mark: (n, type, note) => `#${n}: ${type}${note ? `, ${note}` : ''}`,
    added: (n, type) => `Added #${n}: ${type}`,
    removed: (n) => `Removed #${n}`,
    remove: 'Remove',
    removeN: (n) => `Remove #${n}`,
    listLabel: 'Marks',
    count: (n) => `${n} total`,
    empty: 'No marks yet',
    notePlaceholder: 'Note',
    noteLabel: (n) => `Note for #${n}`,
  },
  signature: {
    label: 'Signature',
    placeholder: 'Sign here',
    hint: 'Sign with your finger, a stylus or the mouse',
    undo: 'Undo last stroke',
    clear: 'Clear',
    empty: 'Not signed',
    signed: 'Signed',
    status: (label, state) => `${label}: ${state}`,
  },
  numpad: {
    label: 'Number pad',
    backspace: 'Delete last digit',
    clear: 'Clear',
    confirm: 'OK',
    negate: 'Plus/minus',
    decimal: 'Decimal point',
    range: (min, max) => `Range ${min} – ${max}`,
    min: (min) => `Min ${min}`,
    max: (max) => `Max ${max}`,
    below: (min) => `Must be at least ${min}`,
    above: (max) => `Must be at most ${max}`,
    empty: 'Enter a value',
  },
  inputTag: {
    placeholder: 'Type and press Enter',
    hint: 'Press Enter or comma to add, Backspace to remove the last one',
    max: (n) => `At most ${n}`,
    duplicate: 'Already added',
    added: (items) => `Added ${items.join(', ')}`,
    rejected: (items) => `Not added: ${items.join('; ')}`,
    removed: (item) => `Removed ${item}`,
    backspaceAgain: (item) => `Press Backspace again to remove ${item}`,
    list: (label, n) => `${label || 'Tags'} (${n})`,
    remove: (tag) => `Remove ${tag}`,
    rejectedItem: (v, r) => `${v}: ${r}`,
  },
  list: { loadMore: 'Load more' },
  menu: { label: 'Main menu' },
  modal: {
    label: 'Dialog',
    drag: 'Drag to move',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
  },
  modalDock: { restore: 'Restore window', close: 'Close window' },
  notification: { label: 'Notifications', close: (title) => `Dismiss notification: ${title}` },
  pageSwitcher: { title: 'Switch page', footerHint: 'Closes when the pointer leaves' },
  popconfirm: { message: 'Are you sure?' },
  progress: { label: 'Progress' },
  qrcode: {
    generating: 'Generating',
    regenerate: 'Regenerate',
    expired: 'QR code expired',
    tooLong: 'Content is too long for a QR code',
    empty: 'No content',
    label: (v) => `QR code: ${v}`,
  },
  rate: { label: 'Rating', star: (n) => `${n} ${n === 1 ? 'star' : 'stars'}` },
  result: {
    success: 'Success',
    error: 'Failed',
    warning: 'Warning',
    info: 'Information',
    forbidden: 'Access denied',
    notFound: 'Page not found',
    serverError: 'Server error',
  },
  splitter: { label: 'Resize panels' },
  statistic: {
    up: (d) => `up ${d}`,
    down: (d) => `down ${d}`,
    flat: 'unchanged',
    better: ' (better)',
    worse: ' (worse)',
  },
  steps: { done: 'Completed', process: 'In progress', pending: 'Not started', error: 'Error' },
  table: { expand: 'Expand', row: (n) => `Row ${n}`, resize: (title) => `Resize column "${title}"`, selectRow: (label) => `Select ${label}`, summary: 'Total', columns: 'Columns', columnSettings: 'Visible columns', resetColumns: 'Reset' },
  timePicker: { now: 'Now', hour: 'Hour', minute: 'Minute', second: 'Second', choose: (label) => `Choose ${label}`, chooseTime: 'Choose time' },
  toast: { label: 'Notifications', close: 'Dismiss' },
  tour: {
    close: 'Close tour',
    prev: 'Back',
    finish: 'Done',
    step: (c, t, title) => `Step ${c} of ${t}: ${title}`,
    next: 'Next',
  },
  transfer: {
    source: 'Available',
    target: 'Selected',
    add: 'Add',
    remove: 'Remove',
    moved: (n, to) => `Moved ${n} ${n === 1 ? 'item' : 'items'} to ${to}`,
    selectAll: (title) => `Select all ${title}`,
    search: (title) => `Search ${title}`,
  },
  upload: {
    drop: 'Drop to add files',
    dragBefore: 'Drag files here, or ',
    clickToSelect: 'click to select',
    fileList: 'Selected files',
    button: 'Choose files',
    listSeparator: ', ',
    accept: (types) => `Formats: ${types}`,
    maxSize: (size) => `Max ${size} per file`,
    reachedMaxCount: (n) => `Reached the limit of ${n} files`,
    maxCount: (n) => `Up to ${n} files`,
    invalidType: (accept) => `Unsupported format (allowed: ${accept})`,
    tooLarge: (size) => `Exceeds the ${size} limit`,
    tooMany: (n) => `Exceeds the limit of ${n} files`,
    failed: 'Upload failed',
    retry: (name) => `Retry uploading ${name}`,
    cancelUpload: (name) => `Cancel uploading ${name}`,
    remove: (name) => `Remove ${name}`,
    progress: (name) => `${name} upload progress`,
    hintSeparator: '; ',
  },
  image: {
    failed: 'Image failed to load',
    failedWithAlt: (alt) => `${alt} (failed to load)`,
    preview: 'View larger image',
    previewWithAlt: (alt) => `View larger: ${alt}`,
  },
  tag: {
    close: 'Remove tag',
    closeWithLabel: (label) => `Remove ${label}`,
  },
  fixedTable: {
    selectAll: 'Select all',
  },
  treeSelect: {
    options: 'Options',
  },
  chart: {
    noData: 'No data',
    resetZoom: 'Reset zoom',
    legend: 'Legend',
    legendToggle: 'Legend (click to show or hide a series)',
    statusLegend: 'Status legend',
    others: 'Other',
    target: 'Target',
    mean: 'Mean',
    total: 'Total',
    show: (l) => `Show ${l}`,
    hide: (l) => `Hide ${l}`,
    titled: (name, text) => `${name}: ${text}`,
    empty: (name) => `${name}: no data`,
    records: (n) => `${n} ${n === 1 ? 'record' : 'records'}`,
    items: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    othersCount: (label, n) => `${label} (${n})`,
    membersTotal: (n) => `${n} items combined`,
    listSeparator: ', ',
    clauseSeparator: ', ',
    range: (a, b) => `${a} to ${b}`,
    outOfSpec: 'Out of spec',
    days: (n) => `${n}d`,
    hours: (n) => `${n}h`,
    minutes: (n) => `${n}m`,
    hoursDecimal: (n) => `${n}h`,
    timeFormat: { monthOfYear: '%B %Y', month: '%b', year: '%Y' },
    layerTypes: { bar: 'Bar', 'stacked-bar': 'Stacked bar', line: 'Line', area: 'Area', scatter: 'Scatter', 'trigger-line': 'Reference line' },
    faceted: 'Faceted chart',
    gridFaceted: 'Grid faceted chart',
    facet: (n) => `Facet ${n}`,
  },
  boxPlot: {
    title: 'Box plot',
    summary: (n, w, iqr) => `${n} groups, widest IQR is ${w} (${iqr}). Use left and right arrows to step through groups`,
    n: 'Count',
    max: 'Max',
    median: 'Median',
    min: 'Min',
    sd: 'Std dev',
    iqr: 'IQR',
    outliers: 'Outliers',
    outlierCount: (n) => `${n}`,
    outlierMark: ' · outlier',
    group: (n, m, q1, q3, o) => `${n} records, median ${m}, Q1 ${q1}, Q3 ${q3}${o ? `, ${o} outliers` : ''}`,
  },
  capability: {
    title: 'Process capability histogram',
    good: 'Capable',
    warning: 'Marginal',
    critical: 'Not capable',
    n: 'Samples',
    sigmaOverall: 'Std dev (overall)',
    sigmaWithin: 'Std dev (within)',
    ppmObserved: 'PPM out of spec (observed)',
    ppmExpected: 'PPM out of spec (expected)',
    summary: (n, mean, cpk, status, ppk) => `${n} records, mean ${mean}, Cpk ${cpk}${status ? ` (${status})` : ''}, Ppk ${ppk}. Use arrow keys to step through bins`,
    bin: (a, b, n, out) => `${a} to ${b}: ${n} records${out ? ', out of spec' : ''}`,
  },
  controlChart: {
    title: (type) => `Control chart (${type})`,
    types: {
      imr: ['Individual (I)', 'Moving range (MR)'],
      'xbar-r': ['Mean (X̄)', 'Range (R)'],
      'xbar-s': ['Mean (X̄)', 'Std dev (S)'],
      p: ['Proportion defective (p)', ''],
      u: ['Defects per unit (u)', ''],
    },
    rule: (n, text) => `Rule ${n}: ${text}`,
    rules: {
      1: '1 point beyond the control limits (±3σ)',
      2: '9 points in a row on the same side of the center line',
      3: '6 points in a row steadily increasing or decreasing',
      4: '14 points in a row alternating up and down',
      5: '2 of 3 points in a row beyond 2σ on the same side',
      6: '4 of 5 points in a row beyond 1σ on the same side',
      7: '15 points in a row within 1σ (too little variation, possible stratification)',
      8: '8 points in a row beyond 1σ on both sides (possible mixture)',
    },
    summary: (n, cl, ucl, lcl, out) => `${n} points, CL ${cl}, UCL ${ucl}, LCL ${lcl}; ${out ? `${out} out of control` : 'no out-of-control points'}. Use arrow keys to step through points`,
    sampleSize: (n) => `Sample size: ${n}`,
    subgroupSize: (n) => `Subgroup size: ${n}`,
    violations: (rules) => `, out of control (rules ${rules.join(', ')})`,
  },
  pareto: {
    loading: 'Loading Pareto data…',
    empty: 'No data',
    statistics: 'Statistics',
    totalCount: 'Total',
    types: 'Categories',
    max: 'Largest',
    count: 'Count',
    cumulative: 'Cumulative %',
    cumulativeAxis: 'Cumulative (%)',
    threshold: 'threshold',
    thresholdSetting: 'Threshold',
    top3: 'Top 3 share',
  },
  horizontalBar: {
    title: 'Horizontal bar chart',
    summary: (n, first, v) => `${n} items, first is ${first} ${v}`,
    rank: (n) => `Rank ${n}`,
    share: (p) => `${p} of total`,
  },
  pie: {
    title: 'Pie chart',
  },
  sparkline: {
    title: 'Trend',
    summary: (n, a, b, max, min) => `${n} values, from ${a} to ${b}, high ${max}, low ${min}`,
  },
  gauge: {
    title: 'Gauge',
  },
  gantt: {
    title: 'Gantt chart',
    empty: 'No tasks',
    today: 'Today',
    help: 'Drag or use arrow keys to move a task; Shift + arrows changes the end, Alt + arrows changes the start',
    helpRows: '; up and down arrows move it to another row',
    helpEnd: '.',
    statuses: { planned: 'Planned', running: 'In progress', done: 'Done', delayed: 'Delayed' },
    summary: (r, n) => `${r} rows, ${n} tasks`,
    span: (a, b) => `${a} to ${b}`,
    row: 'Row',
    status: 'Status',
    time: 'Time',
    start: 'Start',
    end: 'End',
    duration: 'Duration',
    progress: 'Progress',
  },
  stateTimeline: {
    title: 'Machine state timeline',
    states: { run: 'Running', idle: 'Idle', maintenance: 'Maintenance', down: 'Down' },
    unknown: '(unknown)',
    utilization: 'Utilization',
    downtime: 'Downtime',
    good: 'On target',
    warning: 'Fair',
    critical: 'Low',
    downCount: (d, n) => `${d} (${n}×)`,
    summary: (n, worst) => `${n} machines${worst}. Use up and down arrows to switch machines, left and right to step through segments`,
    worst: (row, pct) => `, lowest utilization is ${row} (${pct})`,
    ongoing: '(ongoing)',
    segment: (row, state, range, d) => `${row}, ${state}, ${range}, ${d} total`,
  },
  statusScatter: {
    title: 'Status scatter map',
  },
  waterfall: {
    title: 'Waterfall chart',
    increase: 'Increase',
    decrease: 'Decrease',
    startTotal: 'Start / total',
    subtotal: 'Subtotal',
    summary: (a, b, big) => `from ${a} to ${b}${big}. Use left and right arrows to step through items`,
    biggest: (l, v) => `, largest change is ${l} (${v})`,
    shareOfStart: (p) => `${p} of start`,
    change: (a, b) => `, ${a} to ${b}`,
  },
  viewer: {
    layers: (n) => `Layers (${n})`,
    layer: (n) => `Layer ${n}`,
    shapes: (n) => `${n} shapes`,
    zoom: (p) => `Zoom: ${p}%`,
    mm: 'mm',
    inch: 'in',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    toggleMoves: 'Toggle D02 move paths',
    retry: 'Retry',
    loading: 'Loading…',
    loadingLayers: (n) => `Loading ${n} layers…`,
    rendering: 'Rendering…',
    missingSource: 'Missing src or gerberText',
    noCoordinates: 'No valid Gerber coordinates',
    noInput: 'Provide src, gerberText or layers',
    allFailed: 'All layers failed to load',
    notMounted: 'Container is not mounted yet',
    zeroSize: 'Container has zero size; make sure the parent has a height',
    gerberBehaviors: { region: 'Region (G36/G37)', draw: 'Draw (D01)', flash: 'Flash (D03)', drill: 'Drill', slot: 'Slot (G85)', move: 'Move path (D02)' },
    pcbTypes: { outline: 'Outline', trace: 'Trace', pad: 'Pad', via: 'Via', region: 'Region', silk: 'Silkscreen', component: 'Component outline' },
  },
  excelExporter: {
    button: 'Export Excel',
    noData: 'No data to export',
    exportFile: 'Export to an Excel file',
    exporting: 'Exporting…',
    settings: 'Excel export settings',
    filename: 'File name',
    filenamePlaceholder: 'Enter a file name…',
    sheetName: 'Sheet name',
    sheetNamePlaceholder: 'Enter a sheet name…',
    columns: 'Columns to export',
    deselectAll: 'Deselect all',
    selected: (n, t) => `${n} of ${t} selected`,
    confirm: 'Export',
  },
  excelUploader: {
    button: 'Import Excel',
    uploading: 'Uploading…',
    notExcel: 'Not an Excel file (only .xlsx and .xls are supported)',
    noSheets: 'This Excel file has no sheets',
    readFailed: 'Failed to read the file',
  },
  excelEditor: {
    functions: {
      SUM: 'Add numbers',
      AVERAGE: 'Average',
      MIN: 'Smallest value',
      MAX: 'Largest value',
      COUNT: 'Count numbers',
      COUNTA: 'Count non-empty cells',
      IF: 'Conditional value',
      IFS: 'Multiple conditions',
      IFERROR: 'Fallback on error',
      AND: 'All conditions true',
      OR: 'Any condition true',
      NOT: 'Negate',
      SUMIF: 'Sum with a condition',
      SUMIFS: 'Sum with multiple conditions',
      COUNTIF: 'Count with a condition',
      COUNTIFS: 'Count with multiple conditions',
      AVERAGEIF: 'Average with a condition',
      AVERAGEIFS: 'Average with multiple conditions',
      VLOOKUP: 'Vertical lookup',
      HLOOKUP: 'Horizontal lookup',
      XLOOKUP: 'Lookup',
      INDEX: 'Value at a position',
      MATCH: 'Position of a value',
      ROUND: 'Round',
      ROUNDUP: 'Round up',
      ROUNDDOWN: 'Round down',
      INT: 'Integer part',
      ABS: 'Absolute value',
      MOD: 'Remainder',
      SUMPRODUCT: 'Sum of products',
      MEDIAN: 'Median',
      LARGE: 'k-th largest',
      SMALL: 'k-th smallest',
      RANK: 'Rank',
      LEN: 'Text length',
      LEFT: 'Leftmost characters',
      RIGHT: 'Rightmost characters',
      MID: 'Characters from the middle',
      TRIM: 'Remove extra spaces',
      UPPER: 'To upper case',
      LOWER: 'To lower case',
      CONCAT: 'Join text',
      TEXTJOIN: 'Join text with a delimiter',
      SUBSTITUTE: 'Replace text',
      FIND: 'Find (case-sensitive)',
      SEARCH: 'Find (case-insensitive)',
      TEXT: 'Format a number as text',
      VALUE: 'Text to number',
      ISBLANK: 'Is blank',
      ISNUMBER: 'Is a number',
      ISERROR: 'Is an error',
      TODAY: "Today's date",
      NOW: 'Current date and time',
      DATE: 'Date from year, month, day',
      TIME: 'Time from hour, minute, second',
      YEAR: 'Year of a date',
      MONTH: 'Month of a date',
      DAY: 'Day of a date',
      WEEKDAY: 'Day of the week',
      WEEKNUM: 'Week number of the year',
      EDATE: 'Same day N months later',
      EOMONTH: 'Month end N months later',
      DATEDIF: 'Difference between dates (Y / M / D)',
      DAYS: 'Days between dates',
      NETWORKDAYS: 'Working days (excluding weekends and holidays)',
      WORKDAY: 'Date N working days later',
      DATEVALUE: 'Text to date',
    },
    title: 'Excel editor',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    cut: 'Cut (Ctrl+X)',
    copy: 'Copy (Ctrl+C)',
    paste: 'Paste (Ctrl+V)',
    bold: 'Bold (Ctrl+B)',
    italic: 'Italic (Ctrl+I)',
    underline: 'Underline (Ctrl+U)',
    alignLeft: 'Align left',
    alignCenter: 'Center',
    alignRight: 'Align right',
    insertRow: 'Insert row above',
    insertRowShort: '↑Row',
    insertColumn: 'Insert column to the left',
    insertColumnShort: '+Col',
    deleteRow: 'Delete row',
    deleteRowShort: '−Row',
    deleteColumn: 'Delete column',
    deleteColumnShort: '−Col',
    merge: 'Merge cells',
    sortAsc: 'Sort selection ascending',
    sortDesc: 'Sort selection descending',
    clear: 'Clear selection (Delete)',
    freeze: 'Freeze panes above and left of the active cell',
    freezeShort: 'Freeze',
    unfreeze: 'Unfreeze panes',
    unfreezeShort: 'Unfreeze',
    applyFormat: 'Apply number format',
    numberFormat: 'Number format',
    activeCell: 'Active cell',
    insertFunction: 'Insert function',
    formulaPlaceholder: 'Enter a value or formula, e.g. =SUM(A1:A3)',
    chooseFunction: 'Choose a function',
    addSheet: 'Add sheet',
    removeSheet: 'Delete sheet',
    formats: { general: 'General', integer: 'Integer', decimal2: '2 decimals', thousands: 'Thousands separator', thousandsDecimal: 'Thousands separator, 2 decimals', percent: 'Percent', percentDecimal: 'Percent, 2 decimals', date: 'Date', dateTime: 'Date and time', time: 'Time' },
  },
  chartFrame: {
    export: 'Export',
    exporting: 'Exporting…',
    png: 'Download PNG image',
    svg: 'Download SVG vector',
    csv: 'Download CSV data',
    exportFailed: 'Export failed. Please try again.',
    error: 'Failed to load the chart',
    retry: 'Retry',
  },
  kpiCard: {
    good: 'On target',
    warning: 'Near target',
    critical: 'Off target',
    target: (v) => `Target ${v}`,
    trend: (title, label) => `${title} trend${label ? ` (${label})` : ''}`,
  },
  scanInput: {
    placeholder: 'Scan or type a barcode',
    submit: 'Submit',
    ok: (v) => `Scanned ${v}`,
    duplicateWarn: (v) => `${v} was already scanned (added anyway)`,
    duplicate: (v) => `Duplicate: ${v} was already scanned`,
    invalid: (v) => `Invalid format: ${v}`,
    tooShort: (n) => `Barcode must be at least ${n} characters`,
    manualNotAllowed: 'Please use the scanner; manual entry is not accepted',
    imeHint: 'An input method editor is active: switch to direct (English) input before scanning, or the barcode will be swallowed',
    history: 'Scan history',
    historyCount: (n) => `Scan history (${n})`,
    clearHistory: 'Clear history',
    scanner: 'Scan',
    manual: 'Manual',
    status: { ok: 'Accepted', duplicate: 'Duplicate (accepted)', rejected: 'Rejected' },
  },
  formList: {
    add: 'Add row',
    empty: 'No rows yet. Use “Add row” to add one.',
    item: (label, n) => `${label ? `${label} ` : ''}row ${n}`,
    remove: (n) => `Remove row ${n}`,
    moveUp: (n) => `Move row ${n} up`,
    moveDown: (n) => `Move row ${n} down`,
    added: (n) => `Added row ${n}`,
    removed: (n) => `Removed row ${n}`,
    moved: (a, b) => `Moved row ${a} to ${b}`,
    max: (n) => `Up to ${n} rows`,
  },
  schemaForm: {
    submit: 'Submit',
    reset: 'Reset',
    requiredSelect: (label) => `Please select ${label}`,
  },
  waferMap: {
    yieldLabel: 'Yield',
    yieldCount: (pass, total) => `(${pass.toLocaleString()} / ${total.toLocaleString()} dies)`,
    ringYield: 'Yield by zone',
    ring: (i, n) => (i === 1 ? 'Center' : i === n ? 'Edge' : `Ring ${i}`),
    coord: (x, y) => `Die (${x}, ${y})`,
    bin: 'Bin',
    value: 'Value',
    pass: 'Pass',
    empty: 'No die data',
    legend: 'Bin legend (click to dim / restore)',
    ariaLabel: (total, yieldText) => `Wafer map, ${total.toLocaleString()} dies${yieldText ? `, yield ${yieldText}` : ''}. Use arrow keys to move between dies, Enter to select`,
  },
  bullet: {
    title: 'Bullet chart',
    target: (value) => `target ${value}`,
  },
  sankey: {
    title: 'Flow chart',
    empty: 'No data',
    source: 'From',
    target: 'To',
    value: 'Amount',
    inflow: (v) => `In ${v}`,
    outflow: (v) => `Out ${v}`,
    share: (source, pct) => `${pct} of ${source} outflow`,
  },
  scatter: {
    title: 'Scatter plot',
    empty: 'No data',
    legend: 'Categories',
    point: 'Point',
    all: 'All',
    group: 'Group',
    equation: 'Equation',
    clearSelection: 'Clear selection',
    selected: (n, mx, my) => `${n} point${n === 1 ? '' : 's'} selected (mean ${mx}, ${my})`,
    axisTitle: (label, unit) => (label && unit ? `${label} (${unit})` : label || unit),
    fitText: (g, eq, r2, n) => `${g ? `${g}: ` : ''}${eq}, R² = ${r2}, n = ${n}`,
    tipLine: (name, value) => `${name}: ${value}`,
    statsCaption: (title) => `${title} regression statistics`,
    ariaLabel: (title, n, x, y, fits) => `${title}: ${n} points, X axis ${x}, Y axis ${y}${fits.length ? `; ${fits.join(', ')}` : ''}`,
  },
  treemap: {
    title: 'Treemap',
    empty: 'No data',
    breadcrumb: 'Current level',
    hint: 'Click a tile to drill down, the path above to go back; arrow keys move, Enter drills down, Esc goes up',
    name: 'Name',
    value: 'Value',
    share: 'Share',
    metric: 'Metric',
    center: (v) => `center ${v}`,
    drillable: (n) => `${n} item${n === 1 ? '' : 's'} inside, can drill down`,
    valueShare: (v, share) => `${v} (${share})`,
    metricLine: (label, v) => `${label}: ${v}`,
    ariaLabel: (title, path, n, total) => `${title}: ${path}, ${n} items, total ${total}. Values in the table below`,
  },
  parallel: {
    title: 'Parallel coordinates',
    empty: 'No data (at least two axes are needed)',
    selected: (n, total) => (n === total ? `${total} rows` : `${n} of ${total} rows selected`),
    clear: 'Clear brushes',
    hint: 'Drag on an axis to brush a range, drag the brush to move it, click an axis to clear; drag an axis title to reorder (keyboard: ←→ reorder, Delete clears)',
    axis: (label, lo, hi, b) => `${label}, range ${lo} to ${hi}${b ? `, ${b}` : ''}`,
    brushed: (lo, hi) => `brushed ${lo} to ${hi}`,
    row: (n) => `Row ${n}`,
    value: (name, v) => `${name}: ${v}`,
    ariaLabel: (title, axes, n, sel) => `${title}: ${axes.join(', ')}, ${n} rows${sel < n ? `, ${sel} after brushing` : ''}`,
  },
  correlation: {
    title: 'Correlation matrix',
    empty: 'No data (at least two parameters are needed)',
    method: 'Coefficient',
    pearson: 'Pearson (linear)',
    spearman: 'Spearman (rank)',
    cluster: 'Order by correlation',
    faded: (alpha) => `Faded: not significant (p ≥ ${alpha})`,
    self: (name) => `${name} (itself)`,
    noData: (a, b, n) => `${a} and ${b}: not enough data (n = ${n})`,
    cell: (a, b, r, n, p, sig) => `${a} and ${b}: r = ${r}, n = ${n}, p ${String(p).startsWith('<') ? p : `= ${p}`}${sig ? '' : ' (not significant)'}`,
    pair: (x, y) => `${y} vs ${x}`,
    closePair: 'Close',
  },
  radar: {
    title: 'Radar chart',
    empty: 'No data',
    legend: 'Legend (click to show / hide)',
    metric: 'Metric',
    lowerIsBetterLabel: (label) => `${label} (lower is better)`,
    point: (axis, value) => `${axis}: ${value}`,
    ariaLabel: (title, axes, series) => `${title}: comparing ${series.join(', ')} on ${axes.join(', ')}. Values are in the table below`,
  },
  calendarHeatmap: {
    legend: 'Legend',
    less: 'Less',
    more: 'More',
    noData: 'No data',
    range: (from, to) => (from === null && to === null ? 'All' : from === null ? `Below ${to}` : to === null ? `${from} and above` : `${from} – ${to}`),
    cell: (date, value) => `${date}: ${value}`,
    ariaLabel: (title, start, end, days) => `${title || 'Calendar heatmap'}: ${start} to ${end}, ${days} days with data. Use arrow keys to move between days`,
  },
  funnel: {
    title: 'Yield funnel',
    rty: 'Rolled throughput yield',
    stepYield: 'Step yield',
    cumulative: 'Cumulative',
    loss: (n) => `${n} lost`,
    worst: 'Largest loss',
    empty: 'No data',
  },
  commandPalette: {
    title: 'Command palette',
    placeholder: 'Search commands or pages…',
    empty: 'No matching commands',
    recent: 'Recent',
    results: (n) => `${n} result${n === 1 ? '' : 's'}`,
    navigate: 'navigate',
    run: 'run',
    close: 'close',
  },
  dashboardGrid: {
    label: 'Dashboard',
    drag: (title) => `Move or resize "${title}": arrow keys to move, Shift + arrow keys to resize`,
    resize: (title) => `Resize "${title}"`,
    moved: (title, x, y) => `"${title}" moved to column ${x}, row ${y}`,
    resized: (title, w, h) => `"${title}" resized to ${w} × ${h}`,
    untitled: 'Widget',
  },
  kanban: {
    label: 'Board',
    empty: 'No cards',
    overLimit: (limit) => `Over WIP limit of ${limit}`,
    help: 'Press Space to pick up, arrow keys to move, Space again to drop, Escape to cancel, Enter to open',
    grabbed: (title, column, pos, total) => `Picked up ${title}: ${column}, position ${pos} of ${total}`,
    moved: (title, column, pos, total) => `${title}: ${column}, position ${pos} of ${total}`,
    dropped: (title, column, pos) => `${title} dropped in ${column}, position ${pos}`,
    cancelled: (title) => `Move of ${title} cancelled`,
    blocked: (title, column) => `${title} can't be moved to ${column}`,
    card: 'Card',
  },
  richText: {
    toolbar: 'Formatting',
    placeholder: 'Start typing…',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    heading: (level) => `Heading ${level}`,
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    link: 'Link',
    linkUrl: 'Link URL',
    apply: 'Apply',
    unlink: 'Remove link',
    invalidUrl: 'Only http, https or mailto URLs are allowed',
    undo: 'Undo',
    redo: 'Redo',
    clear: 'Clear formatting',
    count: (n, max) => (max ? `${n} / ${max} characters` : `${n} characters`),
    overLimit: (max) => `Over the ${max}-character limit`,
  },
  barcode: {
    label: (value) => `Barcode: ${value}`,
    empty: 'No value',
    invalid: (chars) => `Contains characters that can't be encoded: ${chars}`,
  },
  cameraScanner: {
    title: 'Camera scanner',
    starting: 'Starting camera…',
    hint: 'Point the camera at a barcode or QR code',
    hintQrOnly: 'Point the camera at a QR code (this browser can only read QR codes)',
    scanned: (value) => `Scanned ${value}`,
    start: 'Start camera',
    stop: 'Stop camera',
    switchCamera: 'Switch camera',
    retry: 'Try again',
    stopped: 'Camera is off',
    errors: {
      denied: 'Camera permission denied: allow camera access for this site in your browser settings',
      notFound: 'No camera found',
      inUse: 'The camera is being used by another app',
      insecure: 'The camera only works on HTTPS (or localhost) pages',
      unsupported: "This browser doesn't support camera scanning",
      unknown: "Couldn't start the camera",
    },
  },
}

// ===== 部分覆寫 =====

type Fn = (...args: never[]) => unknown

/** 巢狀的 Partial：群組可以只給部分欄位；函式與陣列整個替換 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Fn ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** 給 ChptConfigProvider 的 locale：可以是完整語系，也可以只覆寫部分文字 */
export type ChptLocaleInput = DeepPartial<ChptLocale>

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * 把覆寫合併進基底語系（不修改兩者）。
 * 群組逐層合併 —— 只給 `{ modal: { close: 'X' } }` 時，modal 其他欄位沿用基底，
 * 而不是整個 modal 群組被換成只剩一個欄位（淺合併會讓其他文字變成 undefined）。
 */
export function mergeLocale(base: ChptLocale, override: ChptLocaleInput | undefined): ChptLocale {
  if (!override) return base
  const merge = (a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...a }
    for (const [k, v] of Object.entries(b)) {
      if (v === undefined) continue
      out[k] = isPlainObject(v) && isPlainObject(a[k]) ? merge(a[k] as Record<string, unknown>, v) : v
    }
    return out
  }
  return merge(base as unknown as Record<string, unknown>, override as Record<string, unknown>) as unknown as ChptLocale
}
