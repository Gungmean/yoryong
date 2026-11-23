"""Bake field-size, indexed sprite sheets from the original animation cells."""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "art/actor-masters"
OUTPUT = ROOT / "assets/actors"
HEIGHTS = {"hero": 60, **dict(zip((f"foe{i}" for i in range(6)), (153, 163, 180, 158, 219, 27)))}


def scale2x(frame):
    # Extend matching coloured edges across a diagonal, without mixing palette indices.
    a = np.array(frame)
    p = np.pad(a, 1, mode="edge")
    b, d, f, h = p[:-2, 1:-1], p[1:-1, :-2], p[1:-1, 2:], p[2:, 1:-1]
    edge = (b != h) & (d != f)
    out = a.repeat(2, axis=0).repeat(2, axis=1)
    for y, x, left, right in ((0, 0, d, b), (0, 1, b, f), (1, 0, d, h), (1, 1, h, f)):
        out[y::2, x::2] = np.where(edge & (left == right), left, a)
    result = Image.frombytes("P", (frame.width * 2, frame.height * 2), out.tobytes())
    result.putpalette(frame.getpalette())
    result.info["transparency"] = frame.info["transparency"]
    return result


def field_pose(frame, size):
    if size > frame.width:
        frame = scale2x(frame)
    # Area sampling is alpha-weighted in Pillow's RGBA resizer. Restore the
    # source palette and a binary silhouette after sampling each individual cell.
    sampled = frame.convert("RGBA").resize((size, size), Image.Resampling.BOX)
    transparent = frame.info["transparency"]
    visible = 1 if transparent == 0 else 0
    colors = frame.getpalette()
    colors[3*transparent:3*transparent+3] = colors[3*visible:3*visible+3]
    frame.putpalette(colors)
    result = sampled.convert("RGB").quantize(palette=frame, dither=Image.Dither.NONE)
    result = result.point([visible if i == transparent else i for i in range(256)])
    result.paste(transparent, mask=sampled.getchannel("A").point(lambda a: 255 if a < 128 else 0))
    result.info["transparency"] = transparent
    return result


def bake():
    layout = json.loads((MASTERS / "layout.json").read_text())
    summons = Image.new("RGBA", (4 * 108, 8 * 108))
    for name, spec in layout.items():
        sheet = Image.open(MASTERS / (name + ".png"))
        old_cell, old_height = spec["cell"], spec["standingHeight"]
        height = HEIGHTS.get(name, 56)
        ratio = height / old_height
        cell = round(old_cell * ratio)
        atlas = Image.new("P", (cell * 4, cell * (spec["frames"] // 4)), sheet.info["transparency"])
        atlas.putpalette(sheet.getpalette())
        for i in range(spec["frames"]):
            x, y = i % 4, i // 4
            frame = sheet.crop((x * old_cell, y * old_cell, (x + 1) * old_cell, (y + 1) * old_cell))
            atlas.paste(field_pose(frame, cell), (x * cell, y * cell))
            if name.startswith("scholar") and i >= 4:
                summons.paste(field_pose(frame, 108).convert("RGBA"), (x * 108, int(name[7:]) * 108))
        atlas.save(OUTPUT / (name + ".png"), transparency=sheet.info["transparency"], optimize=True)
        spec.update(cell=cell, standingHeight=height, baseline=round(spec["baseline"] * ratio))
    summons.save(OUTPUT / "summons.png", optimize=True)
    (ROOT / "actor-sheets.js").write_text(
        '"use strict";\nconst actorSheets = ' + json.dumps(layout, indent=2) + ";\n", encoding="utf-8"
    )


if __name__ == "__main__":
    bake()
    for i in range(8):
        source = Image.open(ROOT / f"assets/skill{i}.png").convert("RGB")
        tile = source.resize((24, 24), Image.Resampling.LANCZOS)
        tile = tile.quantize(colors=64, dither=Image.Dither.NONE)
        tile.save(ROOT / f"assets/ui/skill{i}.png", optimize=True)
