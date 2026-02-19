/**
 * quotation.js — Quotation PDF Export
 * สร้างใบเสนอราคา (Quotation) เป็น PDF พร้อมรูป 3D ของห้องที่ออกแบบ
 * ใช้ jsPDF เพื่อ generate PDF ฝั่ง client โดยไม่ต้องมี server
 */

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

let jsPDFModule = null;

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

function captureRendererImage(renderer) {
    renderer.render(renderer._scene, renderer._camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.92);
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

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = margin;

    // --- Thai font fallback: use Helvetica (built-in), Thai chars render as available glyphs ---
    doc.setFont('Helvetica');

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
    doc.setFont('Helvetica', 'bold');
    doc.text('Customer:', margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(params.customerName || '-', margin + 28, y);
    y += 7;
    doc.setFont('Helvetica', 'bold');
    doc.text('Project:', margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(params.projectName || '-', margin + 28, y);
    y += 12;

    // === Room Image ===
    if (params.roomImageDataUrl) {
        const imgW = contentW;
        const imgH = imgW * 0.55; // ~16:9 aspect
        doc.addImage(params.roomImageDataUrl, 'JPEG', margin, y, imgW, imgH);
        // border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, imgW, imgH, 'S');
        y += imgH + 8;
    }

    // === Room Spec Summary ===
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('Room Specification', margin, y);
    y += 7;

    const specRows = [
        ['Grid Size', `${params.gridWidth} x ${params.gridHeight} units`],
        ['Wall Height', `${params.wallHeight} m`],
        ['Tile Pattern', params.tilePatternLabel || '-'],
        ['Wall Pattern', params.wallPatternLabel || '-'],
    ];

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    specRows.forEach(([label, value]) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(label, margin + 2, y);
        doc.setFont('Helvetica', 'normal');
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
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(80, 75, 65);
    const headerY = y + 6.5;
    doc.text('Item', cols[0], headerY);
    doc.text('Qty', cols[1], headerY);
    doc.text('Unit Price', cols[2], headerY);
    doc.text('Total', cols[3], headerY);
    y += 9;

    // Row 1: Tiles
    doc.setFont('Helvetica', 'normal');
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
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    const totalY = y + 8;
    doc.text('TOTAL', cols[0], totalY);
    doc.text(`${formatCurrency(totalPrice)} Baht`, cols[3], totalY);
    y += 18;

    // === Footer ===
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
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
