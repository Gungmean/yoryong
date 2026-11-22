"""Pack the campus furniture and lighting masks. Run with Python, Pillow and NumPy."""
import base64
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / "art/fixture-masters.webp").convert("RGBA")
parts = {}


def grade(image, gain, bias=(0, 0, 0), tint=(0, 0, 0)):
    pixels = np.array(image.convert("RGBA"))
    rgb = pixels[:, :, :3].astype(float)
    highlight = rgb.max(axis=2, keepdims=True) / 255
    pixels[:, :, :3] = np.clip(rgb * gain + bias + highlight ** 2 * tint, 0, 255)
    return Image.fromarray(pixels)


for i, name in enumerate(("bench", "physics", "chem", "bio", "earth", "roof")):
    w, h = source.size
    cell = source.crop((i % 3 * w // 3, i // 3 * h // 2, (i % 3 + 1) * w // 3, (i // 3 + 1) * h // 2))
    bounds = cell.getchannel("A").point(lambda a: 255 if a > 100 else 0).getbbox()
    cell = cell.crop(bounds)
    cell.thumbnail((165, 96), Image.Resampling.LANCZOS)
    parts[name] = cell

# The colours are taken into the same light as each painted room. Dark metal
# keeps local colour in the shadows; the lamp/window colour shows on the rim.
parts["hall-case"] = grade(parts["earth"], (1.09, .95, .69), (21, 13, 0), (19, 14, 1))
parts["physics"] = grade(parts["physics"], (.92, .97, 1.14), (4, 5, 19), (-8, 7, 18))
parts["chem"] = grade(parts["chem"], (1.06, .8, 1.1), (10, 1, 19), (10, -8, 22))
parts["bio"] = grade(parts["bio"], (.99, 1.06, .77), (6, 7, 0), (12, 10, -4))
parts["earth"] = grade(parts["earth"], (1.06, .95, 1.02), (3, 4, 12), (14, 4, 0))
parts["roof-day"] = grade(parts["roof"], (1.04, .91, .92), (12, 8, 12), (22, 10, 1))
parts["roof-night"] = grade(parts.pop("roof"), (.68, .54, .88), (14, 5, 27), (29, 6, 31))

# Polished floor reflections use the same silhouette, broken up by fine floor grain.
for name in ("bench", "hall-case", "physics", "chem", "bio", "earth"):
    a = np.array(parts[name].transpose(Image.Transpose.FLIP_TOP_BOTTOM).resize((128,22),Image.Resampling.LANCZOS))
    for y in range(a.shape[0]):
        a[y,:,3] = a[y,:,3] * (1-y/21)**1.6 * (.35 if y%4 else .18)
    parts["reflection-"+name] = Image.fromarray(a)

for name, gain, bias in [
    ("physics", (.89, .98, 1.06), (1, 5, 15)), ("chem", (1.13, .72, 1.06), (14, 1, 20)),
    ("bio", (.96, 1.03, .65), (12, 15, 2)), ("earth", (1.04, .88, .94), (9, 4, 12)),
    ("roof-night", (.88, .82, 1.02), (7, 3, 11)), ("roof-day", (1.02, .95, .88), (25, 19, 15)),
]:
    outside = name.startswith("roof")
    stair = Image.open(ROOT / ("assets/stairs/roof.webp" if outside else "assets/stairs/arena.webp")).convert("RGBA")
    stair.thumbnail((176, 86), Image.Resampling.LANCZOS)
    if outside and name == "roof-day":
        grey = np.asarray(stair.convert("L"))
        arr = np.array(stair)
        arr[:, :, :3] = .25 * arr[:, :, :3] + .75 * grey[:, :, None]
        stair = Image.fromarray(arr)
    steps = grade(stair, gain, bias)
    if not outside:
        a = np.asarray(stair).astype(float)
        blue = np.clip((a[:,:,2]-a[:,:,0]-14)/78,0,1) * np.clip((a[:,:,1]-a[:,:,0])/45,0,1)
        rgb = np.array(steps)
        lamp = {"physics":(.54,.91,1), "chem":(.93,.58,1), "bio":(.83,1,.52), "earth":(1,.78,.45)}[name]
        band = a[:,:,:3].max(axis=2)[:,:,None] * lamp
        rgb[:,:,:3] = rgb[:,:,:3]*(1-blue[:,:,None]) + band*blue[:,:,None]
        steps = Image.fromarray(rgb)
    parts["stairs-" + name] = steps

# A low relief roll of the classroom sill and a painted equirectangular school globe.
sill = Image.new("RGBA",(68,7)); pen=ImageDraw.Draw(sill)
pen.polygon([(3,0),(64,0),(67,3),(67,5),(1,6),(0,4)],fill="#726453")
pen.polygon([(3,0),(64,0),(66,2),(1,2)],fill="#c7b697")
pen.line((2,3,66,3),fill="#b1a084")
for x in (7,22,37,53):
    pen.line((x,1,x+4,1),fill="#dbc7a6")
    pen.point((x+3,4),fill="#96846a")
parts["sill"]=sill
globe=Image.new("RGBA",(120,60),"#426c82"); pen=ImageDraw.Draw(globe)
coasts=[[(3,9),(13,6),(22,11),(31,8),(42,11),(37,16),(29,18),(24,26),(19,26),(17,20),(8,17)],
        [(25,26),(35,28),(44,34),(41,41),(35,48),(31,54),(29,44),(26,39)],
        [(38,4),(49,3),(46,10),(40,12)],[(54,23),(63,20),(70,23),(76,29),(73,37),(66,45),(61,39),(59,30),(54,28)],
        [(54,18),(58,13),(63,12),(66,8),(73,11),(82,8),(99,8),(114,13),(107,18),(98,21),(93,28),(90,29),(86,23),(81,30),(77,25),(73,19),(67,21),(63,18),(58,22)],
        [(91,37),(100,34),(108,40),(106,45),(97,44)],[(0,57),(25,55),(33,58),(50,56),(69,54),(97,57),(119,55),(119,59),(0,59)]]
for coast in coasts: pen.polygon(coast,fill="#a8a57a",outline="#c4b88b")
for x in range(0,120,15):
    for y in range(2,58,3): pen.point((x,y),fill="#839999")
for y in [15,30,45]:
    for x in range(0,120,3): pen.point((x,y),fill="#93a3a0")
parts["globe"]=globe

# An asymmetric dithered cast shadow, with a denser contact strip under the feet.
rng = np.random.default_rng(420)
y, x = np.mgrid[-1:1:23j, -1:1:141j]
cast = np.maximum(0, 1 - ((x - .09 - .14*y)/.92)**2 - ((y-.05)/.96)**2) ** 1.4
contact = np.maximum(0, 1 - ((x+.07)/.83)**4 - ((y+.05)/.25)**2)
alpha = np.clip(np.rint((54*cast + 73*contact + rng.uniform(-5,5,x.shape)*cast)/7)*7,0,160)
shadow = np.zeros((*x.shape,4),dtype=np.uint8)
shadow[:, :, :3] = (37, 24, 46)
shadow[:, :, 3] = alpha
parts["shadow"] = Image.fromarray(shadow)

sheet = Image.new("RGBA",(768,512))
regions = {}
x = y = row = 0
for name, item in parts.items():
    w,h = item.size
    if x+w+2 > sheet.width:
        x,y,row = 0,y+row+2,0
    sheet.paste(item,(x,y))
    regions[name] = [x,y,w,h]
    x += w+2
    row = max(row,h)
assert y+row <= sheet.height
sheet = sheet.crop((0,0,sheet.width,y+row))
out = io.BytesIO()
sheet.save(out, "WEBP", lossless=True, method=6)
data = dict(regions=regions, data="data:image/webp;base64,"+base64.b64encode(out.getvalue()).decode())
(ROOT/"assets/world/fixtures.js").write_text("// Generated by art/bake_fixtures.py\nconst fixtureAtlas = "+json.dumps(data,separators=(",",":"))+";\n",encoding="utf8")
