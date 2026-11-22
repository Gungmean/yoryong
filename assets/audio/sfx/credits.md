# 요룡이 효과음 출처

- Kenney · [RPG Audio](https://kenney.nl/assets/rpg-audio), [Impact Sounds](https://kenney.nl/assets/impact-sounds), [Interface Sounds](https://kenney.nl/assets/interface-sounds)
- Juhani Junkala (SubspaceAudio) · [512 Sound Effects (8-bit style)](https://opengameart.org/content/512-sound-effects-8-bit-style)
- JaggedStone · [Magic Spell SFX](https://opengameart.org/node/29772)

아래 효과음은 모두 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)입니다. 필요한 부분을 잘라내고 레벨을 맞춰 24 kHz 모노 MP3로 변환했습니다. `bank.js`에 오디오 데이터를 담아 GitHub Pages와 오프라인 실행에서 같은 샘플을 재생합니다.

학자 스킬은 직접 만든 음색에 Kenney의 충격음과 마찰음을 섞어 시전음과 착지·명중음을 따로 제작했습니다. 아래 표의 파일은 각 스킬에 섞은 외부 샘플입니다. `—`는 합성 음원만 사용한 경우입니다.

두 Kenney 팩을 `rpg.zip`, `impact.zip`으로 저장한 폴더를 인수로 넘겨 [스킬 효과음 제작 스크립트](../../../art/bake_skill_sounds.py)를 실행하면 스킬 음원을 다시 만들 수 있습니다. FFmpeg, NumPy, SciPy가 필요합니다.

| 게임에서 쓰는 이름 | 팩 | 원본 파일 |
| --- | --- | --- |
| `select` | Kenney Interface Sounds | `select_002.ogg` |
| `wrong` | Kenney Interface Sounds | `error_004.ogg` |
| `talk` | Kenney Interface Sounds | `select_004.ogg` |
| `door` | Kenney RPG Audio | `doorOpen_2.ogg` |
| `page` | Kenney RPG Audio | `bookFlip1.ogg` |
| `softStep1` | Kenney Impact Sounds | `footstep_wood_001.ogg` |
| `softStep2` | Kenney Impact Sounds | `footstep_wood_003.ogg` |
| `stoneStep1` | Kenney Impact Sounds | `footstep_concrete_001.ogg` |
| `stoneStep2` | Kenney Impact Sounds | `footstep_concrete_003.ogg` |
| `grassStep1` | Kenney Impact Sounds | `footstep_grass_001.ogg` |
| `grassStep2` | Kenney Impact Sounds | `footstep_grass_002.ogg` |
| `jump` | 512 Sound Effects | `sfx_movement_jump2.wav` |
| `doubleJump` | 512 Sound Effects | `sfx_movement_jump6.wav` |
| `dash` | Kenney RPG Audio | `knifeSlice2.ogg` |
| `slash` | Kenney RPG Audio | `knifeSlice.ogg` |
| `hit1` | Kenney Impact Sounds | `impactPunch_medium_001.ogg` |
| `hit2` | Kenney Impact Sounds | `impactPunch_medium_004.ogg` |
| `hurt` | 512 Sound Effects | `sfx_damage_hit4.wav` |
| `defeat` | 512 Sound Effects | `sfx_exp_shortest_soft4.wav` |
| `phase` | Magic Spell SFX | `magical_7.ogg` |
| `recovery` | 512 Sound Effects | `sfx_coin_cluster2.wav` |
| `correct` | 512 Sound Effects | `sfx_coin_double3.wav` |
| `questNew` | 512 Sound Effects | `sfx_menu_select2.wav` |
| `questComplete` | 512 Sound Effects | `sfx_sounds_powerup4.wav` |
| `bossVictory` | 512 Sound Effects | `sfx_sounds_powerup8.wav` |
| `castGravity` | Kenney RPG Audio | `knifeSlice2.ogg` |
| `landGravity` | Kenney Impact Sounds | `impactWood_heavy_002.ogg`, `impactPunch_heavy_003.ogg` |
| `castSpace` | — | — |
| `hitSpace` | Kenney Impact Sounds | `impactBell_heavy_001.ogg` |
| `castRestore` | Kenney RPG Audio | `metalClick.ogg` |
| `landRestore` | Kenney Impact Sounds, RPG Audio | `impactPlate_heavy_002.ogg`, `metalPot2.ogg` |
| `castCrystal` | Kenney Impact Sounds | `impactGlass_light_001.ogg`, `impactGlass_light_003.ogg` |
| `hitCrystal` | Kenney Impact Sounds | `impactGlass_medium_000.ogg`, `impactGlass_light_003.ogg` |
| `castVine` | Kenney RPG Audio | `cloth3.ogg`, `knifeSlice.ogg` |
| `hitVine` | Kenney Impact Sounds, RPG Audio | `impactWood_medium_001.ogg`, `clothBelt2.ogg` |
| `castSwarm` | Kenney RPG Audio | `cloth1.ogg` |
| `hitSwarm` | — | — |
| `castEarth` | Kenney Impact Sounds | `impactMining_002.ogg` |
| `landEarth` | Kenney Impact Sounds | `impactMining_000.ogg`, `impactWood_heavy_004.ogg` |
| `castQuake` | — | — |
| `landQuake` | Kenney Impact Sounds | `impactPunch_heavy_003.ogg`, `impactMining_004.ogg` |
| `bossWarning` | Kenney Interface Sounds | `bong_001.ogg` |
| `bossWarningRoof` | Kenney Impact Sounds | `impactBell_heavy_003.ogg` |
| `boltOrbit` | Magic Spell SFX | `magical_2.ogg` |
| `boltFoam` | Magic Spell SFX | `magical_3.ogg` |
| `boltVine` | Magic Spell SFX | `magical_5.ogg` |
| `boltMeteor` | 512 Sound Effects | `sfx_exp_shortest_soft2.wav` |
| `bossRush` | 512 Sound Effects | `sfx_exp_short_hard6.wav` |
| `impactOrbit` | Kenney Impact Sounds | `impactMetal_heavy_002.ogg` |
| `impactFoam` | Kenney Impact Sounds | `impactGlass_medium_001.ogg` |
| `impactVine` | Kenney Impact Sounds | `impactWood_heavy_000.ogg` |
| `impactMeteor` | 512 Sound Effects | `sfx_exp_short_hard4.wav` |
| `impactRoof` | 512 Sound Effects | `sfx_exp_short_hard11.wav` |
