"""Build the scholar cues. Requires FFmpeg, NumPy and SciPy."""

import argparse
import base64
from functools import lru_cache
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

import numpy as np
from scipy.signal import butter, sosfilt


RATE = 24000
BANK = Path(__file__).resolve().parents[1] / "assets/audio/sfx/bank.js"
MARKER = "const sfxSamples = "
rng = np.random.default_rng(47)


def timeline(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def bandpass(samples, low, high):
    return sosfilt(butter(2, (low, high), fs=RATE, btype="bandpass", output="sos"), samples)


def thump(seconds, start, end, decay):
    time = timeline(seconds)
    freq = end + (start - end) * np.exp(-time * 22)
    phase = 2 * np.pi * np.cumsum(freq) / RATE
    body = np.sin(phase) + .33 * np.sin(phase * 1.98) + .16 * np.sin(phase * 3.04)
    return body * (1 - np.exp(-time * 510)) * np.exp(-time * decay)


def sweep(seconds, start, end, rise=.008, decay=7, harmonics=.22):
    time = timeline(seconds)
    pitch = start + (end - start) * (time / seconds) ** .55
    phase = 2 * np.pi * np.cumsum(pitch) / RATE
    return (np.sin(phase) + harmonics * np.sin(2.02 * phase)) * (1 - np.exp(-time / rise)) * np.exp(-time * decay)


def breath(seconds, low, high, pulses=0):
    time = timeline(seconds)
    noise = bandpass(rng.standard_normal(len(time)), low, high)
    envelope = np.sin(np.pi * time / seconds) ** 1.4
    if pulses:
        envelope *= .20 + .80 * (.5 + .5 * np.sin(2 * np.pi * pulses * time)) ** 2
    return noise * envelope


def mix(seconds, *layers):
    result = np.zeros(round(seconds * RATE))
    for at, gain, samples in layers:
        start = round(at * RATE)
        count = min(len(samples), len(result) - start)
        result[start:start + count] += gain * samples[:count]
    return result


def build_samples(archive_dir, ffmpeg):
    @lru_cache
    def recording(pack, name, speed=1, low=65, high=4100):
        with ZipFile(archive_dir / (pack + ".zip")) as archive:
            member = next(path for path in archive.namelist() if Path(path).name == name)
            raw = archive.read(member)
        decoded = subprocess.run(
            [ffmpeg, "-v", "error", "-i", "pipe:0", "-ac", "1",
             "-ar", str(RATE), "-f", "f32le", "pipe:1"],
            input=raw, capture_output=True, check=True,
        ).stdout
        original = np.frombuffer(decoded, dtype="<f4")
        active = np.flatnonzero(np.abs(original) > .012)
        original = original[max(0, int(active[0]) - 24):]
        shifted = np.interp(np.arange(0, len(original), speed), np.arange(len(original)), original)
        filtered = bandpass(shifted, low, high)
        return filtered / max(.01, np.max(np.abs(filtered)))

    def impact(name, speed=1, low=65, high=4100):
        return recording("impact", name + ".ogg", speed, low, high)

    def foley(name, speed=1, low=65, high=4100):
        return recording("rpg", name + ".ogg", speed, low, high)

    # Scholarly skills share an attack/release shape but each has its own materials.
    return {
        "castGravity": mix(.34,
            (0, .52, breath(.29, 130, 720)), (.04, .24, sweep(.28, 320, 98, .032, 6)),
            (.05, .18, foley("knifeSlice2", .80, 150, 970))),
        "landGravity": mix(.34,
            (0, .59, thump(.30, 146, 70, 15)), (0, .52, impact("impactWood_heavy_002", .82, 76, 1450)),
            (.013, .31, impact("impactPunch_heavy_003", .84, 72, 790))),
        "castSpace": mix(.46,
            (0, .32, breath(.44, 280, 1750)), (.015, .29, sweep(.37, 230, 700, .029, 5)),
            (.09, .23, sweep(.32, 604, 286, .018, 7)), (.08, .22, thump(.32, 170, 98, 11))),
        "hitSpace": mix(.36,
            (0, .42, thump(.32, 170, 102, 13)), (.018, .24, sweep(.31, 640, 225, .01, 9)),
            (0, .32, impact("impactBell_heavy_001", .70, 160, 1600))),
        "castRestore": mix(.42,
            (.015, .37, foley("metalClick", .79, 160, 1900)),
            (.052, .28, sweep(.23, 292, 294, .018, 8)), (.116, .23, sweep(.24, 438, 439, .018, 8)),
            (.186, .20, sweep(.23, 587, 588, .017, 8))),
        "landRestore": mix(.43,
            (0, .48, thump(.27, 137, 73, 15)), (0, .56, impact("impactPlate_heavy_002", .75, 115, 1700)),
            (.069, .14, foley("metalPot2", .72, 130, 1450))),
        "castCrystal": mix(.31,
            (0, .39, impact("impactGlass_light_001", 1.10, 720, 3300)),
            (.042, .34, impact("impactGlass_light_003", 1.23, 830, 3450)),
            (.09, .30, sweep(.18, 1000, 1390, .009, 11)), (.04, .28, breath(.23, 540, 2330))),
        "hitCrystal": mix(.25,
            (0, .57, impact("impactGlass_medium_000", .95, 480, 3150)),
            (.025, .27, impact("impactGlass_light_003", .92, 620, 3180)),
            (0, .21, thump(.18, 190, 113, 22))),
        "castVine": mix(.43,
            (0, .39, foley("cloth3", .96, 290, 2300)), (.08, .42, breath(.34, 300, 2400, 12)),
            (.12, .24, foley("knifeSlice", .83, 390, 1820))),
        "hitVine": mix(.44,
            (0, .45, thump(.25, 150, 89, 15)), (.008, .45, impact("impactWood_medium_001", .90, 140, 1900)),
            (.036, .29, foley("clothBelt2", .83, 240, 1770)), (.09, .23, breath(.31, 200, 1200, 9))),
        "castSwarm": mix(.43,
            (0, .49, breath(.42, 560, 2700, 16)), (.02, .19, foley("cloth1", 1.20, 610, 2900)),
            (.095, .21, sweep(.22, 630, 990, .025, 10)), (.18, .16, sweep(.23, 910, 1190, .033, 8))),
        "hitSwarm": mix(.28,
            (0, .34, breath(.25, 290, 1730, 21)), (.025, .19, sweep(.19, 610, 850, .02, 11)),
            (.074, .15, sweep(.18, 970, 510, .02, 11)), (.01, .17, thump(.19, 163, 103, 17))),
        "castEarth": mix(.36,
            (0, .53, breath(.34, 130, 820, 17)), (0, .30, impact("impactMining_002", .67, 105, 1070)),
            (.08, .18, thump(.27, 135, 76, 12))),
        "landEarth": mix(.27,
            (0, .56, thump(.25, 151, 74, 19)), (.004, .48, impact("impactMining_000", .74, 110, 1370)),
            (.024, .24, impact("impactWood_heavy_004", .71, 83, 606))),
        "castQuake": mix(.29,
            (0, .31, thump(.28, 157, 77, 13)), (.057, .26, breath(.22, 105, 640, 11))),
        "landQuake": mix(.62,
            (.022, .62, thump(.43, 153, 66, 9)), (.022, .38, impact("impactPunch_heavy_003", .70, 72, 690)),
            (.094, .29, thump(.31, 130, 57, 14)), (.205, .20, thump(.29, 109, 62, 13)),
            (.035, .43, breath(.54, 95, 690, 11)), (.13, .31, impact("impactMining_004", .70, 170, 1050))),
    }


def encode(samples, ffmpeg, peak):
    samples = np.tanh(samples * 1.4)
    samples *= peak / max(.01, np.max(np.abs(samples)))
    samples[:36] *= np.linspace(0, 1, 36)
    samples[-480:] *= np.linspace(1, 0, 480)
    encoded = subprocess.run(
        [ffmpeg, "-v", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
         "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k", "-write_xing", "0",
         "-id3v2_version", "0", "-f", "mp3", "pipe:1"],
        input=samples.astype("<f4").tobytes(), capture_output=True, check=True,
    ).stdout
    return base64.b64encode(encoded).decode("ascii")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archives", type=Path, help="Directory containing Kenney's packs as rpg.zip and impact.zip")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()
    prefix, data = BANK.read_text(encoding="utf-8").split(MARKER, 1)
    bank = json.loads(data.strip().removesuffix(";"))
    samples = build_samples(args.archives, args.ffmpeg)
    for name, rendered in samples.items():
        peak = .77 if name.startswith("land") else .62
        bank[name] = encode(rendered, args.ffmpeg, peak)
    BANK.write_text(prefix + MARKER + json.dumps(bank, indent=2) + ";\n", encoding="utf-8", newline="\n")
    print(f"Baked {len(samples)} scholar cues ({len(bank)} effects total)")


if __name__ == "__main__":
    main()
