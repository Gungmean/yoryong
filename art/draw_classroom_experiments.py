"""Paint experiment props on the classroom atlas's pixel grid and daylight palette."""
import base64
import io
import json
from random import Random

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

from draw_campus_polish import WORLD, atlas_source


ROOM = atlas_source("classrooms")
SAMPLES = {
    "oak": (510, 195, 569, 250),
    "steel": (28, 188, 74, 242),
    "paper": (901, 124, 920, 151),
    "leaf": (747, 72, 796, 105),
}
ATLAS = {}


def swatch(size, material, colors):
    sample = ROOM.crop(SAMPLES[material]).resize(size, Image.Resampling.NEAREST).convert("L")
    texture = ImageChops.subtract(sample, sample.filter(ImageFilter.BoxBlur(3)), offset=128)
    detail = {"oak":.78,"steel":.40,"paper":.20,"leaf":.58}[material]
    grain = Image.blend(Image.new("L",size,128), ImageOps.autocontrast(texture, cutoff=3), detail)
    return ImageOps.colorize(grain, colors[0], colors[1])


def surface(image, polygon, material, colors):
    mask = Image.new("L", image.size)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    l, t, r, b = mask.getbbox()
    pixels = swatch((r-l,b-t), material, colors).convert("RGBA")
    image.paste(pixels, (l,t), mask.crop((l,t,r,b)))


def board(image, bounds, material, colors):
    l,t,r,b = bounds
    surface(image, [(l,t),(r,t),(r,b),(l,b)], material, colors)


def fixture(name, size):
    picture = Image.new("RGBA", size)
    ATLAS[name] = picture
    return picture, ImageDraw.Draw(picture)


def cabinet(name, w, h, bookshelf=False):
    im,d = fixture(name,(w,h))
    oak = ("#805336","#d2a166")
    green = ("#4f6159","#98a18a")
    shade, trim, material = ("#503d33",oak,"oak") if bookshelf else ("#3f514d",green,"steel")
    d.polygon([(1,6),(w-1,6),(w-1,h-2),(2,h-2),(1,h-5)],fill=shade)
    board(im,(4,7,w-5,h-9),material,trim)
    d.rectangle((5,h-7,w-6,h-3),fill=shade)
    d.line((6,h-7,w-7,h-7),fill=trim[0])
    d.line((3,7,3,h-9),fill=trim[1])
    d.line((w-4,7,w-4,h-9),fill=trim[0])
    door_top = 54 if bookshelf else 11
    for x in (8,w//2+2):
        end = x+w//2-11
        d.rectangle((x,door_top,end,h-12),fill=shade)
        board(im,(x+1,door_top+1,end-1,h-13),material,trim)
        d.line((x+2,door_top+2,end-1,door_top+2),fill=trim[1])
        if not bookshelf:
            d.line((x+2,door_top+4,x+2,h-14),fill="#a0a28b")
            d.line((x+4,h-15,end-3,h-15),fill="#637770")
        d.line((end-1,door_top+3,end-1,h-14),fill=trim[0])
        d.rectangle((end-10,door_top+5,end-4,door_top+7),fill="#635a4d")
        d.line((end-10,door_top+5,end-4,door_top+5),fill="#d2bd94")
    if bookshelf:
        books = ROOM.crop((348,112,372,164))
        for i,y in enumerate((9,31)):
            panel = books.crop((0,9+i*19,24,23+i*19)).resize((43,19),Image.Resampling.NEAREST)
            im.paste(panel,(8,y))
            im.paste(panel.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(w-51,y))
            d.rectangle((6,y+18,w-7,y+21),fill="#785539")
            d.line((7,y+18,w-8,y+18),fill="#ddaf75")
            d.line((w//2-2,y,w//2-2,y+17),fill="#b07b50",width=3)
    d.polygon([(0,3),(4,0),(w-5,0),(w-1,3),(w-1,7),(0,7)],fill=shade)
    d.line((3,1,w-4,1),fill="#efd29c")
    d.line((2,2,w-3,2),fill=trim[1])
    d.line((1,5,w-2,5),fill=trim[0])


def plant_parts():
    pot,d = fixture("pot",(39,26))
    surface(pot,[(2,4),(37,4),(33,21),(30,24),(9,24),(5,20)],
            "oak",("#6d493b","#c48863"))
    d.line([(2,5),(6,21),(10,24),(29,24),(33,21),(37,5)],fill="#6e4d3d")
    d.polygon([(2,2),(6,0),(32,0),(37,2),(38,5),(35,8),(3,8),(0,5)],fill="#9d6b53")
    d.line((4,2,33,2),fill="#efba85")
    d.line((4,6,35,6),fill="#c69068")
    d.line([(8,9),(9,17),(11,21)],fill="#dc9f73")
    for i in range(8):
        d.point((12+i*2,10+i*7%12),fill="#b07859")

    leaf,d = fixture("leaf",(100,18))
    edge = [(0,5),(7,2),(14,0),(82,0),(92,2),(99,5),(91,9),(82,11),(60,15),(49,17),(42,15),(13,11)]
    surface(leaf,edge,"leaf",("#4a684a","#9eac60"))
    d.line(edge+[edge[0]],fill="#3f6248")
    d.line([(11,3),(20,1),(76,1),(87,3)],fill="#c4ca77")
    d.line([(9,6),(46,9),(64,9),(91,5)],fill="#647f46")
    rng=Random(989)
    for x in range(13,87,8):
        y=5+rng.randrange(2)
        d.line([(x,y),(x+(7 if x<50 else -7),y+3)],fill="#8e9b54")
        d.line((x,y-1,x+3,y-1),fill="#b7c376")

    crown,d = fixture("apple-crown",(66,47))
    rng=Random(774)
    for x,y,w,h in [(0,22,23,20),(8,11,23,25),(22,3,25,25),(43,14,22,21),(18,23,24,24),(36,26,26,19)]:
        shape=[(x,y+8),(x+3,y+3),(x+8,y),(x+w-8,y+1),(x+w-3,y+4),
               (x+w-1,y+9),(x+w-3,y+h-5),(x+w-8,y+h-1),(x+6,y+h-2),(x+1,y+h-6)]
        surface(crown,shape,"leaf",("#536a43","#9eab65"))
        d.line(shape[:5],fill="#b5b16b")
        for k in range(15):
            px=x+3+rng.randrange(w-7)
            py=y+3+rng.randrange(h-8)
            d.line((px,py,px+1+rng.randrange(2),py), fill=rng.choice(("#697e4c","#a2a95d","#c0b56e","#536c45")))


def equipment():
    scale,d=fixture("balance",(58,37))
    surface(scale,[(6,33),(12,28),(44,28),(51,33),(50,36),(7,36)],"steel",("#645c49","#b4a17a"))
    surface(scale,[(24,29),(25,8),(29,4),(33,8),(34,29)],"steel",("#514b42","#b4a07b"))
    d.line((27,10,27,27),fill="#e1c693")
    d.line((9,33,49,33),fill="#dcc299")
    for x in (12,44):
        d.rectangle((x,34,x+3,35),fill="#745b4b")

    rail,d=fixture("lift-rails",(76,100))
    for x in (9,62):
        board(rail,(x,0,x+5,95),"steel",("#565958","#a1a591"))
        d.line((x+1,2,x+1,93),fill="#d3c7a8")
        d.line((x+5,1,x+5,93),fill="#4c504b")
        d.rectangle((x-3,93,x+8,99),fill="#60564a")
        d.line((x-2,93,x+7,93),fill="#c7ac83")
        for y in (11,73,95):
            d.point((x+2,y),fill="#e9cc9d")
    d.rectangle((0,8,12,25),fill="#54594c")
    board(rail,(1,9,11,23),"steel",("#61746b","#aba789"))
    d.line((1,9,11,9),fill="#d0c7a8")

    plate,d=fixture("lift-deck",(74,10))
    surface(plate,[(0,4),(6,0),(67,0),(73,4),(73,9),(0,9)],"oak",("#6e5541","#be9c6c"))
    d.line((6,0,67,0),fill="#e2c392")
    d.line((2,6,71,6),fill="#606356")
    d.line((5,7,67,7),fill="#a49573")
    for x in range(7,68,10):
        d.point((x,5),fill="#4a4841")

    vessel,d=fixture("vessel",(37,48))
    shape=[(9,0),(27,0),(28,11),(34,16),(35,42),(30,47),(6,47),(1,42),(2,17),(8,11)]
    surface(vessel,shape,"steel",("#608b81","#c3d6b2"))
    d.line(shape+[shape[0]],fill="#4c665d")
    d.polygon([(4,27),(9,25),(29,25),(33,27),(32,40),(29,44),(7,44),(4,39)],fill="#708f74")
    d.line([(4,27),(9,25),(29,25),(32,27)],fill="#b2c398")
    d.line([(8,14),(5,19),(5,37)],fill="#e6edce",width=2)
    d.line([(30,17),(32,19),(32,39)],fill="#71938b")
    for x,y in ((11,31),(25,33),(15,39),(21,29)):
        d.point((x,y),fill="#a8b498")
    d.rectangle((9,1,27,5),outline="#d8c8a0")
    for y in (19,24,30,35):
        d.line((28,y,30,y),fill="#d9dfb6")

    meter,d=fixture("meter",(50,33))
    surface(meter,[(0,5),(5,0),(44,0),(49,5),(49,31),(1,32)],"steel",("#574e43","#a69c79"))
    d.line([(1,6),(5,1),(44,1),(48,5)],fill="#e0c592")
    d.rectangle((5,5,44,23),fill="#3f5349")
    d.line((6,6,43,6),fill="#879183")
    d.line((6,22,43,22),fill="#617465")
    for x in (8,13,18,38,43):
        d.rectangle((x-2,26,x+1,29),fill="#62584c")
        d.line((x-2,26,x+1,26),fill="#dac396")

    mirror,d=fixture("mirror-stand",(25,45))
    d.polygon([(1,43),(6,38),(19,38),(24,42),(24,44),(1,44)],fill="#766552")
    d.line((3,42,22,42),fill="#cba97e")
    board(mirror,(10,2,14,40),"steel",("#455955","#a6b3a0"))
    d.line((11,2,11,39),fill="#c6c8a4")
    d.ellipse((8,0,17,9),fill="#727668",outline="#4b574e")
    d.point((11,2),fill="#e2d2a6")

    lamp,d=fixture("optics-light",(28,35))
    d.rectangle((4,29,25,34),fill="#6b604f")
    d.rectangle((12,13,16,29),fill="#596759")
    d.line((13,15,13,28),fill="#9a9b7f")
    surface(lamp,[(0,3),(4,0),(22,0),(25,4),(25,13),(1,13)],"steel",("#4d655a","#92a287"))
    d.line((3,2,23,2),fill="#c0c194")
    d.rectangle((22,4,27,10),fill="#c0af78")
    d.line((24,5,27,5),fill="#fae6ac")

    sensor,d=fixture("optics-detector",(24,56))
    surface(sensor,[(0,4),(3,0),(20,0),(23,4),(23,52),(19,55),(3,55),(0,52)],
            "steel",("#455e58","#879a83"))
    d.line([(1,5),(3,1),(20,1),(22,4)],fill="#bfc1a2")
    d.rectangle((4,7,19,22),fill="#455a50",outline="#d5c09b")
    for y in (28,32,36,40):
        d.line((6,y,17,y),fill="#9aa48d")
    d.rectangle((8,46,15,50),fill="#665e49")


def paper_and_bird():
    im,d=fixture("map-frame",(312,85))
    surface(im,[(0,1),(311,1),(311,84),(0,84)],"oak",("#634c37","#c4a56f"))
    d.line((1,1,310,1),fill="#ead09a")
    d.line((2,82,309,82),fill="#785e46")
    board(im,(6,5,305,79),"paper",("#728880","#a3ae91"))
    d.line((7,5,304,5),fill="#c6cdac")
    for x in (8,303):
        for y in (7,77):
            d.rectangle((x-1,y-1,x+1,y+1),fill="#747459")
            d.point((x-1,y-1),fill="#e8d4a1")
    im,d=fixture("card",(34,23))
    surface(im,[(1,1),(32,0),(33,20),(30,22),(1,22)],"paper",("#94815e","#e0cea1"))
    d.line([(2,1),(32,0),(33,20)],fill="#e6d5a8")
    d.line((2,20,30,20),fill="#8f7d5c")
    d.line((5,4,26,4),fill="#b8a47a")

    im,d=fixture("nest-bird",(43,22))
    surface(im,[(0,14),(5,10),(16,11),(22,13),(38,10),(42,14),(37,19),(34,21),(8,21),(4,18)],
            "oak",("#624a34","#b18c5e"))
    for i in range(13):
        x=3+i*3
        d.line((x,13+i%4,x+3,15+i%5),fill=["#d6af79","#9b794d","#70553d"][i%3])
    d.polygon([(11,11),(7,8),(16,9),(18,4),(22,1),(28,1),(32,4),(33,8),(29,14),(17,16)],fill="#65574d")
    d.polygon([(11,10),(18,6),(21,6),(23,2),(28,2),(31,5),(30,10),(24,13),(17,14)],fill="#b3a084")
    d.polygon([(12,10),(18,8),(23,9),(20,12),(15,12)],fill="#8a7564")
    d.point((27,4),fill="#322e27")
    d.point((26,3),fill="#ede0bb")
    d.polygon([(31,5),(37,7),(31,8)],fill="#ceaa6f")


def pack():
    atlas=Image.new("RGBA",(512,384))
    x=y=row=2
    regions={}
    for name,im in ATLAS.items():
        if x+im.width+2>atlas.width:
            x,y,row=2,y+row+3,0
        if y+im.height>atlas.height:
            raise RuntimeError("Classroom prop atlas overflow")
        atlas.paste(im,(x,y))
        regions[name]=[x,y,im.width,im.height]
        x+=im.width+3
        row=max(row,im.height)
    stride=y+row+2
    art=atlas.crop((0,0,atlas.width,stride))
    atlas=Image.new("RGBA",(art.width,stride*3))
    # The homerooms show spring morning, summer daylight and warm autumn light.
    alpha=art.getchannel("A")
    for grade, gains in enumerate(((1.0,1.0,1.0),(.98,1.035,1.01),(1.06,1.01,.94))):
        channels=[band.point(lambda v, gain=gain: min(255,round(v*gain)))
                  for band,gain in zip(art.split(),gains)]
        atlas.paste(Image.merge("RGBA",(*channels,alpha)),(0,stride*grade))
    buf=io.BytesIO()
    atlas.save(buf,"WEBP",lossless=True,method=6)
    data={"regions":regions,"gradeStride":stride,"data":"data:image/webp;base64,"+base64.b64encode(buf.getvalue()).decode("ascii")}
    (WORLD/"classroom-props.js").write_text("const classroomPropAtlas = "+json.dumps(data,separators=(",",":"))+";\n",encoding="utf-8")


if __name__=="__main__":
    cabinet("bookcase",116,96,True)
    cabinet("lab-counter",90,49)
    cabinet("steel-rack",109,83)
    plant_parts()
    equipment()
    paper_and_bird()
    pack()
