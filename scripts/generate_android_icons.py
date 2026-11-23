import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_SRC = os.path.join(ROOT, "public", "assets", "app_icon_512.png")
RES_DIR = os.path.join(ROOT, "android", "app", "src", "main", "res")

MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def main():
    if not os.path.exists(RES_DIR):
        print("Android res dir not found; skipping icon generation.")
        return

    src = Image.open(ICON_SRC).convert("RGBA")

    for folder, size in MIPMAP_SIZES.items():
        d = os.path.join(RES_DIR, folder)
        os.makedirs(d, exist_ok=True)
        resized = src.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(d, "ic_launcher.png"), optimize=True)
        resized.save(os.path.join(d, "ic_launcher_round.png"), optimize=True)

        fg_size = FOREGROUND_SIZES[folder]
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        inner_size = int(fg_size * 0.68)
        inner = src.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        off = (fg_size - inner_size) // 2
        fg_canvas.alpha_composite(inner, (off, off))
        fg_canvas.save(os.path.join(d, "ic_launcher_foreground.png"), optimize=True)

    # Notification small icon
    drawable_dir = os.path.join(RES_DIR, "drawable")
    os.makedirs(drawable_dir, exist_ok=True)
    stat_icon = src.resize((72, 72), Image.Resampling.LANCZOS)
    stat_icon.save(os.path.join(drawable_dir, "ic_stat_rat.png"), optimize=True)

    # Cozy cream adaptive icon background color
    values_dir = os.path.join(RES_DIR, "values")
    os.makedirs(values_dir, exist_ok=True)
    bg_xml = os.path.join(values_dir, "ic_launcher_background.xml")
    with open(bg_xml, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F6EFE6</color>\n</resources>\n')

    print("Generated all Android mipmap icons and notification icon.")


if __name__ == "__main__":
    main()
