"""Bake pixel poses for the five signature attacks into a lossless sprite atlas."""

from math import cos, pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw


WIDTH, HEIGHT, PIVOT = 144, 152, (72, 112)
FRAMES = 8


class Pixels:
    def __init__(self):
        self.image = Image.new("RGBA", (WIDTH, HEIGHT))
        self.pen = ImageDraw.Draw(self.image)

    def point(self, x, y):
        return round(x + PIVOT[0]), round(y + PIVOT[1])

    def poly(self, color, *points):
        self.pen.polygon([self.point(x, y) for x, y in points], fill=color)

    def line(self, color, width, *points):
        self.pen.line([self.point(x, y) for x, y in points], fill=color, width=width)

    def oval(self, x, y, rx, ry, color):
        self.pen.ellipse((*self.point(x - rx, y - ry), *self.point(x + rx, y + ry)), fill=color)

    def spark(self, x, y, size, color):
        self.poly(color, (x, y - size), (x + 1, y - 1), (x + size, y),
                  (x + 1, y + 1), (x, y + size), (x - 1, y + 1), (x - size, y), (x - 1, y - 1))


def gravity(p, frame):
    angle = frame * pi / 4
    for arm in range(3):
        for band in range(3):
            length = 61 - band * 12
            points = []
            for i in range(29):
                t = i / 28
                spin = t * 3.1 + arm * 2 * pi / 3 + angle + band * .25
                radius = length * (1 - t * .70)
                points.append((radius * cos(spin), radius * sin(spin) * .59 - 5))
            p.line(("#30234f", "#6551af", "#79aeea")[band], 6 - band, *points)
            p.line(("#856bee", "#acc3ff", "#e5faff")[band], 1, *points[3:19])
    for i in range(26):
        a = i * 2.399 + angle * .55
        r = 26 + (i * 13 - frame * 5) % 41
        p.spark(r * cos(a), r * sin(a) * .59 - 5, 1 + i % 3, ("#9c89fa", "#9de8ff", "#f1deff")[i % 3])
    p.oval(0, -5, 22, 18, "#33204e")
    p.oval(-1, -6, 18, 15, "#a18bfc")
    p.oval(-2, -7, 15, 12, "#e2f9ff")
    p.oval(0, -5, 13, 11, "#171228")
    p.spark(13 * cos(angle) - 1, -5 + 10 * sin(angle), 5, "#fff3ff")


def collapse(p, frame):
    extent = [29, 39, 48, 58, 63, 67, 69, 70][frame]
    for side in (-1, 1):
        p.poly("#472b7e", (0, 0), (side * extent, -8), (side * extent * .9, -17),
               (side * extent * .42, -13), (side * 14, -82 + frame * 7), (0, -99 + frame * 9))
        p.line("#bba8ff", 2, (side * extent, -10), (side * 31, -12), (side * 14, -24),
               (side * 10, -52 + frame * 3))
    if frame < 5:
        p.poly("#b5ddff", (-19 + frame, -6), (-8, -24), (-4, -81 + frame * 10),
               (3, -92 + frame * 11), (9, -29), (21 - frame, -5), (0, -1))
        p.poly("#fff6ff", (-7, -9), (0, -76 + frame * 12), (6, -23), (11, -8), (0, -4))
    for i in range(17):
        a = i * 2.399
        p.spark(cos(a) * extent * (.6 + i % 4 * .14), -10 - abs(sin(a)) * (25 + i % 5 * 13),
                1 + i % max(2, 5 - frame // 2), ("#8767eb", "#9fe5ff", "#fce4ff")[i % 3])


def foam(p, frame):
    height = [71, 85, 83, 76, 76, 72, 64, 47][frame]
    p.poly("#56264d", (-59, 0), (-57, -9), (-43, -15), (-31, -height * .62), (-17, -height + 9),
           (15, -height + 5), (32, -height * .65), (43, -17), (58, -11), (60, 0))
    p.poly("#b54e8c", (-53, -2), (-37, -11), (-26, -height * .59), (-16, -height + 6),
           (15, -height + 4), (29, -height * .58), (33, -11), (57, -3))
    rng = Random(246)
    for i in range(25):
        f = (i * .181 + frame * .13) % 1
        x = rng.uniform(-1, 1) * (45 - 24 * f)
        y = -(height - 9) * f - 5
        size = rng.randint(4, 12)
        p.oval(x, y, size, size * .78, "#81346e")
        p.oval(x - 1, y - 1, size - 1, size * .69, ("#cf7fb0", "#eba6db", "#8dd2d8")[i % 3])
        p.oval(x - size * .32, y - size * .46, size * .34, max(1, size * .17), "#fff5e4")
    for i in range(12):
        x = (-1 if i % 2 else 1) * (17 + (i * 7 + frame * 3) % 46)
        y = -(7 + (i * 13 + frame * 7) % 80)
        p.oval(x, y, 1 + i % 3, 1 + i % 4, ("#fbc7dd", "#def9ee")[i % 2])


def roots(p, frame, shaded):
    dark, mid, light = ("#233848", "#52887d", "#b0d9b3") if shaded else ("#33402e", "#7c9f4a", "#e7e57b")
    growth = [.73, .95, 1, 1, .97, .86, .75, .57][frame]
    for i, x in enumerate((-43, -30, -15, 3, 21, 37, 47)):
        direction = 1 if i % 2 else -1
        height = (37 + (i * 19) % 44) * growth
        tip = x + direction * (11 + 4 * sin(frame * .7 + i))
        p.poly(dark, (x - 11, 0), (x - 7, -height * .34), (tip, -height + 10),
               (tip + direction * 11, -height), (tip + direction * 8, -height * .71),
               (x + 7, -height * .37), (x + 13, 0))
        p.line(mid, 4, (x - 3, -1), (x, -height * .39), (tip + direction * 4, -height + 9))
        for j in (1, 2):
            leaf_x = x + (tip - x) * j / 3
            leaf_y = -height * (j + .4) / 4
            side = direction * (-1 if j == 1 else 1)
            p.poly(mid, (leaf_x, leaf_y), (leaf_x + side * 5, leaf_y - 9),
                   (leaf_x + side * 17, leaf_y - 13), (leaf_x + side * 10, leaf_y - 4))
            p.line(light, 1, (leaf_x, leaf_y), (leaf_x + side * 13, leaf_y - 11))
    for i in range(11):
        x = (i * 29) % 118 - 59
        p.spark(x, -8 - (i * 17 + frame * 9) % 69, 1 + i % 2, light)


def seismic(p, frame, shear):
    dark, mid, light = ("#543139", "#c37455", "#ffda97") if shear else ("#234659", "#52b6d0", "#cefbff")
    p.poly(dark, (-67, 0), (-49, -8), (-36, -3), (-17, -10), (1, -3), (23, -10),
           (40, -4), (58, -8), (66, 0), (56, 9), (29, 4), (5, 11), (-27, 4), (-54, 9))
    fade = 1 - frame * .055
    if shear:
        # Rock chips rise along the transverse bend, then fall behind the crest.
        points = [(-66, -3), (-50, -8), (-33, -22 * fade), (-22, -35 * fade),
                  (-8, -28 * fade), (6, -5), (21, -8), (38, -31 * fade), (56, -19 * fade), (67, -4)]
        p.poly(mid, *points, (64, 2), (10, 3), (-62, 2))
        p.line(light, 2, *points)
        for i in range(11):
            x = -57 + (i * 23 + frame * 7) % 119
            y = -6 - (i * 11 + frame * 8) % 36
            p.poly(mid, (x - 4, y), (x + 1, y - 3), (x + 5, y + 1), (x - 1, y + 4))
            p.line(light, 1, (x - 4, y), (x + 1, y - 3))
    else:
        # The gaps close toward the front like a stack of compressed pulses.
        for i, start in enumerate((-52, -26, -5, 12, 25, 35, 43)):
            x = start + (frame % 4) * 3
            height = (17 + i * 4) * fade
            p.poly(dark, (x - 11, -1), (x - 4, -height * .72), (x + 13, -height),
                   (x + 10, -height * .42), (x + 15, -1))
            p.poly(mid, (x - 9, -2), (x - 2, -height * .70), (x + 11, -height + 3), (x + 7, -2))
            p.line(light, 2, (x - 7, -2), (x, -height * .64), (x + 11, -height + 4))
            p.spark(x - 6, -height - i % 7, 2 + i % 2, light)


def shear_stop(p, frame):
    for i in range(16):
        f = (i + 2) / 18
        x = -f * (18 + frame * 7)
        y = -2 - (i * 19 % 42) * (1 + frame * .08)
        size = 1 + i % 4
        p.poly("#985943", (x - size, y), (x + 2, y - size), (x + size, y + 2), (x - 1, y + size))
        p.line("#ffca8b", 1, (x - size, y), (x + 2, y - size))
    if frame < 5:
        p.line("#6cc1d3", 4, (0, 1), (-2, -19), (2, -29), (0, -49 + frame * 4))
        p.line("#d8faff", 1, (0, -1), (0, -39 + frame * 4))


def moon(p, frame):
    length = 9 + frame % 4
    p.poly("#4e316e", (-length - 6, 0), (-6, -6), (0, -12), (9, -4), (16, 0),
           (8, 4), (0, 12), (-5, 5))
    p.poly("#a57bf2", (-length, 0), (-3, -5), (0, -10), (9, -3), (13, 0), (6, 4), (0, 10), (-3, 3))
    p.poly("#e3baff", (-10, 0), (-2, -4), (0, -8), (3, -2), (10, 0), (3, 2), (0, 8), (-2, 3))
    p.spark(0, 0, 5, "#f9faff")


def reflection(p, frame):
    reach = 22 + frame * 6
    for side in (-1, 1):
        p.poly("#6045a0", (0, 1), (side * reach, -reach), (side * (reach - 18), -reach + 4),
               (side * 16, -12), (side * (reach + 5), -8), (side * 15, 3))
        p.line("#e7bfff" if side == 1 else "#a3e7ff", 3, (0, 0), (side * 15, -13), (side * reach, -reach))
        p.line("#fcf8ff", 1, (side * 13, -10), (side * (reach - 6), -reach + 6))
        for i in range(6):
            d = (i + 1) * reach / 7
            p.spark(side * (d + i % 3 * 6), -d - (i * 7 + frame * 3) % 31, 1 + i % 4,
                    "#f2daff" if side == 1 else "#c4f7ff")
    p.spark(0, -2, 14 - frame, "#fff4ec")


def mirror(p, frame):
    p.poly("#362947", (-23, 0), (-17, -4), (17, -4), (23, 0), (20, 6), (-20, 6))
    p.poly("#7364a2", (-20, 0), (-15, -3), (15, -3), (20, 0), (16, 4), (-16, 4))
    p.line("#c9f2ff", 2, (-17, 0), (17, 0))
    p.spark(-15 + frame * 4, -1, 3, "#fff6ff")


def sunshaft(p, frame):
    for x, width, offset in ((-32, 14, 33), (-6, 17, 22), (23, 11, 17)):
        dx = x + round(4 * sin(frame * .8 + x))
        p.poly("#e9bd6e46", (dx - width, 5), (dx + width, 5), (dx + offset + 7, -101), (dx + offset - 7, -101))
        p.poly("#ffe4a263", (dx - width / 3, 3), (dx + width / 3, 3), (dx + offset + 2, -105), (dx + offset - 2, -105))
    for i in range(16):
        x = -56 + (i * 31 + frame * 3) % 110
        y = -4 - (i * 23 + frame * 8) % 88
        p.spark(x, y, 1 + i % 4, ("#dadb83", "#ffdd92", "#fff6c5")[i % 3])


def foam_wake(p, frame):
    spread = 33 + frame * 4
    for side in (-1, 1):
        p.poly("#b6588f87", (0, 2), (side * spread, 1), (side * (spread + 8), 5),
               (side * (spread - 11), 11), (side * 15, 12))
        p.line("#eda5d8", 2, (side * 4, 6), (side * (spread - 9), 7), (side * (spread + 3), 5))
    for i in range(23):
        x = (i * 29 + frame * 4) % (2 * spread) - spread
        y = -4 - (i * 9 + frame * (5 + i % 3)) % 74
        size = 2 + i % 6
        p.oval(x, y, size, size * .90, ("#d5b4df9c", "#92d1e1a8", "#f5bdd9ad")[i % 3])
        p.oval(x - size * .25, y - size * .35, max(1, size * .24), 1, "#fff2de")


def fracture(p, frame):
    radius = [30, 42, 53, 60, 65, 67, 68, 68][frame]
    for side in (-1, 1):
        points = [(0, 3), (side * radius * .22, 9), (side * radius * .35, 5),
                  (side * radius * .56, 10), (side * radius * .72, 4), (side * radius, 6)]
        p.line("#32223bbf", 6, *points)
        p.line("#e8cded", 2 if frame < 4 else 1, *points)
        for i in range(7):
            x = side * radius * (.28 + i * .10)
            y = 2 + (i * 7 + frame) % 15
            p.spark(x, y, 1 + (i * 5) % 3, ("#b993e4", "#fcdeb8")[i % 2])


ROWS = (gravity, collapse, foam, lambda p, f: roots(p, f, False), lambda p, f: roots(p, f, True),
        lambda p, f: seismic(p, f, False), lambda p, f: seismic(p, f, True), shear_stop, moon, reflection,
        mirror, sunshaft, foam_wake, fracture)


def bake():
    sheet = Image.new("RGBA", (WIDTH * FRAMES, HEIGHT * len(ROWS)))
    for row, draw in enumerate(ROWS):
        for frame in range(FRAMES):
            pixels = Pixels()
            draw(pixels, frame)
            left, top, right, bottom = pixels.image.getbbox()
            assert 0 < left < right < WIDTH and 0 < top < bottom < HEIGHT, (row, frame, pixels.image.getbbox())
            sheet.paste(pixels.image, (frame * WIDTH, row * HEIGHT))
    target = Path(__file__).resolve().parents[1] / "assets/combat/science-attacks.webp"
    sheet.save(target, lossless=True, method=6)


if __name__ == "__main__":
    bake()
