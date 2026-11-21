# 교실 픽셀 배경

부광고 게임의 기존 복도 문 안쪽 그림을 참고해 내장 이미지 생성 도구로 가로형 교실 세 장과 투명 책상 원화 한 장을 제작했습니다. 교실은 한국 고등학교의 일반 학급을 참고해 게임 공간으로 재구성했습니다. 학년별 배경을 같은 학년의 일곱 반이 공유합니다. 반 이름과 칠판 메모, 앞줄 책상의 배치와 소품은 게임에서 정해집니다.

[실제 게임 화면](classroom-preview.webp) · [배포용 텍스처](../assets/world/classrooms.js)

1080×1180 WebP의 위쪽에는 1080×360 교실 세 장을 학년순으로 담았습니다. 아래쪽에는 132×96 투명 책상 세 개가 있습니다. 월드 좌표와 텍스처 좌표는 `game.js`의 `classroomPanels()`에서 관리하며 Three.js와 Canvas 2D가 함께 사용합니다.

<details>
<summary>생성 프롬프트</summary>

세 교실에 공통으로 사용한 지시문

Paint an original ultra-wide horizontal background panorama for a beautiful Korean pixel-art side-scrolling game inside a normal public high school classroom in Bupyeong, Incheon. Use attached image solely as reference for its Korean school furnishings, pixel clusters and warm illustrated atmosphere. Recompose completely as an orthographic SIDE-ON room panorama, a FLASHCUT ACROSS ONE LONG WALL at a right angle, with a long strictly horizontal empty playable aisle running left-to-right across the ENTIRE bottom 24 percent. 3:1 panoramic landscape composition. Use fine but crisp stepped 16-bit hand-placed pixel shading, tactile timber, square highlights, restrained natural colors, clean structural silhouettes and real school scale. Plan precisely from left to right: a single closed soft teal Korean glazed sliding classroom door centered at x=7% at the extreme left, a bank of tall mullioned sunlit windows over old radiators, a large dark teal GREEN CHALKBOARD centered at 50% x on the wall with clear empty middle for the game's own lettering and only some small abstract diagrams on its edges, teacher's little wooden podium below it, a second set of windows, shelves or corkboard, a SECOND teal glazed door centered at 93% x at the extreme right. The full door frames and thresholds must be visible and kept unobstructed. Receding rows of small wooden school desks and matching chairs only in the MIDDLE distance between the doors. The nearest desk feet must all end ABOVE the lower 24% horizontal aisle. Glowing parquet under the player, window shadows, softly reflective tile. The room is much WIDER than it is deep; school corridor-style parallel backwall elevation, not a deep perspective from the back of the classroom. Entire area in frame incl sliver of ceiling with fluorescent fixtures and full floor. NO people, dragons, monsters, HUD, signs, banners, text, lettering, numerals, flags, watermark or logos.

각 학년의 추가 지시문

1. First year homeroom. Fresh spring morning: pale jade lower walls, pastel yellow plaster, vivid celadon and golden light, new green zelkova leaves and pink-blossoming branches outside. Pots of tiny spring seedlings, pinned geometric paper collages and a paper windmill on the right board.

2. Second year homeroom. High summer afternoon: soft sage and honey plaster, deep emerald leaves and blue sky outside, glowing broad window reflections. Include a green leafy potted monstera and a student-made DNA model in the rear right display corner and pressed leaves on the corkboard.

3. Third year homeroom. Clear amber late afternoon near autumn: tawny ochre walls, warm chestnut floor, copper and apricot zelkova leaves outside. Books stacked neatly and an antique small celestial globe on the rear right sideboard, understated star chart on the pinboard.

앞줄 책상 원화

Create ONE pixel-art prop sprite sheet on fully transparent background, in three equal cells in a single horizontal row, exactly three separate school desk and chair pairs. The reference image is for the furnishing design, light and pixel-art shading. Each isolated pair is a small KOREAN single student desk with a school chair tucked BEHIND it: view head-on straight toward the BACKREST above the desk, 10-15 degrees down so the tabletop appears as a slim horizontal top surface, four chromed tubular metal desk legs reaching the same baseline, little shadowed metal tray under wooden tabletop. Straight on, not angled sideways, same orientation and height all three. The seat back top is only a little above the tabletop. No humans, no signage or text, no floor or scene, no contact shadow beyond the feet. Keep all four legs and feet visible; transparent between legs. Rich neat handclustered 16-bit dot art; visible small pixel clusters, thin warm brown stepped outlines, amber grain on wooden desktop, chrome edge highlights, natural warm sunlight from upper left. Fairly wide rectangular desktop rather than square, equally-sized three assets with transparent gutters, each fully contained in its own cell. Left: golden oak desktop with a closed navy notebook and red pencil. Middle: honey oak desktop with a pale sage squared exercise book and a small blue pencil case. Right: amber-brown desktop with two slim books and a beige folded bookmark. Each desk should be roughly 1.65x wider than the height of the desk+chair. Editorial raw sprite atlas only, no UI or panels, transparent alpha.

</details>
