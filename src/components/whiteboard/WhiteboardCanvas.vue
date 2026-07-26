<template>
  <div ref="stageRef" class="relative w-full h-[72vh] min-h-[520px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <canvas
      ref="canvasRef"
      class="w-full h-full"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @wheel.prevent="onWheel"
    />

    <div class="absolute right-3 bottom-3 px-3 py-1.5 text-xs rounded-md bg-gray-900 text-white/90">
      {{ toolLabel }} · {{ size }}px · {{ Math.round(viewport.scale * 100) }}%
    </div>

    <textarea
      v-if="textEditor.visible"
      ref="textEditorRef"
      v-model="textEditor.value"
      class="absolute z-20 resize-none rounded-md border border-amber-300 bg-amber-100/95 px-3 py-2 text-sm text-amber-900 shadow outline-none"
      :style="textEditorStyle"
      placeholder="輸入文字..."
      @keydown.stop="onTextEditorKeydown"
      @blur="commitTextEdit"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

const props = defineProps({
  objects: {
    type: Array,
    required: true,
  },
  tool: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['objects-change', 'thumbnail-change']);

const stageRef = ref(null);
const canvasRef = ref(null);
const textEditorRef = ref(null);
const localObjects = ref([]);

const selectedIds = ref([]);
const isInternalObjectsUpdate = ref(false);
const preview = ref(null);
const marquee = ref(null);

const viewport = reactive({
  scale: 1,
  panX: 0,
  panY: 0,
});

const interaction = reactive({
  mode: null,
  pointerId: null,
  startScreen: null,
  startWorld: null,
  startObjects: null,
  startSelectionBounds: null,
  activeHandle: null,
  dragSelectionSeed: [],
  isShiftMultiSelect: false,
});

const undoStack = ref([]);
const objectClipboard = ref(null);
const pasteSerial = ref(0);

const keyState = reactive({
  spaceDown: false,
});

const textEditor = reactive({
  visible: false,
  objectId: null,
  value: '',
  x: 0,
  y: 0,
  w: 220,
  h: 120,
  snapshot: '',
});

let idSeq = 1;
let resizeObserver = null;
const imageCache = new Map();

const toolNameMap = {
  select: '選取',
  pen: '畫筆',
  line: '直線',
  rect: '矩形',
  ellipse: '橢圓',
  text: '文字',
  eraser: '橡皮擦',
};

const toolLabel = computed(() => toolNameMap[props.tool] || props.tool);

const textEditorStyle = computed(() => ({
  left: textEditor.x + 'px',
  top: textEditor.y + 'px',
  width: textEditor.w + 'px',
  height: textEditor.h + 'px',
}));

function cloneData(input) {
  return JSON.parse(JSON.stringify(input || []));
}

function getCanvasContext() {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function stageSize() {
  const stage = stageRef.value;
  if (!stage) return { width: 1, height: 1 };
  return {
    width: Math.max(1, Math.floor(stage.clientWidth)),
    height: Math.max(1, Math.floor(stage.clientHeight)),
  };
}

function resizeCanvas() {
  const canvas = canvasRef.value;
  const stage = stageRef.value;
  if (!canvas || !stage) return;

  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(stage.clientWidth));
  const height = Math.max(1, Math.floor(stage.clientHeight));

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = getCanvasContext();
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function screenPoint(event) {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function toWorld(screen) {
  return {
    x: (screen.x - viewport.panX) / viewport.scale,
    y: (screen.y - viewport.panY) / viewport.scale,
  };
}

function toScreen(world) {
  return {
    x: viewport.panX + world.x * viewport.scale,
    y: viewport.panY + world.y * viewport.scale,
  };
}

function generateId() {
  idSeq += 1;
  return 'obj-' + idSeq;
}

function pushUndo() {
  undoStack.value.push(cloneData(localObjects.value));
  if (undoStack.value.length > 50) {
    undoStack.value.shift();
  }
}

function getObjectBounds(item) {
  if (item.type === 'path' || item.type === 'line') {
    const pts = item.points || [];
    if (!pts.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    pts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    const pad = Math.max(6, (item.size || 2) * 0.75);
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.max(1, maxX - minX + pad * 2),
      h: Math.max(1, maxY - minY + pad * 2),
    };
  }

  const x = item.x || 0;
  const y = item.y || 0;
  const w = Math.max(1, item.w || 1);
  const h = Math.max(1, item.h || 1);
  const rot = ((item.rot || 0) * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ].map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  corners.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function getSelectionBounds(ids = selectedIds.value) {
  if (!ids.length) return null;
  const targets = localObjects.value.filter((item) => ids.includes(item.id));
  if (!targets.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  targets.forEach((item) => {
    const b = getObjectBounds(item);
    if (!b) return;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });

  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function drawGrid(ctx, width, height) {
  const spacing = 32;
  const left = (-viewport.panX) / viewport.scale;
  const top = (-viewport.panY) / viewport.scale;
  const right = (width - viewport.panX) / viewport.scale;
  const bottom = (height - viewport.panY) / viewport.scale;

  const x0 = Math.floor(left / spacing) * spacing;
  const y0 = Math.floor(top / spacing) * spacing;

  ctx.save();
  ctx.fillStyle = '#e5e7eb';
  for (let x = x0; x <= right; x += spacing) {
    for (let y = y0; y <= bottom; y += spacing) {
      const p = toScreen({ x, y });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawObject(ctx, item) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (item.type === 'path' || item.type === 'line') {
    const pts = item.points || [];
    if (pts.length) {
      ctx.strokeStyle = item.color || '#111827';
      ctx.lineWidth = item.size || 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const x = item.x || 0;
  const y = item.y || 0;
  const w = item.w || 1;
  const h = item.h || 1;
  const rot = ((item.rot || 0) * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);

  if (item.type === 'rect') {
    ctx.strokeStyle = item.color || '#111827';
    ctx.lineWidth = item.size || 2;
    ctx.strokeRect(0, 0, w, h);
  } else if (item.type === 'ellipse') {
    ctx.strokeStyle = item.color || '#111827';
    ctx.lineWidth = item.size || 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.type === 'text') {
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#f2df9a';
    ctx.lineWidth = 1;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#5b4a16';
    ctx.font = '14px "Segoe UI", sans-serif';
    const lines = String(item.text || '').split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, 12, 20 + i * 19);
    });
  } else if (item.type === 'image') {
    const img = getCachedImage(item);
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText('載入中...', 12, 20);
    }
  }

  ctx.restore();
}

function getCachedImage(item) {
  if (item.type !== 'image' || !item.src) return null;
  if (imageCache.has(item.id)) return imageCache.get(item.id);
  const img = new Image();
  img.onload = () => {
    redraw();
    emit('thumbnail-change', createPageCanvas(localObjects.value, 0.65).toDataURL('image/png'));
  };
  img.src = item.src;
  imageCache.set(item.id, img);
  return img;
}

function drawSelectionUI(ctx) {
  const bounds = getSelectionBounds();
  if (!bounds) return;

  const handleSize = 10 / viewport.scale;
  const cx = bounds.x + bounds.w / 2;

  ctx.save();
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 1.5 / viewport.scale;
  ctx.setLineDash([6 / viewport.scale, 4 / viewport.scale]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.setLineDash([]);

  const handles = [
    { id: 'nw', x: bounds.x, y: bounds.y },
    { id: 'ne', x: bounds.x + bounds.w, y: bounds.y },
    { id: 'sw', x: bounds.x, y: bounds.y + bounds.h },
    { id: 'se', x: bounds.x + bounds.w, y: bounds.y + bounds.h },
    { id: 'rot', x: cx, y: bounds.y - 26 / viewport.scale },
  ];

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f766e';
  handles.forEach((h) => {
    if (h.id === 'rot') {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bounds.y);
      ctx.lineTo(h.x, h.y + handleSize * 0.6);
      ctx.stroke();
    } else {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }
  });

  ctx.restore();
}

function drawPreview(ctx) {
  if (!preview.value) return;
  const p = preview.value;

  ctx.save();
  ctx.strokeStyle = p.color || props.color;
  ctx.lineWidth = (p.size || props.size) / viewport.scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (p.type === 'line') {
    ctx.beginPath();
    ctx.moveTo(p.points[0].x, p.points[0].y);
    ctx.lineTo(p.points[1].x, p.points[1].y);
    ctx.stroke();
  } else if (p.type === 'rect') {
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  } else if (p.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, Math.abs(p.w) / 2, Math.abs(p.h) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.type === 'path') {
    const pts = p.points || [];
    if (pts.length) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMarquee(ctx) {
  if (!marquee.value) return;
  const m = marquee.value;
  ctx.save();
  ctx.strokeStyle = '#0f766e';
  ctx.fillStyle = 'rgba(15, 118, 110, 0.08)';
  ctx.lineWidth = 1.2 / viewport.scale;
  ctx.setLineDash([5 / viewport.scale, 4 / viewport.scale]);
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.strokeRect(m.x, m.y, m.w, m.h);
  ctx.restore();
}

function applySceneTransform(ctx) {
  ctx.translate(viewport.panX, viewport.panY);
  ctx.scale(viewport.scale, viewport.scale);
}

function redraw() {
  const canvas = canvasRef.value;
  const ctx = getCanvasContext();
  if (!canvas || !ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  // Keep white page background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height);

  ctx.save();
  applySceneTransform(ctx);
  localObjects.value.forEach((item) => drawObject(ctx, item));
  drawPreview(ctx);
  drawMarquee(ctx);
  drawSelectionUI(ctx);
  ctx.restore();

  canvas.style.cursor = resolveCursor();
}

function objectContainsPoint(item, worldPoint, tolerance = 6 / viewport.scale) {
  if (item.type === 'path' || item.type === 'line') {
    const pts = item.points || [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((worldPoint.x - a.x) * dx + (worldPoint.y - a.y) * dy) / len2));
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      if (Math.hypot(worldPoint.x - px, worldPoint.y - py) <= Math.max(tolerance, (item.size || 2) * 0.75)) {
        return true;
      }
    }
    return false;
  }

  const x = item.x || 0;
  const y = item.y || 0;
  const w = item.w || 1;
  const h = item.h || 1;
  const rot = ((item.rot || 0) * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const dx = worldPoint.x - cx;
  const dy = worldPoint.y - cy;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const lx = dx * cos - dy * sin + w / 2;
  const ly = dx * sin + dy * cos + h / 2;

  if (item.type === 'ellipse') {
    const rx = w / 2;
    const ry = h / 2;
    const ex = (lx - rx) / Math.max(1, rx);
    const ey = (ly - ry) / Math.max(1, ry);
    return ex * ex + ey * ey <= 1.05;
  }

  return lx >= -tolerance && ly >= -tolerance && lx <= w + tolerance && ly <= h + tolerance;
}

function findTopObject(worldPoint) {
  for (let i = localObjects.value.length - 1; i >= 0; i -= 1) {
    const item = localObjects.value[i];
    if (objectContainsPoint(item, worldPoint)) return item;
  }
  return null;
}

function getHandleAt(worldPoint) {
  const b = getSelectionBounds();
  if (!b) return null;
  const hs = 10 / viewport.scale;
  const cx = b.x + b.w / 2;
  const handles = [
    { id: 'nw', x: b.x, y: b.y },
    { id: 'ne', x: b.x + b.w, y: b.y },
    { id: 'sw', x: b.x, y: b.y + b.h },
    { id: 'se', x: b.x + b.w, y: b.y + b.h },
    { id: 'rot', x: cx, y: b.y - 26 / viewport.scale, r: hs * 0.7 },
  ];

  for (const h of handles) {
    if (h.id === 'rot') {
      if (Math.hypot(worldPoint.x - h.x, worldPoint.y - h.y) <= h.r) return h.id;
    } else if (Math.abs(worldPoint.x - h.x) <= hs / 2 && Math.abs(worldPoint.y - h.y) <= hs / 2) {
      return h.id;
    }
  }
  return null;
}

function resolveCursor() {
  if (interaction.mode === 'pan') return 'grabbing';
  if (keyState.spaceDown) return 'grab';
  if (interaction.mode === 'move') return 'grabbing';
  if (interaction.mode === 'resize') return 'nwse-resize';
  if (interaction.mode === 'rotate') return 'crosshair';
  if (props.tool === 'select') return 'default';
  if (props.tool === 'text') return 'text';
  return 'crosshair';
}

function setSelection(ids) {
  selectedIds.value = ids;
}

function objectById(id) {
  return localObjects.value.find((item) => item.id === id) || null;
}

function estimateTextHeight(text) {
  const lines = String(text || '').split('\n').length;
  return Math.max(84, 24 + lines * 20);
}

function openTextEditor(item, focusToEnd = true) {
  const s = toScreen({ x: item.x, y: item.y });
  textEditor.visible = true;
  textEditor.objectId = item.id;
  textEditor.value = String(item.text || '');
  textEditor.snapshot = String(item.text || '');
  textEditor.x = s.x;
  textEditor.y = s.y;
  textEditor.w = Math.max(160, (item.w || 220) * viewport.scale);
  textEditor.h = Math.max(84, (item.h || 120) * viewport.scale);

  nextTick(() => {
    const el = textEditorRef.value;
    if (!el) return;
    el.focus();
    if (focusToEnd) {
      const n = el.value.length;
      el.setSelectionRange(n, n);
    }
  });
}

function closeTextEditor() {
  textEditor.visible = false;
  textEditor.objectId = null;
  textEditor.value = '';
  textEditor.snapshot = '';
}

function commitTextEdit() {
  if (!textEditor.visible || !textEditor.objectId) return;
  const item = objectById(textEditor.objectId);
  if (!item) {
    closeTextEditor();
    return;
  }

  const nextText = String(textEditor.value || '').trim();
  if (!nextText) {
    pushUndo();
    localObjects.value = localObjects.value.filter((x) => x.id !== item.id);
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id);
    closeTextEditor();
    redraw();
    emitState();
    return;
  }

  const changed = nextText !== textEditor.snapshot;
  if (changed) pushUndo();

  item.text = nextText;
  item.h = Math.max(84, estimateTextHeight(nextText));

  closeTextEditor();
  redraw();
  if (changed) emitState();
}

function cancelTextEdit() {
  if (!textEditor.visible || !textEditor.objectId) {
    closeTextEditor();
    return;
  }
  const item = objectById(textEditor.objectId);
  if (item && !String(item.text || '').trim()) {
    localObjects.value = localObjects.value.filter((x) => x.id !== item.id);
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id);
    emitState();
  }
  closeTextEditor();
  redraw();
}

function onTextEditorKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    commitTextEdit();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelTextEdit();
  }
}

function buildClipboardFromSelection() {
  if (!selectedIds.value.length) {
    objectClipboard.value = null;
    return;
  }
  const objects = cloneData(localObjects.value.filter((item) => selectedIds.value.includes(item.id)));
  const bounds = computeContentBounds(objects);
  if (!objects.length || !bounds) {
    objectClipboard.value = null;
    return;
  }
  objectClipboard.value = { objects, bounds };
}

function pasteObjectsFromClipboard() {
  const clip = objectClipboard.value;
  if (!clip || !clip.objects?.length || !clip.bounds) return false;

  pushUndo();
  pasteSerial.value += 1;
  const center = worldCenter();
  const cascade = 22 * pasteSerial.value;
  const targetX = center.x - clip.bounds.w / 2 + cascade;
  const targetY = center.y - clip.bounds.h / 2 + cascade;
  const dx = targetX - clip.bounds.x;
  const dy = targetY - clip.bounds.y;

  const inserted = clip.objects.map((item) => {
    const next = { ...item, id: generateId() };
    if (next.type === 'path' || next.type === 'line') {
      next.points = (next.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      next.x = (next.x || 0) + dx;
      next.y = (next.y || 0) + dy;
    }
    return next;
  });

  localObjects.value.push(...inserted);
  setSelection(inserted.map((item) => item.id));
  redraw();
  emitState();
  return true;
}

function emitState() {
  isInternalObjectsUpdate.value = true;
  emit('objects-change', cloneData(localObjects.value));
  const canvas = canvasRef.value;
  if (canvas) {
    emit('thumbnail-change', createPageCanvas(localObjects.value, 0.65).toDataURL('image/png'));
  }
  nextTick(() => {
    isInternalObjectsUpdate.value = false;
  });
}

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

function startPan(screen) {
  interaction.mode = 'pan';
  interaction.startScreen = screen;
  interaction.startWorld = { x: viewport.panX, y: viewport.panY };
}

function startMove(screen, world) {
  interaction.mode = 'move';
  interaction.startScreen = screen;
  interaction.startWorld = world;
  interaction.startObjects = cloneData(localObjects.value);
}

function startResize(screen, world, handleId) {
  interaction.mode = 'resize';
  interaction.startScreen = screen;
  interaction.startWorld = world;
  interaction.activeHandle = handleId;
  interaction.startObjects = cloneData(localObjects.value);
  interaction.startSelectionBounds = getSelectionBounds();
}

function startRotate(screen, world) {
  interaction.mode = 'rotate';
  interaction.startScreen = screen;
  interaction.startWorld = world;
  interaction.startObjects = cloneData(localObjects.value);
  interaction.startSelectionBounds = getSelectionBounds();
}

function startMarquee(world, isShiftKey = false) {
  interaction.mode = 'marquee';
  interaction.startWorld = world;
  interaction.isShiftMultiSelect = isShiftKey;
  interaction.dragSelectionSeed = isShiftKey ? cloneData(selectedIds.value) : [];
  marquee.value = { x: world.x, y: world.y, w: 0, h: 0 };
}

function addTextNote(world) {
  pushUndo();
  const note = {
    id: generateId(),
    type: 'text',
    x: world.x,
    y: world.y,
    w: 220,
    h: 96,
    rot: 0,
    text: '',
    color: props.color,
    size: props.size,
  };
  localObjects.value.push(note);
  setSelection([note.id]);
  openTextEditor(note, false);
  redraw();
  emitState();
}

function worldCenter() {
  const { width, height } = stageSize();
  return toWorld({ x: width / 2, y: height / 2 });
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addImageFromDataUrl(dataUrl) {
  const img = await dataUrlToImage(dataUrl);
  const maxW = 460;
  const w = Math.max(80, Math.min(maxW, img.naturalWidth || maxW));
  const h = Math.max(60, w / Math.max(0.2, (img.naturalWidth || 1) / Math.max(1, img.naturalHeight || 1)));
  const center = worldCenter();

  pushUndo();
  const item = {
    id: generateId(),
    type: 'image',
    src: dataUrl,
    x: center.x - w / 2,
    y: center.y - h / 2,
    w,
    h,
    rot: 0,
  };
  localObjects.value.push(item);
  imageCache.delete(item.id);
  setSelection([item.id]);
  redraw();
  emitState();
}

async function addImageFile(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return;
  const dataUrl = await fileToDataUrl(file);
  await addImageFromDataUrl(dataUrl);
}

async function pasteImageFromClipboard() {
  if (navigator.clipboard && navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'clipboard-image.png', { type: blob.type || 'image/png' });
          await addImageFile(file);
          return;
        }
      }
    } catch (error) {
      // Fall back to Ctrl+V paste event handling.
    }
  }
}

function openImagePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (file) await addImageFile(file);
  };
  input.click();
}

function onPaste(event) {
  const items = event.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          addImageFile(file);
          event.preventDefault();
          return;
        }
      }
    }
  }

  if (pasteObjectsFromClipboard()) {
    event.preventDefault();
  }
}

function onDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (!files || !files.length) return;
  const imageFile = [...files].find((file) => file.type && file.type.startsWith('image/'));
  if (imageFile) {
    addImageFile(imageFile);
  }
}

function onDragOver(event) {
  event.preventDefault();
}

function deleteAt(world) {
  const hit = findTopObject(world);
  if (!hit) return;
  pushUndo();
  localObjects.value = localObjects.value.filter((item) => item.id !== hit.id);
  selectedIds.value = selectedIds.value.filter((id) => id !== hit.id);
  redraw();
  emitState();
}

function onPointerDown(event) {
  if (textEditor.visible) {
    commitTextEdit();
  }

  const screen = screenPoint(event);
  const world = toWorld(screen);

  if (event.button === 1 || keyState.spaceDown) {
    startPan(screen);
    redraw();
    return;
  }
  if (event.button !== 0) return;

  if (props.tool === 'text') {
    addTextNote(world);
    return;
  }

  if (props.tool === 'eraser') {
    deleteAt(world);
    interaction.mode = 'erase';
    return;
  }

  if (props.tool === 'pen') {
    pushUndo();
    interaction.mode = 'draw';
    preview.value = {
      type: 'path',
      color: props.color,
      size: props.size,
      points: [world],
    };
    redraw();
    return;
  }

  if (props.tool === 'line' || props.tool === 'rect' || props.tool === 'ellipse') {
    pushUndo();
    interaction.mode = 'shape';
    interaction.startWorld = world;
    if (props.tool === 'line') {
      preview.value = {
        type: 'line',
        color: props.color,
        size: props.size,
        points: [world, world],
      };
    } else {
      preview.value = {
        type: props.tool,
        color: props.color,
        size: props.size,
        x: world.x,
        y: world.y,
        w: 0,
        h: 0,
      };
    }
    redraw();
    return;
  }

  // select tool
  const handle = getHandleAt(world);
  if (handle) {
    pushUndo();
    if (handle === 'rot') startRotate(screen, world);
    else startResize(screen, world, handle);
    redraw();
    return;
  }

  const hit = findTopObject(world);
  if (hit) {
    if (hit.type === 'text' && event.detail >= 2) {
      setSelection([hit.id]);
      openTextEditor(hit);
      redraw();
      return;
    }

    if (event.shiftKey) {
      if (selectedIds.value.includes(hit.id)) {
        setSelection(selectedIds.value.filter((id) => id !== hit.id));
      } else {
        setSelection([...selectedIds.value, hit.id]);
      }
      redraw();
      return;
    }

    if (!selectedIds.value.includes(hit.id)) {
      setSelection([hit.id]);
    }
    pushUndo();
    startMove(screen, world);
    redraw();
    return;
  }

  if (!event.shiftKey) {
    setSelection([]);
  }
  startMarquee(world, event.shiftKey);
  redraw();
}

function moveSelected(world) {
  if (!interaction.startObjects) return;
  const dx = world.x - interaction.startWorld.x;
  const dy = world.y - interaction.startWorld.y;
  const base = interaction.startObjects;

  localObjects.value = base.map((item) => {
    if (!selectedIds.value.includes(item.id)) return item;
    if (item.type === 'path' || item.type === 'line') {
      return {
        ...item,
        points: (item.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
    }
    return { ...item, x: (item.x || 0) + dx, y: (item.y || 0) + dy };
  });
}

function resizeSelected(world) {
  const b = interaction.startSelectionBounds;
  if (!b || !interaction.startObjects) return;

  const handle = interaction.activeHandle;
  const anchor = {
    x: handle.includes('w') ? b.x + b.w : b.x,
    y: handle.includes('n') ? b.y + b.h : b.y,
  };
  const from = {
    x: handle.includes('w') ? b.x : b.x + b.w,
    y: handle.includes('n') ? b.y : b.y + b.h,
  };

  const denom_x = Math.abs(from.x - anchor.x);
  const denom_y = Math.abs(from.y - anchor.y);
  
  const sx = (world.x - anchor.x) / Math.max(1e-6, denom_x);
  const sy = (world.y - anchor.y) / Math.max(1e-6, denom_y);

  const scaleX = Math.max(0.05, Math.abs(sx));
  const scaleY = Math.max(0.05, Math.abs(sy));

  localObjects.value = interaction.startObjects.map((item) => {
    if (!selectedIds.value.includes(item.id)) return item;

    if (item.type === 'path' || item.type === 'line') {
      return {
        ...item,
        points: (item.points || []).map((p) => ({
          x: anchor.x + (p.x - anchor.x) * scaleX,
          y: anchor.y + (p.y - anchor.y) * scaleY,
        })),
      };
    }

    const x = item.x || 0;
    const y = item.y || 0;
    const w = Math.max(10, (item.w || 1) * scaleX);
    const h = Math.max(10, (item.h || 1) * scaleY);
    return {
      ...item,
      x: anchor.x + (x - anchor.x) * scaleX,
      y: anchor.y + (y - anchor.y) * scaleY,
      w,
      h,
    };
  });
}

function rotateSelected(world) {
  const b = interaction.startSelectionBounds;
  if (!b || !interaction.startObjects) return;
  const center = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const a0 = Math.atan2(interaction.startWorld.y - center.y, interaction.startWorld.x - center.x);
  const a1 = Math.atan2(world.y - center.y, world.x - center.x);
  const delta = ((a1 - a0) * 180) / Math.PI;
  const rad = (delta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  localObjects.value = interaction.startObjects.map((item) => {
    if (!selectedIds.value.includes(item.id)) return item;

    if (item.type === 'path' || item.type === 'line') {
      return {
        ...item,
        points: (item.points || []).map((p) => {
          const dx = p.x - center.x;
          const dy = p.y - center.y;
          return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos,
          };
        }),
      };
    }

    const x = item.x || 0;
    const y = item.y || 0;
    const w = item.w || 1;
    const h = item.h || 1;
    const c = { x: x + w / 2, y: y + h / 2 };
    const dx = c.x - center.x;
    const dy = c.y - center.y;
    const nx = center.x + dx * cos - dy * sin;
    const ny = center.y + dx * sin + dy * cos;
    return {
      ...item,
      x: nx - w / 2,
      y: ny - h / 2,
      rot: (item.rot || 0) + delta,
    };
  });
}

function updateMarquee(world) {
  const m = normalizeRect(interaction.startWorld, world);
  marquee.value = m;

  const hitIds = localObjects.value
    .filter((item) => {
      const b = getObjectBounds(item);
      if (!b) return false;
      return b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y;
    })
    .map((item) => item.id);

  const merged = interaction.isShiftMultiSelect ? [...interaction.dragSelectionSeed] : [];
  hitIds.forEach((id) => {
    if (!merged.includes(id)) merged.push(id);
  });
  setSelection(merged);
}

function onPointerMove(event) {
  const screen = screenPoint(event);
  const world = toWorld(screen);

  if (interaction.mode === 'pan') {
    const dx = screen.x - interaction.startScreen.x;
    const dy = screen.y - interaction.startScreen.y;
    viewport.panX = interaction.startWorld.x + dx;
    viewport.panY = interaction.startWorld.y + dy;
    redraw();
    return;
  }

  if (interaction.mode === 'erase' && props.tool === 'eraser') {
    deleteAt(world);
    return;
  }

  if (interaction.mode === 'draw' && preview.value) {
    preview.value.points.push(world);
    redraw();
    return;
  }

  if (interaction.mode === 'shape' && preview.value) {
    if (preview.value.type === 'line') {
      preview.value.points[1] = world;
    } else {
      const n = normalizeRect(interaction.startWorld, world);
      preview.value.x = n.x;
      preview.value.y = n.y;
      preview.value.w = n.w;
      preview.value.h = n.h;
    }
    redraw();
    return;
  }

  if (interaction.mode === 'move') {
    moveSelected(world);
    redraw();
    return;
  }

  if (interaction.mode === 'resize') {
    resizeSelected(world);
    redraw();
    return;
  }

  if (interaction.mode === 'rotate') {
    rotateSelected(world);
    redraw();
    return;
  }

  if (interaction.mode === 'marquee') {
    updateMarquee(world);
    redraw();
  }
}

function commitPreviewToObject() {
  if (!preview.value) return;
  const p = preview.value;
  let object = null;

  if (p.type === 'path' && p.points.length > 1) {
    object = {
      id: generateId(),
      type: 'path',
      color: p.color,
      size: p.size,
      points: cloneData(p.points),
    };
  } else if (p.type === 'line') {
    const len = Math.hypot(p.points[1].x - p.points[0].x, p.points[1].y - p.points[0].y);
    if (len >= 2) {
      object = {
        id: generateId(),
        type: 'line',
        color: p.color,
        size: p.size,
        points: cloneData(p.points),
      };
    }
  } else if ((p.type === 'rect' || p.type === 'ellipse') && p.w >= 4 && p.h >= 4) {
    object = {
      id: generateId(),
      type: p.type,
      color: p.color,
      size: p.size,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      rot: 0,
    };
  }

  if (object) {
    localObjects.value.push(object);
    setSelection([object.id]);
    emitState();
  }
  preview.value = null;
}

function finishInteraction() {
  if (interaction.mode === 'draw' || interaction.mode === 'shape') {
    commitPreviewToObject();
  }
  if (interaction.mode === 'move' || interaction.mode === 'resize' || interaction.mode === 'rotate') {
    emitState();
  }
  if (interaction.mode === 'marquee') {
    marquee.value = null;
  }

  interaction.mode = null;
  interaction.pointerId = null;
  interaction.startScreen = null;
  interaction.startWorld = null;
  interaction.startObjects = null;
  interaction.startSelectionBounds = null;
  interaction.activeHandle = null;
  redraw();
}

function onPointerUp() {
  if (!interaction.mode) return;
  if (interaction.mode === 'erase') {
    interaction.mode = null;
    redraw();
    return;
  }
  finishInteraction();
}

function onWheel(event) {
  const screen = screenPoint(event);
  const worldBefore = toWorld(screen);
  const nextScale = Math.max(0.2, Math.min(5, viewport.scale * Math.exp(-event.deltaY * 0.0015)));
  viewport.scale = nextScale;
  viewport.panX = screen.x - worldBefore.x * nextScale;
  viewport.panY = screen.y - worldBefore.y * nextScale;

  if (textEditor.visible && textEditor.objectId) {
    const item = objectById(textEditor.objectId);
    if (item) {
      const s = toScreen({ x: item.x, y: item.y });
      textEditor.x = s.x;
      textEditor.y = s.y;
      textEditor.w = Math.max(160, item.w * viewport.scale);
      textEditor.h = Math.max(84, item.h * viewport.scale);
    }
  }

  redraw();
}

function onKeyDown(event) {
  if (textEditor.visible) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTextEdit();
    }
    return;
  }

  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 'c') {
    if (selectedIds.value.length) {
      buildClipboardFromSelection();
      event.preventDefault();
    }
    return;
  }

  if (event.code === 'Space') {
    keyState.spaceDown = true;
    redraw();
    return;
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.value.length) {
    pushUndo();
    localObjects.value = localObjects.value.filter((item) => !selectedIds.value.includes(item.id));
    selectedIds.value = [];
    emitState();
    redraw();
  }
}

function onKeyUp(event) {
  if (event.code === 'Space') {
    keyState.spaceDown = false;
    redraw();
  }
}

function computeContentBounds(objects) {
  if (!objects.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  objects.forEach((item) => {
    const b = getObjectBounds(item);
    if (!b) return;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function createPageCanvas(objects = localObjects.value, scaleOut = 2) {
  const pad = 36;
  const bounds = computeContentBounds(objects) || { x: 0, y: 0, w: 1000, h: 700 };
  const width = Math.max(1, Math.round((bounds.w + pad * 2) * scaleOut));
  const height = Math.max(1, Math.round((bounds.h + pad * 2) * scaleOut));
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate((-bounds.x + pad) * scaleOut, (-bounds.y + pad) * scaleOut);
  ctx.scale(scaleOut, scaleOut);
  objects.forEach((item) => drawObject(ctx, item));
  ctx.restore();
  return out;
}

function exportPNG(filename = 'whiteboard.png') {
  const out = createPageCanvas(localObjects.value, 2);
  const link = document.createElement('a');
  link.href = out.toDataURL('image/png');
  link.download = filename;
  link.click();
}

function exportSVG(filename = 'whiteboard.svg') {
  const svg = createPageSVG(localObjects.value);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1200);
}

function exportCurrentPageSVG(page, filename = 'whiteboard.svg') {
  const objects = cloneData(page?.objects || []);
  const svg = createPageSVG(objects);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1200);
}

async function exportAllPagesPNG(pages = []) {
  const pageList = Array.isArray(pages) ? pages : [];
  if (!pageList.length) return;

  const rendered = pageList.map((page, index) => ({
    index,
    canvas: createPageCanvas(cloneData(page.objects || []), 1.6),
  }));

  const gap = 28;
  const titleH = 30;
  const width = Math.max(...rendered.map((x) => x.canvas.width)) + gap * 2;
  const height = rendered.reduce((acc, x) => acc + x.canvas.height + titleH + gap, gap);

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, out.width, out.height);

  let y = gap;
  rendered.forEach(({ index, canvas }) => {
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText('第 ' + (index + 1) + ' 頁', gap, y + 20);
    y += titleH;

    const x = Math.round((out.width - canvas.width) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, canvas.width, canvas.height);
    ctx.drawImage(canvas, x, y);
    y += canvas.height + gap;
  });

  const link = document.createElement('a');
  link.href = out.toDataURL('image/png');
  link.download = 'whiteboard-all-pages.png';
  link.click();
}

function createPageSVG(objects = localObjects.value) {
  const pad = 36;
  const bounds = computeContentBounds(objects) || { x: 0, y: 0, w: 1000, h: 700 };
  const width = bounds.w + pad * 2;
  const height = bounds.h + pad * 2;
  const ox = bounds.x - pad;
  const oy = bounds.y - pad;

  const toNum = (v) => Number(v).toFixed(2);
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let body = '<rect x="0" y="0" width="' + toNum(width) + '" height="' + toNum(height) + '" fill="#ffffff"/>';
  objects.forEach((item) => {
    if (item.type === 'path' || item.type === 'line') {
      const pts = item.points || [];
      if (!pts.length) return;
      const d = pts
        .map((p, i) => (i === 0 ? 'M' : 'L') + toNum(p.x - ox) + ' ' + toNum(p.y - oy))
        .join(' ');
      body += '<path d="' + d + '" fill="none" stroke="' + (item.color || '#111827') + '" stroke-width="' + (item.size || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      return;
    }

    const x = (item.x || 0) - ox;
    const y = (item.y || 0) - oy;
    const w = item.w || 1;
    const h = item.h || 1;
    const rot = item.rot || 0;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const tf = rot ? ' transform="rotate(' + toNum(rot) + ' ' + toNum(cx) + ' ' + toNum(cy) + ')"' : '';

    if (item.type === 'rect') {
      body += '<rect x="' + toNum(x) + '" y="' + toNum(y) + '" width="' + toNum(w) + '" height="' + toNum(h) + '" fill="none" stroke="' + (item.color || '#111827') + '" stroke-width="' + (item.size || 2) + '"' + tf + '/>';
    } else if (item.type === 'ellipse') {
      body += '<ellipse cx="' + toNum(cx) + '" cy="' + toNum(cy) + '" rx="' + toNum(w / 2) + '" ry="' + toNum(h / 2) + '" fill="none" stroke="' + (item.color || '#111827') + '" stroke-width="' + (item.size || 2) + '"' + tf + '/>';
    } else if (item.type === 'text') {
      body += '<g' + tf + '>';
      body += '<rect x="' + toNum(x) + '" y="' + toNum(y) + '" width="' + toNum(w) + '" height="' + toNum(h) + '" fill="#fef3c7" stroke="#f2df9a" stroke-width="1"/>';
      const lines = String(item.text || '').split('\n');
      lines.forEach((line, i) => {
        body += '<text x="' + toNum(x + 12) + '" y="' + toNum(y + 22 + i * 18) + '" font-family="Segoe UI, sans-serif" font-size="14" fill="#5b4a16">' + esc(line) + '</text>';
      });
      body += '</g>';
    } else if (item.type === 'image' && item.src) {
      body += '<image x="' + toNum(x) + '" y="' + toNum(y) + '" width="' + toNum(w) + '" height="' + toNum(h) + '" preserveAspectRatio="none" href="' + esc(item.src) + '"' + tf + '/>';
    }
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="' + toNum(width) + '" height="' + toNum(height) + '" viewBox="0 0 ' + toNum(width) + ' ' + toNum(height) + '">' + body + '</svg>';
}

function undo() {
  if (!undoStack.value.length) return;
  localObjects.value = undoStack.value.pop();
  selectedIds.value = [];
  emitState();
  redraw();
}

function clear() {
  if (textEditor.visible) {
    closeTextEditor();
  }
  pushUndo();
  localObjects.value = [];
  selectedIds.value = [];
  redraw();
  emitState();
}

watch(
  () => props.objects,
  (value) => {
    localObjects.value = cloneData(value);
    // 只在外部更新時清除選取（例如切換頁面）
    if (!isInternalObjectsUpdate.value) {
      selectedIds.value = [];
    }
    preview.value = null;
    marquee.value = null;
    closeTextEditor();
    idSeq += 1;
    nextTick(() => {
      redraw();
      emit('thumbnail-change', createPageCanvas(localObjects.value, 0.65).toDataURL('image/png'));
    });
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  resizeCanvas();
  resizeObserver = new ResizeObserver(() => resizeCanvas());
  if (stageRef.value) {
    resizeObserver.observe(stageRef.value);
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('paste', onPaste);
  if (stageRef.value) {
    stageRef.value.addEventListener('dragover', onDragOver);
    stageRef.value.addEventListener('drop', onDrop);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('paste', onPaste);
  if (stageRef.value) {
    stageRef.value.removeEventListener('dragover', onDragOver);
    stageRef.value.removeEventListener('drop', onDrop);
  }
});

defineExpose({
  undo,
  clear,
  pasteImageFromClipboard,
  openImagePicker,
  exportPNG,
  exportSVG,
  exportCurrentPageSVG,
  exportAllPagesPNG,
  createPageCanvas,
  createPageSVG,
});
</script>
