#!/usr/bin/env python3
"""
Google Shopping Feed Fixer
Fixes Shopify product CSV to meet Google Merchant Center requirements

Based on official Google documentation:
- Gender: lowercase only (male, female, unisex)
- Age Group: lowercase only (adult, kids, toddler, infant, newborn)
- Condition: lowercase only (new, used, refurbished)
"""

import csv
import sys
from pathlib import Path

# Column indices (0-based)
COL_SKU = 17  # Variant SKU
COL_GENDER = 38  # Google Shopping / Gender
COL_AGE_GROUP = 39  # Google Shopping / Age Group
COL_MPN = 40  # Google Shopping / MPN
COL_CONDITION = 41  # Google Shopping / Condition
COL_CUSTOM_PRODUCT = 42  # Google Shopping / Custom Product
COL_TARGET_GENDER = 67  # Target gender (metafield)
COL_PRODUCT_CATEGORY = 4  # Product Category


def fix_row(row, row_num):
    """Fix a single row according to Google standards"""
    changes = []

    # Fix Gender (column 39) - must be lowercase
    if len(row) > COL_GENDER and row[COL_GENDER]:
        original = row[COL_GENDER]
        fixed = original.lower()
        if fixed in ['male', 'female', 'unisex'] and original != fixed:
            row[COL_GENDER] = fixed
            changes.append(f"Gender: {original}→{fixed}")

    # Fix Age Group (column 40) - must be lowercase
    if len(row) > COL_AGE_GROUP and row[COL_AGE_GROUP]:
        original = row[COL_AGE_GROUP]
        fixed = original.lower()
        valid_ages = ['newborn', 'infant', 'toddler', 'kids', 'adult']
        if fixed in valid_ages and original != fixed:
            row[COL_AGE_GROUP] = fixed
            changes.append(f"Age: {original}→{fixed}")

    # Add Condition (column 42) if empty - default to "new"
    if len(row) > COL_CONDITION:
        if not row[COL_CONDITION] or row[COL_CONDITION].strip() == '':
            row[COL_CONDITION] = 'new'
            changes.append("Condition: →new")

    # Add Custom Product (column 43) if empty
    if len(row) > COL_CUSTOM_PRODUCT:
        if not row[COL_CUSTOM_PRODUCT] or row[COL_CUSTOM_PRODUCT].strip() == '':
            row[COL_CUSTOM_PRODUCT] = 'FALSE'
            changes.append("Custom Product: →FALSE")

    # Add MPN (column 41) from SKU if empty
    if len(row) > COL_MPN and len(row) > COL_SKU:
        if (not row[COL_MPN] or row[COL_MPN].strip() == '') and row[COL_SKU]:
            row[COL_MPN] = row[COL_SKU]
            changes.append(f"MPN: →{row[COL_SKU]}")

    return row, changes


def process_csv(input_file, output_file):
    """Process the entire CSV file"""
    print(f"📖 Reading: {input_file}")
    print(f"💾 Output: {output_file}\n")

    total_rows = 0
    fixed_rows = 0
    all_changes = []

    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        rows = list(reader)

    print(f"📊 Total rows: {len(rows):,}")
    print(f"📊 Product rows: {len(rows)-1:,}\n")

    # Keep header as-is
    output_rows = [rows[0]]

    # Track last seen values for product-level fields (Shopify CSV format)
    last_product_data = {
        'gender': '',
        'age_group': '',
        'title': '',
        'handle': ''
    }

    # Process data rows
    for i, row in enumerate(rows[1:], start=2):
        if not row or len(row) < 10:  # Skip empty/malformed rows
            output_rows.append(row)
            continue

        # Track handle changes (new product vs variant)
        current_handle = row[0] if len(row) > 0 else ''

        # If this is a new product (has title), save its data
        if len(row) > 1 and row[1].strip():
            last_product_data['title'] = row[1]
            last_product_data['handle'] = current_handle

            # Get gender from Google Shopping field or Target gender metafield
            if len(row) > COL_GENDER and row[COL_GENDER]:
                last_product_data['gender'] = row[COL_GENDER]
            elif len(row) > COL_TARGET_GENDER and row[COL_TARGET_GENDER]:
                # Parse target gender (may have multiple like "male; unisex")
                target_gender = row[COL_TARGET_GENDER].split(';')[0].strip().lower()
                if target_gender in ['male', 'female', 'unisex']:
                    last_product_data['gender'] = target_gender
                    row[COL_GENDER] = target_gender  # Set it directly too
                    all_changes.append(f"Row {i}: Copied gender from metafield: '{target_gender}'")

            if len(row) > COL_AGE_GROUP and row[COL_AGE_GROUP]:
                last_product_data['age_group'] = row[COL_AGE_GROUP]
        else:
            # This is a variant row - propagate product-level data
            if current_handle == last_product_data['handle']:
                if len(row) > COL_GENDER and not row[COL_GENDER] and last_product_data['gender']:
                    row[COL_GENDER] = last_product_data['gender']
                    all_changes.append(f"Row {i}: Propagated gender='{last_product_data['gender']}'")
                if len(row) > COL_AGE_GROUP and not row[COL_AGE_GROUP] and last_product_data['age_group']:
                    row[COL_AGE_GROUP] = last_product_data['age_group']
                    all_changes.append(f"Row {i}: Propagated age_group='{last_product_data['age_group']}'")

        fixed_row, changes = fix_row(row, i)
        output_rows.append(fixed_row)
        total_rows += 1

        if changes:
            fixed_rows += 1
            all_changes.extend(changes)

    # Write output
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        writer.writerows(output_rows)

    # Summary
    print("✅ PROCESSING COMPLETE\n")
    print(f"📊 Statistics:")
    print(f"   Total product rows: {total_rows:,}")
    print(f"   Rows modified: {fixed_rows:,}")
    print(f"   Total changes: {len(all_changes):,}\n")

    # Change breakdown
    change_types = {}
    for change in all_changes:
        change_type = change.split(':')[0]
        change_types[change_type] = change_types.get(change_type, 0) + 1

    if change_types:
        print("🔧 Changes by type:")
        for change_type, count in sorted(change_types.items()):
            print(f"   {change_type}: {count:,}")

    print(f"\n💾 Saved to: {output_file}")
    print("\n✓ Ready for Google Merchant Center upload")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 fix_google_shopping.py <input.csv> [output.csv]")
        print("\nExample:")
        print("  python3 fix_google_shopping.py products.csv products_fixed.csv")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"❌ File not found: {input_path}")
        sys.exit(1)

    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else input_path.parent / f"{input_path.stem}_FIXED.csv"

    try:
        process_csv(input_path, output_path)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
