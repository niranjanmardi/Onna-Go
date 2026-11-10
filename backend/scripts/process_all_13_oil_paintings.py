import os
from PIL import Image, ImageDraw, ImageFont

RAW_IMAGES = {
    'howrah_bridge': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\.user_uploaded\media_1794326637023_c9e9bd86.jpg',
        '1. Howrah Bridge — Golden Sunset'
    ),
    'chennai_central': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\chennai_central_impressionist_1794309311987.jpg',
        '2. Chennai Central — Exterior View'
    ),
    'kochi_coast': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\fort_kochi_impressionist_1794309304770.jpg',
        '3. Kochi — Natural Coastal Artwork'
    ),
    'kanyakumari_statue': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\thiruvalluvar_kanyakumari_impressionist_1794309308123.jpg',
        '4. Kanyakumari — Thiruvalluvar Statue'
    ),
    'chennai_traffic': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\chennai_traffic_impressionist_oil_1794309311306.jpg',
        '5. Chennai Traffic — City Traffic'
    ),
    'mumbai_gateway': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\gateway_of_india_impressionist_1794315342284.jpg',
        '6. Mumbai — Gateway of India'
    ),
    'mumbai_csmt': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\csmt_mumbai_impressionist_oil_painting_1794315389274.jpg',
        '7. Mumbai — CSMT Railway Station'
    ),
    'thanjavur_temple': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\thanjavur_periya_kovil_impressionist_oil_1794326863076.jpg',
        '8. Thanjavur — Brihadeeswarar Temple'
    ),
    'hampi_heritage': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\hampi_stone_chariot_impressionist_oil_painting_1794326853372.jpg',
        '9. Hampi — Historic Heritage Landscape'
    ),
    'badami_lake': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\badami_agastya_lake_oil_painting_1794326860859.jpg',
        '10. Badami — Agastya Lake'
    ),
    'konark_sun_temple': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\konark_sun_temple_oil_painting_1794326870882.jpg',
        '11. Odisha — Konark Sun Temple'
    ),
    'punjab_heritage': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\punjab_heritage_sunrise_oil_painting_1794326885947.jpg',
        '12. Punjab — Turban & Kirpan at Sunrise'
    ),
    'konkan_railway': (
        r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972\konkan_railway_oil_painting_1794326898066.jpg',
        '13. Konkan Railway — Coastal Journey'
    )
}

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    web_wallpapers = os.path.join(base_dir, 'frontend', 'public', 'themes', 'wallpapers')
    web_thumbs = os.path.join(base_dir, 'frontend', 'public', 'themes', 'thumbnails')
    android_wallpapers = os.path.join(base_dir, 'frontend', 'android', 'app', 'src', 'main', 'assets', 'public', 'themes', 'wallpapers')
    android_thumbs = os.path.join(base_dir, 'frontend', 'android', 'app', 'src', 'main', 'assets', 'public', 'themes', 'thumbnails')
    artifacts_dir = r'C:\Users\mardi\.gemini\antigravity\brain\6013d6a9-e8f6-4c19-b403-49a80127e972'

    for d in [web_wallpapers, web_thumbs, android_wallpapers, android_thumbs]:
        os.makedirs(d, exist_ok=True)

    TARGET_W, TARGET_H = 768, 1376
    THUMB_W, THUMB_H = 400, 716

    print("=== Processing All 13 Impressionist Oil Paintings ===")
    
    processed_images = {}

    for theme_id, (src_path, label) in RAW_IMAGES.items():
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"Missing source file for {theme_id}: {src_path}")
        
        img = Image.open(src_path).convert('RGB')
        
        # 1. Full-res 9:16 portrait WebP wallpaper
        full = img.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        out_web = os.path.join(web_wallpapers, f"{theme_id}.webp")
        out_and = os.path.join(android_wallpapers, f"{theme_id}.webp")
        full.save(out_web, 'WEBP', quality=92, method=6)
        full.save(out_and, 'WEBP', quality=92, method=6)

        # 2. Thumbnail WebP
        thumb = img.resize((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
        out_web_thumb = os.path.join(web_thumbs, f"{theme_id}.webp")
        out_and_thumb = os.path.join(android_thumbs, f"{theme_id}.webp")
        thumb.save(out_web_thumb, 'WEBP', quality=88, method=6)
        thumb.save(out_and_thumb, 'WEBP', quality=88, method=6)

        processed_images[theme_id] = (full, label)
        print(f"[{theme_id}] Processed full ({os.path.getsize(out_web)//1024} KB) and thumb ({os.path.getsize(out_web_thumb)//1024} KB)")

    print("\n=== Generating Master 13-Theme Impressionist Oil Painting Contact Sheet ===")
    # 5 columns layout (5 + 5 + 3)
    COLS = 5
    ROWS = 3
    CELL_W = 384
    CELL_H = 688
    PAD_X = 20
    PAD_Y = 24
    LABEL_H = 36
    HEADER_H = 80

    TOTAL_W = COLS * CELL_W + (COLS + 1) * PAD_X
    TOTAL_H = HEADER_H + ROWS * (CELL_H + LABEL_H) + (ROWS + 1) * PAD_Y

    sheet = Image.new('RGB', (TOTAL_W, TOTAL_H), color=(15, 18, 24))
    draw = ImageDraw.Draw(sheet)

    # Header text
    try:
        font_header = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 15)
        font_label = ImageFont.truetype("arial.ttf", 13)
    except:
        font_header = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_label = ImageFont.load_default()

    draw.text((PAD_X, 18), "ONNA-GO — Complete 13 Impressionist Oil Painting Wallpaper Collection", fill=(255, 255, 255), font=font_header)
    draw.text((PAD_X, 50), "All 13 Canonical Themes Styled with Thick Impasto Brushstrokes & Canvas Texture Matching Howrah Bridge Master Reference", fill=(160, 170, 185), font=font_sub)

    for idx, (theme_id, (full_img, label)) in enumerate(processed_images.items()):
        row = idx // COLS
        col = idx % COLS
        x = PAD_X + col * (CELL_W + PAD_X)
        y = HEADER_H + PAD_Y + row * (CELL_H + LABEL_H + PAD_Y)

        cell_thumb = full_img.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)
        sheet.paste(cell_thumb, (x, y))

        # Thin white border around each artwork
        draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(255, 255, 255, 80), width=1)

        # Label background
        label_y = y + CELL_H + 4
        draw.rectangle([x, label_y, x + CELL_W, label_y + LABEL_H - 4], fill=(22, 26, 36))
        draw.text((x + 8, label_y + 6), label, fill=(240, 245, 255), font=font_label)

    contact_sheet_path = os.path.join(artifacts_dir, 'contact_sheet_all_13_impressionist_oil_paintings.png')
    sheet.save(contact_sheet_path, 'PNG', optimize=True)
    print(f"Master Contact Sheet saved to: {contact_sheet_path}")

    # Also overwrite the previous contact sheet path so any references resolve to this new one
    legacy_sheet_path = os.path.join(artifacts_dir, 'contact_sheet_all_13_themes.png')
    sheet.save(legacy_sheet_path, 'PNG', optimize=True)
    print(f"Updated legacy contact sheet at: {legacy_sheet_path}")

if __name__ == '__main__':
    main()

