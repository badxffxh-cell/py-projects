"""Turn word timings into the video timeline (shots, clock, labels, captions, SFX cues).

Usage: python3 build_timeline.py <timing.json> <timeline.json>
The same timeline.json drives the Remotion composition and the FFmpeg mix.
"""
import json
import sys

sys.path.insert(0, __import__('os').path.dirname(__file__))
from script_text import norm

FPS = 30
TAIL = 1.6  # seconds held after the last word


def finder(words):
    keys = [norm(w["text"]) for w in words]

    def at(word, nth=0, edge="start"):
        k = norm(word)
        hits = [i for i, x in enumerate(keys) if x == k]
        return words[hits[nth]][edge]

    def idx(word, nth=0):
        k = norm(word)
        return [i for i, x in enumerate(keys) if x == k][nth]

    return at, idx


def build(timing):
    words = timing["words"]
    at, idx = finder(words)
    end = words[-1]["end"] + TAIL

    # Marcos: clock value + darkness level of the scene
    marcos = [
        {"t": 0.0, "clock": "00:00", "dark": 0.0},
        {"t": at("Cinco"), "clock": "00:05", "dark": 0.12},
        {"t": at("Uma"), "clock": "01:00", "dark": 0.28},
        {"t": at("Seis"), "clock": "06:00", "dark": 0.42},
        {"t": at("Doze"), "clock": "12:00", "dark": 0.56},
        {"t": at("Vinte"), "clock": "24:00", "dark": 0.68},
        {"t": at("22"), "clock": "22 DIAS", "dark": 0.74},
        {"t": at("Você"), "clock": "22 DIAS", "dark": 0.85},
    ]

    blackout = at("agora?", edge="end") + 0.15
    # Shots: image, start, transition in, optional label (text on screen)
    shots = [
        {"id": "hook", "img": "city_on", "t": 0.0, "in": "cut"},
        {"id": "semaforo", "img": "traffic_off", "t": at("Cinco"), "in": "whip",
         "label": {"t": at("Semáforos"), "text": "11.600 semáforos apagaram em NY (2003)"}},
        {"id": "cartao", "img": "card_machine", "t": at("Cartão"), "in": "cut",
         "label": {"t": at("Cartão"), "text": "Espanha e Portugal, 2025"}},
        {"id": "hospital", "img": "hospital", "t": at("Hospitais"), "in": "zoom",
         "label": {"t": at("Hospitais"), "text": "Gerador: até 10 s (norma dos EUA)"}},
        {"id": "rede", "img": "people_phones", "t": at("Uma"), "in": "whip"},
        {"id": "grafico", "img": "people_phones", "t": at("No", 0), "in": "match", "graphic": "chart17",
         "label": {"t": at("Espanha,"), "text": "17% do normal · Espanha, 28/04/2025"}},
        {"id": "torre", "img": "cell_tower", "t": at("Seis"), "in": "whip",
         "label": {"t": at("baterias"), "text": "Bateria da torre: 2–8 h"}},
        {"id": "semsinal", "img": "phone_hand", "t": at("Quando"), "in": "cut", "graphic": "nosignal",
         "graphicT": at("some.")},
        {"id": "geladeira", "img": "fridge_open", "t": at("Doze"), "in": "whip",
         "label": {"t": at("geladeira"), "text": "Geladeira fechada: ~4 h"}},
        {"id": "agua", "img": "faucet", "t": at("Sem"), "in": "zoom",
         "label": {"t": at("Sem"), "text": "Cleveland, 2003: sem pressão na água"}},
        {"id": "vinte4", "img": "city_dark", "t": at("Vinte"), "in": "whip"},
        {"id": "amapa", "img": "city_dark", "t": at("No", 1), "in": "zoom",
         "label": {"t": at("Amapá,"), "text": "Amapá, nov. 2020 · 13 de 16 municípios"}},
        {"id": "final", "img": "city_on", "t": at("Você"), "in": "cut", "graphic": "cta",
         "graphicT": at("Comenta")},
    ]
    for i, s in enumerate(shots):
        s["end"] = shots[i + 1]["t"] if i + 1 < len(shots) else end

    sfx = [
        {"file": "sfx_click.wav", "t": blackout, "gain": 0.9},
        {"file": "sfx_signal.wav", "t": at("some."), "gain": 0.7},
        {"file": "sfx_hit.wav", "t": at("22"), "gain": 0.8},
    ]
    for s in shots[1:]:
        if s["in"] == "whip":
            sfx.append({"file": "sfx_whoosh.wav", "t": max(0, s["t"] - 0.12), "gain": 0.45})
    for m in marcos[1:6]:
        sfx.append({"file": "sfx_tick.wav", "t": m["t"], "gain": 0.6})

    # Caption pages: 1-2 words, break after punctuation or long pairs
    pages, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        txt = " ".join(words[j]["text"] for j in cur)
        punct = w["text"][-1] in ".,?!…"
        nxt_len = len(words[i + 1]["text"]) if i + 1 < len(words) else 0
        if len(cur) == 2 or punct or len(txt) + 1 + nxt_len > 16:
            pages.append(cur)
            cur = []
    if cur:
        pages.append(cur)
    cap_pages = []
    for k, p in enumerate(pages):
        start = words[p[0]]["start"]
        stop = words[pages[k + 1][0]]["start"] if k + 1 < len(pages) else words[p[-1]]["end"] + 0.6
        stop = min(stop, words[p[-1]]["end"] + 0.6)
        cap_pages.append({"start": start, "end": stop,
                          "words": [{"text": words[j]["text"], "start": words[j]["start"],
                                     "end": words[j]["end"]} for j in p]})

    return {
        "fps": FPS,
        "duration": round(end, 3),
        "frames": int(round(end * FPS)),
        "blackout": blackout,
        "marcos": marcos,
        "shots": shots,
        "sfx": sorted(sfx, key=lambda x: x["t"]),
        "captions": cap_pages,
    }


if __name__ == "__main__":
    tl = build(json.load(open(sys.argv[1])))
    json.dump(tl, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
    print(f"timeline: {tl['duration']:.2f}s, {len(tl['shots'])} shots, {len(tl['captions'])} caption pages")
    for s in tl["shots"]:
        print(f"  {s['id']:10s} {s['t']:6.2f} -> {s['end']:6.2f}  ({s['end'] - s['t']:.2f}s) {s['in']}")
