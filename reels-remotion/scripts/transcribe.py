"""Word timings for the narration with faster-whisper, aligned to the approved script.

Usage: python3 transcribe.py <voice.mp3> <timing.json>
Captions use the script's exact spelling; times come from whisper words
(difflib alignment, unmatched script words are interpolated).
"""
import difflib
import json
import subprocess
import sys

from faster_whisper import WhisperModel

sys.path.insert(0, __import__('os').path.dirname(__file__))
from script_text import CAPTION_TEXT, TOKENS, norm


def audio_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main(audio, out_path):
    model = WhisperModel("medium", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(
        audio, language="pt", word_timestamps=True, initial_prompt=CAPTION_TEXT, beam_size=5
    )
    heard = [w for seg in segments for w in seg.words]
    print("whisper:", " ".join(w.word.strip() for w in heard))

    a = [norm(t) for t in TOKENS]
    b = [norm(w.word) for w in heard]
    times = [None] * len(TOKENS)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            w = heard[blk.b + k]
            times[blk.a + k] = (w.start, w.end)
    matched = sum(t is not None for t in times)

    # interpolate gaps between known neighbours
    dur = audio_duration(audio)
    i = 0
    while i < len(times):
        if times[i] is None:
            j = i
            while j < len(times) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < len(times) else dur
            step = (t1 - t0) / (j - i)
            for k in range(i, j):
                times[k] = (t0 + step * (k - i), t0 + step * (k - i + 1))
            i = j
        else:
            i += 1

    words = [{"text": t, "start": round(s, 3), "end": round(e, 3)} for t, (s, e) in zip(TOKENS, times)]
    json.dump({"duration": dur, "words": words, "matched": matched, "total": len(TOKENS)},
              open(out_path, "w"), ensure_ascii=False, indent=1)
    print(f"matched {matched}/{len(TOKENS)} words; audio {dur:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
