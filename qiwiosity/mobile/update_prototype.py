#!/usr/bin/env python3
"""
Update prototype.html with the latest data from the JSON source files.

Replaces:
  - ATTRACTIONS block (const ATTRACTIONS = [...];)
  - Adds CATEGORIES, REGIONS, ACCOMMODATIONS blocks if missing
  - Adds POI_IMG_SPECIFIC, POI_IMG_REGION, POI_IMG_CATEGORY blocks if missing
"""

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
HTML_PATH = BASE / "prototype.html"
DATA_DIR = BASE / "src" / "data"


def load_json(name):
    p = DATA_DIR / name
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def js_const(name, data, indent=2):
    """Return a JS const declaration with JSON-formatted data."""
    body = json.dumps(data, indent=indent, ensure_ascii=False)
    return f"const {name} = {body};"


def main():
    # ── Load source data ──────────────────────────────────────────────
    attractions = load_json("attractions.json")
    categories = load_json("categories.json")
    regions = load_json("regions.json")
    accommodations = load_json("accommodations.json")
    poi_images = load_json("poi_images.json")

    print(f"Loaded {len(attractions)} attractions")
    print(f"Loaded {len(categories)} categories")
    print(f"Loaded {len(regions)} regions")
    print(f"Loaded {len(accommodations)} accommodations")
    print(f"Loaded {len(poi_images.get('attractions', {}))} POI-specific images")

    # ── Read existing HTML ────────────────────────────────────────────
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    print(f"Read {len(lines)} lines from prototype.html")

    # ── Find the ATTRACTIONS block ────────────────────────────────────
    # Pattern: starts with "const ATTRACTIONS = [" and ends with "];"
    start_line = None
    end_line = None
    for i, line in enumerate(lines):
        if start_line is None and line.strip().startswith("const ATTRACTIONS = ["):
            start_line = i
        if start_line is not None and end_line is None and line.strip() == "];":
            end_line = i
            break

    if start_line is None or end_line is None:
        print("ERROR: Could not locate ATTRACTIONS block boundaries.")
        sys.exit(1)

    print(f"ATTRACTIONS block: lines {start_line+1}–{end_line+1}")

    # ── Check for existing CATEGORIES / REGIONS / ACCOMMODATIONS / POI_IMG blocks ─
    full_text = "".join(lines)
    has_categories = bool(re.search(r'\bconst CATEGORIES\s*=', full_text))
    has_regions = bool(re.search(r'\bconst REGIONS\s*=', full_text))
    has_accommodations = bool(re.search(r'\bconst ACCOMMODATIONS\s*=', full_text))
    has_poi_specific = bool(re.search(r'\bconst POI_IMG_SPECIFIC\s*=', full_text))
    has_poi_region = bool(re.search(r'\bconst POI_IMG_REGION\s*=', full_text))
    has_poi_category = bool(re.search(r'\bconst POI_IMG_CATEGORY\s*=', full_text))

    print(f"  CATEGORIES already present: {has_categories}")
    print(f"  REGIONS already present:    {has_regions}")
    print(f"  ACCOMMODATIONS already present: {has_accommodations}")
    print(f"  POI_IMG_SPECIFIC already present: {has_poi_specific}")
    print(f"  POI_IMG_REGION already present:   {has_poi_region}")
    print(f"  POI_IMG_CATEGORY already present: {has_poi_category}")

    # ── Build the replacement data block ──────────────────────────────
    data_lines = []
    data_lines.append("// ============ DATA (inline for offline prototype) ============\n")

    # ATTRACTIONS
    data_lines.append(js_const("ATTRACTIONS", attractions) + "\n\n")

    # CATEGORIES
    if not has_categories:
        data_lines.append(js_const("CATEGORIES", categories) + "\n\n")

    # REGIONS
    if not has_regions:
        data_lines.append(js_const("REGIONS", regions) + "\n\n")

    # ACCOMMODATIONS
    if not has_accommodations:
        data_lines.append(js_const("ACCOMMODATIONS", accommodations) + "\n\n")

    # POI images — split into three lookup objects for the front-end
    if not has_poi_specific:
        data_lines.append(js_const("POI_IMG_SPECIFIC", poi_images.get("attractions", {})) + "\n\n")
    if not has_poi_region:
        data_lines.append(js_const("POI_IMG_REGION", poi_images.get("regions", {})) + "\n\n")
    if not has_poi_category:
        data_lines.append(js_const("POI_IMG_CATEGORY", poi_images.get("categories", {})) + "\n\n")

    # Also add accommodationTypes images if present
    has_poi_accom_type = bool(re.search(r'\bconst POI_IMG_ACCOM_TYPE\s*=', full_text))
    if not has_poi_accom_type and "accommodationTypes" in poi_images:
        data_lines.append(js_const("POI_IMG_ACCOM_TYPE", poi_images["accommodationTypes"]) + "\n\n")

    # ── Splice into the HTML ──────────────────────────────────────────
    # We replace from the "// ============ DATA" comment line (one above start_line)
    # through the end of the ATTRACTIONS block (end_line inclusive).
    # Check if the line before start_line is the DATA comment.
    comment_line = start_line - 1
    if comment_line >= 0 and "DATA" in lines[comment_line]:
        replace_start = comment_line
    else:
        replace_start = start_line

    new_lines = lines[:replace_start] + data_lines + lines[end_line + 1:]

    # ── Write output ──────────────────────────────────────────────────
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    new_count = len(new_lines)
    print(f"\nWrote {new_count} lines to prototype.html")

    # ── Verify ────────────────────────────────────────────────────────
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        verify = f.read()

    # Count POIs by counting "id" fields in ATTRACTIONS
    att_match = re.search(r'const ATTRACTIONS\s*=\s*(\[[\s\S]*?\n\]);', verify)
    if att_match:
        att_data = json.loads(att_match.group(1))
        print(f"Verification: ATTRACTIONS contains {len(att_data)} POIs")
    else:
        # Fallback: count "id" keys
        id_count = verify.count('"id":')
        print(f"Verification (approx): ~{id_count} 'id' fields found in file")

    for name in ["CATEGORIES", "REGIONS", "ACCOMMODATIONS",
                  "POI_IMG_SPECIFIC", "POI_IMG_REGION", "POI_IMG_CATEGORY"]:
        if f"const {name}" in verify:
            print(f"  ✓ {name} block present")
        else:
            print(f"  ✗ {name} block MISSING")


if __name__ == "__main__":
    main()
