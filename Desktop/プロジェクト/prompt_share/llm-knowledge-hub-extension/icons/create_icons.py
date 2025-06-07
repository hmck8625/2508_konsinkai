#!/usr/bin/env python3
import struct
import zlib

def create_png(size):
    """Create a simple blue PNG icon with the given size."""
    # PNG header
    png_header = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>2I5B', size, size, 8, 2, 0, 0, 0)  # width, height, bit depth, color type (RGB), etc
    ihdr_chunk = b'IHDR' + ihdr_data
    ihdr_crc = zlib.crc32(ihdr_chunk) & 0xffffffff
    ihdr = struct.pack('>I', len(ihdr_data)) + ihdr_chunk + struct.pack('>I', ihdr_crc)
    
    # Create simple blue gradient image data
    raw_data = []
    for y in range(size):
        raw_data.append(0)  # filter type
        for x in range(size):
            # Blue gradient
            intensity = int(255 * (1 - y / size * 0.3))
            raw_data.extend([66, 133, min(244, intensity)])  # RGB: Google Blue
    
    # Compress the data
    compressed_data = zlib.compress(bytes(raw_data), 9)
    
    # IDAT chunk
    idat_chunk = b'IDAT' + compressed_data
    idat_crc = zlib.crc32(idat_chunk) & 0xffffffff
    idat = struct.pack('>I', len(compressed_data)) + idat_chunk + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend = b'\x00\x00\x00\x00IEND\xaeB`\x82'
    
    # Combine all chunks
    png_data = png_header + ihdr + idat + iend
    
    return png_data

# Generate icons
sizes = [16, 48, 128]
for size in sizes:
    png_data = create_png(size)
    with open(f'icon-{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon-{size}.png')

print('All icons created successfully!')