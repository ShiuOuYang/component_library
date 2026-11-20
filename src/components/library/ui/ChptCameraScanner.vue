<template>
  <div class="chpt-camera-scanner flex flex-col gap-2" role="region" :aria-label="t.cameraScanner.title">
    <div
      class="relative overflow-hidden rounded-lg bg-black"
      :style="{ aspectRatio: props.aspectRatio, width: props.width ? `${props.width}px` : '100%' }"
    >
      <video ref="video" class="h-full w-full object-cover" muted playsinline aria-hidden="true"></video>

      <!-- 對準框：四個角 + 掃描線 -->
      <div v-if="props.viewfinder && state === 'scanning'" class="pointer-events-none absolute inset-[12%] rounded-md" aria-hidden="true">
        <span class="corner left-0 top-0 border-l-4 border-t-4"></span>
        <span class="corner right-0 top-0 border-r-4 border-t-4"></span>
        <span class="corner bottom-0 left-0 border-b-4 border-l-4"></span>
        <span class="corner bottom-0 right-0 border-b-4 border-r-4"></span>
        <span class="scan-line"></span>
      </div>

      <!-- 掃到時閃一下 -->
      <div v-if="flash" class="pointer-events-none absolute inset-0 bg-success/30" aria-hidden="true"></div>

      <!-- 開啟中、關閉、錯誤 -->
      <div v-if="state !== 'scanning'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-white">
        <template v-if="state === 'starting'">
          <span class="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          <span>{{ t.cameraScanner.starting }}</span>
        </template>
        <template v-else-if="state === 'error'">
          <span class="material-symbols-outlined text-3xl" aria-hidden="true">videocam_off</span>
          <span role="alert">{{ t.cameraScanner.errors[errorKind] }}</span>
          <ChptButton v-if="errorKind !== 'insecure' && errorKind !== 'unsupported'" size="sm" @click="start">{{ t.cameraScanner.retry }}</ChptButton>
        </template>
        <template v-else>
          <span class="material-symbols-outlined text-3xl" aria-hidden="true">photo_camera</span>
          <span>{{ t.cameraScanner.stopped }}</span>
          <ChptButton size="sm" @click="start">{{ t.cameraScanner.start }}</ChptButton>
        </template>
      </div>

      <!-- 切換鏡頭 -->
      <button
        v-if="state === 'scanning' && cameras.length > 1"
        type="button"
        class="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        :aria-label="t.cameraScanner.switchCamera"
        :title="t.cameraScanner.switchCamera"
        @click="switchCamera"
      >
        <span class="material-symbols-outlined text-xl" aria-hidden="true">cameraswitch</span>
      </button>
    </div>

    <div class="flex items-center justify-between gap-2 text-xs text-content-secondary">
      <span v-if="state === 'scanning'">{{ qrOnly ? t.cameraScanner.hintQrOnly : t.cameraScanner.hint }}</span>
      <span v-else></span>
      <ChptButton v-if="state === 'scanning' || state === 'starting'" size="xs" is-outline @click="stop">{{ t.cameraScanner.stop }}</ChptButton>
    </div>
    <p v-if="lastScan" class="truncate rounded-md bg-success-subtle px-2 py-1 font-mono text-sm text-success-on-subtle">{{ lastScan }}</p>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import {
  beep,
  cameraAvailability,
  classifyCameraError,
  createDeduper,
  createDetector,
  type CameraErrorKind,
  type CodeDetector,
  type DetectedCode,
  type ScanFormat,
} from '../shared/cameraScan'
import { useLocale } from '../shared/config'

/**
 * ChptCameraScanner（CHPT 主題） - 用相機掃 QR Code / 條碼
 *
 * 平板、手機上沒有掃描槍時用鏡頭掃：巡檢、盤點、領料。
 * （有掃描槍的工作站請用 ChptScanInput：掃描槍其實是鍵盤，更快也更準。）
 *
 * - 優先用瀏覽器內建的 BarcodeDetector（QR 與各種一維條碼）；沒有時退回 jsQR（只能讀 QR Code，會提示使用者）
 * - 同一個碼對著鏡頭時不會一直重複觸發（dedupeMs 內只算一次）
 * - 掃到時嗶一聲、震動、畫面閃一下，並以 aria-live 念出內容
 * - 相機權限被拒、找不到相機、被其他程式占用、不是 HTTPS 時各有說明與重試
 * - active=false、元件卸載或分頁切到背景時關閉相機（手機的相機燈不會一直亮著）
 */

interface ChptCameraScannerProps {
  /** 開啟相機（false 時關閉）；continuous=false 掃到一次後會送出 update:active false */
  active?: boolean
  /** 要讀的格式（BarcodeDetector 的命名） */
  formats?: ScanFormat[]
  /** 優先用哪一顆鏡頭：environment 後鏡頭、user 前鏡頭 */
  facingMode?: 'environment' | 'user'
  /** 連續掃描；false 時掃到一次就停 */
  continuous?: boolean
  /** 同一個內容在這段時間內只算一次（毫秒） */
  dedupeMs?: number
  /** 每隔幾毫秒解碼一次 */
  interval?: number
  /** 掃到時的回饋 */
  feedback?: 'both' | 'beep' | 'vibrate' | 'none'
  /** 畫面比例（CSS aspect-ratio） */
  aspectRatio?: string
  /** 固定寬度（px）；不給時填滿容器 */
  width?: number
  /** 顯示對準框 */
  viewfinder?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptCameraScannerProps>(), {
  active: true,
  formats: () => ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'],
  facingMode: 'environment',
  continuous: true,
  dedupeMs: 2000,
  interval: 200,
  feedback: 'both',
  aspectRatio: '4 / 3',
  width: undefined,
  viewfinder: true,
})

const emit = defineEmits<{
  /** 掃到一個碼（同一個內容 dedupeMs 內只送一次） */
  (e: 'scan', code: DetectedCode): void
  /** 相機開不起來 */
  (e: 'error', kind: CameraErrorKind): void
  /** 相機開好、開始掃描 */
  (e: 'ready', info: { native: boolean; formats: string[] }): void
  (e: 'update:active', active: boolean): void
}>()

const video = useTemplateRef<HTMLVideoElement>('video')
const state = ref<'idle' | 'starting' | 'scanning' | 'error'>('idle')
const errorKind = ref<CameraErrorKind>('unknown')
const cameras = ref<MediaDeviceInfo[]>([])
const qrOnly = ref(false)
const lastScan = ref('')
const announcement = ref('')
const flash = ref(false)

let stream: MediaStream | null = null
let detector: CodeDetector | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let deviceId: string | null = null
let canvas: HTMLCanvasElement | null = null
let isDuplicate = createDeduper(props.dedupeMs)
/** 每次 start 一個新號碼：還在等 getUserMedia 時又按了停止，回來的串流要丟掉 */
let session = 0

watch(
  () => props.dedupeMs,
  (ms) => (isDuplicate = createDeduper(ms))
)

// 換了格式要重建解碼器（下次開相機時）
watch(
  () => props.formats.join(','),
  () => (detector = null)
)

function fail(kind: CameraErrorKind): void {
  stopStream()
  state.value = 'error'
  errorKind.value = kind
  emit('error', kind)
}

async function startCamera(): Promise<void> {
  const mine = ++session
  const availability = cameraAvailability()
  if (availability !== 'ok') return fail(availability)
  state.value = 'starting'
  try {
    detector ??= await createDetector(props.formats)
    if (mine !== session) return // 載入解碼器時已被關掉：不要再開相機
    if (!detector) return fail('unsupported')
    qrOnly.value = !detector.native && props.formats.some((f) => f !== 'qr_code')
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: props.facingMode } },
    }
    const s = await navigator.mediaDevices.getUserMedia(constraints)
    if (mine !== session) {
      s.getTracks().forEach((tr) => tr.stop())
      return
    }
    stream = s
    deviceId = s.getVideoTracks()[0]?.getSettings?.().deviceId ?? deviceId
    const el = video.value
    if (el) {
      el.srcObject = s
      await el.play().catch(() => undefined)
    }
    state.value = 'scanning'
    emit('ready', { native: detector.native, formats: detector.formats })
    // 有幾顆鏡頭（拿到權限之後 enumerateDevices 才會有名稱與 id）
    const devices = (await navigator.mediaDevices.enumerateDevices?.()) ?? []
    cameras.value = devices.filter((d) => d.kind === 'videoinput')
    scheduleScan()
  } catch (error) {
    if (mine === session) fail(classifyCameraError(error))
  }
}

function stopStream(): void {
  if (timer) clearTimeout(timer)
  timer = null
  stream?.getTracks().forEach((tr) => tr.stop())
  stream = null
  if (video.value) video.value.srcObject = null
}

function stopCamera(): void {
  session++
  stopStream()
  state.value = 'idle'
}

const running = () => state.value === 'scanning' || state.value === 'starting'

/** 由畫面上的按鈕或 ref 開關相機：同步更新 v-model:active */
async function start(): Promise<void> {
  if (!props.active) emit('update:active', true)
  await startCamera()
}

function stop(): void {
  stopCamera()
  if (props.active) emit('update:active', false)
}

async function switchCamera(): Promise<void> {
  if (cameras.value.length < 2) return
  const i = cameras.value.findIndex((c) => c.deviceId === deviceId)
  deviceId = cameras.value[(i + 1) % cameras.value.length].deviceId
  stopStream()
  await startCamera()
}

function scheduleScan(): void {
  timer = setTimeout(scanOnce, props.interval)
}

/** 把目前的影格畫到小畫布上（jsQR 用；縮到最長邊 640，解碼快很多，QR 仍讀得到） */
function grabImageData(): ImageData | null {
  const el = video.value
  if (!el || !el.videoWidth) return null
  const scale = Math.min(1, 640 / Math.max(el.videoWidth, el.videoHeight))
  const w = Math.round(el.videoWidth * scale)
  const h = Math.round(el.videoHeight * scale)
  canvas ??= document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(el, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

async function scanOnce(): Promise<void> {
  timer = null
  const el = video.value
  if (state.value !== 'scanning' || !detector || !el) return
  if (el.readyState >= 2) {
    try {
      const codes = await detector.detect({ source: el, getImageData: grabImageData })
      for (const code of codes) {
        if (!code.text || !isDuplicate(code.text)) continue
        onScanned(code)
        if (!props.continuous) {
          stop()
          return
        }
      }
    } catch {
      // 單一影格解碼失敗（影格還沒準備好等）不影響下一次
    }
  }
  if (state.value === 'scanning') scheduleScan()
}

function onScanned(code: DetectedCode): void {
  lastScan.value = code.text
  announcement.value = t.value.cameraScanner.scanned(code.text)
  if (props.feedback === 'both' || props.feedback === 'beep') beep()
  if (props.feedback === 'both' || props.feedback === 'vibrate') navigator.vibrate?.(60)
  flash.value = true
  setTimeout(() => (flash.value = false), 150)
  emit('scan', code)
}

// 分頁切到背景時關閉相機，回來再開（手機上背景開著相機很耗電，也會一直亮著相機燈）
function onVisibility(): void {
  if (!props.active) return
  if (document.hidden && running()) stopCamera()
  else if (!document.hidden && state.value === 'idle') void startCamera()
}

// 外部切換 active：相機已經是那個狀態時不重複開關（按鈕開相機時也會送出 update:active，父層再傳回來）
watch(
  () => props.active,
  (on) => {
    if (on && !running()) void startCamera()
    else if (!on && running()) stopCamera()
  }
)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  if (props.active) void startCamera()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  stopCamera()
})

defineExpose({ start, stop, switchCamera })
</script>

<style scoped>
.corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: rgb(255 255 255 / 0.9);
  border-radius: 4px;
}

.scan-line {
  position: absolute;
  left: 6%;
  right: 6%;
  height: 2px;
  background: rgb(var(--t-danger-solid) / 0.85);
  box-shadow: 0 0 8px rgb(var(--t-danger-solid) / 0.8);
  animation: scan 2s ease-in-out infinite alternate;
}

@keyframes scan {
  from {
    top: 8%;
  }
  to {
    top: 92%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scan-line {
    animation: none;
    top: 50%;
  }
}
</style>
