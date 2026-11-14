"""Insert short silences before each marco so the clock has room to roll.

Usage: python3 add_pauses.py <voice_raw.mp3> <timing_raw.json> <voice.wav> <timing.json> [pause_s]
Cuts happen in the gap between words (midpoint), so no word is clipped.
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from script_text import norm  # noqa: E402

SR = 48000
MARCO_WORDS = [("cinco", 0), ("uma", 0), ("seis", 0), ("doze", 0), ("vinte", 0), ("você", 0)]


def decode(path):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def main(raw, timing_raw, out_wav, out_json, pause=0.9):
    pause = float(pause)
    audio = decode(raw)
    timing = json.load(open(timing_raw))
    words = timing["words"]
    keys = [norm(w["text"]) for w in words]

    cuts = []  # (cut_time, word_index)
    for word, nth in MARCO_WORDS:
        i = [k for k, x in enumerate(keys) if x == word][nth]
        prev_end = words[i - 1]["end"]
        cuts.append(((prev_end + words[i]["start"]) / 2, i))
    cuts.sort()

    pieces, last = [], 0
    silence = np.zeros(int(pause * SR), dtype=np.float32)
    for t, _ in cuts:
        s = int(t * SR)
        pieces += [audio[last:s], silence]
        last = s
    pieces.append(audio[last:])
    out = np.concatenate(pieces)

    shifted = []
    for k, w in enumerate(words):
        n_before = sum(1 for _, i in cuts if i <= k)
        shifted.append({**w, "start": round(w["start"] + n_before * pause, 3),
                        "end": round(w["end"] + n_before * pause, 3)})

    pcm16 = (np.clip(out, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-ac", "2", out_wav],
        input=pcm16, check=True,
    )
    dur = len(out) / SR
    json.dump({"duration": dur, "words": shifted}, open(out_json, "w"), ensure_ascii=False, indent=1)
    print(f"voice {dur:.2f}s with {len(cuts)} pauses of {pause}s")


if __name__ == "__main__":
    main(*sys.argv[1:])
