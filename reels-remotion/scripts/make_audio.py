"""Synthesize original background music and sound effects (no third-party audio).

Usage: python3 make_audio.py <out_dir> [music_seconds]
Writes: music_raw.wav, sfx_click.wav, sfx_signal.wav, sfx_whoosh.wav, sfx_tick.wav, sfx_hit.wav
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def write_wav(path, data):
    data = np.asarray(data, dtype=np.float64)
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    peak = np.max(np.abs(data)) or 1.0
    data = data / peak * 0.89
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def lowpass(x, cutoff):
    """One-pole low-pass, vectorised via cumulative filtering in blocks."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    # simple loop; fine for short buffers
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def note(freq, sec, harmonics=(1, 0.5, 0.25, 0.12), detune=0.003):
    t = t_axis(sec)
    out = np.zeros_like(t)
    for k, amp in enumerate(harmonics, start=1):
        for d in (-detune, detune):
            out += amp * np.sin(2 * np.pi * freq * k * (1 + d) * t + rng.uniform(0, 6.28))
    return out


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def make_music(sec):
    n = int(sec * SR)
    t = np.arange(n) / SR
    left = np.zeros(n)
    right = np.zeros(n)

    # Drone on A1 + E2 with slow swell
    drone = 0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.41 * t + 1.0)
    drone *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 11.0) ** 2
    left += drone
    right += drone

    # Pad progression Am - F - Dm - E (each 6 s), soft attack/release
    chords = [(57, 60, 64), (53, 57, 60), (50, 53, 57), (52, 56, 59)]
    chord_len = 6.0
    pos = 0.0
    idx = 0
    while pos < sec:
        dur = min(chord_len + 1.5, sec - pos)
        seg_n = int(dur * SR)
        start = int(pos * SR)
        chord = chords[idx % len(chords)]
        pad = sum(note(midi(m), dur) for m in chord) * 0.12
        pad *= env_adsr(seg_n, 1.5, 1.5)[: len(pad)]
        end = min(start + len(pad), n)
        left[start:end] += pad[: end - start] * 0.9
        right[start:end] += pad[: end - start] * 1.1
        pos += chord_len
        idx += 1

    # Clock tick every second (motif for the timeline), slowly getting louder
    tick = rng.normal(0, 1, int(0.012 * SR)) * np.exp(-np.linspace(0, 9, int(0.012 * SR)))
    tick = np.diff(tick, prepend=0)  # brighten
    for s in np.arange(0.5, sec - 0.5, 1.0):
        i = int(s * SR)
        gain = 0.15 + 0.25 * (s / sec)
        left[i : i + len(tick)] += tick * gain
        right[i : i + len(tick)] += tick * gain * 0.8

    # Fade in/out
    fade = np.ones(n)
    fi, fo = int(1.0 * SR), int(2.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo)
    return np.stack([left * fade, right * fade], axis=1)


def sfx_click():
    # Relay clack + low thump + mains hum powering down
    sec = 1.4
    t = t_axis(sec)
    n = len(t)
    out = np.zeros(n)
    clack = rng.normal(0, 1, int(0.006 * SR))
    out[: len(clack)] += clack * 1.0
    thump = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18)
    out += thump * 0.9
    f = 120 * np.exp(-t * 1.6)  # hum falling in pitch
    phase = 2 * np.pi * np.cumsum(f) / SR
    hum = (np.sin(phase) + 0.4 * np.sin(2 * phase) + 0.2 * np.sin(3 * phase)) * np.exp(-t * 2.2)
    out += hum * 0.35
    return out


def sfx_signal():
    # Three descending beeps + static burst fading out
    parts = []
    for f in (1180, 880, 620):
        t = t_axis(0.09)
        b = np.sin(2 * np.pi * f * t) * env_adsr(len(t), 0.005, 0.02)
        parts += [b, np.zeros(int(0.05 * SR))]
    beeps = np.concatenate(parts)
    t = t_axis(0.6)
    static = rng.normal(0, 1, len(t)) * np.exp(-t * 6) * 0.35
    return np.concatenate([beeps * 0.6, static])


def sfx_whoosh():
    sec = 0.4
    t = t_axis(sec)
    noise = rng.normal(0, 1, len(t))
    # crude band sweep: mix of differently low-passed noise with moving gain
    bright = np.diff(noise, prepend=0)
    sweep = np.sin(np.pi * t / sec) ** 2
    return (noise * 0.4 + bright * 0.6 * (t / sec)) * sweep


def sfx_tick():
    sec = 0.08
    t = t_axis(sec)
    click = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90)
    click += np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) * 0.6
    return click


def sfx_hit():
    sec = 2.0
    t = t_axis(sec)
    f = 60 * np.exp(-t * 0.8) + 30
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-t * 1.8)
    noise = rng.normal(0, 1, len(t)) * np.exp(-t * 14) * 0.25
    return sub + noise


if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    music_sec = float(sys.argv[2]) if len(sys.argv) > 2 else 50.0
    write_wav(out / "music_raw.wav", make_music(music_sec))
    write_wav(out / "sfx_click.wav", sfx_click())
    write_wav(out / "sfx_signal.wav", sfx_signal())
    write_wav(out / "sfx_whoosh.wav", sfx_whoosh())
    write_wav(out / "sfx_tick.wav", sfx_tick())
    write_wav(out / "sfx_hit.wav", sfx_hit())
    print("ok")
