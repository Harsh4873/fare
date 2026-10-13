"""Rasterize the Fare plate icon to the PNG sizes GitHub Pages checks."""

import math
from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parents[1] / "public"
ESPRESSO = (0x1B, 0x17, 0x14, 255)
CREAM = (0xF4, 0xE9, 0xD3, 255)
DARK = (0x25, 0x1E, 0x19, 255)
ORANGE = (0xF3, 0x6A, 0x2E, 255)
BLUE = (0x35, 0x68, 0xD4, 255)
GOLD = (0xF1, 0xB9, 0x4F, 255)
VIOLET = (0x75, 0x57, 0xC8, 255)


def draw_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), ESPRESSO)
    pen = ImageDraw.Draw(image)
    scale = size / 1024

    def unit(value: float) -> float:
        return value * scale

    center = unit(512)
    rim = unit(426)
    plate = unit(374)
    slice_radius = unit(366)
    pen.ellipse((center - rim, center - rim, center + rim, center + rim), fill=CREAM)
    pen.ellipse((center - plate, center - plate, center + plate, center + plate), fill=DARK)
    box = (
        center - slice_radius,
        center - slice_radius,
        center + slice_radius,
        center + slice_radius,
    )
    # Pillow measures pie slices clockwise from 3 o'clock, matching the SVG.
    pen.pieslice(box, 240, 360, fill=ORANGE)
    pen.pieslice(box, 0, 60, fill=BLUE)
    pen.pieslice(box, 60, 120, fill=GOLD)
    pen.pieslice(box, 120, 240, fill=VIOLET)
    spoke = max(1, round(unit(12)))
    for degrees in (240, 0, 60, 120):
        radians = degrees * math.pi / 180
        pen.line(
            (
                center,
                center,
                center + slice_radius * math.cos(radians),
                center + slice_radius * math.sin(radians),
            ),
            fill=DARK,
            width=spoke,
        )
    hub = unit(51)
    dot = unit(18)
    pen.ellipse((center - hub, center - hub, center + hub, center + hub), fill=DARK)
    pen.ellipse((center - dot, center - dot, center + dot, center + dot), fill=CREAM)
    return image


def main() -> None:
    outputs = {
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    for name, size in outputs.items():
        path = PUBLIC / name
        draw_icon(size).save(path, format="PNG")
        print(f"wrote {path} {size}x{size}")


if __name__ == "__main__":
    main()
