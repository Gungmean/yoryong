"""Build the game's original Bugwang pixel artwork. Requires Pillow."""

import random
from pathlib import Path

from PIL import Image, ImageDraw


OUT = Path(__file__).resolve().parents[1] / "assets" / "ui"
INK = "#152953"
GOLD = "#f4c456"
CREAM = "#fff0ae"


def canvas(width, height):
    return Image.new("RGBA", (width, height))


def globe():
    """A lit horizon inside a longitude dial, inspired by the school's globe and light."""
    im = canvas(40, 40)
    d = ImageDraw.Draw(im)
    d.ellipse((1, 2, 38, 39), fill="#162245")
    d.ellipse((1, 0, 38, 37), fill="#bd8435", outline="#0c2350")
    d.arc((2, 1, 37, 36), 155, 331, fill=CREAM, width=2)
    d.ellipse((4, 3, 35, 34), fill="#253d78", outline=INK)
    d.ellipse((6, 5, 33, 32), fill=GOLD)
    for points in [[(18,6),(21,6),(21,16),(19,18)], [(26,7),(29,9),(23,16),(21,17)],
                   [(9,11),(11,9),(16,15),(15,17)]]:
        d.polygon(points, fill=CREAM)
    d.ellipse((7,12,32,33), fill="#91c48d", outline=INK, width=2)
    d.ellipse((14,12,25,33), outline=INK, width=2)
    d.arc((8,15,31,24), 0, 180, fill=INK, width=2)
    d.arc((9,21,30,28), 4, 176, fill="#36618a", width=1)
    d.line([(10,17),(13,14),(16,14)], fill="#d7e9a2")
    d.line([(27,4),(30,5),(32,7)], fill="#fff6cf")
    d.rectangle((18,35,21,36),fill=GOLD)
    return im


def rose():
    im = canvas(30, 31)
    d = ImageDraw.Draw(im)
    d.polygon([(4,29),(5,23),(11,21),(15,21),(12,27),(8,28)], fill="#356454")
    d.polygon([(14,25),(21,20),(28,20),(25,25),(21,27),(16,27)], fill="#477752")
    d.line([(5,28),(10,25),(13,23)],fill="#b4cb80")
    d.line([(17,26),(24,23)],fill="#a9c374")
    d.polygon([(5,9),(9,9),(11,5),(16,2),(20,3),(23,6),(26,7),(27,13),(25,17),
               (24,21),(20,24),(13,25),(8,22),(6,19),(3,16),(3,12)], fill="#753b58")
    d.polygon([(5,11),(11,10),(12,5),(17,4),(21,5),(23,8),(25,9),(24,16),(20,20),
               (16,23),(10,21),(8,18),(5,16)], fill="#e78da0")
    d.polygon([(5,11),(9,11),(10,16),(15,20),(10,19),(6,16)], fill="#f8bdba")
    d.polygon([(12,7),(15,4),(19,4),(22,7),(18,7),(15,8)], fill="#ffe4d0")
    d.polygon([(12,9),(16,7),(20,8),(22,11),(21,15),(18,18),(13,18),(10,14)], fill="#b75b7e")
    d.line([(11,11),(14,9),(18,9),(20,11),(18,14),(15,15),(13,13),(15,11),(17,11)], fill="#ffd4c6",width=2)
    d.line([(10,17),(13,20),(17,21),(20,19),(23,16)],fill="#f6a6ae",width=2)
    d.line([(6,10),(9,10)],fill="#ffe2cc")
    return im


def zelkova():
    """A broad vase-shaped crown over a forked trunk, lit from the upper left."""
    im = canvas(78, 59)
    d = ImageDraw.Draw(im)
    d.ellipse((16,53,64,57), fill="#476051")
    d.polygon([(28,55),(35,51),(37,42),(34,36),(24,33),(18,28),(24,28),
               (34,32),(38,35),(42,23),(45,24),(42,38),(49,34),(57,27),(61,26),
               (56,34),(46,41),(43,46),(44,52),(50,55),(41,54),(37,55)], fill="#4a4146")
    d.line([(35,52),(39,47),(40,40),(48,36)], fill="#9a795a", width=2)
    d.line([(41,52),(41,46)],fill="#c39764")
    lobes = [(15,28,13,7),(24,20,15,11),(14,23,9,7),(35,16,15,11),
             (48,13,12,9),(58,18,14,10),(66,25,10,8),(52,28,15,11),
             (35,29,13,10),(23,31,12,6),(37,20,18,11)]
    for x,y,w,h in lobes:
        d.ellipse((x-w,y-h,x+w,y+h), fill="#244858")
    rng = random.Random(57)
    for x,y,w,h in lobes:
        d.ellipse((x-w+1,y-h,x+w-2,y+h-3),fill="#41705c")
        d.ellipse((x-w+1,y-h,x+w-5,y+1),fill="#739656")
        d.arc((x-w+3,y-h,x+w-5,y+h-3),195,276,fill="#a9b75f",width=2)
        for _ in range(14):
            px,py = rng.randint(x-w+2,x+w-2),rng.randint(y-h+1,y+h-2)
            if ((px-x)/w)**2+((py-y)/h)**2 < .8:
                color = rng.choice(("#a4b55d","#91a753","#65894f")) if py<y else "#527c56"
                d.line((px,py,px+rng.randrange(1,4),py),fill=color)
    return im


def socket(active):
    im = canvas(44,44)
    d = ImageDraw.Draw(im)
    rim, light = ("#ba8740",CREAM) if active else ("#536b99","#98aace")
    edge = [(5,0),(38,0),(43,5),(43,36),(38,41),(26,41),(22,43),(18,41),(5,41),(0,36),(0,5)]
    d.polygon(edge,fill=INK)
    d.polygon([(5,1),(38,1),(42,5),(42,35),(37,40),(6,40),(1,35),(1,5)],fill=rim)
    d.polygon([(6,3),(37,3),(40,6),(40,34),(36,38),(7,38),(3,34),(3,6)],fill="#243e74" if active else "#20325b")
    d.line([(2,8),(2,5),(6,1),(28,1)],fill=light)
    d.line([(6,36),(8,38),(35,38),(38,35)],fill="#46669a")
    d.rectangle((18,39,26,40),fill=rim)
    d.line((20,40,24,40),fill=light)
    if not active:
        d.ellipse((12,11,34,31),outline="#435880")
        d.ellipse((17,11,29,31),outline="#435880")
        d.arc((12,14,34,24),0,180,fill="#435880")
        d.point((32,15),fill="#8294ad")
    return im


def cover(tree, flower):
    """A dusk landscape on the cloth cover of the campus field book."""
    im = canvas(198,58)
    d = ImageDraw.Draw(im)
    d.ellipse((111,-18,191,62),outline="#405887")
    d.ellipse((127,-18,175,62),outline="#405887")
    d.arc((110,3,192,29),0,180,fill="#405887")
    for x,y in [(23,18),(58,8),(92,20),(113,6),(177,5),(186,19)]:
        d.line((x-2,y,x+2,y),fill="#8996ab")
        d.line((x,y-2,x,y+2),fill="#8996ab")
    d.ellipse((96,14,121,39),fill="#e5b651")
    d.line((97,22,118,22),fill="#ffdf8d")
    d.polygon([(13,54),(30,50),(49,49),(59,42),(70,40),(78,35),(84,36),(94,30),
               (103,32),(116,27),(127,29),(138,24),(157,27),(168,23),(197,27),(197,57)],fill="#465b87")
    d.polygon([(0,57),(23,55),(39,52),(55,53),(79,46),(95,47),(108,42),
               (126,43),(142,34),(168,38),(187,32),(197,34),(197,57)],fill="#2e496f")
    im.alpha_composite(tree,(120,0))
    im.alpha_composite(flower.resize((19,20),Image.Resampling.NEAREST),(108,38))
    d.line([(63,55),(73,53),(83,53),(88,51)],fill="#778663")
    return im


def trim():
    im = canvas(76,14)
    d = ImageDraw.Draw(im)
    for x in (0,38):
        d.line([(x,12),(x+5,12),(x+12,6),(x+17,6),(x+20,3),(x+23,6),(x+28,6),(x+35,12),(x+38,12)],fill="#43547e")
        d.line([(x+14,10),(x+20,6),(x+26,10)],fill="#58638a")
        d.point((x+20,2),fill="#9a855e")
    return im


def binding_edge():
    im = canvas(25,25)
    d = ImageDraw.Draw(im)
    for inset,color in [(0,"#101e3d"),(1,"#b48a49"),(2,"#f6d989"),(3,"#354770")]:
        d.rectangle((inset,inset,24-inset,24-inset), outline=color)
    for x,y,sx,sy in [(0,0,1,1),(24,0,-1,1),(0,24,1,-1),(24,24,-1,-1)]:
        d.polygon([(x+sx,y+sy),(x+8*sx,y+sy),(x+sx,y+8*sy)],fill="#bd944f")
        d.line([(x+sx,y+6*sy),(x+sx,y+sy),(x+6*sx,y+sy)],fill="#fae2a2")
        d.point((x+3*sx,y+3*sy),fill="#594e4f")
    return im


def switch(on):
    im = canvas(28,14)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0,1,27,13),radius=5,fill=INK)
    d.rounded_rectangle((1,2,26,11),radius=4,fill="#78955b" if on else "#7e8495")
    d.line((5,3,22,3),fill="#aabd82" if on else "#a6a8ad")
    x=15 if on else 1
    d.ellipse((x,0,x+11,12),fill="#715a40")
    d.ellipse((x,0,x+11,10),fill=GOLD,outline="#8c713f")
    d.arc((x+1,1,x+10,9),170,293,fill=CREAM)
    d.line((x+5,3,x+5,7),fill="#967738")
    return im


def keycap():
    im = canvas(32,32)
    d = ImageDraw.Draw(im)
    d.polygon([(4,0),(27,0),(31,4),(31,26),(26,31),(5,31),(0,26),(0,4)],fill="#111f3e")
    d.polygon([(4,1),(27,1),(30,4),(30,24),(26,28),(5,28),(1,24),(1,4)],fill="#7383a4")
    d.polygon([(5,3),(26,3),(28,5),(28,23),(25,26),(6,26),(3,23),(3,5)],fill="#344d7b")
    d.line([(2,7),(2,4),(5,1),(12,1)],fill="#f0cb78")
    d.line([(19,28),(25,28),(29,24)],fill="#b39660")
    d.line((8,24,23,24),fill="#465d88")
    return im


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    tree, flower = zelkova(), rose()
    for name, art in {"globe":globe(), "rose":flower, "zelkova":tree, "book-cover":cover(tree, flower),
                      "socket-empty":socket(False), "socket-set":socket(True), "binding":trim(),
                      "case-edge":binding_edge(), "keycap":keycap(),
                      "switch-on":switch(True), "switch-off":switch(False)}.items():
        art.save(OUT / (name + ".png"), optimize=True)


if __name__ == "__main__":
    main()
