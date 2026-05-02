#!/usr/bin/env python3
"""
Replace data blocks in prototype.html with latest JSON data.
"""

import json
import re
import sys
import os

BASE = "/sessions/cool-elegant-clarke/mnt/Tourism map/aotearoa-app"
HTML_PATH = os.path.join(BASE, "prototype.html")
DATA_DIR = os.path.join(BASE, "src", "data")


def load_json(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def js_value(v, indent_level=0):
    """Convert a Python value to a JS literal string (JSON-style with double quotes)."""
    return json.dumps(v, ensure_ascii=False)


def format_attraction(obj, indent=2):
    """Format a single attraction object as JSON-style JS (matching existing format)."""
    return json.dumps(obj, ensure_ascii=False, indent=indent)


def format_accommodation(obj, indent=2):
    """Format a single accommodation object as JSON-style JS."""
    return json.dumps(obj, ensure_ascii=False, indent=indent)


def format_js_object_unquoted(obj, keys_order=None):
    """Format an object with unquoted keys and single-quoted string values (JS style).
    For simple single-line objects like categories and regions."""
    parts = []
    keys = keys_order if keys_order else list(obj.keys())
    for k in keys:
        if k not in obj:
            continue
        v = obj[k]
        if isinstance(v, str):
            # Escape single quotes in values
            escaped = v.replace("\\", "\\\\").replace("'", "\\'")
            parts.append(f"{k}: '{escaped}'")
        elif isinstance(v, bool):
            parts.append(f"{k}: {'true' if v else 'false'}")
        elif isinstance(v, (int, float)):
            parts.append(f"{k}: {v}")
        elif isinstance(v, dict):
            # For nested objects like bounds, use inline JSON-ish
            inner = json.dumps(v, ensure_ascii=False)
            # Convert to unquoted keys
            inner = re.sub(r'"(\w+)":', r'\1:', inner)
            parts.append(f"{k}: {inner}")
        elif isinstance(v, list):
            parts.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
        else:
            parts.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
    return "{ " + ", ".join(parts) + " }"


def format_categories(categories):
    """Format CATEGORIES array as JS with unquoted keys."""
    lines = []
    for cat in categories:
        lines.append("  " + format_js_object_unquoted(cat, ["id", "label", "icon", "color"]) + ",")
    return "const CATEGORIES = [\n" + "\n".join(lines) + "\n];"


def format_regions(regions):
    """Format REGIONS array as JS with unquoted keys."""
    lines = []
    for reg in regions:
        lines.append("  " + format_js_object_unquoted(reg, ["id", "name", "island", "lat", "lng", "description", "bounds", "poi_count"]) + ",")
    return "const REGIONS = [\n" + "\n".join(lines) + "\n];"


def format_accom_types():
    """Keep existing accommodation types (they're not in a JSON file)."""
    return """const ACCOMMODATION_TYPES = [
  { id: 'hotel',        label: 'Hotel',         color: '#2c6fad' },
  { id: 'motel',        label: 'Motel',         color: '#2980b9' },
  { id: 'bnb',          label: 'B&B',           color: '#8e44ad' },
  { id: 'hostel',       label: 'Hostel',        color: '#27ae60' },
  { id: 'lodge',        label: 'Lodge',         color: '#e67e22' },
  { id: 'camping',      label: 'Camping',       color: '#16a085' },
  { id: 'holiday-park', label: 'Holiday Park',  color: '#d35400' }
];"""


def format_attractions(attractions):
    """Format ATTRACTIONS array."""
    items = []
    for a in attractions:
        items.append("  " + format_attraction(a, indent=4).replace("\n", "\n  "))
    return "const ATTRACTIONS = [\n" + ",\n".join(items) + "\n];"


def format_accommodations(accommodations):
    """Format ACCOMMODATIONS array."""
    items = []
    for a in accommodations:
        items.append("  " + format_accommodation(a, indent=4).replace("\n", "\n  "))
    return "const ACCOMMODATIONS = [\n" + ",\n".join(items) + "\n];"


def format_poi_img_specific(attractions_imgs):
    """Format POI_IMG_SPECIFIC object."""
    lines = []
    for poi_id, urls in attractions_imgs.items():
        lines.append(f"  {json.dumps(poi_id)}: {json.dumps(urls, ensure_ascii=False)},")
    return "const POI_IMG_SPECIFIC = {\n" + "\n".join(lines) + "\n};"


def format_poi_img_region(regions_imgs):
    """Format POI_IMG_REGION object."""
    lines = []
    for region_id, url in regions_imgs.items():
        lines.append(f"  {json.dumps(region_id)}: {json.dumps(url, ensure_ascii=False)},")
    return "const POI_IMG_REGION = {\n" + "\n".join(lines) + "\n};"


def format_poi_img_category(categories_imgs):
    """Format POI_IMG_CATEGORY object."""
    lines = []
    for cat_id, url in categories_imgs.items():
        lines.append(f"  {json.dumps(cat_id)}: {json.dumps(url, ensure_ascii=False)},")
    return "const POI_IMG_CATEGORY = {\n" + "\n".join(lines) + "\n};"


def find_block(lines, start_pattern, end_pattern="];", start_offset=0):
    """Find start and end line indices for a data block.
    Returns (start_idx, end_idx) inclusive."""
    start_idx = None
    for i, line in enumerate(lines):
        if start_pattern in line:
            start_idx = i + start_offset
            break
    if start_idx is None:
        raise ValueError(f"Could not find start pattern: {start_pattern}")

    # Find the closing pattern
    bracket_depth = 0
    for i in range(start_idx, len(lines)):
        line = lines[i]
        # Count brackets/braces
        for ch in line:
            if ch in "[{":
                bracket_depth += 1
            elif ch in "]}":
                bracket_depth -= 1
        if bracket_depth <= 0 and (end_pattern in line or line.strip().startswith(end_pattern)):
            return start_idx, i
    raise ValueError(f"Could not find end of block starting at line {start_idx}")


def find_const_block(lines, const_name):
    """Find a const declaration block by name, handling both arrays and objects."""
    pattern = f"const {const_name} = "
    start_idx = None
    for i, line in enumerate(lines):
        if pattern in line:
            start_idx = i
            break
    if start_idx is None:
        raise ValueError(f"Could not find: {pattern}")

    # Determine if it's an array or object
    bracket_depth = 0
    for i in range(start_idx, len(lines)):
        line = lines[i]
        for ch in line:
            if ch in "[{":
                bracket_depth += 1
            elif ch in "]}":
                bracket_depth -= 1
        if bracket_depth == 0:
            # Check for trailing semicolon
            return start_idx, i
    raise ValueError(f"Could not find end of {const_name}")


def main():
    # Load data
    attractions = load_json("attractions.json")
    categories = load_json("categories.json")
    regions = load_json("regions.json")
    accommodations = load_json("accommodations.json")
    poi_images = load_json("poi_images.json")

    print(f"Loaded {len(attractions)} attractions")
    print(f"Loaded {len(categories)} categories")
    print(f"Loaded {len(regions)} regions")
    print(f"Loaded {len(accommodations)} accommodations")
    print(f"Loaded {len(poi_images['attractions'])} POI images")

    # Read existing file
    with open(HTML_PATH, encoding="utf-8") as f:
        lines = f.readlines()
    # Strip newlines for processing
    lines = [line.rstrip("\n") for line in lines]
    total_original = len(lines)
    print(f"Original file: {total_original} lines")

    # Find all blocks (must find from top to bottom, replace from bottom to top)
    blocks = {}
    for name in ["ATTRACTIONS", "CATEGORIES", "REGIONS", "ACCOMMODATION_TYPES",
                  "ACCOMMODATIONS", "POI_IMG_SPECIFIC", "POI_IMG_REGION", "POI_IMG_CATEGORY"]:
        s, e = find_const_block(lines, name)
        blocks[name] = (s, e)
        print(f"  {name}: lines {s+1}-{e+1}")

    # Generate replacement text for each block
    replacements = {
        "ATTRACTIONS": format_attractions(attractions),
        "CATEGORIES": format_categories(categories),
        "REGIONS": format_regions(regions),
        "ACCOMMODATION_TYPES": format_accom_types(),
        "ACCOMMODATIONS": format_accommodations(accommodations),
        "POI_IMG_SPECIFIC": format_poi_img_specific(poi_images["attractions"]),
        "POI_IMG_REGION": format_poi_img_region(poi_images["regions"]),
        "POI_IMG_CATEGORY": format_poi_img_category(poi_images["categories"]),
    }

    # Replace blocks from bottom to top to preserve line numbers
    sorted_blocks = sorted(blocks.items(), key=lambda x: x[1][0], reverse=True)
    for name, (start, end) in sorted_blocks:
        replacement_lines = replacements[name].split("\n")
        lines[start:end+1] = replacement_lines
        print(f"  Replaced {name}: {end-start+1} lines -> {len(replacement_lines)} lines")

    # Write output
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nUpdated file: {len(lines)} lines")
    print("Done!")


if __name__ == "__main__":
    main()
