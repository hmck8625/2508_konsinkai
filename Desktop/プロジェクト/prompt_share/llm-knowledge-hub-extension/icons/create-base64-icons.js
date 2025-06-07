// Base64 encoded PNG icons generator
// This creates simple colored square icons with "LH" text

const fs = require('fs');
const path = require('path');

// Simple PNG generator using raw binary data
function createSimplePNG(size) {
    // Create a simple colored square with gradient effect
    const colors = {
        16: [66, 133, 244],   // Blue
        48: [52, 168, 83],    // Green  
        128: [66, 133, 244]   // Blue
    };
    
    const color = colors[size] || [66, 133, 244];
    
    // Very simple PNG structure
    const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    const width = Buffer.alloc(4);
    width.writeUInt32BE(size);
    const height = Buffer.alloc(4);
    height.writeUInt32BE(size);
    
    const ihdrData = Buffer.concat([
        width,
        height,
        Buffer.from([8, 2, 0, 0, 0]) // 8-bit depth, RGB, no compression
    ]);
    
    const ihdrLength = Buffer.alloc(4);
    ihdrLength.writeUInt32BE(ihdrData.length);
    
    const ihdrType = Buffer.from('IHDR');
    const ihdrCRC = calculateCRC(Buffer.concat([ihdrType, ihdrData]));
    
    const IHDR = Buffer.concat([
        ihdrLength,
        ihdrType,
        ihdrData,
        ihdrCRC
    ]);
    
    // Create simple image data (solid color with slight gradient)
    const imageData = [];
    for (let y = 0; y < size; y++) {
        imageData.push(0); // Filter byte
        for (let x = 0; x < size; x++) {
            const gradientFactor = 1 - (y / size) * 0.2; // Simple gradient
            imageData.push(Math.floor(color[0] * gradientFactor)); // R
            imageData.push(Math.floor(color[1] * gradientFactor)); // G
            imageData.push(Math.floor(color[2] * gradientFactor)); // B
        }
    }
    
    // Compress using simple zlib deflate (uncompressed block for simplicity)
    const compressedData = simpleDeflate(Buffer.from(imageData));
    
    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(compressedData.length);
    
    const idatType = Buffer.from('IDAT');
    const idatCRC = calculateCRC(Buffer.concat([idatType, compressedData]));
    
    const IDAT = Buffer.concat([
        idatLength,
        idatType,
        compressedData,
        idatCRC
    ]);
    
    // IEND chunk
    const IEND = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    
    return Buffer.concat([PNG_SIGNATURE, IHDR, IDAT, IEND]);
}

// Simple CRC calculation
function calculateCRC(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crc ^ data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xEDB88320;
            } else {
                crc = crc >>> 1;
            }
        }
    }
    crc = crc ^ 0xFFFFFFFF;
    const result = Buffer.alloc(4);
    result.writeUInt32BE(crc >>> 0);
    return result;
}

// Very simple deflate implementation (uncompressed blocks)
function simpleDeflate(data) {
    const chunks = [];
    const chunkSize = 65535;
    
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
        const isLast = i + chunkSize >= data.length;
        
        const header = Buffer.from([
            isLast ? 1 : 0, // BFINAL and BTYPE (00 = uncompressed)
            chunk.length & 0xFF,
            (chunk.length >> 8) & 0xFF,
            ~chunk.length & 0xFF,
            (~chunk.length >> 8) & 0xFF
        ]);
        
        chunks.push(header);
        chunks.push(chunk);
    }
    
    // Add zlib header and checksum
    const zlibHeader = Buffer.from([0x78, 0x01]); // Default compression
    const adler32 = calculateAdler32(data);
    
    return Buffer.concat([zlibHeader, ...chunks, adler32]);
}

// Adler-32 checksum
function calculateAdler32(data) {
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
        a = (a + data[i]) % 65521;
        b = (b + a) % 65521;
    }
    const result = Buffer.alloc(4);
    result.writeUInt32BE((b << 16) | a);
    return result;
}

// Create base64 encoded icons
const sizes = [16, 48, 128];
const base64Icons = {};

sizes.forEach(size => {
    const png = createSimplePNG(size);
    base64Icons[size] = png.toString('base64');
});

// Generate JavaScript file with base64 data
const jsContent = `// Auto-generated base64 PNG icons
const icons = {
    16: 'data:image/png;base64,${base64Icons[16]}',
    48: 'data:image/png;base64,${base64Icons[48]}',
    128: 'data:image/png;base64,${base64Icons[128]}'
};

// Node.js script to create icon files
if (typeof require !== 'undefined' && require.main === module) {
    const fs = require('fs');
    const path = require('path');
    
    Object.entries(icons).forEach(([size, dataUrl]) => {
        const base64Data = dataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = path.join(__dirname, \`icon-\${size}.png\`);
        fs.writeFileSync(filename, buffer);
        console.log(\`Created \${filename}\`);
    });
}

module.exports = icons;
`;

console.log(jsContent);