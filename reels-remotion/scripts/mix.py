"""Final mix + encode with FFmpeg.

Usage: python3 mix.py <video_silent.mp4> <voice.mp3> <audio_dir> <timeline.json> <out.mp4>
- voice at full level, music ducked under the voice (sidechain), SFX at timeline cues
- loudness normalised to about -14 LUFS (short-form platforms)
- H.264 CRF 18 preset veryfast, yuv420p, 30 fps, AAC 192k, +faststart
"""
import json
import subprocess
import sys
from pathlib import Path


def main(video, voice, audio_dir, timeline_path, out):
    tl = json.load(open(timeline_path))
    audio_dir = Path(audio_dir)
    dur = tl["duration"]

    inputs = ["-i", video, "-i", voice, "-i", str(audio_dir / "music.wav")]
    filters = [
        "[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[voice][vkey]",
        f"[2:a]aresample=48000,volume=0.55,atrim=0:{dur},afade=t=out:st={dur - 2.0}:d=2.0[music0]",
        "[music0][vkey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[music]",
    ]
    mix_labels = ["[voice]", "[music]"]
    for k, cue in enumerate(tl["sfx"]):
        idx = 3 + k
        inputs += ["-i", str(audio_dir / cue["file"])]
        ms = int(round(cue["t"] * 1000))
        filters.append(
            f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={cue['gain']},"
            f"adelay={ms}|{ms}[s{k}]"
        )
        mix_labels.append(f"[s{k}]")
    filters.append(
        f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:normalize=0:duration=longest,"
        f"atrim=0:{dur},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]"
    )

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-r", "30", "-profile:v", "high",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", "-t", f"{dur}", out,
    ]
    subprocess.run(cmd, check=True)
    print("wrote", out)


if __name__ == "__main__":
    main(*sys.argv[1:6])
