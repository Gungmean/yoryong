"""Compose the original battle artwork into lossless, nearest-neighbor game sheets."""
from math import cos, pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageOps

ART = Path(__file__).resolve().parent
OUT = ART.parent / "assets" / "combat"
NEAREST = Image.Resampling.NEAREST
WARD_PALETTES = [
    ("#612936","#c64237","#ff7a3f","#ffdf93"),
    ("#223c67","#347ca7","#76dbf7","#e9faff"),
    ("#654432","#b07137","#f0b957","#fff1af"),
    ("#3e305e","#7257af","#bb8be8","#f9e2ff"),
    ("#344731","#5f913c","#a2d454","#f0e79b"),
    ("#654033","#bf6d36","#edaa42","#ffed96"),
    ("#583740","#a75d54","#e39b66","#ffe2a0"),
    ("#53374d","#a4565e","#ed8e64","#fff0b7"),
]
BOSS_PALETTES = [
    WARD_PALETTES[1], ("#49294f","#a0469c","#f08ae4","#ffd698"),
    WARD_PALETTES[4], WARD_PALETTES[6], ("#38255d","#8646ba","#c984f6","#9cf4ff"),
]

def cores(name, columns, count):
    with Image.open(ART / name) as sheet:
        result = []
        for i in range(count):
            x, y = (i % columns)*128, (i // columns)*128
            tile = sheet.crop((x,y,x+128,y+128)).convert("RGBA")
            result.append(tile.crop(tile.getbbox()))
        return result

WARD = cores("finisher-cores.webp",4,8)
BOSS = cores("boss-attack-cores.webp",3,6)
SCALE_PAN = WARD[2].crop((0, round(WARD[2].height * .61), round(WARD[2].width * .37), round(WARD[2].height * .80)))
COMET_FLAME = BOSS[3].crop((0, 0, BOSS[3].width, round(BOSS[3].height * .62)))

def clamp(t):
    return max(0,min(1,t))

def paint(image, prop, x, y, width, *, height=None, tilt=0, flip=False, ink=255, bottom=False):
    width = max(1,round(width))
    height = max(1,round(height if height is not None else width*prop.height/prop.width))
    tile = prop.resize((width,height),NEAREST)
    if flip:
        tile = ImageOps.mirror(tile)
    if tilt:
        tile = tile.rotate(round(tilt),NEAREST,expand=True)
    if ink != 255:
        tile.putalpha(tile.getchannel("A").point(lambda value: value*ink//255))
    image.alpha_composite(tile,(round(x-tile.width/2),round(y-(tile.height if bottom else tile.height/2))))

def shard(d,x,y,size,palette,direction=1):
    a,b,c,h = palette
    d.polygon([(x-size,y+2),(x-direction*size*.28,y-size),(x+size,y-size*.50),
        (x+size*.71,y+size*.45),(x-size*.44,y+size*.63)], fill=a)
    d.polygon([(x-size,y+2),(x-direction*size*.28,y-size),(x+size,y-size*.50),
        (x+size*.33,y+1)],fill=b)
    d.line([(x-size,y+2),(x-direction*size*.28,y-size),(x+size,y-size*.50)],fill=c)
    if size > 5:
        d.line([(x-size*.27,y-size*.61),(x+size*.46,y-size*.43)],fill=h)

def fragments(d,x,y,t,palette,seed,count,span,rise,gravity=35):
    rng = Random(seed)
    for i in range(count):
        p = clamp(t - (i%4)*.06)
        if p <= 0:
            continue
        dx = (-1 if i%2 else 1)*rng.uniform(.30,1)*span
        dy = rng.uniform(.3,1)*rise
        tx, ty = x+dx*p, min(116,y-dy*sin(p*pi*.84)+gravity*p*p)
        size = max(1,round(rng.uniform(2,5)*(1-p*.53)))
        shard(d,tx,ty,size,palette,-1 if i%2 else 1)

def flare(d, x, y, w, h, palette):
    a,b,c,tip = palette
    points = [(x-w,y),(x-w*.71,y-h*.27),(x-w*.44,y-h*.21),(x-w*.31,y-h*.69),
        (x-w*.06,y-h),(x+w*.13,y-h*.39),(x+w*.38,y-h*.53),(x+w*.79,y-h*.19),(x+w,y)]
    d.polygon(points,fill=a)
    d.polygon([(x-w*.63,y),(x-w*.33,y-h*.28),(x-w*.05,y-h*.79),(x+w*.13,y-h*.26),
        (x+w*.38,y-h*.41),(x+w*.66,y)],fill=b)
    d.line(points[1:6],fill=c,width=2)
    d.line([(x-w*.58,y-1),(x-w*.18,y-h*.22),(x+w*.08,y-4),(x+w*.48,y-h*.10)],fill=tip,width=2)

def wave(d,x,y,p,direction,span,amplitude,palette):
    travel = span*p
    if travel <= 0:
        return
    length = min(travel,56)
    points = []
    for i in range(19):
        lead = travel - length + length*i/18
        pulse = sin(i*1.94)*sin(i*pi/18)*amplitude
        points.append((x+direction*lead,y+pulse))
    d.line(points, fill=palette[0],width=5)
    d.line(points, fill=palette[2],width=2)
    for i in (4,8,13,16):
        tx,ty = points[i]
        d.point((int(tx),int(ty)-1),fill=palette[3])

def finishers(index,t,impact):
    image = Image.new("RGBA",(240,128))
    d = ImageDraw.Draw(image)
    p = WARD_PALETTES[index]
    dark,mid,lit,tip = p
    prop = WARD[index]
    x,y,foot = 120,69,116
    e = 1-(1-t)**2

    if index == 0:
        if not impact:
            for dx,delay,speed,size in [(-51,0,1.28,31),(48,.14,1.23,38),(0,.20,1.14,62)]:
                fall = clamp((t-delay)*speed)**1.75
                if t < delay:
                    continue
                tx = x+dx-30*(1-fall)
                ty = -31+119*fall
                for i in range(6):
                    trail = 9+i*5
                    px = tx-trail*.38
                    d.line([(px-15+i,ty-trail),(px-5+i,ty-trail-11)],fill=(mid,lit,tip)[i%3],width=1+i%2)
                paint(image,prop,tx,ty,size,tilt=8)
        else:
            for dx,delay,size in [(0,0,43),(-54,.12,29),(54,.24,28)]:
                if t < delay:
                    continue
                fire = max(.04,clamp((t-delay)/.62))
                if fire == 1:
                    continue
                flare(d,x+dx,foot, (17+size*fire), (65 if dx==0 else 46)*(1-fire)**.65,p)
                for side in (-1,1):
                    height = (55 if dx==0 else 34)*(1-fire)**.82
                    paint(image,COMET_FLAME,x+dx+side*(8+size*fire*.46),foot-1,34+fire*9,
                          height=height,tilt=-side*(31+20*fire),flip=side<0,bottom=True,ink=round(224*(1-fire)))
                d.line([(x+dx-size,foot+2),(x+dx-8,foot+3),(x+dx+13,foot+1),(x+dx+size,foot+2)],fill=lit,width=2)
                fragments(d,x+dx,foot-7,fire,p,23+dx,14,48,76,32)
    elif index == 1:
        size = 61+e*34
        if not impact:
            paint(image,prop,x,y+4,size,tilt=9-14*min(t,.74))
            radius = 26+18*e
            for i in range(12):
                a=i*pi/6
                px,py=x+cos(a)*radius,y+8+sin(a)*radius*.91
                d.line([(px,py),(px+cos(a)*(4+i%3),py+sin(a)*(4+i%3))],fill=tip if i%3==0 else lit,width=2)
            a=-pi*.72 + min(.74,t)*4
            d.line([(x,y+10),(x+cos(a)*27,y+10+sin(a)*27)],fill=tip,width=2)
        else:
            full = prop.resize((94,103),NEAREST)
            for side in (-1,1):
                half = full.crop((0 if side < 0 else 47,0,47 if side < 0 else 94,103))
                px = x+side*(25+e*37)
                paint(image,half,px,y-2,47,ink=round(241*(1-t*.54)))
                for i in range(7):
                    dx = side*(i*4+27*e)
                    py = 26+i*13
                    d.line([(px+dx-side*16,py),(px+dx,py)],fill=lit,width=1+i%2)
                    if i%2==0:
                        d.point((int(px+dx+side*2),py),fill=tip)
            wave(d,x,y+3,e,-1,111,5,p)
            wave(d,x,y+3,e,1,111,5,p)
    elif index == 2:
        if not impact:
            paint(image,prop,x,foot-6,115+e*18,height=100,bottom=True,tilt=sin(t*3*pi)*(1-t)*8)
            for side in (-1,1):
                tx=x+side*51
                ty=foot-33-(1-clamp(t*1.3))**2*66
                d.polygon([(tx-9,ty+9),(tx-6,ty),(tx+6,ty),(tx+9,ty+9)],fill=dark)
                d.rectangle((tx-6,ty,tx+6,ty+3),fill=lit)
                d.line([(tx-4,ty+4),(tx-4,ty+7)],fill=tip,width=2)
        else:
            for side in (-1,1):
                px = x+side*52
                py = foot-27+21*clamp(t*4)
                paint(image,SCALE_PAN,px,py-3,66+e*10,height=19,flip=side>0,tilt=side*(1-t)*7)
                d.line([(px-30,py+8),(px-13,py+11),(px+19,py+10),(px+33,py+6)],fill=lit,width=2)
                fragments(d,px,py,t,p,9,12,30,43,15)
            d.line([(x-111,foot-2),(x-48,foot-2),(x,foot-8),(x+47,foot-2),(x+111,foot-2)],fill=lit,width=2)
    elif index == 3:
        tiles = [(c,r) for r in range(4) for c in range(-4,5) if r>=2 or abs(c)>1 or (r==1 and c==0)]
        for col,row in tiles:
            f = clamp(t*1.51-abs(col)*.064-row*.092)
            if not impact and f == 0:
                continue
            px = x+col*(18+(e*10 if impact else (1-f)*8))-row*2
            py = y+(row-1.5)*17+(row-1.5)*e*14 if impact else y+(row-1.5)*17-(1-f)*35
            tint = ("#9691e9","#d88df5","#6bd1c5","#dca2b0")[(row+col)%4]
            if impact:
                shard(d,px,py,5+abs(col)%3,(dark,mid,tint,tip))
                d.line([(px-(1 if col>0 else -1)*14,py+4),(px,py)],fill=tint)
            else:
                d.polygon([(px-9,py+4),(px-5,py-7),(px+9,py-7),(px+5,py+6)],fill=dark)
                d.line([(px-9,py+4),(px-5,py-7),(px+9,py-7)],fill=tint)
                d.rectangle((px-3,py-4,px+1,py-3),fill=lit)
                d.rectangle((px-3,py-1,px+4,py),fill=tip)
        if not impact or t < .42:
            paint(image,prop,x,y+12,31+e*32,ink=round(255*(1-t)) if impact else 255,tilt=7*(1-t))
    elif index == 4:
        growth = clamp(.15+e*.95) if not impact else 1
        for side in (-1,1):
            for arm in (0,1):
                wide = (39+arm*26)*growth
                high = (102-arm*34)*growth
                pts=[(x+side*(10+arm*14),foot),(x+side*wide*.54,foot-high*.35),
                    (x+side*wide*.64,foot-high*.66),(x+side*wide,foot-high)]
                d.line(pts,fill=dark,width=7-arm*2)
                d.line(pts,fill=mid,width=4-arm)
                d.line([(a+side,b-1) for a,b in pts],fill=lit,width=1)
                for node,(tx,ty) in enumerate(pts[1:]):
                    sign = side if node!=1 else -side
                    leaf = (10+node*3)*growth
                    d.polygon([(tx,ty),(tx+sign*leaf*.51,ty-leaf*.81),
                        (tx+sign*leaf*1.35,ty-leaf),(tx+sign*leaf,ty-leaf*.1)], fill=mid)
                    d.line([(tx,ty),(tx+sign*leaf,ty-leaf*.76)],fill=lit)
        paint(image,prop,x,foot-2,40+48*growth,height=48+48*growth,bottom=True,ink=225 if impact else 255)
        if impact:
            for i in range(25):
                sign=-1 if i%2 else 1
                px=x+sign*(16+(i*17%79)*e)
                py=foot-(22+i*31%88)-e*(i*7%21)
                shard(d,px,py,2+i%4,p,sign)
    elif index == 5:
        for i in range(18 if impact else 12):
            pace = t*1.25-i*.043
            if not 0<=pace<=1:
                continue
            px = x+(pace-.5)*222
            py = y+sin(pace*6.6+i%3*.73)*26+(i%4-1.5)*12
            if impact:
                py -= pace*27
            flap = .52+.48*abs(sin(t*29+i*1.61))
            size = 31 if i in (1,7,11) else 14+i%3*5
            d.line([(px-15,py+6),(px-7,py+3),(px,py)],fill=lit,width=1+i%2)
            paint(image,prop,px,py,size*flap,height=size*.89,tilt=-10+6*sin(i),ink=241)
    elif index == 6:
        step = t**1.72 if not impact else 1
        for side in (-1,1):
            tx = x+side*(30+(1-step)*69)
            paint(image,prop,tx,foot+3,83,height=39+30*step,flip=side>0,bottom=True,tilt=side*(11-step*7))
            d.line([(tx-side*24,foot-4),(tx+side*26,foot-4),(tx+side*49,foot-10)],fill=lit,width=2)
        if impact:
            flare(d,x,foot-8,23+e*14,56*(1-t),p)
            fragments(d,x,foot-15,t,p,62,30,106,105)
    else:
        if not impact or t < .58:
            paint(image,prop,x,y-3,50+37*e,tilt=6-11*t,ink=round(255*(1-t)) if impact else 255)
        for side in (-1,1):
            wave(d,x,foot-8,t*1.08,side,116,7,p)
            wave(d,x,foot-23,clamp((t-.14)*1.17),side,98,13,(dark,mid,lit,"#ffbdad"))
            if impact:
                wave(d,x,foot-45,clamp((t-.26)*1.14),side,82,9,p)
        if impact:
            fragments(d,x,y+2,t,p,120,11,78,42,6)

    if impact and 0<t<.74:
        # Shared shield chips are drawn into the atlas once at authoring time.
        fragments(d,x,76,clamp(t*1.32),p,71+index,8,70,28,12)
    opacity = (1-clamp((t-.58)/.42)**1.36) if impact else clamp(.25+t*1.4)
    image.putalpha(image.getchannel("A").point(lambda value: round(value * opacity)))
    return image

def bubbles(d,t,palette,count=11,floor=73):
    dark,mid,lit,tip=palette
    for i in range(count):
        size=2+i%4
        px=5+(i*17)%69
        py=floor-((i*9+t*48)%52)
        d.ellipse((px-size,py-size,px+size,py+size),outline=dark,width=2)
        d.arc((px-size,py-size,px+size,py+size),200,350,fill=lit)
        d.point((px-1,int(py)-size+2),fill=tip)

def boss_zone(index,t,low,active):
    im=Image.new("RGBA",(80,80))
    d=ImageDraw.Draw(im)
    p=BOSS_PALETTES[index]
    dark,mid,lit,tip=p
    grow=sin(pi*clamp(t*.93+.04)) if active else .42+.30*t
    if index==0:
        size=47+25*grow
        paint(im,BOSS[0],40,41,size,height=52 if low else size,tilt=12+48*t)
        for arm in (-1,1):
            for i in range(3):
                py=17+i*23
                tx=40+arm*(20+6*sin(i+t*5))
                d.line([(tx,py),(tx-arm*5,py+8),(tx+arm*3,py+13)],fill=lit,width=1+i%2)
    elif index==1:
        if low:
            paint(im,BOSS[1],40,81,74,height=33+38*grow,bottom=True)
            bubbles(d,t,p,11,78)
        else:
            paint(im,BOSS[1],40,80,72,height=40+32*grow,bottom=True)
            bubbles(d,t,p,13,67)
    elif index==2:
        stem=29+45*grow
        paint(im,BOSS[2],39,80,79,height=stem if not low else 34+grow*42,bottom=True)
        for i in range(9):
            tx=9+(i*23%61)
            ty=77-stem*.57-((i*15+t*43)%23)
            shard(d,tx,ty,2+i%3,p,-1 if i%2 else 1)
    elif index==3:
        if low:
            paint(im,BOSS[5],40,79,79,height=28+grow*28,bottom=True)
            for i in range(10):
                tx=7+(i*17)%68
                ty=62-(20+i%3*5)*grow+(i%2)*8
                shard(d,tx,ty,3+i%3,p)
        else:
            paint(im,BOSS[3],41,-12+68*t*t if not active else 53,58,height=61,tilt=-19)
            if active:
                paint(im,BOSS[5],40,81,80,height=25,bottom=True)
                flare(d,40,77,38,35*grow,p)
    else:
        if low:
            for side in (-1,1):
                paint(im,BOSS[4],40+side*13,46,47,height=72,tilt=side*(65+5*grow),ink=239)
        else:
            paint(im,BOSS[4],40,38,74,height=70+22*grow,tilt=5*sin(t*5))
        for i in range(8):
            x=9+(i*16)%62
            y=9+int((i*15+t*50)%66)
            shard(d,x,y,2+i%2,p)
    return im

def projectile(index,t):
    im=Image.new("RGBA",(80,80))
    d=ImageDraw.Draw(im)
    p=BOSS_PALETTES[index]
    for i in range(6):
        px=2+i*5
        py=36+(i%3-1)*6+sin(t*7+i)*4
        d.line([(px,py),(px+11+i%3*3,py-1)],fill=p[1+i%2],width=1+i%2)
    paint(im,BOSS[index],48,40,48+(index==2)*7,height=42+(index==0)*6,tilt=[t*68,0,-17,72,83][index])
    return im

def contact(index,t):
    im=Image.new("RGBA",(80,80))
    d=ImageDraw.Draw(im)
    p=BOSS_PALETTES[index]
    if index==1:
        bubbles(d,t,p,11,67)
    for i in range(12):
        a=i*2.3999
        distance=8+t*(19+i%4*6)
        px,py=40+cos(a)*distance,39+sin(a)*distance*.78
        shard(d,px,py,2+i%4,p)
    if t<.56:
        paint(im,BOSS[index],40,42,22+25*t,height=32,tilt=t*33,ink=round((1-t)*230))
    return im

def direction(t):
    im=Image.new("RGBA",(80,80))
    d=ImageDraw.Draw(im)
    for x in (17,39):
        x+=round(5*t)
        d.line([(x,23),(x+19,40),(x,56)], fill="#392638",width=14)
        d.line([(x,24),(x+17,40),(x,55)],fill="#ffc58b",width=8)
        d.line([(x+1,26),(x+16,40),(x+1,53)], fill="#fff0c9",width=3)
    return im

def strip(index,t):
    im=Image.new("RGBA",(320,108))
    d=ImageDraw.Draw(im)
    p=WARD_PALETTES[index]
    dark,mid,lit,tip=p
    for side,base in [(-1,25),(1,83)]:
        rng=Random(24+index*71+(side+1)*3)
        points=[(0,base)]
        for i in range(1,40):
            x=i*8
            bump=rng.randint(-3,3) + (rng.randint(4,9)*side if i%6 in (1,2) else 0)
            points.append((x,base+bump))
        points.append((319,base))
        d.line(points,fill=dark,width=9)
        d.line(points,fill=mid,width=6)
        d.line(points,fill=lit,width=3)
        for j,(px,py) in enumerate(points):
            if (j-int(t*33))%22<13:
                d.rectangle((px-2,py-1,px+3,py),fill=tip)
        for k in range(11):
            px=int((k*47+t*(121+index*6))%371)-26
            py=base+side*(10+(k*7)%15)
            length=16+k%4*13
            path=[(px,py),(px+length*.34,py),(px+length*.54,py+side*(2+k%3)),
                (px+length*.72,py+side*(1+k%2)),(px+length,py)]
            d.line(path,fill=dark,width=5)
            d.line(path,fill=lit,width=2)
            shard(d,px+length+8,py,2+k%3,p)
    return im

def save_atlas(name, size, rows, frames):
    w,h=size
    packed=Image.new("RGBA",(w*frames,h*len(rows)))
    for row,generate in enumerate(rows):
        for col in range(frames):
            frame=generate(col/(frames-1))
            packed.paste(frame,(col*w,row*h))
    packed.save(OUT/name,lossless=True,method=5)

def main():
    for name,start in (("finishers-a.webp",0),("finishers-b.webp",4)):
        sequences=[lambda t,index=index,impact=impact: finishers(index,t,impact)
            for index in range(start,start+4) for impact in (False,True)]
        save_atlas(name,(240,128),sequences,12)
    boss_rows=[lambda t,index=index,low=low,active=active: boss_zone(index,t,low,active)
        for index in range(5) for low in (False,True) for active in (False,True)]
    boss_rows += [lambda t,index=index: projectile(index,t) for index in range(5)]
    boss_rows += [lambda t,index=index: contact(index,t) for index in range(5)]
    save_atlas("boss-attacks.webp",(80,80),boss_rows+[direction],8)
    save_atlas("cut-in-strips.webp",(320,108),[lambda t,index=index: strip(index,t) for index in range(8)],8)

if __name__ == "__main__":
    main()
