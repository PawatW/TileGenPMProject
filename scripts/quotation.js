/**
 * quotation.js — Quotation PDF Export
 * สร้างใบเสนอราคา (Quotation) เป็น PDF พร้อมรูป 3D ของห้องที่ออกแบบ
 * ใช้ jsPDF เพื่อ generate PDF ฝั่ง client โดยไม่ต้องมี server
 */

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const PDF_THAI_FONT_URL = './assets/fonts/Sarabun-Regular.ttf';
const PDF_THAI_FONT_FILE = 'Sarabun-Regular.ttf';
const PDF_THAI_FONT_FAMILY = 'Sarabun';

let jsPDFModule = null;
let thaiFontBase64Promise = null;

async function loadJsPDF() {
    if (jsPDFModule) return jsPDFModule;
    if (window.jspdf?.jsPDF) {
        jsPDFModule = window.jspdf.jsPDF;
        return jsPDFModule;
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = JSPDF_CDN;
        script.onload = () => {
            jsPDFModule = window.jspdf.jsPDF;
            resolve(jsPDFModule);
        };
        script.onerror = () => reject(new Error('ไม่สามารถโหลด jsPDF ได้'));
        document.head.appendChild(script);
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(value);
}

function arrayBufferToBase64(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

async function loadThaiFontBase64() {
    if (!thaiFontBase64Promise) {
        thaiFontBase64Promise = fetch(PDF_THAI_FONT_URL)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`โหลดฟอนต์ PDF ไม่สำเร็จ (${res.status})`);
                }
                return res.arrayBuffer();
            })
            .then(arrayBufferToBase64);
    }
    return thaiFontBase64Promise;
}

async function ensurePdfThaiFont(doc) {
    const fontList = doc.getFontList?.() || {};
    const hasThaiFont = Array.isArray(fontList[PDF_THAI_FONT_FAMILY])
        ? fontList[PDF_THAI_FONT_FAMILY].includes('normal')
        : false;

    if (!hasThaiFont) {
        const base64 = await loadThaiFontBase64();
        doc.addFileToVFS(PDF_THAI_FONT_FILE, base64);
        doc.addFont(PDF_THAI_FONT_FILE, PDF_THAI_FONT_FAMILY, 'normal');
        doc.addFont(PDF_THAI_FONT_FILE, PDF_THAI_FONT_FAMILY, 'bold');
    }

    return PDF_THAI_FONT_FAMILY;
}

function captureRendererImage(renderer) {
    renderer.render(renderer._scene, renderer._camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.92);
}

function detectDataUrlImageType(dataUrl) {
    const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,/.exec(dataUrl || '');
    const subtype = (match?.[1] || '').toLowerCase();
    if (subtype === 'png') return 'PNG';
    if (subtype === 'webp') return 'WEBP';
    return 'JPEG';
}

function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height
            });
        };
        img.onerror = () => reject(new Error('ไม่สามารถอ่านขนาดรูปสำหรับ PDF ได้'));
        img.src = dataUrl;
    });
}

/**
 * สร้าง PDF ใบเสนอราคา
 * @param {object} params
 * @param {string} params.customerName - ชื่อลูกค้า
 * @param {string} params.projectName - ชื่อโปรเจค
 * @param {number} params.tileCount - จำนวนกระเบื้อง (แผ่น)
 * @param {number} params.tilesPerBox - จำนวนแผ่น/กล่อง
 * @param {number} params.tilePrice - ราคาต่อแผ่น (บาท)
 * @param {string} params.tilePatternLabel - ชื่อลายกระเบื้อง
 * @param {string} params.wallPatternLabel - ชื่อลายผนัง
 * @param {number} params.gridWidth - ขนาด grid กว้าง
 * @param {number} params.gridHeight - ขนาด grid ลึก
 * @param {number} params.wallHeight - ความสูงกำแพง (m)
 * @param {string} params.roomImageDataUrl - ภาพ 3D ห้อง (data URL)
 */
export async function generateQuotationPDF(params) {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let fontFamily = 'Helvetica';
    try {
        fontFamily = await ensurePdfThaiFont(doc);
    } catch (err) {
        console.warn('ใช้ฟอนต์ไทยใน PDF ไม่สำเร็จ, fallback เป็น Helvetica:', err);
    }

    const setDocFont = (style = 'normal') => {
        doc.setFont(fontFamily, style);
    };

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = margin;

    setDocFont('normal');

    // === Header ===
    doc.setFillColor(180, 138, 61); // brand gold
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('QUOTATION', margin, 18);
    doc.setFontSize(10);
    doc.text('Room Design Quotation', margin, 26);
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, pageW - margin, 18, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Ref: QT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, 26, { align: 'right' });

    y = 48;
    doc.setTextColor(28, 26, 23);

    // === Customer / Project Info ===
    doc.setFontSize(11);
    setDocFont('bold');
    doc.text('Customer:', margin, y);
    setDocFont('normal');
    doc.text(params.customerName || '-', margin + 28, y);
    y += 7;
    setDocFont('bold');
    doc.text('Project:', margin, y);
    setDocFont('normal');
    doc.text(params.projectName || '-', margin + 28, y);
    y += 12;

    // === Room Image ===
    if (params.roomImageDataUrl) {
        const { width: rawW, height: rawH } = await getImageDimensions(params.roomImageDataUrl);
        const imageType = detectDataUrlImageType(params.roomImageDataUrl);
        const safeRatio = rawW > 0 && rawH > 0 ? (rawH / rawW) : 0.55;

        let imgW = contentW;
        let imgH = imgW * safeRatio;
        const maxImageHeight = 120;

        if (imgH > maxImageHeight) {
            imgH = maxImageHeight;
            imgW = imgH / safeRatio;
        }

        const imgX = margin + (contentW - imgW) / 2;

        doc.addImage(params.roomImageDataUrl, imageType, imgX, y, imgW, imgH);
        // border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(imgX, y, imgW, imgH, 'S');
        y += imgH + 8;
    }

    // === Room Spec Summary ===
    doc.setFontSize(12);
    setDocFont('bold');
    doc.text('Room Specification', margin, y);
    y += 7;

    const specRows = [
        ['Grid Size', `${params.gridWidth} x ${params.gridHeight} units`],
        ['Wall Height', `${params.wallHeight} m`],
        ['Tile Pattern', params.tilePatternLabel || '-'],
        ['Wall Pattern', params.wallPatternLabel || '-'],
    ];

    doc.setFontSize(10);
    setDocFont('normal');
    specRows.forEach(([label, value]) => {
        setDocFont('bold');
        doc.text(label, margin + 2, y);
        setDocFont('normal');
        doc.text(value, margin + 50, y);
        y += 6;
    });
    y += 4;

    // === Cost Table ===
    const tileCount = params.tileCount || 0;
    const tilesPerBox = params.tilesPerBox || 1;
    const boxCount = Math.ceil(tileCount / tilesPerBox);
    const tilePrice = params.tilePrice || 0;
    const totalPrice = tileCount * tilePrice;

    // Table header
    doc.setFillColor(245, 241, 232);
    doc.rect(margin, y, contentW, 9, 'F');
    doc.setDrawColor(200, 196, 188);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 9, 'S');

    const cols = [margin + 2, margin + 70, margin + 100, margin + 130];
    doc.setFontSize(10);
    setDocFont('bold');
    doc.setTextColor(80, 75, 65);
    const headerY = y + 6.5;
    doc.text('Item', cols[0], headerY);
    doc.text('Qty', cols[1], headerY);
    doc.text('Unit Price', cols[2], headerY);
    doc.text('Total', cols[3], headerY);
    y += 9;

    // Row 1: Tiles
    setDocFont('normal');
    doc.setTextColor(28, 26, 23);
    doc.setDrawColor(230, 226, 218);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentW, 9, 'S');

    const row1Y = y + 6.5;
    doc.text(`Tiles (${params.tilePatternLabel || '-'})`, cols[0], row1Y);
    doc.text(`${tileCount} pcs`, cols[1], row1Y);
    doc.text(`${formatCurrency(tilePrice)} B`, cols[2], row1Y);
    doc.text(`${formatCurrency(totalPrice)} B`, cols[3], row1Y);
    y += 9;

    // Row 2: Boxes
    doc.rect(margin, y, contentW, 9, 'S');
    const row2Y = y + 6.5;
    doc.text(`Boxes (${tilesPerBox} pcs/box)`, cols[0], row2Y);
    doc.text(`${boxCount} boxes`, cols[1], row2Y);
    doc.text('-', cols[2], row2Y);
    doc.text('-', cols[3], row2Y);
    y += 9;

    // Total row
    doc.setFillColor(255, 245, 225);
    doc.rect(margin, y, contentW, 11, 'F');
    doc.setDrawColor(232, 216, 178);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, 11, 'S');
    setDocFont('bold');
    doc.setFontSize(12);
    const totalY = y + 8;
    doc.text('TOTAL', cols[0], totalY);
    doc.text(`${formatCurrency(totalPrice)} Baht`, cols[3], totalY);
    y += 18;

    // === Footer ===
    doc.setFontSize(8);
    setDocFont('normal');
    doc.setTextColor(140, 135, 125);
    doc.text('Generated by 69 PM Floor Planner', margin, 285);
    doc.text(dateStr, pageW - margin, 285, { align: 'right' });

    // === Save ===
    const filename = `Quotation_${(params.projectName || 'Room').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return filename;
}

/**
 * Wire up the Export Quotation UI
 */
export function initQuotationUI({ getDesignInfo, captureRoomImage }) {
    const exportBtn = document.getElementById('quotationExportBtn');
    const customerInput = document.getElementById('quotationCustomer');
    const projectInput = document.getElementById('quotationProject');
    const tilesPerBoxInput = document.getElementById('quotationTilesPerBox');
    const statusNote = document.getElementById('quotationStatus');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', async () => {
        exportBtn.disabled = true;
        exportBtn.textContent = 'กำลังสร้าง PDF...';
        if (statusNote) statusNote.textContent = '';

        try {
            const info = getDesignInfo();
            const roomImageDataUrl = captureRoomImage();

            const filename = await generateQuotationPDF({
                customerName: customerInput?.value?.trim() || '',
                projectName: projectInput?.value?.trim() || '',
                tileCount: info.tileCount,
                tilesPerBox: parseInt(tilesPerBoxInput?.value) || 4,
                tilePrice: info.tilePrice,
                tilePatternLabel: info.tilePatternLabel,
                wallPatternLabel: info.wallPatternLabel,
                gridWidth: info.gridWidth,
                gridHeight: info.gridHeight,
                wallHeight: info.wallHeight,
                roomImageDataUrl
            });

            if (statusNote) statusNote.textContent = `Saved: ${filename}`;
        } catch (err) {
            console.error('Quotation export error:', err);
            if (statusNote) statusNote.textContent = `Error: ${err.message}`;
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export Quotation (PDF)';
        }
    });
}
