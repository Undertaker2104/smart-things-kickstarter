import gzip
import sys

# Read the camera_index.h file and extract the compressed data
with open('src/camera_index.h', 'r') as f:
    content = f.read()

# Extract the hex array for index_ov2640_html_gz
start_marker = 'const unsigned char index_ov2640_html_gz[] = {'
end_marker = '};'

start = content.find(start_marker)
if start == -1:
    print("Could not find the start of the array")
    sys.exit(1)

start += len(start_marker)
end = content.find(end_marker, start)
if end == -1:
    print("Could not find the end of the array")
    sys.exit(1)

hex_data = content[start:end]

# Parse the hex values
hex_values = []
for line in hex_data.split('\n'):
    line = line.strip()
    if not line:
        continue
    # Remove comments and split by comma
    line = line.split('//')[0]
    parts = line.split(',')
    for part in parts:
        part = part.strip()
        if part.startswith('0x'):
            hex_values.append(int(part, 16))

# Convert to bytes and decompress
compressed_data = bytes(hex_values)
decompressed_data = gzip.decompress(compressed_data)

# Save the decompressed HTML
with open('camera_index.html', 'wb') as f:
    f.write(decompressed_data)

print(f"Decompressed HTML saved to camera_index.html ({len(decompressed_data)} bytes)")
print("\nFirst 500 characters:")
print(decompressed_data[:500].decode('utf-8', errors='ignore'))
