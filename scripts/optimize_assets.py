"""Optimize Numelyra's bundled raster assets without changing their visual role.

Requires Pillow with WebP support. Run from the repository root:

    python scripts/optimize_assets.py

The script creates replacement static ``.webp`` files next to their PNG
sources. Animated WebP files are deliberately left untouched. PNG sources are
also left in place so references and builds can be migrated and verified before
removing them.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


# Large opaque PNGs that are currently bundled by static require() calls.
OPAQUE_PNGS = [
    "assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_57 PM-3.png",
    "assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_56 PM-2.png",
    "assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_55 PM-1.png",
    "assets/giao_dien/giaodien1/astrology/background/planet-detail-milky-way-v2.png",
    "assets/giao_dien/giaodien1/constellation/galaxy-background-v2.png",
    "assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/Celestial Moonlit Mountain Lake.png",
    "assets/giao_dien/giaodien1/chat_detail/background/background.png",
    "assets/background/numelyra_background.png",
    "assets/giao_dien/giaodien1/calender_asset/background/calendar_background_v2.png",
    "assets/giao_dien/giaodien1/chat_continue/background.png",
    "assets/giao_dien/auth/auth-celestial-background-v1.png",
    "assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index1.png",
    "assets/giao_dien/giaodien1/wallpaper_asset/background/background.png",
    "assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img1.png",
    "assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img2.png",
    "assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img3.png",
    "assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img4.png",
    "assets/giao_dien/giaodien1/chat_screen_asset/readingTrace/reading_trace_background.png",
    "assets/giao_dien/giaodien1/chat_screen_asset/readingTrace/reading_trace_letter.png",
    "assets/giao_dien/giaodien1/chat_detail/love/background/evident.png",
    "assets/giao_dien/giaodien1/chat_detail/love/background/loading.png",
    "assets/giao_dien/giaodien1/chat_detail/love/background/success.png",
    "assets/Dreamy Purple Lined Journal Template.png",
]

def _resize_to_max_side(image: Image.Image, max_side: int | None) -> Image.Image:
    if max_side is None or max(image.size) <= max_side:
        return image.copy()
    scale = max_side / max(image.size)
    size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    return image.resize(size, Image.Resampling.LANCZOS)


def convert_png(source: Path, *, quality: int, max_side: int | None = None) -> tuple[int, int]:
    destination = source.with_suffix(".webp")
    old_size = source.stat().st_size
    with Image.open(source) as opened:
        mode = "RGBA" if "A" in opened.getbands() else "RGB"
        converted = _resize_to_max_side(opened.convert(mode), max_side)
        converted.save(
            destination,
            format="WEBP",
            quality=quality,
            method=4,
            exact=True,
            icc_profile=opened.info.get("icc_profile"),
        )
        converted.close()
    return old_size, destination.stat().st_size


def is_valid_image(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except (OSError, SyntaxError):
        return False


def main() -> None:
    static_targets: dict[Path, tuple[int, int | None]] = {
        ROOT / relative: (82, None) for relative in OPAQUE_PNGS
    }

    astrology_root = ROOT / "assets/giao_dien/giaodien1/astrology"
    for path in (astrology_root / "plannet").glob("*.png"):
        static_targets[path] = (84, 768)
    for path in (astrology_root / "zodiac").glob("*.png"):
        static_targets[path] = (84, 384)
    for path in (astrology_root / "today").glob("*.png"):
        static_targets[path] = (84, 512)

    total_before = 0
    total_after = 0
    print("Static PNG -> WebP")
    for path, (quality, max_side) in sorted(static_targets.items(), key=lambda item: str(item[0])):
        if not path.exists():
            print(f"  skip missing: {path.relative_to(ROOT)}")
            continue
        destination = path.with_suffix(".webp")
        if is_valid_image(destination):
            before, after = path.stat().st_size, destination.stat().st_size
            print(f"  reuse completed output: {destination.relative_to(ROOT)}")
        else:
            before, after = convert_png(path, quality=quality, max_side=max_side)
        total_before += before
        total_after += after
        print(
            f"  {path.relative_to(ROOT)}: "
            f"{before / 1_048_576:.2f} -> {after / 1_048_576:.2f} MB"
        )

    print(
        f"Optimized targets: {total_before / 1_048_576:.2f} -> "
        f"{total_after / 1_048_576:.2f} MB "
        f"(saved {(total_before - total_after) / 1_048_576:.2f} MB)"
    )


if __name__ == "__main__":
    main()
