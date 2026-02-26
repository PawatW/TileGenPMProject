export function createQuarterCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // พื้นหลัง
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 512, 512);

    // วาดเสี้ยววงกลม (Quarter Circle) ที่มุมขวาล่าง
    ctx.beginPath();
    ctx.moveTo(512, 512); // มุมขวาล่าง
    ctx.arc(512, 512, 450, Math.PI, 1.5 * Math.PI); // วาดโค้ง
    ctx.lineTo(512, 512);
    ctx.fillStyle = '#2c3e50'; // สีวงกลม
    ctx.fill();

    // เส้นขอบกระเบื้อง
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, 512, 512);

    return canvas;
}

export function createCheckerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const size = 64;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#f5f5f5' : '#cfd8dc';
            ctx.fillRect(x * size, y * size, size, size);
        }
    }
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);
    return canvas;
}

export function createDiagonalStripeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2efe9';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#b0a99f';
    ctx.lineWidth = 20;
    for (let i = -512; i <= 512; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 512, 512);
        ctx.stroke();
    }
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);
    return canvas;
}

export function createTerrazzoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7f4ef';
    ctx.fillRect(0, 0, 512, 512);
    const colors = ['#d19c7c', '#8aa1b1', '#c9c3b8', '#a4b494'];
    for (let i = 0; i < 220; i++) {
        ctx.fillStyle = colors[i % colors.length];
        const r = 6 + Math.random() * 14;
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);
    return canvas;
}

export function createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b14f44';
    ctx.fillRect(0, 0, 512, 512);

    const brickH = 48;
    const brickW = 96;
    const mortar = 6;
    for (let y = 0; y < 512; y += brickH + mortar) {
        const offset = (Math.floor(y / (brickH + mortar)) % 2) * (brickW / 2);
        for (let x = -brickW; x < 512 + brickW; x += brickW + mortar) {
            const rx = x + offset;
            ctx.fillStyle = '#9a3f37';
            ctx.fillRect(rx, y, brickW, brickH);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(rx + 6, y + 6, brickW - 12, brickH - 12);
        }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += brickH + mortar) {
        ctx.beginPath();
        ctx.moveTo(0, y - mortar / 2);
        ctx.lineTo(512, y - mortar / 2);
        ctx.stroke();
    }
    return canvas;
}

export function createPlasterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2f0eb';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
        const g = 230 + Math.floor(Math.random() * 15);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.globalAlpha = 1;
    return canvas;
}

export function createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1500; i++) {
        const g = 170 + Math.floor(Math.random() * 40);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,120,120,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
    return canvas;
}

export function createWallTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d2d2d2';
    ctx.lineWidth = 6;
    const size = 128;
    for (let y = 0; y <= 512; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }
    for (let x = 0; x <= 512; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
    }
    return canvas;
}

export function createWindowTextureCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#c7e3ff');
    gradient.addColorStop(1, '#8abfff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 20;
    ctx.strokeRect(24, 24, 464, 464);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(36, 36, 440, 440);

    ctx.fillStyle = gradient;
    ctx.fillRect(60, 60, 392, 392);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(246, 60, 20, 392);
    ctx.fillRect(60, 246, 392, 20);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(90, 90, 120, 80);
    return canvas;
}

export function createDoorTextureCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#c28b6a');
    gradient.addColorStop(1, '#9a6a4a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 1024);

    ctx.strokeStyle = '#7c4a2d';
    ctx.lineWidth = 18;
    ctx.strokeRect(28, 24, 456, 976);

    ctx.fillStyle = '#d2a07b';
    ctx.fillRect(90, 140, 332, 240);
    ctx.fillStyle = '#b98561';
    ctx.fillRect(90, 430, 332, 520);

    ctx.strokeStyle = '#b88763';
    ctx.lineWidth = 10;
    ctx.strokeRect(90, 140, 332, 240);
    ctx.strokeRect(90, 430, 332, 520);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(410, 560, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(120, 210, 80, 18);
    return canvas;
}
