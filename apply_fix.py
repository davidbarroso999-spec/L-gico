import sys

def main():
    with open('app/page.tsx', 'r') as f:
        content = f.read()

    # 1. Ensure icons imported
    if 'List,' not in content:
        content = content.replace('import { MapPin,', 'import { MapPin, List, Sliders,')

    # 2. Extract Bento 1 to 5 block (the preferences bento boxes)
    bento_start = content.find('{/* Right Section: Dynamic Logistics Configuration Bento Box List */}')
    if bento_start == -1:
        bento_start = content.find('{/* Bento Box 1: Vehicle selection */}')
        
    bento_end = content.find('{/* Bento Box 6: Saved & Shared Routes List */}')
    if bento_end == -1:
        bento_end = content.find('{savedRoutes.length === 0')

    bento_boxes_code = ''
    if bento_start != -1 and bento_end != -1:
        bento_boxes_code = content[bento_start:bento_end].strip()
        # Clean wrapping divs if any
        if bento_boxes_code.startswith('<div className="flex flex-col gap-6 mt-6">'):
            bento_boxes_code = bento_boxes_code[len('<div className="flex flex-col gap-6 mt-6">'):].strip()
        if bento_boxes_code.startswith('<div className="w-full flex flex-col gap-6">'):
            bento_boxes_code = bento_boxes_code[len('<div className="w-full flex flex-col gap-6">'):].strip()

    print("Found bento boxes code length:", len(bento_boxes_code))

main()
