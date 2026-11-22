"use strict";

const skillSounds = [
  { cast: "castGravity", impact: "landGravity", onGround: true },
  { cast: "castSpace", impact: "hitSpace" },
  { cast: "castRestore", impact: "landRestore", onGround: true },
  { cast: "castCrystal", impact: "hitCrystal" },
  { cast: "castVine", impact: "hitVine" },
  { cast: "castSwarm", impact: "hitSwarm" },
  { cast: "castEarth", impact: "landEarth", onGround: true },
  { cast: "castQuake", impact: "landQuake", onGround: true },
];
const bossBoltSounds = ["boltOrbit", "boltFoam", "boltVine", "boltMeteor"];
const bossImpactSounds = ["impactOrbit", "impactFoam", "impactVine", "impactMeteor"];
const effectLevels = {
  select: .23, wrong: .29, talk: .21, door: .32, page: .29,
  grassStep: .17, softStep: .16, stoneStep: .20, stairs: .29,
  jump: .36, doubleJump: .30, dash: .27, slash: .28, hit: .47, hurt: .49, defeat: .40,
  phase: .50, recovery: .42, correct: .34, questNew: .29, questComplete: .51, bossVictory: .59,
  castGravity: .24, landGravity: .63, castSpace: .39, hitSpace: .48,
  castRestore: .34, landRestore: .57, castCrystal: .34, hitCrystal: .44,
  castVine: .35, hitVine: .50, castSwarm: .30, hitSwarm: .32,
  castEarth: .34, landEarth: .55, castQuake: .26, landQuake: .69,
  bossWarning: .55, bossWarningRoof: .59, boltOrbit: .36, boltFoam: .38, boltVine: .36, boltMeteor: .35,
  bossRush: .56, impactOrbit: .47, impactFoam: .48, impactVine: .47, impactMeteor: .57, impactRoof: .59,
};
const sampleVariants = {
  grassStep: ["grassStep1", "grassStep2"], softStep: ["softStep1", "softStep2"],
  stoneStep: ["stoneStep1", "stoneStep2"], stairs: ["stoneStep2", "softStep1"],
  hit: ["hit1", "hit2"],
};
const rotatingSounds = new Map();
const recentEffects = new Map();
const queuedEffects = new Map();
const decodedEffects = new Map();
const activeEffects = new Set();
let effectsContext, effectsBus, decodingEffects, effectsReady = false;
function syncEffectsVolume() {
  if (effectsBus) effectsBus.gain.value = effectsVolume;
}

function unlockEffects() {
  if (!sound || document.hidden) return;
  if (effectsReady && effectsContext.state === "running" && !queuedEffects.size) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  if (!effectsContext) {
    try { effectsContext = new AudioEngine(); }
    catch { return; }
    effectsBus = effectsContext.createGain();
    syncEffectsVolume();
    const limiter = effectsContext.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 5;
    limiter.attack.value = .004;
    limiter.release.value = .13;
    effectsBus.connect(limiter).connect(effectsContext.destination);
  }
  const resume = effectsContext.state === "running" ? Promise.resolve() : effectsContext.resume();
  if (!decodingEffects) {
    decodingEffects = Promise.allSettled(Object.entries(sfxSamples).map(async ([name, bytes]) => {
      const input = Uint8Array.from(atob(bytes), char => char.charCodeAt(0));
      decodedEffects.set(name, await effectsContext.decodeAudioData(input.buffer));
    })).then(() => { effectsReady = true; });
  }
  Promise.all([resume, decodingEffects]).then(() => {
    if (effectsContext.state !== "running") return;
    const queued = [...queuedEffects];
    queuedEffects.clear();
    for (const [name, {at, strength}] of queued) {
      if (performance.now() - at < 380) playEffect(name, strength);
    }
  }).catch(() => {});
}

function playEffect(name, strength = 1) {
  if (!sound || document.hidden) return;
  const at = performance.now();
  if (!effectsReady || effectsContext.state !== "running") {
    queuedEffects.set(name, {at, strength});
    return;
  }
  if (at - (recentEffects.get(name) ?? -Infinity) < 80) return;
  const options = sampleVariants[name];
  const index = options ? (rotatingSounds.get(name) ?? 0) : 0;
  const sample = decodedEffects.get(options ? options[index] : name);
  if (!sample) return;
  const volume = effectLevels[name] * strength;
  if (activeEffects.size >= 12) {
    const [oldest] = activeEffects;
    if (volume < .30) return;
    oldest.stop();
    activeEffects.delete(oldest);
  }
  if (options) rotatingSounds.set(name, (index + 1) % options.length);
  recentEffects.set(name, at);
  const voice = effectsContext.createBufferSource();
  const gain = effectsContext.createGain();
  voice.buffer = sample;
  if (options) voice.playbackRate.value = .94 + Math.random() * .12;
  gain.gain.value = volume;
  voice.connect(gain).connect(effectsBus);
  activeEffects.add(voice);
  voice.onended = () => {
    activeEffects.delete(voice);
    voice.disconnect();
    gain.disconnect();
  };
  voice.start();
}

function stopEffects() {
  queuedEffects.clear();
  recentEffects.clear();
  for (const voice of activeEffects) voice.stop();
  activeEffects.clear();
}

for (const event of ["keydown", "pointerup", "click"]) {
  document.addEventListener(event, event => { if (event.isTrusted) unlockEffects(); }, true);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) stopEffects(); });
window.addEventListener("pagehide", stopEffects);

function footstepSound(onPlatform = false) {
  if (onPlatform || scene.type === "classroom" || (scene.type === "floor" && scene.floor !== 1)) return "softStep";
  return scene.type === "gate" ? "grassStep" : "stoneStep";
}
