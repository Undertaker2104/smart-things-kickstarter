import re
import json

# Read the tm_model_files.h
with open('src/tm_model_files.h', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find tm_metadata_json array
match = re.search(r'const uint8_t tm_metadata_json\[\] PROGMEM = \{([^}]+)\};', content, re.DOTALL)
if match:
    hex_values = match.group(1)
    # Extract all hex values
    hex_nums = re.findall(r'0x([0-9A-Fa-f]{2})', hex_values)
    
    # Convert to bytes
    metadata_bytes = bytes([int(h, 16) for h in hex_nums])
    
    # Decode as UTF-8
    metadata_text = metadata_bytes.decode('utf-8', errors='ignore')
    
    print("Metadata JSON:")
    print(metadata_text)
    
    # Try to parse as JSON
    try:
        metadata_obj = json.loads(metadata_text)
        print("\nClass labels:")
        if 'labels' in metadata_obj:
            for i, label in enumerate(metadata_obj['labels']):
                print(f"  {i}: {label}")
    except json.JSONDecodeError as e:
        print(f"Could not parse JSON: {e}")
else:
    print("Could not find tm_metadata_json in file")
