"""Make 'lights going out' versions of the city photo.

Usage: python3 city_levels.py <city_on.png> <out_dir>
Writes city_lv0..city_lv6.png (1080x1920). Bright pixels (windows, streetlights,
car trails) are switched off block by block in a fixed random order, so each level
keeps the darkness of the previous one.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

LEVELS = [0.0, 0.5, 0.65, 0.78, 0.88, 0.95, 0.99]
CELL = 28  # px block ~ a building facade / street segment


def main(src, out_dir):
    out = Path(out_dir)
    img = Image.open(src).convert("RGB").resize((1080, 1920), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32) / 255.0
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    # how "lit" a pixel is (artificial light), soft ramp
    lit = np.clip((lum - 0.18) / 0.35, 0, 1)

    # moonlit "off" look: very dark, slightly blue
    off = a * 0.10 + np.array([0.010, 0.016, 0.032], dtype=np.float32)
    sky = np.zeros_like(lum)
    sky[: int(0.12 * 1920)] = 1.0  # keep the distant sky/horizon a bit lighter
    off = off * (1 - sky[..., None]) + a * 0.35 * sky[..., None]

    rng = np.random.default_rng(42)
    gh, gw = -(-1920 // CELL), -(-1080 // CELL)
    order = rng.random((gh, gw))
    rank = np.kron(order, np.ones((CELL, CELL)))[:1920, :1080]

    for k, frac in enumerate(LEVELS):
        cells_off = (rank < frac).astype(np.float32)
        m = Image.fromarray((cells_off * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
        m = np.asarray(m).astype(np.float32) / 255.0
        # global dim also grows with the level (ambient light from the city disappears)
        ambient = 1 - 0.55 * frac
        w = (m * np.maximum(lit, 0.6 * frac))[..., None]
        res = (a * ambient) * (1 - w) + off * w
        Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8)).save(out / f"city_lv{k}.png")
        print("city_lv%d" % k, f"{frac:.0%} off")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
