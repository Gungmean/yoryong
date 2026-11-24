# 전투 이펙트 원화

## 필살기와 보스 공격 스프라이트

내장 이미지 생성 도구로 원화 두 장을 만들고, 소품별로 분리해 투명 픽셀과 색을 정리했습니다. 정리한 원화는 [필살기 소품 8종](finisher-cores.webp)과 [보스 공격 소품 6종](boss-attack-cores.webp)입니다. 아래 명령은 두 원화를 사용해 이동, 변형, 잔상 프레임을 미리 합성합니다. 브라우저는 완성된 프레임을 재생하고 위험 구역의 테두리와 순서 숫자를 전투 판정에 맞춰 표시합니다.

```sh
python art/bake_battle_sprites.py
```

| 시트 | 재생 단위 |
| --- | --- |
| [물리·화학 필살기](../assets/combat/finishers-a.webp), [생명·지구과학 필살기](../assets/combat/finishers-b.webp) | 240×128, 학자별 준비 12장과 타격 12장, 발밑 기준점 (120, 116) |
| [보스 공격](../assets/combat/boss-attacks.webp) | 80×80, 예고·발동 각 8장, 투사체와 타격·방향 표시 포함 |
| [컷인 테두리](../assets/combat/cut-in-strips.webp) | 320×108, 기술별 8장, 대각선 대화 띠의 양쪽에 배치 |

<details>
<summary>새 원화 제작 프롬프트</summary>

**필살기**

Production transparent pixel-art prop atlas for the Korean browser RPG Yoryongi. EXACT 4 columns by 2 rows, eight individual isolated sprites, one sprite centered per equal-sized cell, consistent margin of at least 18% inside each cell, no overlapping pixels across cells. Landscape canvas. Authentic detailed hard-edge 32-bit-era pixel artwork, visible uniformly sized square pixels, selective colored 1-pixel outlines, thick color clusters, selective dithering. Clear side view with slight 3/4 on objects only, lighting from upper left. Strong silhouette with transparent holes where appropriate. Top row left to right: (1) a red apple engulfed in a short up-pointing amber/vemilion fire tail, fruit is foreground and recognizable; (2) upright antique silver-and-iceblue circular pocket clock face, transparent dial interior with elegant cyan hour ticks and two hands centered, angular steel frame, no printed digits; (3) complete ornate alchemist balance scale, brushed yellow bronze with two swinging red-bronze pans, strong readability; (4) fractured amethyst elemental crystal cluster with teal facets, tapered irregular outline. Bottom row left to right: (5) upright giant green pea vine with emerald leaves and open golden pea pod, leaf clusters and organic overlaps, curling vines; (6) golden amber swallowtail butterfly facing right, wings opened, orange-edged teal spots, a black wing outline, clean interior pattern; (7) jagged cross-section of a terracotta basalt tectonic shelf with multiple colorful rugged horizontal strata and hot glowing cracks, roughly horizontal broad piece, brown and rose; (8) circular cross-section of the inner Earth with nested coral, amber and red layers and a molten white centre, a wedge cut away to expose the layers. Draw each as a coherent richly shaded isolated game prop, no scenes, no people, no labels, no grid, no backdrop, no shadows outside. Actual transparent background.

**보스**

Transparent pixel-art prop atlas for a 2D pixel boss battle. EXACT 3 columns by 2 rows; six individual professional pixel sprites, each centered in its cell with 18% padding, no overlap or shared pixels. Consistent hard square pixel grid, crisp detailed 16/32-bit action RPG cluster shading, clean silhouette, no shading halo. Side view. Top row left to right: 1 compact spinning blue-white four-ring gravitational gyroscope, angled metal rings with open transparent holes and white blue core; 2 small cluster of violently fizzing violet and acid-amber bubbling fluid splashes and translucent bubble clusters that emerge from a small puddle; 3 dark-green knotted roots and three crooked thorned stalks erupting straight up, shades of yellow green on pointed leaves. Bottom row left to right: 4 angular orange-streaked meteor with a short upward tail and faint faceted dark rock core, fully isolated; 5 tapered downward-facing violet-and-cyan dragon breath with distinct overlapping wide scale tongues and bright violet small inner sparks, black purple rim, no dragon or body; 6 low wide layered ground crack with jagged raised slabs of sienna stone and vermilion lava edge, two separated angular extensions. No characters, no background, no labels, no gridlines, no scenery, fully transparent alpha.

</details>

## 기본 기술과 조작 스프라이트

게임용으로 두 장의 투명 원화를 내장 이미지 생성 도구로 제작하고, 각 실루엣을 픽셀 격자에 맞춰 정리했습니다. [정규화한 원화 16종](combat-cores.png)

왼쪽에서 오른쪽, 위에서 아래 순서로 첫 여덟 칸은 학자의 기술, 다음 네 칸은 보스의 공격, 마지막 네 칸은 발톱·대시·타격·균열입니다. 각 행의 크기와 기준점, 원소 결정의 단면, 불길·덩굴·날개의 변형은 `bake_combat_fx.py`에서 조정할 수 있습니다. Pillow를 설치한 뒤 저장소에서 `python art/bake_combat_fx.py`를 실행하면 실제 게임용 128프레임을 다시 만듭니다. [게임용 스프라이트 시트](../assets/combat/effects.webp)

## 전투 중에 겹쳐 그리는 효과

학자 소환진, 타격 파편, 속박 뿌리, 보스의 충전과 균열 등 21개 애니메이션을 330프레임의 투명 WebP 한 장에 담았습니다. 투사체의 궤적은 이동 중에 기록한 월드 좌표를 따라 그립니다. 보스의 발사 방향과 낙하 지점 표시는 공격 이펙트 위에 표시합니다. [전투 미리보기](combat-preview.webp)

색상과 프레임 구간은 `art/bake_pixelfx.mjs`, 장면에서의 크기·방향·타이밍은 `combat-fx.js`에서 수정합니다. Node.js와 Pillow가 설치된 환경에서 아래 명령으로 시트와 기준점 목록을 다시 만들 수 있습니다. 생성한 이미지와 좌표는 게임에 포함되어 오프라인에서도 재생됩니다. [PixelFX 원본](https://github.com/patch-gg/pixelfx/tree/5294518ce7c72e48b6100a744596e0acf57f2826) · [MIT 라이선스 및 저작자 표기](../vendor/pixelfx-LICENSE.txt)

```sh
git clone https://github.com/patch-gg/pixelfx ../pixelfx
git -C ../pixelfx checkout 5294518ce7c72e48b6100a744596e0acf57f2826
node art/bake_pixelfx.mjs ../pixelfx
```

보스 격파 효과는 별도 시트에 5종·127프레임을 담았습니다. 물리는 전기 고리, 화학은 보랏빛 기포, 생명은 빛나는 꽃과 꽃잎, 지구는 파열된 바닥과 암석, 옥상은 넓게 펼쳐지는 금빛 광선을 사용합니다. 아래 명령으로 격파 시트를 다시 만들고, `victory.js`에서 파편·인장·효과음의 타이밍을 조정할 수 있습니다. [보스 격파 시트](../assets/combat/victory-fx.webp)

```sh
node art/bake_pixelfx.mjs ../pixelfx --victory
```

<details>
<summary>두 원화에 사용한 생성 프롬프트</summary>

**학자 스킬 원화**

Production pixel art asset sheet, one transparent landscape image in an EXACT evenly spaced grid, 4 columns x 2 rows, eight separated combat VFX sprites for a lavish Korean 2D side scrolling pixel RPG. Each of the 8 equal cells contains exactly one large self-contained luminous illustrated ability at its dramatic apex. Strict transparent gutters between cells, padding. Orthographic side view, bold hard stepped pixel contours, detailed sculpted 16-bit clusters, deep saturated outlines, cream-white specular centers with highly colored rim-light, minimal translucent haze. Not UI icons, no frames/badges/panels/rounded squares/floor/background or text, isolated dynamic silhouettes. Read order TOP ROW: (1) one large glossy ruby red apple with a green leaf plunging DOWN, gold and vermilion comet flame pointing UP, apple occupies lower third; (2) bright electric cobalt cyan elliptical wormhole viewed almost edge on, long thin horizontal blue comet stream to LEFT, leading bright vertical elliptical ring is on RIGHT, open transparent center; (3) intricate suspended GOLD ALCHEMIST BALANCE SCALE with red violet pans, large brass finial and lightning pointing UP, unmistakable beam and two pans, feet below; (4) one sharp faceted lilac-violet bismuth magic crystal lance firing RIGHT, marked with a tiny elemental geometric lattice, comet facets trailing LEFT. BOTTOM ROW: (1) curling emerald pea vine horizontally sweeping RIGHT, elongated twisting shoot, pointed leaves, pea pod and pale yellow curling tendril, tapered tail LEFT; (2) one large ornate golden yellow and teal swallowtail butterfly flying RIGHT, turquoise and cream glowing markings on distinct wings and pixel gold dust behind; (3) cluster of erupting jagged reddish copper basalt spires with glowing molten golden cracks in their faceted surfaces, spires point UP, crumbly chunks, anchored along a short flat ground baseline; (4) floating luminous cross section of planet earth's core with layered orange/vermillion ribbons, hot white center, split open, fine gold seismic orbit arcs outward either side. Eight visually distinct magical attacks on fully transparent background, no characters, no contact sheet decoration.

**보스 공격과 공통 동작 원화**

Production sprite sheet of eight isolated original magical effects for pixel art arcade boss fights, uniform aligned grid FOUR columns by TWO rows, each square-ish cell filled by one complete sprite with space all around. Transparent PNG, no scenery, no grids, frames, text, borders or UI. Premium handclustered 16-bit action RPG art, nearest pixel stepped edges, strong shaped well-shaded highlights and rich coloured outlines, no blurry airbrush. Every sprite a different recognizable action. TOP ROW left to right: (1) physics boss shot: cobalt electric gyroscope orb of metal with intersecting icy rotating rings, bright pearl core and short blue sparks trailing LEFT; (2) chemistry boss shot: huge poisonous amethyst liquid droplet falling down, big weighty purple blob at bottom with bubbles above, violet specular, magenta contour; (3) plant boss shot: ground-skimming twisted dark forest-green thorned root breaking RIGHT from ground, vicious sharp glowing lime thorns, root trail LEFT; (4) astronomy boss shot: heavy faceted orange iron meteor falling DOWN with blazing angular fire tail pointing UP and rock fragments. BOTTOM ROW left to right: (1) spectacular large sweeping golden and icy cyan dragon claw slash, three curved parallel crescents forming a broad backwards letter C ) with opening toward LEFT and pointed tips connecting on RIGHT, no weapon, no character; (2) brilliant icy silver-blue dragon dash trail, horizontal feathers of wind cascading to LEFT, hollow curved aerodynamic leading tip on RIGHT, no solid body; (3) chunky comic pixel impact explosion starburst, long sharp diagonal orange and gold spikes radiating outward from a bright cream core, navy contour and small sparks; (4) dark violet dragon spell cast vortex: near-circular open spiral of lavender lightning and cyan ghostfire fragments surrounding an EMPTY TRANSPARENT CENTER. Maintain complete isolation and equal padding all cells, no sprite touches its neighbor, no labels.

</details>
