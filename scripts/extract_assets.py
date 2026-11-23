import json
import os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_IN = os.path.join(ROOT, "rat_assets")
OUT_DIR = os.path.join(ROOT, "public", "assets")
SPRITES_DIR = os.path.join(OUT_DIR, "sprites")
os.makedirs(SPRITES_DIR, exist_ok=True)


def remove_white_bg_floodfill(img: Image.Image, threshold: int = 242, feather: int = 18) -> Image.Image:
    """Remove exterior near-white background via BFS floodfill from borders, preserving interior whites."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.uint8)
    h, w, _ = arr.shape
    r, g, b = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16)

    # Near-white mask (high luminance & low chroma)
    min_c = np.minimum(np.minimum(r, g), b)
    max_c = np.maximum(np.maximum(r, g), b)
    is_bg_candidate = (min_c >= threshold) & ((max_c - min_c) <= 18)

    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    # Seed from all 4 edges
    for x in range(w):
        for y in (0, h - 1):
            if is_bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = arr[:, :, 3].astype(np.float32)
    alpha[visited] = 0.0

    # Soft feather 1-2px border around removed background where pixels are very light
    if feather > 0:
        dilated = visited.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            shifted = np.roll(np.roll(visited, dy, axis=0), dx, axis=1)
            dilated |= shifted
        edge = dilated & (~visited)
        lum = (r + g + b) / 3.0
        soft_mask = edge & (lum > threshold - feather) & ((max_c - min_c) <= 28)
        factor = np.clip((threshold - lum) / float(feather), 0.0, 1.0)
        alpha[soft_mask] = np.minimum(alpha[soft_mask], factor[soft_mask] * 255.0)

    arr[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(arr, mode="RGBA")


def trim_alpha(img: Image.Image, pad: int = 8) -> Image.Image:
    alpha = np.array(img)[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return img
    y0, y1 = max(0, int(ys.min()) - pad), min(img.height, int(ys.max()) + pad + 1)
    x0, x1 = max(0, int(xs.min()) - pad), min(img.width, int(xs.max()) + pad + 1)
    return img.crop((x0, y0, x1, y1))


def slice_grid(sheet_path: str, cols: int, rows: int, names: list[str], needs_bg_removal: bool, max_dim: int = 384):
    img = Image.open(sheet_path)
    cw = img.width / cols
    ch = img.height / rows
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= len(names):
                break
            name = names[idx]
            idx += 1
            box = (int(round(c * cw)), int(round(r * ch)), int(round((c + 1) * cw)), int(round((r + 1) * ch)))
            cell = img.crop(box)
            if needs_bg_removal:
                cell = remove_white_bg_floodfill(cell, threshold=242, feather=22)
            else:
                cell = cell.convert("RGBA")
            cell = trim_alpha(cell, pad=6)
            if max(cell.width, cell.height) > max_dim:
                cell.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            out_path = os.path.join(SPRITES_DIR, f"{name}.png")
            cell.save(out_path, optimize=True)
            print(f"Saved {name}.png ({cell.size})")


def main():
    with open(os.path.join(ASSETS_IN, "manifest.json"), "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. 01_rats_colors (already RGBA)
    slice_grid(
        os.path.join(ASSETS_IN, "originals", "01_rats_colors.png"),
        4, 3,
        manifest["01_rats_colors"]["items"],
        needs_bg_removal=False,
        max_dim=320,
    )
    # 2. 02_rats_variants_poses (RGB white bg)
    slice_grid(
        os.path.join(ASSETS_IN, "originals", "02_rats_variants_poses.png"),
        4, 3,
        manifest["02_rats_variants_poses"]["items"],
        needs_bg_removal=True,
        max_dim=320,
    )
    # 3. 03_furniture_toys (RGB white bg)
    slice_grid(
        os.path.join(ASSETS_IN, "originals", "03_furniture_toys.png"),
        4, 3,
        manifest["03_furniture_toys"]["items"],
        needs_bg_removal=True,
        max_dim=280,
    )
    # 4. 04_care_ui (already RGBA)
    slice_grid(
        os.path.join(ASSETS_IN, "originals", "04_care_ui.png"),
        4, 4,
        manifest["04_care_ui"]["items"],
        needs_bg_removal=False,
        max_dim=220,
    )
    # 5. 05_habitats (2x2 RGB white bg)
    hab_img = Image.open(os.path.join(ASSETS_IN, "originals", "05_habitats.png"))
    w, h = hab_img.size
    # Fine-tuned boxes for the 2x2 habitats sheet
    hab_boxes = {
        "two_level_cage": (0, 0, int(w * 0.53), int(h * 0.50)),
        "three_level_cage": (int(w * 0.52), 0, w, int(h * 0.55)),
        "playpen": (0, int(h * 0.50), int(w * 0.62), h),
        "carrier": (int(w * 0.60), int(h * 0.54), w, h),
    }
    for name, box in hab_boxes.items():
        cell = hab_img.crop(box)
        cell = remove_white_bg_floodfill(cell, threshold=242, feather=20)
        cell = trim_alpha(cell, pad=6)
        cell.thumbnail((420, 420), Image.Resampling.LANCZOS)
        cell.save(os.path.join(SPRITES_DIR, f"{name}.png"), optimize=True)
        print(f"Saved {name}.png ({cell.size})")

    # 6. Copy & optimize room background
    room = Image.open(os.path.join(ASSETS_IN, "backgrounds", "06_room.png")).convert("RGB")
    room.thumbnail((1280, 854), Image.Resampling.LANCZOS)
    room.save(os.path.join(OUT_DIR, "bg_room.jpg"), quality=86, optimize=True)
    print(f"Saved bg_room.jpg ({room.size})")

    # 7. Generate cozy square App Icon (512x512) using the adorable two-rats 'pets' sprite
    pets_icon = Image.open(os.path.join(SPRITES_DIR, "pets.png")).convert("RGBA")
    icon_bg = Image.new("RGBA", (512, 512), (246, 239, 230, 255))
    # Add soft sage circular medallion
    yy, xx = np.ogrid[:512, :512]
    dist = np.sqrt((xx - 255.5) ** 2 + (yy - 255.5) ** 2)
    bg_arr = np.array(icon_bg)
    ring = (dist >= 208) & (dist <= 228)
    inner = dist < 208
    bg_arr[inner] = [235, 241, 234, 255]
    bg_arr[ring] = [111, 134, 114, 255]
    icon_bg = Image.fromarray(bg_arr, mode="RGBA")
    pets_resized = pets_icon.copy()
    pets_resized.thumbnail((360, 360), Image.Resampling.LANCZOS)
    px = (512 - pets_resized.width) // 2
    py = (512 - pets_resized.height) // 2 + 8
    icon_bg.alpha_composite(pets_resized, (px, py))
    icon_bg.save(os.path.join(OUT_DIR, "app_icon_512.png"), optimize=True)
    print("Saved app_icon_512.png (512x512)")


if __name__ == "__main__":
    main()
