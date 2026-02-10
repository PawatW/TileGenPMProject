export const tilePatternList = [
    { key: 'quarter', label: 'ลายโค้ง', type: 'canvas' },
    { key: 'checker', label: 'ตารางสลับ', type: 'canvas' },
    { key: 'diagonal', label: 'เส้นเฉียง', type: 'canvas' },
    { key: 'terrazzo', label: 'เทอราซโซ', type: 'canvas' },
    { key: 'real1', label: 'ภาพจริง 1', type: 'image', url: './floor-1.jpeg' },
    { key: 'real2', label: 'ภาพจริง 2', type: 'image', url: './floor-2.jpeg' },
    { key: 'real3', label: 'ภาพจริง 3', type: 'image', url: './floor-3.jpeg' }
];

export function createWallTextureList(canvases) {
    return [
        { key: 'paint', label: 'สีเรียบ', type: 'solid', color: 0xeeeeee, roughness: 0.9, metalness: 0.0 },
        { key: 'brick', label: 'อิฐก่อ', type: 'canvas', canvas: canvases.brick, options: { bumpScale: 0.08, roughness: 0.85 } },
        { key: 'plaster', label: 'ปูนฉาบ', type: 'canvas', canvas: canvases.plaster, options: { bumpScale: 0.03, roughness: 0.9 } },
        { key: 'concrete', label: 'คอนกรีต', type: 'canvas', canvas: canvases.concrete, options: { bumpScale: 0.04, roughness: 0.95 } },
        { key: 'walltile', label: 'กระเบื้องผนัง', type: 'canvas', canvas: canvases.walltile, options: { bumpScale: 0.02, roughness: 0.5 } },
        { key: 'wallreal1', label: 'ภาพจริง 1', type: 'image', url: './wall-1.jpeg', repeatX: 2, repeatYPerMeter: 1 },
        { key: 'wallreal2', label: 'ภาพจริง 2', type: 'image', url: './wall-2.jpeg', repeatX: 2, repeatYPerMeter: 1 }
    ];
}

export const fixtureCatalog = [
    {
        key: 'window',
        label: 'หน้าต่าง',
        type: 'window',
        width: 0.9,
        height: 0.8,
        depth: 0.08,
        preview: {
            base: '#93c5fd',
            accent: '#e2e8f0'
        }
    },
    {
        key: 'door',
        label: 'ประตู',
        type: 'door',
        width: 0.95,
        height: 2.0,
        depth: 0.1,
        preview: {
            base: '#b08968',
            accent: '#fef9c3'
        }
    }
];
