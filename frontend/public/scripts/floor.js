import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createQuarterCircleTexture,
    createCheckerTexture,
    createDiagonalStripeTexture,
    createTerrazzoTexture,
    createBrickTexture,
    createPlasterTexture,
    createConcreteTexture,
    createWallTileTexture,
    createWindowTextureCanvas,
    createDoorTextureCanvas
} from './textures.js';
import { tilePatternList, fixtureCatalog, createWallTextureList } from './catalogs.js';
import { initDraftSlotsUI } from './drafts.js';
import { initQuotationUI } from './quotation.js';

// --- 1. State Management (เก็บข้อมูล Grid) ---
let gridWidth = 4.0;
let gridHeight = 4.0;
let wallHeight = 2.5;
// gridData เก็บสถานะ: 0 = ว่าง, 1 = มีพื้น
// rotationData เก็บมุมหมุนของแต่ละช่อง: 0, 1, 2, 3 (x 90 deg)
// flipData เก็บสถานะการพลิกกลับด้าน (Mirror): 0 = ปกติ, 1 = พลิกซ้ายขวา
let gridData = []; 
let rotationData = [];
let flipData = [];
// เก็บชนิดกระเบื้องและกำแพงรายช่อง/รายด้าน (key: 'x,y' หรือ 'x,y,side')
let floorTextureData = {};
let wallTextureData = {};
let tilePattern = 'mosaic_hideaway_alpine'; // Default to 'MT4SR1ไฮด์อเวย์อัลไพน์ เทาอ่อน'
let wallPattern = '8851740036185'; // Default to 'ทรูเนเจอร์ รัสติค บริค สีน้ำตาล'

// Brushes (ลายที่ถูกเลือกอยู่เพื่อรอทา)
let tileBrush = null;
let wallBrush = null;

let placementMode = null;
let wallDeleteMode = false;
let tileFlipMode = false;
let ignoreNextClick = false;
let isDraggingFixture = false;
let draggingFixture = null;
const removedWalls = new Set();
const HISTORY_LIMIT = 120;
const historyStack = [];
let historyIndex = -1;
let suppressHistoryRecording = false;
let dragMutatedState = false;

// Tile offset drag state
let tileOffsets = {};             // { [patternKey]: { x, y } } — UV offset in tile units
let tileOffsetDragMode = false;   // โหมดลากขยับตำแหน่งกระเบื้อง
let isDraggingTileOffset = false;
let tileOffsetDragPattern = null;
let tileOffsetDragLastPos = null; // THREE.Vector3
const WALL_LAYOUT_OPEN = 'open';
const WALL_LAYOUT_FULL = 'full';
const WALL_LAYOUT_CUSTOM = 'custom';
let wallLayoutPreset = WALL_LAYOUT_OPEN;
let wallLayoutMode = WALL_LAYOUT_OPEN;
let pricingSummary = {
    totalAreaSqm: 0,
    areaPerTile: 0,
    rawTilesNeeded: 0,
    tilesWithWaste: 0,
    tilesPerBox: 1,
    boxCount: 0,
    pricePerBox: 0,
    totalPrice: 0
};
const GRID_MIN = 2;
const GRID_MAX = 10;
const DEFAULT_OPEN_WALL_LAYOUT_SIDES = ['bottom', 'right'];

const draftToolbar = document.getElementById('draft-toolbar');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const topBarToggleBtn = document.getElementById('topBarToggleBtn');
const realImageOpenBtn = document.getElementById('realImageOpenBtn');
const realImageModal = document.getElementById('realImageModal');
const realImageModalCloseBtn = document.getElementById('realImageModalCloseBtn');
const wallLayoutOpenBtn = document.getElementById('wallLayoutOpenBtn');
const wallLayoutFullBtn = document.getElementById('wallLayoutFullBtn');
const realModalImageInput = document.getElementById('realModalImageInput');
const realModalStatus = document.getElementById('realModalStatus');
const realModalPreviewWrap = document.getElementById('realModalPreviewWrap');
const realModalPreviewImage = document.getElementById('realModalPreviewImage');
const realModalPreviewPlaceholder = document.getElementById('realModalPreviewPlaceholder');
const realModalDownloadBtn = document.getElementById('realModalDownloadBtn');
let realImageProcessing = false;
let realGeneratedImageDataUrl = null;
const HEIF_EXTENSIONS = new Set(['heic', 'heif']);
const KNOWN_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif']);

// --- Draft State Helpers ---

function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function normalizeGrid2D(source, width, height, defaultValue) {
    const out = [];
    const cw = Math.ceil(width);
    const ch = Math.ceil(height);
    for (let x = 0; x < cw; x++) {
        out[x] = [];
        for (let y = 0; y < ch; y++) {
            const v = source?.[x]?.[y];
            out[x][y] = v ?? defaultValue;
        }
    }
    return out;
}

function sanitizeGridDimension(value, fallback) {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(GRID_MIN, Math.min(GRID_MAX, n));
}

function applyDefaultOpenWallLayout() {
    removedWalls.clear();

    DEFAULT_OPEN_WALL_LAYOUT_SIDES.forEach((side) => {
        if (side === 'bottom') {
            const ch = Math.ceil(gridHeight);
            const cw = Math.ceil(gridWidth);
            for (let x = 0; x < cw; x++) {
                for (let y = ch - 1; y >= 0; y--) {
                    if (!gridData?.[x]?.[y]) continue;
                    removedWalls.add(`${x},${y},bottom`);
                    break;
                }
            }
            return;
        }

        if (side === 'right') {
            const ch = Math.ceil(gridHeight);
            const cw = Math.ceil(gridWidth);
            for (let y = 0; y < ch; y++) {
                for (let x = cw - 1; x >= 0; x--) {
                    if (!gridData?.[x]?.[y]) continue;
                    removedWalls.add(`${x},${y},right`);
                    break;
                }
            }
        }
    });
}

function applySelectedWallLayoutPreset() {
    if (wallLayoutPreset === WALL_LAYOUT_FULL) {
        removedWalls.clear();
        wallLayoutMode = WALL_LAYOUT_FULL;
        return;
    }

    applyDefaultOpenWallLayout();
    wallLayoutMode = WALL_LAYOUT_OPEN;
}

function syncWallLayoutControls() {
    if (wallLayoutOpenBtn) {
        const isActive = wallLayoutMode === WALL_LAYOUT_OPEN;
        wallLayoutOpenBtn.classList.toggle('active', isActive);
        wallLayoutOpenBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    if (wallLayoutFullBtn) {
        const isActive = wallLayoutMode === WALL_LAYOUT_FULL;
        wallLayoutFullBtn.classList.toggle('active', isActive);
        wallLayoutFullBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
}

function setWallLayoutPreset(preset, { recordHistory = true } = {}) {
    if (![WALL_LAYOUT_OPEN, WALL_LAYOUT_FULL].includes(preset)) return;

    wallLayoutPreset = preset;
    applySelectedWallLayoutPreset();
    syncWallLayoutControls();
    build3D();

    if (recordHistory) {
        recordHistorySnapshot();
    }
}

function applyGridDimensionsFromInputs({ commitInputValue = false, recordHistory = false } = {}) {
    const gridWInput = document.getElementById('gridW');
    const gridHInput = document.getElementById('gridH');
    const nextGridWidth = sanitizeGridDimension(gridWInput?.value, gridWidth);
    const nextGridHeight = sanitizeGridDimension(gridHInput?.value, gridHeight);

    if (commitInputValue) {
        if (gridWInput) gridWInput.value = String(nextGridWidth);
        if (gridHInput) gridHInput.value = String(nextGridHeight);
    }

    if (nextGridWidth === gridWidth && nextGridHeight === gridHeight) return;

    gridWidth = nextGridWidth;
    gridHeight = nextGridHeight;

    gridData = normalizeGrid2D(gridData, gridWidth, gridHeight, 1).map(col => col.map(v => (v ? 1 : 0)));
    rotationData = normalizeGrid2D(rotationData, gridWidth, gridHeight, 0).map(col => col.map(v => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return ((Math.round(n) % 4) + 4) % 4;
    }));
    flipData = normalizeGrid2D(flipData, gridWidth, gridHeight, 0).map(col => col.map(v => (v ? 1 : 0)));

    applySelectedWallLayoutPreset();
    placementMode = null;
    while (fixturesGroup.children.length > 0) {
        fixturesGroup.remove(fixturesGroup.children[0]);
    }

    renderUI();
    syncWallLayoutControls();
    build3D();
    renderFixtureSwatches();
    updatePriceSummary();
    if (recordHistory) {
        recordHistorySnapshot();
    }
}

function serializeDesignState() {
    const fixtures = fixturesGroup?.children?.map((fixture) => {
        const data = fixture?.userData ?? {};
        return {
            type: data.type,
            position: { x: fixture.position.x, y: fixture.position.y, z: fixture.position.z },
            rotation: { y: fixture.rotation.y },
            attachedWallKey: data.attachedWallKey ?? null
        };
    }) ?? [];

    return {
        schemaVersion: 4,
        gridWidth,
        gridHeight,
        wallHeight: Number(wallHeight),
        tilePattern,
        wallPattern,
        wallLayoutPreset,
        wallLayoutMode,
        gridData,
        rotationData,
        flipData,
        floorTextureData,
        wallTextureData,
        customTiles: tilePatternList.filter(t => t.key.startsWith('custom_')),
        removedWalls: Array.from(removedWalls),
        tileOffsets,
        fixtures
    };
}

function applyDesignState(state) {
    if (!state || typeof state !== 'object') return;

    const nextGridWidth = sanitizeGridDimension(state.gridWidth, gridWidth);
    const nextGridHeight = sanitizeGridDimension(state.gridHeight, gridHeight);
    gridWidth = nextGridWidth;
    gridHeight = nextGridHeight;

    wallHeight = clampNumber(state.wallHeight, 1, 5, wallHeight);

    if (typeof state.tilePattern === 'string') tilePattern = state.tilePattern;
    if (typeof state.wallPattern === 'string') wallPattern = state.wallPattern;
    wallLayoutPreset = state.wallLayoutPreset === WALL_LAYOUT_FULL ? WALL_LAYOUT_FULL : WALL_LAYOUT_OPEN;
    if ([WALL_LAYOUT_OPEN, WALL_LAYOUT_FULL, WALL_LAYOUT_CUSTOM].includes(state.wallLayoutMode)) {
        wallLayoutMode = state.wallLayoutMode;
    } else if (typeof state.useDefaultOpenWallLayout === 'boolean') {
        wallLayoutMode = state.useDefaultOpenWallLayout ? WALL_LAYOUT_OPEN : WALL_LAYOUT_CUSTOM;
    } else {
        wallLayoutMode = wallLayoutPreset;
    }

    gridData = normalizeGrid2D(state.gridData, gridWidth, gridHeight, 1).map(col => col.map(v => (v ? 1 : 0)));
    rotationData = normalizeGrid2D(state.rotationData, gridWidth, gridHeight, 0).map(col => col.map(v => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return ((Math.round(n) % 4) + 4) % 4;
    }));
    flipData = normalizeGrid2D(state.flipData, gridWidth, gridHeight, 0).map(col => col.map(v => (v ? 1 : 0)));

    if (Array.isArray(state.customTiles)) {
        state.customTiles.forEach(customTile => {
            if (!tilePatternList.some(t => t.key === customTile.key)) {
                tilePatternList.push(customTile);
                tileTextures[customTile.key] = loadImageTileTexture(customTile.url, 2);
            }
        });
        renderTileSwatches();
    }

    floorTextureData = state.floorTextureData || {};
    wallTextureData = state.wallTextureData || {};
    if (state.tileOffsets && typeof state.tileOffsets === 'object') {
        tileOffsets = { ...state.tileOffsets };
    } else {
        tileOffsets = {};
    }
    tileBrush = state.tilePattern;
    wallBrush = state.wallPattern;

    removedWalls.clear();
    if (wallLayoutMode === WALL_LAYOUT_OPEN) {
        applyDefaultOpenWallLayout();
        wallLayoutMode = WALL_LAYOUT_OPEN;
    } else if (wallLayoutMode === WALL_LAYOUT_FULL) {
        removedWalls.clear();
    } else if (Array.isArray(state.removedWalls)) {
        state.removedWalls.forEach((key) => {
            if (typeof key === 'string') removedWalls.add(key);
        });
    } else {
        applySelectedWallLayoutPreset();
    }

    // Sync form controls
    const gridWInput = document.getElementById('gridW');
    const gridHInput = document.getElementById('gridH');
    if (gridWInput) gridWInput.value = String(gridWidth);
    if (gridHInput) gridHInput.value = String(gridHeight);

    const wallHeightRange = document.getElementById('wallHeightInfo');
    const wallHeightLabel = document.getElementById('wallHeightVal');
    if (wallHeightRange) wallHeightRange.value = String(wallHeight);
    if (wallHeightLabel) wallHeightLabel.innerText = String(wallHeight);

    const wallDeleteToggle = document.getElementById('wallDeleteToggle');
    if (wallDeleteToggle) wallDeleteToggle.checked = false;
    wallDeleteMode = false;
    placementMode = null;

    // Clear fixtures before rebuilding
    while (fixturesGroup.children.length > 0) {
        fixturesGroup.remove(fixturesGroup.children[0]);
    }

    renderWallTextureOptions(wallPattern);
    const wallSelect = document.getElementById('wallTextureSelect');
    if (wallSelect) wallSelect.value = wallPattern;

    syncWallLayoutControls();
    renderWallSwatches();
    renderTileSwatches();
    renderFixtureSwatches();
    renderUI();
    build3D();

    // Restore fixtures
    if (Array.isArray(state.fixtures)) {
        state.fixtures.forEach((f) => {
            if (!f || typeof f !== 'object') return;
            if (typeof f.type !== 'string') return;
            const fixture = createFixtureMesh(f.type);
            if (!fixture) return;

            const pos = f.position ?? {};
            const rot = f.rotation ?? {};
            fixture.position.set(Number(pos.x) || 0, Number(pos.y) || 0, Number(pos.z) || 0);
            fixture.rotation.y = Number(rot.y) || 0;
            if (typeof f.attachedWallKey === 'string') {
                fixture.userData.attachedWallKey = f.attachedWallKey;
            }
            fixturesGroup.add(fixture);
        });
    }
    clampFixturesToWallHeight();
    updatePriceSummary();
}

function updateHistoryButtons() {
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

function setTopBarCollapsed(collapsed) {
    if (!draftToolbar || !topBarToggleBtn) return;
    draftToolbar.classList.toggle('is-collapsed', collapsed);
    topBarToggleBtn.textContent = collapsed ? 'แสดงแถบ' : 'ซ่อนแถบ';
    topBarToggleBtn.title = collapsed ? 'แสดงแถบด้านบน' : 'ซ่อนแถบด้านบน';
}

function recordHistorySnapshot({ force = false } = {}) {
    if (suppressHistoryRecording) return;
    const snapshot = JSON.stringify(serializeDesignState());

    try {
        window.localStorage?.setItem('pm69-floorplanner:autosave:v1', snapshot);
    } catch (e) {}

    if (!force && historyIndex >= 0 && historyStack[historyIndex] === snapshot) {
        return;
    }

    if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
    }

    historyStack.push(snapshot);
    if (historyStack.length > HISTORY_LIMIT) {
        historyStack.shift();
    }

    historyIndex = historyStack.length - 1;
    updateHistoryButtons();
}

function restoreHistorySnapshot(index) {
    if (index < 0 || index >= historyStack.length) return;
    const state = JSON.parse(historyStack[index]);
    suppressHistoryRecording = true;
    try {
        applyDesignState(state);
    } finally {
        suppressHistoryRecording = false;
    }
    historyIndex = index;
    updateHistoryButtons();
}

function undoDesignAction() {
    if (historyIndex <= 0) return;
    restoreHistorySnapshot(historyIndex - 1);
}

function redoDesignAction() {
    if (historyIndex >= historyStack.length - 1) return;
    restoreHistorySnapshot(historyIndex + 1);
}

function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function onUndoRedoHotkey(event) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoDesignAction();
        return;
    }

    if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redoDesignAction();
    }
}

// --- 2. Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 8, 8); // มุมมองเฉียงลง

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// Materials & Geometries
const tileTextureCanvases = {
    quarter: createQuarterCircleTexture(),
    checker: createCheckerTexture(),
    diagonal: createDiagonalStripeTexture(),
    terrazzo: createTerrazzoTexture()
};

const fixtureTextureCanvases = {
    window: createWindowTextureCanvas(),
    door: createDoorTextureCanvas()
};

const wallTextureCanvases = {
    brick: createBrickTexture(),
    plaster: createPlasterTexture(),
    concrete: createConcreteTexture(),
    walltile: createWallTileTexture()
};

const wallTextureList = createWallTextureList(wallTextureCanvases);

const tileTextures = {};
Object.keys(tileTextureCanvases).forEach((key) => {
    const tex = new THREE.CanvasTexture(tileTextureCanvases[key]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tileTextures[key] = tex;
});

const fixtureTextures = {};
Object.keys(fixtureTextureCanvases).forEach((key) => {
    const tex = new THREE.CanvasTexture(fixtureTextureCanvases[key]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 4);
    fixtureTextures[key] = tex;
});

function resolveAssetUrl(url) {
    return new URL(url, window.location.href).href;
}

function loadImageTileTexture(url, repeat = 2) {
    const tex = new THREE.TextureLoader().load(resolveAssetUrl(url));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 4);
    return tex;
}

function loadImageWallMaterial(url, repeatX = 2, repeatY = 1, rotation = 0) {
    const map = new THREE.TextureLoader().load(resolveAssetUrl(url));
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    if (rotation !== 0) {
        map.center.set(0.5, 0.5);
        map.rotation = rotation;
    }
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 4);
    return new THREE.MeshStandardMaterial({
        map,
        roughness: 0.8,
        metalness: 0.0
    });
}

tilePatternList
    .filter(item => item.type === 'image')
    .forEach(item => {
        tileTextures[item.key] = loadImageTileTexture(item.url, 2);
    });
function createWallMaterialFromCanvas(canvas, options = {}) {
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 1);
    const bump = new THREE.CanvasTexture(canvas);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(2, 1);
    return new THREE.MeshStandardMaterial({
        map,
        bumpMap: bump,
        bumpScale: options.bumpScale ?? 0.05,
        roughness: options.roughness ?? 0.8,
        metalness: options.metalness ?? 0.0
    });
}

const wallMaterials = wallTextureList.reduce((acc, item) => {
    if (item.type === 'solid') {
        acc[item.key] = new THREE.MeshStandardMaterial({
            color: item.color,
            roughness: item.roughness ?? 0.9,
            metalness: item.metalness ?? 0.0
        });
    } else if (item.type === 'canvas') {
        acc[item.key] = createWallMaterialFromCanvas(item.canvas, item.options);
    } else if (item.type === 'image') {
        const mat = loadImageWallMaterial(item.url, item.repeatX ?? 2, item.repeatYPerMeter ?? 1, item.rotation ?? 0);
        mat.userData = { repeatX: item.repeatX ?? 2, repeatYPerMeter: item.repeatYPerMeter ?? 1 };
        acc[item.key] = mat;
    }
    return acc;
}, {});
const tileGeometry = new THREE.PlaneGeometry(1, 1);
const wallThickness = 0.1;
const wallGeometry = new THREE.BoxGeometry(1, 1, wallThickness); // กว้าง 1, สูง 1, หนา 0.1

// Group รวม object ทั้งหมดเพื่อให้ลบง่ายเวลา render ใหม่
let roomGroup = new THREE.Group();
scene.add(roomGroup);
const fixturesGroup = new THREE.Group();
scene.add(fixturesGroup);

// Raycaster สำหรับคลิกเลือกกระเบื้อง
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const floorIntersectPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// --- 3. Logic Functions ---

// เริ่มต้นสร้าง Grid Data
window.resetGrid = function() {
    gridWidth = sanitizeGridDimension(document.getElementById('gridW')?.value, gridWidth);
    gridHeight = sanitizeGridDimension(document.getElementById('gridH')?.value, gridHeight);
    const gridWInput = document.getElementById('gridW');
    const gridHInput = document.getElementById('gridH');
    if (gridWInput) gridWInput.value = String(gridWidth);
    if (gridHInput) gridHInput.value = String(gridHeight);
    gridData = [];
    rotationData = [];
    flipData = [];
    floorTextureData = {};
    wallTextureData = {};
    tileOffsets = {};
    removedWalls.clear();
    placementMode = null;
    while (fixturesGroup.children.length > 0) {
        fixturesGroup.remove(fixturesGroup.children[0]);
    }

    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    
    // สร้าง Array 2 มิติ
    for(let x=0; x<cw; x++) {
        gridData[x] = [];
        rotationData[x] = [];
        flipData[x] = [];
        for(let y=0; y<ch; y++) {
            gridData[x][y] = 1; // Default คือมีพื้นเต็ม
            rotationData[x][y] = 0; // Default ไม่หมุน
            flipData[x][y] = 0; // Default ไม่พลิก
        }
    }
    applySelectedWallLayoutPreset();
    renderUI();
    syncWallLayoutControls();
    build3D();
    renderFixtureSwatches();
    updatePriceSummary();
    recordHistorySnapshot();
}

// สร้างตาราง UI (Grid Editor)
function renderUI() {
    const editor = document.getElementById('grid-editor');
    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    editor.style.gridTemplateColumns = `repeat(${cw}, 1fr)`;
    editor.innerHTML = '';

    // Note: Loop y แล้ว x เพื่อให้การวาดใน HTML เรียงแถวถูกต้อง
    for(let y=0; y<ch; y++) {
        for(let x=0; x<cw; x++) {
            const cell = document.createElement('div');
            cell.className = gridData[x][y] ? 'grid-cell active' : 'grid-cell';
            cell.onclick = () => {
                gridData[x][y] = gridData[x][y] ? 0 : 1; // Toggle 0/1
                if (wallLayoutMode === WALL_LAYOUT_OPEN) {
                    applyDefaultOpenWallLayout();
                } else if (wallLayoutMode === WALL_LAYOUT_FULL) {
                    removedWalls.clear();
                }
                renderUI();
                build3D(); // สร้าง 3D ใหม่ทันที
                recordHistorySnapshot();
            };
            editor.appendChild(cell);
        }
    }
}

function renderTileSwatches() {
    const swatchContainer = document.getElementById('tileSwatches');
    swatchContainer.innerHTML = '';

    tilePatternList.forEach(({ key, label, type, url }) => {
        const item = document.createElement('div');
        item.className = 'swatch-item';

        const swatch = document.createElement('div');
        const activeTile = tileBrush || tilePattern;
        swatch.className = `tile-swatch ${activeTile === key ? 'active' : ''}`;
        swatch.title = label;
        if (type === 'canvas') {
            swatch.style.backgroundImage = `url(${tileTextureCanvases[key].toDataURL()})`;
        } else if (type === 'image') {
            swatch.style.backgroundImage = `url(${resolveAssetUrl(url)})`;
        }

        const caption = document.createElement('div');
        caption.className = 'swatch-caption';
        caption.textContent = label;

        item.appendChild(swatch);
        item.appendChild(caption);
        item.onclick = () => setTilePattern(key);
        swatchContainer.appendChild(item);
    });
}

function renderWallTextureOptions(preferredValue = wallPattern) {
    const select = document.getElementById('wallTextureSelect');
    const currentValue = preferredValue || select.value || 'paint';
    select.innerHTML = '';

    wallTextureList.forEach(({ key, label }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        select.appendChild(option);
    });

    select.value = wallTextureList.some(item => item.key === currentValue) ? currentValue : 'paint';
    wallPattern = select.value;
}

function renderWallSwatches() {
    const swatchContainer = document.getElementById('wallSwatches');
    if (!swatchContainer) return;
    swatchContainer.innerHTML = '';

    wallTextureList.forEach(({ key, label, type, canvas, url, color }) => {
        const item = document.createElement('div');
        item.className = 'swatch-item';

        const swatch = document.createElement('div');
        const activeWall = wallBrush || wallPattern;
        swatch.className = `tile-swatch ${activeWall === key ? 'active' : ''}`;
        swatch.title = label;

        if (type === 'canvas' && canvas) {
            swatch.style.backgroundImage = `url(${canvas.toDataURL()})`;
        } else if (type === 'image' && url) {
            swatch.style.backgroundImage = `url(${resolveAssetUrl(url)})`;
        } else if (type === 'solid') {
            const hex = `#${color.toString(16).padStart(6, '0')}`;
            swatch.style.backgroundColor = hex;
        }

        const caption = document.createElement('div');
        caption.className = 'swatch-caption';
        caption.textContent = label;

        item.appendChild(swatch);
        item.appendChild(caption);
        item.onclick = () => setWallTexture(key);
        swatchContainer.appendChild(item);
    });
}

function renderFixtureSwatches() {
    const swatchContainer = document.getElementById('fixtureSwatches');
    if (!swatchContainer) return;
    swatchContainer.innerHTML = '';

    fixtureCatalog.forEach(({ key, label, preview }) => {
        const item = document.createElement('div');
        item.className = 'swatch-item';

        const swatch = document.createElement('div');
        swatch.className = `tile-swatch ${placementMode === key ? 'active' : ''}`;
        swatch.title = label;
        if (fixtureTextureCanvases[key]) {
            swatch.style.backgroundImage = `url(${fixtureTextureCanvases[key].toDataURL()})`;
        } else {
            swatch.style.background = `linear-gradient(135deg, ${preview.base} 0%, ${preview.accent} 100%)`;
        }

        const caption = document.createElement('div');
        caption.className = 'swatch-caption';
        caption.textContent = label;

        item.appendChild(swatch);
        item.appendChild(caption);
        item.onclick = () => setPlacementMode(key);
        swatchContainer.appendChild(item);
    });
}

function setPlacementMode(mode) {
    placementMode = placementMode === mode ? null : mode;
    if (placementMode && wallDeleteMode) {
        wallDeleteMode = false;
        const toggle = document.getElementById('wallDeleteToggle');
        if (toggle) toggle.checked = false;
    }
    renderFixtureSwatches();
}

function createFixtureMesh(type) {
    const config = fixtureCatalog.find(item => item.key === type);
    if (!config) return null;

    const group = new THREE.Group();
    const { width, height, depth } = config;
    const slabDepth = Math.min(depth, wallThickness);
    const texture = fixtureTextures[type];

    if (type === 'window') {
        const frameDepth = Math.max(0.04, slabDepth * 0.6);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, height + 0.08, frameDepth), frameMat);
        group.add(frame);

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x9ec9ff,
            roughness: 0.1,
            metalness: 0.0,
            transparent: true,
            opacity: 0.55
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, height - 0.12, frameDepth * 0.35), glassMat);
        group.add(glass);

        const mullionMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
        const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - 0.16, frameDepth * 0.5), mullionMat);
        const mullionH = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, 0.04, frameDepth * 0.5), mullionMat);
        group.add(mullionV, mullionH);
    } else {
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xb98561, roughness: 0.7 });
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x9d6b4b, roughness: 0.8 });
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width, height, slabDepth), doorMat);
        group.add(slab);

        const panelDepth = Math.max(0.012, slabDepth * 0.25);
        const panelTop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, height * 0.25, panelDepth), panelMat);
        const panelBottom = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, height * 0.4, panelDepth), panelMat);
        panelTop.position.y = height * 0.18;
        panelBottom.position.y = -height * 0.18;
        panelTop.position.z = slabDepth / 2 + panelDepth / 2 + 0.002;
        panelBottom.position.z = slabDepth / 2 + panelDepth / 2 + 0.002;
        group.add(panelTop, panelBottom);

        const panelTopBack = panelTop.clone();
        const panelBottomBack = panelBottom.clone();
        panelTopBack.position.z = -panelTop.position.z;
        panelBottomBack.position.z = -panelBottom.position.z;
        group.add(panelTopBack, panelBottomBack);

        const knobMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.3 });
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 18), knobMat);
        knob.position.set(width * 0.32, -height * 0.05, slabDepth / 2 + 0.03);
        const knobBack = knob.clone();
        knobBack.position.z = -knob.position.z;
        group.add(knob, knobBack);
    }

    if (texture) {
        const planeGeometry = new THREE.PlaneGeometry(width, height);
        const planeOffset = (wallThickness / 2) + 0.006;
        const textureMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

        const frontPlane = new THREE.Mesh(planeGeometry, textureMat);
        frontPlane.position.z = planeOffset;
        group.add(frontPlane);

        const backPlane = new THREE.Mesh(planeGeometry, textureMat);
        backPlane.position.z = -planeOffset;
        backPlane.rotation.y = Math.PI;
        group.add(backPlane);
    }

    group.userData = {
        isFixture: true,
        type,
        width,
        height,
        depth
    };
    return group;
}

function positionFixtureOnWall(fixture, wallHit) {
    if (!fixture || !wallHit) return;
    const { side, x, y } = wallHit.object.userData;
    const dims = fixture.userData;
    const point = wallHit.point.clone();

    const offsetX = (gridWidth * 1) / 2 - 0.5;
    const offsetZ = (gridHeight * 1) / 2 - 0.5;
    const baseX = x - offsetX;
    const baseZ = y - offsetZ;

    let wallCenterX = baseX;
    let wallCenterZ = baseZ;
    if (side === 'left') wallCenterX -= 0.5;
    if (side === 'right') wallCenterX += 0.5;
    if (side === 'top') wallCenterZ -= 0.5;
    if (side === 'bottom') wallCenterZ += 0.5;

    const minY = dims.height / 2;
    const maxY = Math.max(minY, wallHeight - dims.height / 2);
    const clampedY = Math.min(Math.max(point.y, minY), maxY);

    if (side === 'left') {
        fixture.rotation.y = Math.PI / 2;
        fixture.position.set(wallCenterX, clampedY, point.z);
    } else if (side === 'right') {
        fixture.rotation.y = Math.PI / 2;
        fixture.position.set(wallCenterX, clampedY, point.z);
    } else if (side === 'top') {
        fixture.rotation.y = 0;
        fixture.position.set(point.x, clampedY, wallCenterZ);
    } else if (side === 'bottom') {
        fixture.rotation.y = 0;
        fixture.position.set(point.x, clampedY, wallCenterZ);
    }

    fixture.userData.attachedWallKey = `${x},${y},${side}`;
}

function placeFixtureOnWall(wallHit, type) {
    const fixture = createFixtureMesh(type);
    if (!fixture) return null;
    positionFixtureOnWall(fixture, wallHit);
    fixturesGroup.add(fixture);
    return fixture;
}

function clampFixturesToWallHeight() {
    fixturesGroup.children.forEach((fixture) => {
        const dims = fixture.userData;
        if (!dims?.height) return;
        const minY = dims.height / 2;
        const maxY = Math.max(minY, wallHeight - dims.height / 2);
        fixture.position.y = Math.min(Math.max(fixture.position.y, minY), maxY);
    });
}

function countActiveTiles() {
    let count = 0;
    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    for (let x = 0; x < cw; x++) {
        for (let y = 0; y < ch; y++) {
            if (gridData[x][y]) {
                const fracX = (x === cw - 1 && gridWidth % 1 !== 0) ? gridWidth % 1 : 1;
                const fracY = (y === ch - 1 && gridHeight % 1 !== 0) ? gridHeight % 1 : 1;
                count += fracX * fracY;
            }
        }
    }
    return count;
}

function getTileMetaByKey(patternKey = tilePattern) {
    return tilePatternList.find((item) => item.key === patternKey) || tilePatternList[0] || null;
}

function getTileSizeInMeters(tileMeta) {
    const w = tileMeta?.width || 60;
    const l = tileMeta?.length || 60;
    const unit = tileMeta?.unit || 'cm';
    if (unit === 'inch') {
        return { widthM: w * 0.0254, lengthM: l * 0.0254 };
    }
    return { widthM: w / 100, lengthM: l / 100 };
}

function calculatePricingSummary() {
    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    const offsetX = (gridWidth * 1) / 2 - 0.5;
    const offsetZ = (gridHeight * 1) / 2 - 0.5;

    // นับ unique tile grid positions ต่อลาย (ตรงกับโมเดล 3D จริง)
    // เหมือนกับ world-space UV ใน build3D — เศษแม้นิดเดียวก็นับ 1 แผ่น
    const patternData = {}; // { [patternKey]: { area, tileSet: Set<string> } }
    let totalAreaSqm = 0;

    for (let x = 0; x < cw; x++) {
        for (let y = 0; y < ch; y++) {
            if (!gridData[x][y]) continue;
            const fracX = (x === cw - 1 && gridWidth % 1 !== 0) ? gridWidth % 1 : 1;
            const fracY = (y === ch - 1 && gridHeight % 1 !== 0) ? gridHeight % 1 : 1;
            const cellArea = fracX * fracY;
            const cellPattern = floorTextureData[`${x},${y}`] || tilePattern;
            totalAreaSqm += cellArea;

            if (!patternData[cellPattern]) patternData[cellPattern] = { area: 0, tileSet: new Set() };
            patternData[cellPattern].area += cellArea;

            const meta = getTileMetaByKey(cellPattern);
            const { widthM: tW, lengthM: tL } = getTileSizeInMeters(meta);
            const safeW = (tW > 0 && Number.isFinite(tW)) ? tW : 0.6;
            const safeL = (tL > 0 && Number.isFinite(tL)) ? tL : 0.6;
            const tileOff = tileOffsets[cellPattern] || { x: 0, y: 0 };

            // World-space position ของ cell (เหมือน build3D)
            const cx = x - offsetX - (1 - fracX) / 2;
            const cz = y - offsetZ - (1 - fracY) / 2;

            // UV range ของ cell นี้ (ใช้สูตรเดียวกับ build3D)
            // X: wx = cx ± fracX/2,  u = wx/safeW + tileOff.x
            // Z: wz = cz ∓ ly (local y → world -z after rotation), wz range = cz ± fracY/2
            const uMin = (cx - fracX / 2) / safeW + tileOff.x;
            const uMax = (cx + fracX / 2) / safeW + tileOff.x;
            const vMin = (cz - fracY / 2) / safeL + tileOff.y;
            const vMax = (cz + fracY / 2) / safeL + tileOff.y;

            // Tile grid indices ที่ overlap กับ cell นี้
            const tiX0 = Math.floor(uMin);
            const tiX1 = Math.floor(uMax - 1e-9);
            const tiZ0 = Math.floor(vMin);
            const tiZ1 = Math.floor(vMax - 1e-9);

            for (let ti = tiX0; ti <= tiX1; ti++) {
                for (let tj = tiZ0; tj <= tiZ1; tj++) {
                    patternData[cellPattern].tileSet.add(`${ti},${tj}`);
                }
            }
        }
    }

    // คำนวณแต่ละกลุ่มลาย
    let totalRawTiles = 0;
    let totalTilesWithWaste = 0;
    let totalBoxCount = 0;
    let totalPrice = 0;

    const groups = Object.entries(patternData).map(([patternKey, data]) => {
        const meta = getTileMetaByKey(patternKey);
        const { widthM, lengthM } = getTileSizeInMeters(meta);
        const rawTiles = data.tileSet.size; // นับ unique tile positions
        const tilesWithWaste = Math.ceil(rawTiles * 1.05);
        const tilesPerBox = Math.max(1, Math.ceil(Number(meta?.tilesPerBox) || 1));
        const pricePerBox = Math.max(0, Number(meta?.pricePerBox) || 0);
        const boxes = tilesWithWaste > 0 ? Math.ceil(tilesWithWaste / tilesPerBox) : 0;
        const price = boxes * pricePerBox;

        totalRawTiles += rawTiles;
        totalTilesWithWaste += tilesWithWaste;
        totalBoxCount += boxes;
        totalPrice += price;

        return { patternKey, area: data.area, rawTiles, tilesWithWaste, tilesPerBox, pricePerBox, boxes, price };
    });

    // ข้อมูล primary tile (สำหรับ backward compat กับ quotation)
    const primaryGroup = groups.find(g => g.patternKey === tilePattern) || groups[0];
    const primaryMeta = getTileMetaByKey(primaryGroup?.patternKey || tilePattern);
    const { widthM: pW, lengthM: pL } = getTileSizeInMeters(primaryMeta);

    return {
        totalAreaSqm,
        areaPerTile: Math.max(pW * pL, 0.0001),
        rawTilesNeeded: totalRawTiles,
        tilesWithWaste: totalTilesWithWaste,
        tilesPerBox: primaryGroup?.tilesPerBox || 1,
        boxCount: totalBoxCount,
        pricePerBox: primaryGroup?.pricePerBox || 0,
        totalPrice,
        groups
    };
}

function formatCurrency(value) {
    const formatter = new Intl.NumberFormat('th-TH', {
        maximumFractionDigits: 0
    });
    return formatter.format(value);
}

function setRealModalStatus(message, isError = false) {
    if (!realModalStatus) return;
    realModalStatus.textContent = message;
    realModalStatus.classList.toggle('is-error', isError);
    realModalStatus.classList.remove('is-loading');
}

function setRealModalLoadingStatus() {
    if (!realModalStatus) return;
    realModalStatus.textContent = 'กำลังประมวลผล...';
    realModalStatus.classList.remove('is-error');
    realModalStatus.classList.add('is-loading');
}

function resetRealModalPreview() {
    if (realModalPreviewImage) {
        realModalPreviewImage.removeAttribute('src');
        realModalPreviewImage.hidden = true;
    }
    if (realModalPreviewWrap) {
        realModalPreviewWrap.hidden = false;
    }
    if (realModalPreviewPlaceholder) {
        realModalPreviewPlaceholder.hidden = false;
    }
    realGeneratedImageDataUrl = null;
    if (realModalDownloadBtn) {
        realModalDownloadBtn.hidden = true;
    }
}

function setRealModalBusyState(isBusy) {
    realImageProcessing = isBusy;
    if (realModalImageInput) realModalImageInput.disabled = isBusy;
    if (realImageOpenBtn) realImageOpenBtn.disabled = isBusy;
}

function openRealImageModal() {
    if (!realImageModal) return;
    realImageModal.classList.add('is-open');
    realImageModal.setAttribute('aria-hidden', 'false');
    setRealModalStatus('');
    resetRealModalPreview();
    if (realModalImageInput) {
        realModalImageInput.value = '';
        realModalImageInput.disabled = false;
    }
    realImageProcessing = false;
}

function closeRealImageModal() {
    if (!realImageModal) return;
    if (realImageProcessing) return;
    realImageModal.classList.remove('is-open');
    realImageModal.setAttribute('aria-hidden', 'true');
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ไม่สามารถอ่านข้อมูลรูปภาพได้'));
        reader.readAsDataURL(blob);
    });
}

function getFileExtension(filename) {
    const value = typeof filename === 'string' ? filename.trim() : '';
    const idx = value.lastIndexOf('.');
    if (idx < 0) return '';
    return value.slice(idx + 1).toLowerCase();
}

function isLikelyImageUpload(file) {
    if (!file) return false;
    if (typeof file.type === 'string' && file.type.toLowerCase().startsWith('image/')) {
        return true;
    }
    return KNOWN_IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

function shouldNormalizeUploadForPreview(file) {
    const type = (file?.type || '').toLowerCase();
    const ext = getFileExtension(file?.name || '');
    return !type || type.includes('heic') || type.includes('heif') || HEIF_EXTENSIONS.has(ext);
}

async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error('ไม่สามารถเตรียมรูปภาพที่แปลงแล้วได้');
    }
    return response.blob();
}

async function requestNormalizedRoomImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/image-normalize', {
        method: 'POST',
        body: formData
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof result?.error === 'string' ? result.error : 'ไม่สามารถแปลงไฟล์รูปภาพได้';
        throw new Error(message);
    }

    const dataUrl = result?.image_data_url;
    const mimeType = result?.mime_type;
    const filename = result?.filename;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        throw new Error('ไฟล์รูปภาพที่แปลงแล้วไม่ถูกต้อง');
    }

    const normalizedBlob = await dataUrlToBlob(dataUrl);
    const uploadFile = new File([normalizedBlob], typeof filename === 'string' && filename ? filename : 'room-image.jpg', {
        type: typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : normalizedBlob.type || 'image/jpeg'
    });

    return {
        previewDataUrl: dataUrl,
        uploadFile
    };
}

async function prepareRealRoomImage(file) {
    if (!isLikelyImageUpload(file)) {
        throw new Error('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง');
    }

    if (shouldNormalizeUploadForPreview(file)) {
        return requestNormalizedRoomImage(file);
    }

    const previewDataUrl = await blobToDataUrl(file);
    if (typeof previewDataUrl === 'string' && previewDataUrl.startsWith('data:image/')) {
        return {
            previewDataUrl,
            uploadFile: file
        };
    }

    return requestNormalizedRoomImage(file);
}

async function assetImageToDataUrl(url) {
    const response = await fetch(resolveAssetUrl(url));
    if (!response.ok) {
        throw new Error('โหลดภาพอ้างอิงไม่สำเร็จ');
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        throw new Error('ข้อมูลภาพอ้างอิงไม่ถูกต้อง');
    }
    return dataUrl;
}

function solidColorToDataUrl(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const hex = `#${(Number(color) || 0).toString(16).padStart(6, '0')}`;
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

async function getTileReferenceDataUrl() {
    const tileMeta = tilePatternList.find(item => item.key === tilePattern);
    if (!tileMeta) throw new Error('ไม่พบลายกระเบื้องที่เลือก');

    if (tileMeta.type === 'canvas') {
        const canvas = tileTextureCanvases[tileMeta.key];
        if (!canvas) throw new Error('ไม่พบภาพลายกระเบื้อง');
        return canvas.toDataURL('image/png');
    }

    if (tileMeta.type === 'image' && tileMeta.url) {
        return assetImageToDataUrl(tileMeta.url);
    }

    throw new Error('ลายกระเบื้องที่เลือกยังไม่รองรับ');
}

async function getWallReferenceDataUrl() {
    const wallMeta = wallTextureList.find(item => item.key === wallPattern);
    if (!wallMeta) throw new Error('ไม่พบพื้นผิวกำแพงที่เลือก');

    if (wallMeta.type === 'canvas' && wallMeta.canvas) {
        return wallMeta.canvas.toDataURL('image/png');
    }

    if (wallMeta.type === 'image' && wallMeta.url) {
        return assetImageToDataUrl(wallMeta.url);
    }

    if (wallMeta.type === 'solid') {
        return solidColorToDataUrl(wallMeta.color);
    }

    throw new Error('พื้นผิวกำแพงที่เลือกยังไม่รองรับ');
}

async function testRealImageWithOpenRouter(roomImage) {
    if (!roomImage || !isLikelyImageUpload(roomImage)) {
        setRealModalStatus('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง', true);
        return;
    }

    setRealModalBusyState(true);
    const tileMeta = tilePatternList.find(item => item.key === tilePattern);
    const wallMeta = wallTextureList.find(item => item.key === wallPattern);
    setRealModalLoadingStatus();

    try {
        const preparedRoomImage = await prepareRealRoomImage(roomImage);
        const previewDataUrl = preparedRoomImage.previewDataUrl;

        if (realModalPreviewImage) {
            realModalPreviewImage.src = previewDataUrl;
            realModalPreviewImage.hidden = false;
        }
        if (realModalPreviewPlaceholder) {
            realModalPreviewPlaceholder.hidden = true;
        }

        const [tileReferenceDataUrl, wallReferenceDataUrl] = await Promise.all([
            getTileReferenceDataUrl(),
            getWallReferenceDataUrl()
        ]);

        const formData = new FormData();
    formData.append('room_image', preparedRoomImage.uploadFile);
        formData.append('tile_reference_data_url', tileReferenceDataUrl);
        formData.append('wall_reference_data_url', wallReferenceDataUrl);
        formData.append('tile_pattern_label', tileMeta?.label || tilePattern);
        formData.append('wall_pattern_label', wallMeta?.label || wallPattern);

        const response = await fetch('/api/image-edit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = typeof result?.error === 'string' ? result.error : 'ไม่สามารถประมวลผลภาพได้';
            throw new Error(message);
        }

        const outputImage = result?.output_image_data_url;
        if (typeof outputImage !== 'string' || !outputImage.startsWith('data:image/')) {
            throw new Error('ไม่ได้รับรูปภาพผลลัพธ์จาก OpenRouter');
        }

        if (realModalPreviewImage) {
            realModalPreviewImage.src = outputImage;
        }
        realGeneratedImageDataUrl = outputImage;
        if (realModalDownloadBtn) {
            realModalDownloadBtn.hidden = false;
        }
        setRealModalStatus('');
    } catch (error) {
        realGeneratedImageDataUrl = null;
        if (realModalDownloadBtn) {
            realModalDownloadBtn.hidden = true;
        }
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดระหว่างประมวลผลภาพ';
        setRealModalStatus(message, true);
    } finally {
        setRealModalBusyState(false);
    }
}

function updatePriceSummary() {
    const totalAreaEl = document.getElementById('totalAreaVal');
    const tileTotalCountEl = document.getElementById('tileTotalCountVal');
    const boxCountEl = document.getElementById('boxCountVal');
    const totalPriceEl = document.getElementById('tileTotalPriceVal');
    const quotationTilesPerBoxInput = document.getElementById('quotationTilesPerBox');

    pricingSummary = calculatePricingSummary();

    if (totalAreaEl) totalAreaEl.textContent = pricingSummary.totalAreaSqm.toFixed(2);
    if (tileTotalCountEl) tileTotalCountEl.textContent = pricingSummary.tilesWithWaste.toString();
    if (boxCountEl) boxCountEl.textContent = pricingSummary.boxCount.toString();
    if (totalPriceEl) totalPriceEl.textContent = `฿ ${formatCurrency(pricingSummary.totalPrice)}`;
    if (quotationTilesPerBoxInput) quotationTilesPerBoxInput.value = String(pricingSummary.tilesPerBox);

    return pricingSummary;
}

window.updatePriceSummary = updatePriceSummary;

// ฟังชันก์หลัก: สร้างห้อง 3D ตามข้อมูล Grid
function build3D() {
    // ลบของเก่าทิ้งให้หมด
    while(roomGroup.children.length > 0){ 
        roomGroup.remove(roomGroup.children[0]); 
    }

    const tileMeta = getTileMetaByKey(tilePattern);

    // คำนวณ Offset ให้ห้องอยู่ตรงกลางโลก
    const offsetX = (gridWidth * 1) / 2 - 0.5;
    const offsetZ = (gridHeight * 1) / 2 - 0.5;

    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);

    for(let x=0; x<cw; x++) {
        for(let y=0; y<ch; y++) {
            
            if (gridData[x][y] === 0) continue; // ถ้าช่องนี้ไม่มีพื้น ข้ามไป

            const fracX = (x === cw - 1 && gridWidth % 1 !== 0) ? gridWidth % 1 : 1;
            const fracY = (y === ch - 1 && gridHeight % 1 !== 0) ? gridHeight % 1 : 1;

            // Cell center in world space (needed for world-space UV calculation)
            const cx = x - offsetX - (1 - fracX) / 2;
            const cz = y - offsetZ - (1 - fracY) / 2;

            // 1. สร้างพื้น (Tile)
            const cellPattern = floorTextureData[`${x},${y}`] || tilePattern;
            const tileMetaInfo = getTileMetaByKey(cellPattern) || tileMeta;
            const baseTexture = tileTextures[cellPattern] || tileTextures[tileMetaInfo?.key || ''];

            // Tile physical size in meters
            const { widthM: tileW, lengthM: tileL } = getTileSizeInMeters(tileMetaInfo);
            const safeW = (tileW > 0 && Number.isFinite(tileW)) ? tileW : 0.6;
            const safeL = (tileL > 0 && Number.isFinite(tileL)) ? tileL : 0.6;

            // Per-cell UV state
            const tileOff = tileOffsets[cellPattern] || { x: 0, y: 0 };
            const cellRotRad = rotationData[x][y] * Math.PI / 2;
            const doFlip = !!flipData[x][y];
            const cellUCx = cx / safeW + tileOff.x; // cell center in tile UV space (X)
            const cellUCz = cz / safeL + tileOff.y; // cell center in tile UV space (Z)

            // Custom Plane Geometry for fractional edge cells
            const cGeometry = new THREE.PlaneGeometry(fracX, fracY);

            // World-space UV — tiles align seamlessly across all cells, no 1 m block seams
            {
                const positions = cGeometry.attributes.position;
                const uvs = cGeometry.attributes.uv;
                for (let i = 0; i < positions.count; i++) {
                    const lx = positions.getX(i);
                    const ly = positions.getY(i);
                    // After tile.rotation.x = -π/2 : local-Y maps to world -Z
                    const wx = cx + lx;
                    const wz = cz - ly;
                    let u = wx / safeW + tileOff.x;
                    let v = wz / safeL + tileOff.y;
                    // Per-cell rotation/flip around the cell's UV centre
                    if (cellRotRad !== 0 || doFlip) {
                        let du = u - cellUCx;
                        let dv = v - cellUCz;
                        if (doFlip) du = -du;
                        if (cellRotRad !== 0) {
                            const cos = Math.cos(cellRotRad);
                            const sin = Math.sin(cellRotRad);
                            const du2 = du * cos - dv * sin;
                            const dv2 = du * sin + dv * cos;
                            du = du2; dv = dv2;
                        }
                        u = cellUCx + du;
                        v = cellUCz + dv;
                    }
                    uvs.setXY(i, u, v);
                }
                uvs.needsUpdate = true;
            }

            let tileMaterial;
            if (baseTexture) {
                const texClone = baseTexture.clone();
                texClone.needsUpdate = true;
                texClone.wrapS = texClone.wrapT = THREE.RepeatWrapping;
                texClone.repeat.set(1, 1); // UVs are already in tile-units; RepeatWrapping handles tiling
                tileMaterial = new THREE.MeshStandardMaterial({ map: texClone, side: THREE.DoubleSide });
            } else {
                tileMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, side: THREE.DoubleSide });
            }

            const tile = new THREE.Mesh(cGeometry, tileMaterial);
            tile.rotation.x = -Math.PI / 2; // นอนราบ — rotation/flip handled via UV above
            tile.position.set(cx, 0, cz);

            tile.userData = { x, y, isTile: true, fracX, fracY }; // เก็บข้อมูลพิกัดไว้ใน mesh เพื่อใช้ตอนคลิก
            tile.receiveShadow = true;
            roomGroup.add(tile);

            // 2. สร้างกำแพง (Wall)
            // เช็คด้านบน (y-1)
            if (y === 0 || gridData[x][y-1] === 0) {
                createWall(cx, cz - fracY/2, 'top', x, y, fracX);
            }
            // เช็คด้านล่าง
            if (y === ch-1 || gridData[x][y+1] === 0) {
                createWall(cx, cz + fracY/2, 'bottom', x, y, fracX);
            }
            // เช็คด้านซ้าย
            if (x === 0 || gridData[x-1][y] === 0) {
                createWall(cx - fracX/2, cz, 'left', x, y, fracY);
            }
            // เช็คด้านขวา
            if (x === cw-1 || gridData[x+1][y] === 0) {
                createWall(cx + fracX/2, cz, 'right', x, y, fracY);
            }
        }
    }

    updatePriceSummary();
}

function createWall(x, z, side, gridX, gridY, segmentLength) {
    const wallKey = `${gridX},${gridY},${side}`;
    if (removedWalls.has(wallKey)) return;
    
    const cellWallPattern = wallTextureData[wallKey] || wallPattern;
    const baseMat = wallMaterials[cellWallPattern] || wallMaterials['8851740036185']; // fallback
    
    // Clone material so we can adjust repeat mappings for fractional segmentLength individually
    let material = baseMat;
    if (baseMat?.map) {
        material = baseMat.clone();
        material.map = baseMat.map.clone();
        material.map.needsUpdate = true;
        if (baseMat.bumpMap) {
            material.bumpMap = baseMat.bumpMap.clone();
            material.bumpMap.needsUpdate = true;
        }
        const repeatX = (baseMat.userData?.repeatX ?? 2) * segmentLength;
        const repeatY = (baseMat.userData?.repeatYPerMeter ?? 1) * wallHeight;
        material.map.repeat.set(repeatX, repeatY);
        if (material.bumpMap) material.bumpMap.repeat.set(repeatX, repeatY);
    }
    
    const h = parseFloat(wallHeight);
    // Custom geometry to fit fractional lengths
    const cWallGeom = new THREE.BoxGeometry(segmentLength, h, wallThickness);
    
    // UV adjustment for side caps (so textures on sides of walls are mapped without stretching)
    // Left as default is fine for simple walls usually.
    
    const wall = new THREE.Mesh(cWallGeom, material);
    
    // ตำแหน่งที่รับมาคือ กึ่งกลางขอบของ segment แล้ว ยกขึ้นครึ่งนึงของความสูง
    wall.position.set(x, h/2, z);

    // หมุนตามทิศ
    if (side === 'left' || side === 'right') {
        wall.rotation.y = Math.PI / 2;
    }

    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { isWall: true, x: gridX, y: gridY, side, length: segmentLength };
    roomGroup.add(wall);
}

// --- Interaction Handlers ---

window.updateWallHeight = function(val) {
    wallHeight = val;
    document.getElementById('wallHeightVal').innerText = val;
    clampFixturesToWallHeight();
    build3D();
}

window.updateWallTexture = function() {
    const select = document.getElementById('wallTextureSelect');
    if (select) {
        wallPattern = select.value;
    }
    renderWallSwatches();
    build3D();
    recordHistorySnapshot();
}

window.toggleWallDeleteMode = function(enabled) {
    wallDeleteMode = enabled;
    if (wallDeleteMode && placementMode) {
        placementMode = null;
        renderFixtureSwatches();
    }
}

window.toggleTileFlipMode = function(enabled) {
    tileFlipMode = enabled;
}

window.setTileOffsetMode = function(enabled) {
    tileOffsetDragMode = enabled;
    renderer.domElement.style.cursor = enabled ? 'grab' : 'default';
    if (!enabled && isDraggingTileOffset) {
        isDraggingTileOffset = false;
        tileOffsetDragPattern = null;
        tileOffsetDragLastPos = null;
        controls.enabled = true;
    }
}

window.resetTileOffset = function() {
    const pattern = tileBrush || tilePattern;
    if (tileOffsets[pattern]) {
        delete tileOffsets[pattern];
        build3D();
        recordHistorySnapshot();
    }
}

window.handleCustomTileUpload = function(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const wInput = document.getElementById('customTileW');
    const lInput = document.getElementById('customTileL');
    const uInput = document.getElementById('customTileUnit');
    const w = parseFloat(wInput?.value || '60');
    const l = parseFloat(lInput?.value || '60');
    const unit = uInput?.value || 'cm';
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Compress and scale down
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            const customKey = `custom_${Date.now()}`;
            // Add to catalog
            tilePatternList.push({
                key: customKey,
                label: `ลายส่วนตัว (${w}x${l}${unit})`,
                type: 'image',
                url: dataUrl,
                width: w,
                length: l,
                unit: unit,
            });

            // Create Texture for THREE
            tileTextures[customKey] = loadImageTileTexture(dataUrl, 2);

            // Select it explicitly
            setTilePattern(customKey);

            // Reset input
            e.target.value = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function setTilePattern(patternKey) {
    if (!tileBrush) tileBrush = tilePattern;
    tileBrush = patternKey;
    renderTileSwatches();
}

function setWallTexture(patternKey) {
    if (!wallBrush) wallBrush = wallPattern;
    wallBrush = patternKey;
    const select = document.getElementById('wallTextureSelect');
    if (select) {
        select.value = patternKey;
    }
    renderWallSwatches();
}

window.fillAllTiles = function() {
    tilePattern = tileBrush || tilePattern;
    floorTextureData = {}; 
    build3D();
    recordHistorySnapshot();
}

window.fillAllWalls = function() {
    wallPattern = wallBrush || wallPattern;
    wallTextureData = {};
    build3D();
    recordHistorySnapshot();
}

window.rotateAllTiles = function() {
    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    for(let x=0; x<cw; x++) {
        for(let y=0; y<ch; y++) {
            if(gridData[x][y]) rotationData[x][y] = (rotationData[x][y] + 1) % 4;
        }
    }
    build3D();
    recordHistorySnapshot();
}

window.flipAllTiles = function() {
    const cw = Math.ceil(gridWidth);
    const ch = Math.ceil(gridHeight);
    for(let x=0; x<cw; x++) {
        for(let y=0; y<ch; y++) {
            if(gridData[x][y]) flipData[x][y] = flipData[x][y] ? 0 : 1;
        }
    }
    build3D();
    recordHistorySnapshot();
}

// Event Listener สำหรับคลิกที่กระเบื้องใน 3D
renderer.domElement.addEventListener('click', onCanvasClick, false);
renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
renderer.domElement.addEventListener('pointermove', onPointerMove, false);
renderer.domElement.addEventListener('pointerup', onPointerUp, false);
renderer.domElement.addEventListener('contextmenu', onContextMenu, false);

function onPointerDown(event) {
    if (event.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // โหมดลากขยับตำแหน่งกระเบื้อง
    if (tileOffsetDragMode) {
        const tileHits = raycaster.intersectObjects(roomGroup.children, true);
        const tileHit = tileHits.find(hit => hit.object.userData.isTile);
        if (tileHit) {
            const data = tileHit.object.userData;
            tileOffsetDragPattern = floorTextureData[`${data.x},${data.y}`] || tilePattern;
            const worldPos = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(floorIntersectPlane, worldPos)) {
                tileOffsetDragLastPos = worldPos.clone();
                isDraggingTileOffset = true;
                dragMutatedState = false;
                ignoreNextClick = true;
                controls.enabled = false;
                renderer.domElement.style.cursor = 'grabbing';
            }
            return;
        }
    }

    const fixtureHits = raycaster.intersectObjects(fixturesGroup.children, true);

    if (fixtureHits.length > 0) {
        const fixtureHit = fixtureHits.find(hit => hit.object.parent?.userData?.isFixture || hit.object.userData?.isFixture);
        if (fixtureHit) {
            draggingFixture = fixtureHit.object.userData?.isFixture ? fixtureHit.object : fixtureHit.object.parent;
            isDraggingFixture = true;
            dragMutatedState = false;
            ignoreNextClick = true;
            controls.enabled = false;
            return;
        }
    }

    if (placementMode && !wallDeleteMode) {
        const wallHits = raycaster.intersectObjects(roomGroup.children, true);
        const wallHit = wallHits.find(hit => hit.object.userData.isWall);
        if (wallHit) {
            const placed = placeFixtureOnWall(wallHit, placementMode);
            if (placed) {
                draggingFixture = placed;
                isDraggingFixture = true;
                dragMutatedState = true;
                controls.enabled = false;
                placementMode = null;
                renderFixtureSwatches();
            }
            ignoreNextClick = true;
            return;
        }
    }
}

function onCanvasClick(event) {
    if (placementMode) return;
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }
    
    // Check if dragging happened
    if (dragMutatedState) {
        dragMutatedState = false;
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomGroup.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const data = hit.object.userData;

        // ถ้าคลิกพื้นกระจก/กระเบื้อง
        if (data.isTile) {
            const key = `${data.x},${data.y}`;
            const targetBrush = tileBrush || tilePattern;
            const currentPattern = floorTextureData[key] || tilePattern;
            
            if (tileFlipMode) {
                // ถ้าอยู่ในโหมดกระจก คลิกคือการพลิกกลับด้านเสมอ
                flipData[data.x][data.y] = flipData[data.x][data.y] ? 0 : 1;
            } else {
                // ถ้ายืนยันจะทาสีลายเดิม ให้เป็นการหมุนแทน (เพื่อให้ backward compatible UX เดิม)
                if (currentPattern === targetBrush) {
                    rotationData[data.x][data.y] = (rotationData[data.x][data.y] + 1) % 4;
                } else {
                    // ถ้าไม่เหมือน ให้ทาสีลายใหม่ใส่ช่องนี้
                    floorTextureData[key] = targetBrush;
                    // Reset flip/rotations back to default when applying new texture
                    rotationData[data.x][data.y] = 0;
                    flipData[data.x][data.y] = 0;
                }
            }
            
            build3D();
            recordHistorySnapshot();
        } 
        // ถ้าคลิกกำแพง
        else if (data.isWall) {
            const wallKey = `${data.x},${data.y},${data.side}`;
            if (wallDeleteMode) {
                removedWalls.add(wallKey);
                wallLayoutMode = WALL_LAYOUT_CUSTOM;
                syncWallLayoutControls();
            } else {
                // ทาสีกำแพงด้วยลายที่เลือกอยู่
                wallTextureData[wallKey] = wallBrush || wallPattern;
            }
            build3D();
            recordHistorySnapshot();
        }
    }
}

function onPointerMove(event) {
    // ลากขยับตำแหน่งกระเบื้อง
    if (isDraggingTileOffset && (event.buttons & 1) !== 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const worldPos = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(floorIntersectPlane, worldPos) && tileOffsetDragLastPos && tileOffsetDragPattern) {
            const meta = getTileMetaByKey(tileOffsetDragPattern);
            const { widthM, lengthM } = getTileSizeInMeters(meta);
            const safeW = (widthM > 0 && Number.isFinite(widthM)) ? widthM : 0.6;
            const safeL = (lengthM > 0 && Number.isFinite(lengthM)) ? lengthM : 0.6;
            const dx = worldPos.x - tileOffsetDragLastPos.x;
            const dz = worldPos.z - tileOffsetDragLastPos.z;
            const curr = tileOffsets[tileOffsetDragPattern] || { x: 0, y: 0 };
            // Subtract delta so the tile pattern follows the cursor
            tileOffsets[tileOffsetDragPattern] = { x: curr.x - dx / safeW, y: curr.y - dz / safeL };
            tileOffsetDragLastPos = worldPos.clone();
            dragMutatedState = true;
            build3D();
        }
        return;
    }

    if (!isDraggingFixture || !draggingFixture || (event.buttons & 1) === 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const wallHits = raycaster.intersectObjects(roomGroup.children, true);
    const wallHit = wallHits.find(hit => hit.object.userData.isWall);
    if (wallHit) {
        positionFixtureOnWall(draggingFixture, wallHit);
        dragMutatedState = true;
    }
}

function onPointerUp() {
    if (isDraggingTileOffset) {
        if (dragMutatedState) recordHistorySnapshot();
        isDraggingTileOffset = false;
        tileOffsetDragPattern = null;
        tileOffsetDragLastPos = null;
        dragMutatedState = false;
        controls.enabled = true;
        renderer.domElement.style.cursor = tileOffsetDragMode ? 'grab' : 'default';
        return;
    }
    if (isDraggingFixture) {
        if (dragMutatedState) {
            recordHistorySnapshot();
        }
        isDraggingFixture = false;
        draggingFixture = null;
        dragMutatedState = false;
        controls.enabled = true;
    }
}

function onContextMenu(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const fixtureHits = raycaster.intersectObjects(fixturesGroup.children, true);
    const fixtureHit = fixtureHits.find(hit => hit.object.parent?.userData?.isFixture || hit.object.userData?.isFixture);
    if (fixtureHit) {
        event.preventDefault();
        const target = fixtureHit.object.userData?.isFixture ? fixtureHit.object : fixtureHit.object.parent;
        fixturesGroup.remove(target);
        ignoreNextClick = true;
        recordHistorySnapshot();
    }
}

// Init
if (undoBtn) undoBtn.addEventListener('click', undoDesignAction);
if (redoBtn) redoBtn.addEventListener('click', redoDesignAction);
if (wallLayoutOpenBtn) {
    wallLayoutOpenBtn.addEventListener('click', () => setWallLayoutPreset(WALL_LAYOUT_OPEN));
}
if (wallLayoutFullBtn) {
    wallLayoutFullBtn.addEventListener('click', () => setWallLayoutPreset(WALL_LAYOUT_FULL));
}
if (topBarToggleBtn) {
    topBarToggleBtn.addEventListener('click', () => {
        const collapsed = draftToolbar?.classList.contains('is-collapsed');
        setTopBarCollapsed(!collapsed);
    });
}

document.addEventListener('keydown', onUndoRedoHotkey);

const wallHeightInput = document.getElementById('wallHeightInfo');
if (wallHeightInput) {
    wallHeightInput.addEventListener('change', () => {
        recordHistorySnapshot();
    });
}

const gridWInput = document.getElementById('gridW');
const gridHInput = document.getElementById('gridH');
if (gridWInput && gridHInput) {
    const onGridInput = () => {
        applyGridDimensionsFromInputs({ commitInputValue: false, recordHistory: false });
    };
    const onGridCommit = () => {
        applyGridDimensionsFromInputs({ commitInputValue: true, recordHistory: true });
    };

    gridWInput.addEventListener('input', onGridInput);
    gridHInput.addEventListener('input', onGridInput);
    gridWInput.addEventListener('change', onGridCommit);
    gridHInput.addEventListener('change', onGridCommit);
    gridWInput.addEventListener('blur', onGridCommit);
    gridHInput.addEventListener('blur', onGridCommit);
}

if (realImageOpenBtn) {
    realImageOpenBtn.addEventListener('click', openRealImageModal);
}

if (realImageModalCloseBtn) {
    realImageModalCloseBtn.addEventListener('click', closeRealImageModal);
}

if (realImageModal) {
    realImageModal.addEventListener('click', (event) => {
        if (event.target === realImageModal) {
            closeRealImageModal();
        }
    });
}

if (realModalImageInput) {
    realModalImageInput.addEventListener('change', () => {
        const roomImage = realModalImageInput.files?.[0];
        if (!roomImage) {
            setRealModalStatus('');
            resetRealModalPreview();
            return;
        }
        testRealImageWithOpenRouter(roomImage);
    });
}

if (realModalDownloadBtn) {
    realModalDownloadBtn.addEventListener('click', (event) => {
        if (!realGeneratedImageDataUrl || !realGeneratedImageDataUrl.startsWith('data:image/')) {
            event.preventDefault();
            return;
        }

        const tempLink = document.createElement('a');
        tempLink.href = realGeneratedImageDataUrl;
        tempLink.download = 'room-ai-result.png';
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
    });
}

setTopBarCollapsed(false);
updateHistoryButtons();
syncWallLayoutControls();
setRealModalStatus('');
resetRealModalPreview();

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeRealImageModal();
    }
});

renderWallTextureOptions();
renderWallSwatches();
renderTileSwatches();

let loadedAutosave = false;
try {
    const autosave = window.localStorage?.getItem('pm69-floorplanner:autosave:v1');
    if (autosave) {
        const state = JSON.parse(autosave);
        applyDesignState(state);
        recordHistorySnapshot({ force: true });
        
        applySelectedWallLayoutPreset();
        renderUI();
        syncWallLayoutControls();
        build3D();
        renderFixtureSwatches();
        updatePriceSummary();
        loadedAutosave = true;
    }
} catch(e) {}

if (!loadedAutosave) {
    window.resetGrid();
}

initDraftSlotsUI({
    serializeDesignState,
    applyDesignState,
    onStateLoaded: () => {
        recordHistorySnapshot();
    }
});

// Quotation Export
renderer._scene = scene;
renderer._camera = camera;
initQuotationUI({
    getDesignInfo: () => {
        const tileMeta = getTileMetaByKey(tilePattern);
        const wallMeta = wallTextureList.find(w => w.key === wallPattern);
        const summary = updatePriceSummary();

        return {
            tileCount: summary.tilesWithWaste,
            totalAreaSqm: summary.totalAreaSqm,
            rawTilesNeeded: summary.rawTilesNeeded,
            tilesWithWaste: summary.tilesWithWaste,
            tilesPerBox: summary.tilesPerBox,
            boxCount: summary.boxCount,
            pricePerBox: summary.pricePerBox,
            totalPrice: summary.totalPrice,
            tilePatternLabel: tileMeta?.label || tilePattern,
            wallPatternLabel: wallMeta?.label || wallPattern,
            gridWidth,
            gridHeight,
            wallHeight: Number(wallHeight)
        };
    },
    captureRoomImage: () => {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/jpeg', 0.92);
    }
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
animate();
