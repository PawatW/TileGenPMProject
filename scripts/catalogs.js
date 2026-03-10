export const tilePatternList = [
    { key: 'devonoir_graphite', label: 'เดโวนัวร์ กราไฟต์ PM', type: 'image', url: './assets/images/tiles/floor-1.jpeg', width: 18, length: 18, unit: 'inch', pricePerBox: 275.00, tilesPerBox: 6 },
    { key: 'mosaic_hideaway_alpine', label: 'MT4SR1ไฮด์อเวย์อัลไพน์ เทาอ่อน', type: 'image', url: './assets/images/tiles/floor-2.jpeg', width: 12, length: 12, unit: 'inch', pricePerBox: 1230.00, tilesPerBox: 10 },
    { key: 'real3', label: 'ภาพจริง 3', type: 'image', url: './assets/images/tiles/floor-3.jpeg', width: 60, length: 60, unit: 'cm', pricePerBox: 150, tilesPerBox: 4 },
    { key: '8852406563861', label: 'FT 45x45 เชฟรอน มาร์เบิล (ซาติน) PM', type: 'image', url: './assets/images/tiles/floor-4.jpeg', width: 18, length: 18, unit: 'inch', pricePerBox: 250.00, tilesPerBox: 5 },
    { key: 'quarter', label: 'ลายโค้ง', type: 'canvas', width: 40, length: 40, unit: 'inch', pricePerBox: 150, tilesPerBox: 4 },
    { key: 'checker', label: 'ตารางสลับ', type: 'canvas', width: 60, length: 60, unit: 'cm', pricePerBox: 150, tilesPerBox: 4 },
    { key: 'diagonal', label: 'เส้นเฉียง', type: 'canvas', width: 60, length: 60, unit: 'cm', pricePerBox: 150, tilesPerBox: 4 },
    { key: 'terrazzo', label: 'เทอราซโซ', type: 'canvas', width: 60, length: 60, unit: 'cm', pricePerBox: 150, tilesPerBox: 4 },
];

export function createWallTextureList(canvases) {
    return [
        { key: '8851740037922', label: 'ทรูเนเจอร์ ไลท์ บริค สีส้ม', type: 'image', url: './assets/images/walls/wall-1.jpeg', repeatX: 2, repeatYPerMeter: 1 },
        { key: '8851740036185', label: 'ทรูเนเจอร์ รัสติค บริค สีน้ำตาล', type: 'image', url: './assets/images/walls/wall-2.jpeg', repeatX: 2, repeatYPerMeter: 1 },
        { key: 'wallreal3', label: 'ไฮด์อเวย์ อัลไพน์ เทา', type: 'image', url: './assets/images/walls/wall-3.jpeg', repeatX: 2, repeatYPerMeter: 2 },
        { key: 'paint', label: 'สีเรียบ', type: 'solid', color: 0xeeeeee, roughness: 0.9, metalness: 0.0 },
        { key: 'brick', label: 'อิฐก่อ', type: 'canvas', canvas: canvases.brick, options: { bumpScale: 0.08, roughness: 0.85 } },
        { key: 'plaster', label: 'ปูนฉาบ', type: 'canvas', canvas: canvases.plaster, options: { bumpScale: 0.03, roughness: 0.9 } },
        { key: 'concrete', label: 'คอนกรีต', type: 'canvas', canvas: canvases.concrete, options: { bumpScale: 0.04, roughness: 0.95 } },
        { key: 'walltile', label: 'กระเบื้องผนัง', type: 'canvas', canvas: canvases.walltile, options: { bumpScale: 0.02, roughness: 0.5 } },
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
