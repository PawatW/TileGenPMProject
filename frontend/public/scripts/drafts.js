const DRAFT_SLOT_COUNT = 5;
const TOKEN_KEY = 'pm_token_v1';

// ── user-scoped storage key ───────────────────────────────────────────────────
// Decode user ID from JWT (no library needed — just base64 the payload)

function getCurrentUserId() {
    const token = window.localStorage?.getItem(TOKEN_KEY);
    if (!token) return 'anonymous';
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || 'anonymous';
    } catch {
        return 'anonymous';
    }
}

function getDraftStorageKey() {
    return `pm69-floorplanner:drafts:v1:${getCurrentUserId()}`;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
}

function readDraftStore() {
    const raw = window.localStorage?.getItem(getDraftStorageKey());
    const parsed = raw ? safeJsonParse(raw, null) : null;
    if (!parsed || typeof parsed !== 'object') return { version: 1, slots: {} };
    if (!parsed.slots || typeof parsed.slots !== 'object') parsed.slots = {};
    parsed.version = 1;
    return parsed;
}

function writeDraftStore(store) {
    window.localStorage?.setItem(getDraftStorageKey(), JSON.stringify(store));
}

// ── API helpers ───────────────────────────────────────────────────────────────

function getAuthToken() {
    return window.localStorage?.getItem(TOKEN_KEY) || null;
}

async function apiSaveSlot(slotId, name, state) {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch(`/api/designs/slot/slot_${slotId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name, state }),
        });
    } catch (e) {
        console.warn('[drafts] API save failed (using localStorage only):', e);
    }
}

async function apiLoadSlot(slotId) {
    const token = getAuthToken();
    if (!token) return null;
    try {
        const res = await fetch(`/api/designs/slot/slot_${slotId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return await res.json(); // { slotKey, name, savedAt, state } | null
    } catch (e) {
        console.warn('[drafts] API load failed (using localStorage):', e);
        return null;
    }
}

async function apiDeleteSlot(slotId) {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch(`/api/designs/slot/slot_${slotId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    } catch (e) {
        console.warn('[drafts] API delete failed:', e);
    }
}

async function apiListSlots() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        const res = await fetch('/api/designs/slots', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return await res.json(); // { slot_1: { slotKey, name, savedAt }, ... }
    } catch {
        return null;
    }
}

// ── UI init ───────────────────────────────────────────────────────────────────

/** Design เริ่มต้นสำหรับผู้ใช้ใหม่ — ห้อง 4×4 m พร้อมกระเบื้อง หน้าต่าง และประตู */
const DEFAULT_DESIGN_STATE = {
    schemaVersion: 4,
    gridWidth: 4.0,
    gridHeight: 4.0,
    wallHeight: 2.5,
    tilePattern: 'mosaic_hideaway_alpine',
    wallPattern: 'paint',
    wallLayoutPreset: 'full',
    wallLayoutMode: 'full',
    gridData: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
    ],
    rotationData: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    flipData: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    floorTextureData: {},
    wallTextureData: {},
    customTiles: [],
    customWalls: [],
    customFixtures: [],
    removedWalls: [],
    tileOffsets: {},
    tileGlobalTransforms: {},
    fixtures: [
        // หน้าต่างกลางผนังด้านบน (cell 1,0 — top wall)
        {
            type: 'window',
            position: { x: -0.5, y: 1.6, z: -2.0 },
            rotation: { y: 0 },
            attachedWallKey: '1,0,top'
        },
        // ประตูผนังด้านล่าง (cell 2,3 — bottom wall)
        {
            type: 'door',
            position: { x: 0.5, y: 1.0, z: 2.0 },
            rotation: { y: 0 },
            attachedWallKey: '2,3,bottom'
        },
    ],
};

export async function initDraftSlotsUI({ serializeDesignState, applyDesignState, onStateLoaded } = {}) {
    if (typeof serializeDesignState !== 'function' || typeof applyDesignState !== 'function') return;

    const slotSelect = document.getElementById('draftSlotSelect');
    const nameInput  = document.getElementById('draftNameInput');
    const saveBtn    = document.getElementById('draftSaveBtn');
    const loadBtn    = document.getElementById('draftLoadBtn');
    const deleteBtn  = document.getElementById('draftDeleteBtn');
    const metaNote   = document.getElementById('draftMetaNote');
    if (!slotSelect || !nameInput || !saveBtn || !loadBtn || !deleteBtn || !metaNote) return;

    // Merge API slot metadata into localStorage on init
    const apiSlots = await apiListSlots();
    if (apiSlots) {
        const store = readDraftStore();
        for (const [slotKey, meta] of Object.entries(apiSlots)) {
            const id = slotKey.replace('slot_', '');
            if (meta && !store.slots[id]) {
                // Slot exists on server but not locally — reflect name/date
                store.slots[id] = { name: meta.name, savedAt: meta.savedAt };
            }
        }
        writeDraftStore(store);
    }

    const refresh = () => {
        const store = readDraftStore();
        const selected = slotSelect.value || '1';
        slotSelect.innerHTML = '';

        for (let i = 1; i <= DRAFT_SLOT_COUNT; i++) {
            const id = String(i);
            const slot = store.slots[id];
            const label = slot?.name ? `Slot ${i} — ${slot.name}` : `Slot ${i} — (ว่าง)`;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = label;
            slotSelect.appendChild(option);
        }

        slotSelect.value = selected;
        const slot = store.slots[slotSelect.value];
        nameInput.value = slot?.name ?? '';
        if (slot?.savedAt) {
            metaNote.textContent = `บันทึกล่าสุด: ${new Date(slot.savedAt).toLocaleString('th-TH')}`;
        } else {
            metaNote.textContent = 'ยังไม่มีข้อมูลใน Slot นี้';
        }
    };

    slotSelect.addEventListener('change', refresh);

    saveBtn.addEventListener('click', async () => {
        const slotId = slotSelect.value || '1';
        const store = readDraftStore();
        const now = new Date().toISOString();
        const name = (nameInput.value || '').trim() || store.slots?.[slotId]?.name || `แบบร่าง ${slotId}`;
        const state = serializeDesignState();

        // Save to localStorage immediately for instant feedback
        store.slots[slotId] = { name, savedAt: now, state };
        writeDraftStore(store);
        refresh();
        metaNote.textContent = `บันทึกแล้ว: ${new Date(now).toLocaleString('th-TH')}`;

        // Sync to API in background
        await apiSaveSlot(slotId, name, state);
    });

    loadBtn.addEventListener('click', async () => {
        const slotId = slotSelect.value || '1';
        metaNote.textContent = 'กำลังโหลด…';

        // Try API first; fall back to localStorage
        const apiData = await apiLoadSlot(slotId);
        let stateToLoad = null;
        let slotName = '';
        let savedAt = null;

        if (apiData?.state) {
            stateToLoad = apiData.state;
            slotName = apiData.name ?? '';
            savedAt = apiData.savedAt;

            // Mirror into localStorage
            const store = readDraftStore();
            store.slots[slotId] = { name: slotName, savedAt, state: stateToLoad };
            writeDraftStore(store);
        } else {
            const store = readDraftStore();
            const slot = store.slots[slotId];
            if (slot?.state) {
                stateToLoad = slot.state;
                slotName = slot.name ?? '';
                savedAt = slot.savedAt;
            }
        }

        if (!stateToLoad) {
            metaNote.textContent = 'Slot นี้ว่างอยู่ (ยังไม่มีแบบร่าง)';
            return;
        }

        applyDesignState(stateToLoad);
        if (typeof onStateLoaded === 'function') onStateLoaded(stateToLoad);
        nameInput.value = slotName;
        metaNote.textContent = savedAt
            ? `โหลดแล้ว (บันทึกล่าสุด: ${new Date(savedAt).toLocaleString('th-TH')})`
            : 'โหลดแล้ว';
    });

    deleteBtn.addEventListener('click', async () => {
        const slotId = slotSelect.value || '1';
        const store = readDraftStore();
        if (!store.slots[slotId]) {
            metaNote.textContent = 'Slot นี้ว่างอยู่';
            return;
        }
        const ok = window.confirm('ลบแบบร่างใน Slot นี้ใช่ไหม?');
        if (!ok) return;
        delete store.slots[slotId];
        writeDraftStore(store);
        refresh();
        metaNote.textContent = 'ลบ Slot แล้ว';
        await apiDeleteSlot(slotId);
    });

    refresh();

    // Auto-load slot ถ้ามาจาก dashboard (?slot=N)
    const autoSlot = window.__autoLoadSlot;
    if (autoSlot) {
        delete window.__autoLoadSlot;
        slotSelect.value = String(autoSlot);
        refresh();
        loadBtn.click();
        return;
    }

    const isNewUser = apiSlots !== null && Object.keys(apiSlots).length === 0;
    const hasLocalData = Object.values(readDraftStore().slots).some(s => s?.state);

    // ผู้ใช้ที่มี draft บันทึกไว้ → โหลด slot แรกที่เจออัตโนมัติ
    if (!isNewUser && apiSlots && Object.keys(apiSlots).length > 0) {
        const firstSlotKey = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5']
            .find(k => apiSlots[k]);
        if (firstSlotKey) {
            const firstId = firstSlotKey.replace('slot_', '');
            slotSelect.value = firstId;
            refresh();
            loadBtn.click();
            return;
        }
    }

    // ผู้ใช้ใหม่ (API ตอบว่าไม่มี slot ใดเลย และ localStorage ก็ว่าง)
    // → โหลด default design ให้ทันที
    if (isNewUser && !hasLocalData) {
        applyDesignState(DEFAULT_DESIGN_STATE);
        if (typeof onStateLoaded === 'function') onStateLoaded(DEFAULT_DESIGN_STATE);
        metaNote.textContent = 'โหลด Design ตัวอย่างสำหรับผู้ใช้ใหม่';
    }
}
