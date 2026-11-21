"""Bake original combat artwork into eight animation poses per effect (Pillow)."""
from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CELL = (208, 176)
PIVOT = (124, 113)
FRAMES = 8

# Gameplay anchors are on the striking edge of a bolt, the fruit of the apple,
# or the base of the fault. Wind and light can extend behind those anchors.
POSES = [
    ("apple", 66, 108, .50, .80), ("ring", 127, 73, .83, .50),
    ("scales", 90, 93, .50, .69), ("crystal", 83, 24, .79, .50),
    ("vine", 132, 56, .82, .52), ("butterfly", 75, 66, .77, .61),
    ("fault", 113, 93, .50, .98), ("core", 103, 87, .50, .51),
    ("gyro", 73, 52, .66, .52), ("droplet", 42, 79, .50, .79),
    ("root", 88, 42, .76, .86), ("meteor", 48, 87, .50, .78),
    ("slash", 122, 91, .83, .54), ("dash", 112, 47, .85, .50),
    ("burst", 94, 81, .50, .50), ("rift", 100, 92, .50, .50),
]
NEAREST = Image.Resampling.NEAREST


def animate(source, name, width, height, frame):
    angle = frame * 2 * pi / FRAMES
    beat, stride = sin(angle), frame / (FRAMES - 1)
    sx, sy, turn = 1., 1., 0.
    if name in ("apple", "droplet", "meteor"):
        sx, sy = 1 - .045 * beat, 1 + .09 * beat
    elif name == "scales":
        sx, turn = 1 + .055 * cos(angle), 10 * beat
    elif name in ("ring", "gyro", "core", "crystal"):
        sx, sy, turn = 1 + .065 * cos(angle), 1 + .10 * beat, 6 * beat
    elif name == "butterfly":
        sy, turn = .68 + .32 * cos(angle), 8 * beat
    elif name == "rift":
        turn = -45 * frame
    elif name == "fault":
        sx, sy = .86 + .14 * sin(pi * stride), .25 + .75 * sin(stride * pi * .65)
    elif name == "slash":
        sx, sy, turn = .69 + .31 * sin(pi * stride), .58 + .42 * sin(pi * stride), 39 - 81 * stride
    elif name == "burst":
        sx = sy = .48 + .58 * sin(stride * pi * .67)
    elif name == "dash":
        sx, sy = .83 + .17 * cos(angle), 1 + .09 * beat

    w, h = max(1, round(width * sx)), max(1, round(height * sy))
    body = source.resize((w, h), NEAREST)
    if name == "crystal":
        # The three lances cross bright magenta floor reflections in the chemistry lab.
        # Give the head opaque cut facets and an icy edge that reads over the floor.
        pen = ImageDraw.Draw(body)
        tip, gem, tail, mid = w - 2, round(w * .68), round(w * .37), h // 2
        pen.polygon([(tail, mid), (gem, mid-6), (tip, mid), (gem-2, mid+7)], fill="#342052")
        pen.polygon([(tail+3,mid), (gem,mid-5), (tip-3,mid)], fill="#a5e5ff")
        pen.polygon([(tail+3,mid), (gem+2,mid+1), (gem-2,mid+5)], fill="#a25bee")
        pen.polygon([(gem,mid-4),(tip-3,mid),(gem+2,mid+1)],fill="#fff3ff")
        pen.line([(tail+3,mid),(gem,mid),(tip-2,mid)],fill="#f6c9ff")
    bent = Image.new("RGBA", (w + 12, h + 12))
    if name in ("apple", "meteor", "droplet"):
        for y in range(h):
            weight = (1 - y / h) ** 2
            offset = round(4 * weight * sin(angle + y / h * 8))
            bent.paste(body.crop((0, y, w, y + 1)), (6 + offset, y + 6))
    elif name in ("vine", "root", "dash", "ring"):
        for x in range(w):
            weight = (1 - x / w) ** .65
            offset = round(5 * weight * sin(angle + x / w * 9))
            bent.paste(body.crop((x, 0, x + 1, h)), (x + 6, 6 + offset))
    else:
        bent.paste(body, (6, 6))
    return bent.rotate(turn, NEAREST, expand=True) if turn else bent


def bake():
    sheet = Image.open(ROOT / "art/combat-cores.png").convert("RGBA")
    atlas = Image.new("RGBA", (CELL[0] * FRAMES, CELL[1] * len(POSES)))
    for row, (name, w, h, ax, ay) in enumerate(POSES):
        x, y = row % 4 * 144, row // 4 * 144
        tile = sheet.crop((x, y, x + 144, y + 144))
        source = tile.crop(tile.getchannel("A").getbbox())
        for frame in range(FRAMES):
            pose = animate(source, name, w, h, frame)
            pose = pose.crop(pose.getchannel("A").getbbox())
            padded = Image.new("RGBA",(pose.width+2,pose.height+2))
            padded.paste(pose,(1,1))
            alpha = padded.getchannel("A")
            rim = Image.new("RGBA",padded.size,"#352241")
            # A one-pixel contour separates luminous artwork from busy laboratory murals.
            rim.putalpha(ImageChops.subtract(alpha.filter(ImageFilter.MaxFilter(3)),alpha).point(lambda v: v*3//4))
            pose = Image.alpha_composite(rim,padded)
            left = round(PIVOT[0] - ax * pose.width)
            top = round(PIVOT[1] - ay * pose.height)
            assert 0 <= left <= CELL[0] - pose.width and 0 <= top <= CELL[1] - pose.height, (name, frame)
            atlas.paste(pose, (CELL[0] * frame + left, CELL[1] * row + top))
    target = ROOT / "assets/combat/effects.webp"
    target.parent.mkdir(exist_ok=True)
    atlas.save(target, lossless=True, method=6)


if __name__ == "__main__":
    bake()
