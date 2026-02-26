const DRAFT_STORAGE_KEY = 'pm69-floorplanner:drafts:v1';
const DRAFT_SLOT_COUNT = 5;

function safeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

function readDraftStore() {
    const raw = window.localStorage?.getItem(DRAFT_STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw, null) : null;
    if (!parsed || typeof parsed !== 'object') {
        return { version: 1, slots: {} };
    }
    if (!parsed.slots || typeof parsed.slots !== 'object') {
        parsed.slots = {};
    }
    parsed.version = 1;
    return parsed;
}

function writeDraftStore(store) {
    window.localStorage?.setItem(DRAFT_STORAGE_KEY, JSON.stringify(store));
}

export function initDraftSlotsUI({ serializeDesignState, applyDesignState, onStateLoaded } = {}) {
    if (typeof serializeDesignState !== 'function' || typeof applyDesignState !== 'function') return;

    const slotSelect = document.getElementById('draftSlotSelect');
    const nameInput = document.getElementById('draftNameInput');
    const saveBtn = document.getElementById('draftSaveBtn');
    const loadBtn = document.getElementById('draftLoadBtn');
    const deleteBtn = document.getElementById('draftDeleteBtn');
    const metaNote = document.getElementById('draftMetaNote');
    if (!slotSelect || !nameInput || !saveBtn || !loadBtn || !deleteBtn || !metaNote) return;

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
            const dateText = new Date(slot.savedAt).toLocaleString('th-TH');
            metaNote.textContent = `บันทึกล่าสุด: ${dateText}`;
        } else {
            metaNote.textContent = 'ยังไม่มีข้อมูลใน Slot นี้';
        }
    };

    slotSelect.addEventListener('change', refresh);

    saveBtn.addEventListener('click', () => {
        const slotId = slotSelect.value || '1';
        const store = readDraftStore();
        const now = new Date().toISOString();
        const name = (nameInput.value || '').trim() || store.slots?.[slotId]?.name || `แบบร่าง ${slotId}`;

        store.slots[slotId] = {
            name,
            savedAt: now,
            state: serializeDesignState()
        };
        writeDraftStore(store);
        refresh();
        metaNote.textContent = `บันทึกแล้ว: ${new Date(now).toLocaleString('th-TH')}`;
    });

    loadBtn.addEventListener('click', () => {
        const slotId = slotSelect.value || '1';
        const store = readDraftStore();
        const slot = store.slots[slotId];
        if (!slot?.state) {
            metaNote.textContent = 'Slot นี้ว่างอยู่ (ยังไม่มีแบบร่าง)';
            return;
        }
        applyDesignState(slot.state);
        if (typeof onStateLoaded === 'function') {
            onStateLoaded(slot.state);
        }
        nameInput.value = slot?.name ?? '';
        metaNote.textContent = slot?.savedAt
            ? `โหลดแล้ว (บันทึกล่าสุด: ${new Date(slot.savedAt).toLocaleString('th-TH')})`
            : 'โหลดแล้ว';
    });

    deleteBtn.addEventListener('click', () => {
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
    });

    refresh();
}
