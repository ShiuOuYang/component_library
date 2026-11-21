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
