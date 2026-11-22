"""Bake the school's revised lab walls, classroom glazing, and dialogue portraits."""
import base64
import io
import json
import re
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter, features


ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "assets/world"


def atlas_source(name):
    src = (WORLD / (name + ".js")).read_text(encoding="utf-8")
    data = re.search(r"data:image/[^,]+,([A-Za-z0-9+/=]+)", src)[1]
    return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")


def grade_hall(hall, classroom, grade):
    result = hall.copy()
    # Only replace the view through the glass. Original mullions, lights and
    # door frames share the same coordinates as the tiles used by the game.
    groups = [
        ((0,178,109,258), (120,207), [(0,27),(35,67),(72,109)]),
        ((228,179,375,258), (710,845), [(228,256),(261,288),(293,320),(326,348),(353,375)]),
        ((579,179,671,258), (224,308), [(579,603),(608,635),(640,671)]),
        ((134,192,191,245), (127,193), [(134,160),(168,191)]),
        ((477,188,549,247), (710,788), [(477,512),(519,549)]),
    ]
    top, end = [(67, 208), (74, 217), (75, 219)][grade]
    for (x,y,right,bottom), (sx,ex), panes in groups:
        view = classroom.crop((sx,grade*360+top,ex,grade*360+end))
        view = view.resize((right-x,bottom-y),Image.Resampling.NEAREST)
        for a,b in panes:
            patch = view.crop((a-x,0,b-x,bottom-y))
            original = result.crop((a,y,b,bottom))
            result.paste(Image.blend(patch,original,.20),(a,y))

    d = ImageDraw.Draw(result)
    accent = ["#678a7b", "#556e91", "#9b6f4c"][grade]
    d.rectangle((391,186,444,254), fill="#77543c")
    d.rectangle((394,189,441,251), fill="#b18d5d")
    d.rectangle((397,192,438,247), fill="#9e794d")
    d.rectangle((399,194,436,201), fill=accent)
    for i, (px, py) in enumerate([(400,205),(418,208),(408,228)]):
        d.rectangle((px,py,px+13,py+14), fill=["#f0dfa7","#ece3cb","#e3b485"][(i+grade)%3])
        d.line((px+2,py+5,px+10,py+5), fill=accent)
        d.line((px+2,py+8,px+8,py+8), fill="#9c8266")
        d.point((px+6,py+1), fill="#744c38")
    return result


def apply_surface_grain(image, source, bounds, strength):
    grain = source.convert("L").resize((118,46),Image.Resampling.BOX)
    soften = grain.filter(ImageFilter.BoxBlur(4))
    shifts = [int((a-b)*strength) for a,b in zip(grain.get_flattened_data(),soften.get_flattened_data())]
    pixels = image.load()
    l,t,r,b = bounds
    for y in range(t,b):
        for x in range(l,r):
            shade = shifts[(x%118)+(y%46)*118]
            pixels[x,y] = tuple(max(0,min(255,c+shade)) for c in pixels[x,y])


def lab(kind, origin):
    """Coordinate layout uses 1040×360 world units and the game's 318 ground line."""
    rng = Random(300 + kind)
    wall = ["#d4caa9", "#d1ccae", "#d6cfac", "#dfceab"][kind]
    door = ["#587a78", "#617e73", "#6b825c", "#7b7e63"][kind]
    trim = "#765f47"
    dim = "#484944"
    image = Image.new("RGB", (1040,360), wall)
    d = ImageDraw.Draw(image)
    d.rectangle((0,0,1039,59),fill="#b6a593")
    d.rectangle((0,28,1039,57),fill="#c5b69e")
    for x in range(-60,1070,143):
        d.line((x,0,x+34,49),fill="#a29284")
        d.line((x+1,0,x+35,49),fill="#cebea5")
    d.rectangle((0,58,1039,63),fill=trim)
    d.rectangle((0,64,1039,68),fill="#f1dfb9")
    d.rectangle((0,68,1039,71),fill="#b6a888")
    d.rectangle((0,185,1039,265),fill="#9d9f85")
    d.rectangle((0,184,1039,187),fill="#727b68")
    d.rectangle((0,258,1039,268),fill="#615949")
    d.rectangle((0,269,1039,359),fill="#aa8b68")
    for x in range(-160,1260,103):
        d.line((x,269,520+(x-520)*1.44,359),fill="#896b53",width=2)
        d.line((x+1,269,521+(x-520)*1.44,359),fill="#c4a27a")
    for y in (277,292,312,337):
        d.line((0,y,1039,y),fill="#816a54")
        d.line((0,y+1,1039,y+1),fill="#c5a579")
    for y in range(72,182,2):
        mix = (182-y)//18
        c = tuple(int(wall[i:i+2],16) for i in (1,3,5))
        d.line((0,y,1039,y),fill=tuple(n+mix for n in c))
    for _ in range(6400):
        x,y=rng.randrange(1040),rng.randrange(360)
        c=image.getpixel((x,y))
        shift=rng.choice((-6,-4,-2,2,3,5,7))
        d.line((x,y,x+rng.choice((0,1,1,3)),y),fill=tuple(min(255,max(0,n+shift)) for n in c))
    for x in (246,772):
        d.line((x+5,25,x+5,44),fill=dim,width=2)
        d.line((x+110,25,x+110,44),fill=dim,width=2)
        d.rectangle((x,43,x+116,57),fill=dim)
        d.rectangle((x+2,45,x+114,49),fill="#9a906c")
        d.rectangle((x+4,50,x+112,54),fill="#fff0b2")
        d.line((x+7,54,x+110,54),fill="#ffffe5")

    for x in (132,645):
        d.rectangle((x-5,97,x+175,211),fill="#7d705a")
        d.rectangle((x-2,100,x+171,207),fill=dim)
        view = origin.crop((710, 60+(kind%3)*360, 844, 172+(kind%3)*360)).resize((166,105), Image.Resampling.NEAREST)
        image.paste(Image.blend(view, Image.new("RGB", view.size, "#c4c6b9"), .25), (x+2,102))
        for n in (0,56,112,168):
            d.rectangle((x+n,100,x+n+2,206),fill=door)
            d.line((x+n+3,102,x+n+3,204),fill="#8e9d88")
        d.rectangle((x,127,x+169,131),fill=door)
        d.rectangle((x-6,209,x+176,214),fill="#716b57")
        d.line((x-5,210,x+174,210),fill="#ead8ac")
        # Window light and sash shadows fall across the same grouted floor.
        glass = Image.new("RGBA", image.size)
        light = ImageDraw.Draw(glass)
        for k in range(3):
            px = x + 21 + k * 39
            reach = [88,72,102,80][kind]
            light.polygon([(px,270),(px+34,270),(px+34+reach,343),(px+reach,343)],fill=(255,222,150,70))
            light.line((px,270,px+reach,343),fill=(244,208,142,48))
        for y in (277,292,312,337):
            light.line((x,y,x+232,y),fill=(0,0,0,0))
        image.paste(glass,(0,0),glass)
    apply_surface_grain(image, origin.crop((366,292,675,359)), (0,269,1040,360), .52)
    apply_surface_grain(image, origin.crop((420,43,670,78)), (0,60,1040,185), .30)

    for x in (15,963):
        d.rectangle((x-4,107,x+67,267),fill=dim)
        d.rectangle((x,109,x+63,264),fill=door)
        d.rectangle((x+8,118,x+55,173),fill="#3d5653")
        d.rectangle((x+10,120,x+53,170),fill="#a0a697")
        d.polygon([(x+11,143),(x+34,121),(x+49,121),(x+11,158)],fill="#d1c9a8")
        d.rectangle((x+9,180,x+55,255),outline="#445d53",width=2)
        d.rectangle((x+51,194,x+55,211),fill="#3c4143")
        d.line((x+52,195,x+52,205),fill="#c5bea0")
        d.rectangle((x-3,99,x+66,107), fill="#7b6e59")
    for x in (115,637):
        d.rectangle((x,223,x+221,263),fill=dim)
        d.rectangle((x+2,225,x+218,258),fill=door)
        d.rectangle((x-4,220,x+225,226),fill=trim)
        d.rectangle((x-3,220,x+224,221),fill="#dcc295")
        for j in range(4):
            d.rectangle((x+7+54*j,232,x+50+54*j,244),fill=["#648581","#6f8a7d","#778a67","#888a70"][kind])
            d.rectangle((x+5+54*j,230,x+52+54*j,255),outline="#494e44")
            d.line((x+23+54*j,235,x+34+54*j,235), fill="#d1c498",width=2)
    # Rear benches stay above the playfield. The live specimen is positioned on
    # the left bench while the right one has running water and a drying rack.
    d.rectangle((714,219,763,222),fill="#4b5452")
    d.rectangle((718,218,760,220),fill="#839b94")
    d.line([(736,218),(736,202),(747,202),(747,208)],fill="#4e615e",width=3)
    d.line([(737,217),(737,203),(746,203)],fill="#d0d7bc")
    for j in range(3):
        x=780+j*12
        d.rectangle((x,205,x+4,218),fill="#778e88")
        d.line((x+1,206,x+1,216),fill="#dbe1c7")

    d.rectangle((378,107,613,211),fill="#a49a7e")
    d.rectangle((376,103,610,207),fill=dim)
    d.rectangle((379,106,607,203),fill="#77674e")
    d.rectangle((382,109,604,200),fill="#475d54")
    d.rectangle((382,199,605,202),fill="#887e61")
    accent = ["#acc4b9", "#d2bc9f", "#aabe8b", "#deb882"][kind]
    for i in range(4):
        d.line((495,154+i*7,586-i*8,154+i*7),fill="#64786b")
    if kind == 0:
        d.line([(403,166),(421,166),(421,138),(461,138),(461,166),(482,166)],fill=accent,width=2)
        d.line((434,133,434,143),fill=accent,width=2)
        d.line((440,130,440,146),fill=accent,width=2)
        d.ellipse((451,155,470,175),outline=accent,width=2)
    elif kind == 1:
        for x,y in ((418,142),(438,152),(421,174),(465,144),(477,171)):
            d.ellipse((x-6,y-6,x+6,y+6),outline=accent,width=2)
            d.point((x,y),fill=accent)
    elif kind == 2:
        d.line([(441,181),(441,146),(458,135)],fill=accent,width=2)
        d.polygon([(441,164),(425,159),(412,146),(429,147)],outline=accent)
        d.polygon([(441,170),(458,155),(471,153),(462,165)],outline=accent)
        d.line((428,181,458,181),fill=accent)
    else:
        for j,c in enumerate(("#a8af89","#c2a579","#cfa88a","#a79177")):
            d.polygon([(401,146+j*8),(438,140+j*8),(479,156+j*8),(479,162+j*8),(438,146+j*8),(401,152+j*8)],fill=c)
    for x,y in ((557,124),(574,130),(588,133)):
        d.rectangle((x,y,x+9,y+15),fill="#bbad87")
        d.point((x+4,y+1),fill="#b16955")
    # The side shelf changes its tools in each lab.
    d.rectangle((865,214,944,247),fill="#92896c")
    d.rectangle((866,215,943,218),fill="#cec39d")
    d.rectangle((872,220,938,243),fill="#777c68")
    d.rectangle((865,234,944,236),fill="#b6ac89")
    if kind == 0:
        for x,y in ((879,225),(896,225),(916,225)):
            d.ellipse((x-4,y-5,x+4,y+3),fill="#c2b794",outline="#4e5c57")
            d.line((x,y-1,x+2,y-4),fill="#706053")
    elif kind == 1:
        for x,h in ((879,12),(890,9),(910,13),(924,8)):
            d.rectangle((x,233-h,x+5,232),fill="#a2b9ad",outline="#627f79")
            d.line((x+1,231,x+4,231),fill="#dbc8a2")
    elif kind == 2:
        for x in (880,900,921):
            d.polygon([(x-4,226),(x+5,226),(x+3,233),(x-3,233)],fill="#b78460")
            d.line((x,227,x,219),fill="#405f4c")
            d.line((x,225,x+4,221),fill="#91a26e",width=2)
    else:
        for x,y,color in ((877,231,"#9e8268"),(893,230,"#afa696"),(910,229,"#c4b193"),(927,232,"#92715d")):
            d.polygon([(x-5,233),(x-3,y-4),(x+2,y-5),(x+6,y),(x+5,233)],fill=color)
    d.rectangle((888,145,925,192),fill="#f0e5c6",outline="#8d775f",width=2)
    d.rectangle((892,150,920,155),fill="#995f48")
    d.polygon([(905,160),(895,176),(915,176)],outline="#ae7541",width=2)
    d.line((905,164,905,170),fill=dim)
    d.point((905,173),fill=dim)
    return image


def entrance_view(facade):
    view = Image.new("RGB",(260,256))
    # From the entrance we face away from the building, across the yard.
    sky = facade.crop((10,5,248,133)).resize((260,112),Image.Resampling.NEAREST)
    trees = facade.crop((0,148,66,301)).resize((260,110),Image.Resampling.NEAREST)
    yard = facade.crop((7,313,296,442)).resize((260,105),Image.Resampling.NEAREST)
    view.paste(sky,(0,0))
    view.paste(trees,(0,90))
    view.paste(yard,(0,151))
    d = ImageDraw.Draw(view)
    for x in range(0,260,14):
        d.line((x,121,x,151),fill="#385f53",width=2)
        d.point((x,119),fill="#91a17c")
    for y in (124,145):
        d.line((0,y,259,y),fill="#667f64",width=2)
    for y in range(170,256,7):
        edge=(y-170)//2
        d.line((57-edge,y,201+edge,y),fill="#b99c78",width=4)
        d.line((56-edge,y+4,202+edge,y+4),fill="#d9b98e")
    return view


def write_atlas():
    source = atlas_source("atlas")
    classroom = atlas_source("classrooms")
    original = json.loads((WORLD / "atlas.js").read_text(encoding="utf-8").split("const campusAtlas = ")[1].strip().removesuffix(";"))["regions"]
    x, y, w, h = original["corridor"]
    hall = source.crop((x, y, x+w, y+h))
    atlas = Image.new("RGB", (2048, 1424))
    regions = {}
    for grade in range(3):
        x=grade*w
        atlas.paste(grade_hall(hall, classroom, grade),(x,720))
        regions[f"hall{grade+3}"] = [x,720,w,h]
    for i, key in enumerate(("physics","chem","bio","earth")):
        x, y = i%2*1024, i//2*360
        atlas.paste(lab(i,classroom).resize((1024,360),Image.Resampling.NEAREST),(x,y))
        regions[key] = [x,y,1024,360]
    x,y,w,h = original["school"]
    atlas.paste(entrance_view(source.crop((x,y,x+w,y+h))),(0,1168))
    regions["entrance-view"] = [0,1168,260,256]
    out = io.BytesIO()
    atlas.save(out, "WEBP", lossless=True, method=6)
    metadata = {"regions": regions, "data": "data:image/webp;base64,"+base64.b64encode(out.getvalue()).decode("ascii")}
    (WORLD / "school-rooms.js").write_text("const schoolRoomAtlas = "+json.dumps(metadata,separators=(",",":"))+";\n", encoding="utf-8")


def write_portraits():
    target = ROOT / "assets/portraits"
    target.mkdir(exist_ok=True)
    for i in range(8):
        src = Image.open(ROOT / f"assets/scholar{i}.png").convert("RGBA")
        src = src.crop(src.getchannel("A").point(lambda a: 255 if a > 132 else 0).getbbox())
        src.thumbnail((66,72),Image.Resampling.LANCZOS)
        mask = src.getchannel("A").point(lambda a: 255 if a >= 148 else 0)
        rgb = Image.new("RGB",src.size,"#343448")
        rgb.paste(src.convert("RGB"),mask=mask)
        mode = Image.Quantize.LIBIMAGEQUANT if features.check_feature("libimagequant") else Image.Quantize.MEDIANCUT
        poster = rgb.quantize(colors=24,method=mode,dither=Image.Dither.NONE).convert("RGBA")
        poster.putalpha(mask)
        portrait = Image.new("RGBA",(70,76))
        x,y=(70-src.width)//2,74-src.height
        outline = Image.new("L",portrait.size)
        outline.paste(mask,(x,y))
        portrait.paste("#302d40",mask=outline.filter(ImageFilter.MaxFilter(3)))
        portrait.alpha_composite(poster,(x,y))
        portrait.save(target / f"scholar{i}.png",optimize=True)


if __name__ == "__main__":
    write_atlas()
    write_portraits()
