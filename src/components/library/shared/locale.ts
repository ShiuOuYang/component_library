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
  datePicker: { placeholder: string }
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
  datePicker: { placeholder: '選擇日期' },
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
  table: { expand: '展開', row: (n) => `第 ${n} 列`, resize: (title) => `調整「${title}」欄寬`, selectRow: (label) => `選取 ${label}` },
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
  datePicker: { placeholder: 'Select date' },
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
  table: { expand: 'Expand', row: (n) => `Row ${n}`, resize: (title) => `Resize column "${title}"`, selectRow: (label) => `Select ${label}` },
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
