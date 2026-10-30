#!/usr/bin/env python3
"""Sintetiza os sons das snipers do Docão Shooter.

Tudo é gerado aqui (numpy + ffmpeg). Não usa sample de jogo, vídeo ou banco.
Cada tiro cola quatro coisas de um ferrolho de verdade:

- crack supersônico (onda N + ruído de choque, ataque de poucos samples);
- corpo do disparo (bark, Friedlander e grave com queda de pitch, saturado);
- cauda de terreiro (reflexos espalhados + leito que decai, sem segundo tiro);
- ferrolho mecânico no tempo de poseSniperBolt / da recarga em main.js.

Identidade (coerente com shared/rules.js):

- carabina (leve, rate 0,58 s): seca, aguda, cauda curta, ferrolho miúdo e rápido;
- torresmo (média, .338, rate 1,15 s): crack crocante de torresmo + boom de sniper;
- canhão (anti-material, rate 1,85 s): boom enorme, freio de boca, cauda longa.

Saída: assets/audio/sniper/*.ogg e a cópia em modo/zumbi/assets/audio/sniper/.
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np

FS = 48000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "sniper"
ZUMBI = ROOT / "modo" / "zumbi" / "assets" / "audio" / "sniper"

# poseSniperBolt: a mão chega (0–0,12), levanta (0,12–0,32), puxa (0,32–0,58),
# empurra (0,58–0,82), fecha (0,82–0,93). Os impactos caem dentro desses trechos.
BOLT_OPEN = 0.16
BOLT_PULL = 0.34
BOLT_SHELL = 0.50
BOLT_SHELL2 = 0.57
BOLT_PUSH = 0.60
BOLT_CLOSE = 0.88
# Recarga (main.js, w.bolt): abre cedo, três cartuchos, fecha.
RELOAD_OPEN = 0.12
RELOAD_PULL = 0.20
RELOAD_ROUNDS = (0.40, 0.53, 0.66)
RELOAD_CLOSE = 0.86

# Ganhos são relativos e entram ANTES da saturação. O pico final é normalizado.
PROFILES = {
    "light": {
        "near": 1.15,
        "far": 1.55,
        "n_pos": 0.00018,
        "n_g": 0.85,
        "crack_band": (4800, 12500),
        "crack_tau": 0.0036,
        "crack_g": 1.0,
        "bark_band": (1600, 3400),
        "bark_tau": 0.028,
        "bark_g": 0.42,
        "body_td": 0.0055,
        "body_lp": 780,
        "body_g": 0.30,
        "sub_f0": 150,
        "sub_f1": 90,
        "sub_dur": 0.09,
        "sub_tau": 0.038,
        "sub_g": 0.10,
        "sub_drive": 1.3,
        "drive": 1.35,
        "comp": 2.2,
        "ring_f": 2680,
        "ring_tau": 0.09,
        "ring_g": 0.07,
        "mech_f": 3400,
        "mech_g": 0.16,
        "ground_t": 0.007,
        "ground_lp": 900,
        "ground_g": 0.18,
        "tail_g": 0.22,
        "tail_rt": 0.28,
        "tail_bright": 3400,
        "tail_rumble": 0.05,
        "excite": 0.035,
        "refl": [(0.014, 0.18, 5000), (0.038, 0.13, 3200), (0.09, 0.08, 1800), (0.22, 0.05, 1200)],
        "far_lp": 1680,
        "far_pre": 0.016,
        "width": 0.10,
        "dry_peak": 0.74,
        "f_open": 2500,
        "f_close": 1680,
        "f_shell": 3900,
        "scrape": (1600, 4200),
        "bolt_g": 0.82,
        "f_round": 2600,
        "reload_g": 0.78,
        "whistle": True,
    },
    "mid": {
        "near": 2.15,
        "far": 2.65,
        "n_pos": 0.00032,
        "n_g": 0.78,
        "crack_band": (2600, 8600),
        "crack_tau": 0.0065,
        "crack_g": 0.88,
        "crackle": True,
        "bark_band": (700, 1900),
        "bark_tau": 0.055,
        "bark_g": 0.62,
        "body_td": 0.012,
        "body_lp": 420,
        "body_g": 0.58,
        "sub_f0": 96,
        "sub_f1": 52,
        "sub_dur": 0.22,
        "sub_tau": 0.09,
        "sub_g": 0.42,
        "sub_drive": 1.8,
        "drive": 1.85,
        "comp": 3.0,
        "mech_f": 1850,
        "mech_g": 0.20,
        "ground_t": 0.009,
        "ground_lp": 480,
        "ground_g": 0.32,
        "tail_g": 0.36,
        "tail_rt": 0.62,
        "tail_bright": 2200,
        "tail_rumble": 0.18,
        "excite": 0.07,
        "refl": [(0.013, 0.22, 4200), (0.041, 0.18, 2600), (0.092, 0.12, 1600),
                 (0.19, 0.09, 1100), (0.41, 0.07, 780), (0.68, 0.045, 560)],
        "far_lp": 980,
        "far_pre": 0.026,
        "width": 0.20,
        "dry_peak": 0.70,
        "f_open": 1540,
        "f_close": 860,
        "f_shell": 2300,
        "scrape": (780, 2300),
        "bolt_g": 1.0,
        "f_round": 1700,
        "reload_g": 1.0,
    },
    "heavy": {
        "near": 3.15,
        "far": 3.55,
        "n_pos": 0.00072,
        "n_g": 1.05,
        "crack_band": (1400, 6200),
        "crack_tau": 0.007,
        "crack_g": 0.72,
        "bark_band": (180, 720),
        "bark_tau": 0.11,
        "bark_g": 0.78,
        "body_td": 0.028,
        "body_lp": 160,
        "body_g": 0.72,
        "sub_f0": 58,
        "sub_f1": 28,
        "sub_dur": 0.48,
        "sub_tau": 0.20,
        "sub_g": 1.0,
        "sub_drive": 2.4,
        "sub2_f": 34,
        "drive": 2.6,
        "comp": 4.2,
        "brake": True,
        "mech_f": 640,
        "mech_g": 0.28,
        "ground_t": 0.012,
        "ground_lp": 220,
        "ground_g": 0.48,
        "tail_g": 0.42,
        "tail_rt": 0.85,
        "tail_bright": 900,
        "tail_rumble": 0.55,
        "excite": 0.14,
        "refl": [(0.016, 0.26, 1400), (0.048, 0.22, 900), (0.11, 0.16, 640),
                 (0.24, 0.12, 480), (0.46, 0.09, 360), (0.78, 0.07, 280), (1.25, 0.05, 220)],
        "far_lp": 620,
        "far_pre": 0.034,
        "width": 0.16,
        "dry_peak": 0.66,
        "f_open": 520,
        "f_close": 280,
        "f_shell": 740,
        "scrape": (240, 980),
        "bolt_g": 1.18,
        "f_round": 560,
        "reload_g": 1.22,
    },
}


_kernels: dict[tuple, np.ndarray] = {}


def sinc_kernel(cutoff: float, taps: int = 191) -> np.ndarray:
    cutoff = float(np.clip(cutoff, 30.0, FS * 0.45))
    key = (round(cutoff, 1), taps)
    hit = _kernels.get(key)
    if hit is not None:
        return hit
    n = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * cutoff / FS * n) * np.hamming(taps)
    s = h.sum()
    h = h / s if s else h
    _kernels[key] = h
    return h


def lowpass(x: np.ndarray, cutoff: float, taps: int = 127) -> np.ndarray:
    if x.size < 8:
        return x
    return np.convolve(x, sinc_kernel(cutoff, taps), mode="same")


def highpass(x: np.ndarray, cutoff: float, taps: int = 127) -> np.ndarray:
    return x - lowpass(x, cutoff, taps)


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return highpass(lowpass(x, hi), lo)


def env_exp(n: int, tau: float) -> np.ndarray:
    t = np.arange(n) / FS
    return np.exp(-t / max(tau, 1e-4)).astype(np.float64)


def silence(dur: float) -> np.ndarray:
    return np.zeros(max(1, int(dur * FS)), dtype=np.float64)


def place(buf: np.ndarray, t: float, sig: np.ndarray, gain: float = 1.0) -> None:
    if gain == 0 or sig.size == 0:
        return
    i = int(round(t * FS))
    if i >= len(buf):
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(sig.size, len(buf) - i)
    if n > 0:
        buf[i : i + n] += sig[:n] * gain


def unit(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = float(np.max(np.abs(x))) + 1e-9
    return x / m * peak


def noise(dur: float, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(max(8, int(dur * FS)))


def friedlander(dur: float, td: float) -> np.ndarray:
    n = max(8, int(dur * FS))
    t = np.arange(n) / FS
    y = (1.0 - t / td) * np.exp(-t / max(td, 1e-4))
    return y


def n_wave(pos_s: float, neg_ratio: float = 0.7) -> np.ndarray:
    """Onda N do estalo supersônico: sobe em 1–2 samples, cruza zero e volta."""
    rise = 2
    pos_n = max(rise + 2, int(pos_s * FS))
    neg_n = max(4, int(pos_n * neg_ratio))
    tail = int(0.006 * FS)
    n = pos_n + neg_n + tail
    y = np.zeros(n)
    y[:rise] = np.linspace(0.0, 1.0, rise, endpoint=False)
    y[rise:pos_n] = np.linspace(1.0, -0.08, pos_n - rise, endpoint=False)
    y[pos_n : pos_n + neg_n] = np.linspace(-0.08, -0.62, neg_n, endpoint=False)
    y[pos_n + neg_n :] = -0.62 * np.exp(-np.arange(tail) / (0.0011 * FS))
    return y


def pitch_drop(f0: float, f1: float, dur: float, tau: float, drive: float) -> np.ndarray:
    """Grave que despenca de tom — pressão de boca, não um seno parado."""
    n = max(8, int(dur * FS))
    t = np.arange(n) / FS
    f0 = max(f0, 20.0)
    f1 = max(f1, 18.0)
    k = math.log(f1 / f0) / max(dur, 1e-3)
    if abs(k) < 1e-6:
        phase = 2 * math.pi * f0 * t
    else:
        phase = (2 * math.pi * f0 / k) * (np.exp(k * t) - 1.0)
    amp = np.exp(-t / max(tau, 1e-3))
    y = np.sin(phase) * amp
    d = max(drive, 1.01)
    y = np.tanh(y * d) / math.tanh(d)
    return y


def metal_click(f0: float, dur: float, rng: np.random.Generator, bright: float = 1.0) -> np.ndarray:
    """Impacto curto de aço: parciais que morrem em dezenas de ms + ruído, sem sino."""
    n = max(8, int(dur * FS))
    t = np.arange(n) / FS
    y = np.zeros(n)
    for i, r in enumerate((1.0, 2.37, 3.91, 6.05, 8.4)):
        decay = np.exp(-t * (140 + i * 90) / max(bright, 0.3))
        f = f0 * r * (1 + 0.012 * math.sin(i * 1.7))
        y += np.sin(2 * math.pi * f * t + rng.random() * 6.2) * decay * (0.55 ** i)
    burst = bandpass(noise(dur, rng), f0 * 0.55, min(f0 * 4.2, 14000)) * np.exp(-t * 260)
    y = y * 0.38 + burst * 0.85
    return y


def scrape(dur: float, lo: float, hi: float, rng: np.random.Generator, ridges: float) -> np.ndarray:
    """Aço deslizando no trilho: ruído filtrado com a crista dos dentes."""
    y = bandpass(noise(dur + 0.02, rng), lo, hi)
    n = y.size
    t = np.arange(n) / FS
    ridges = max(ridges, 8.0)
    mod = 0.42 + 0.58 * (0.5 + 0.5 * np.sin(2 * math.pi * ridges * t + rng.random() * 4))
    wob = 0.85 + 0.15 * np.sin(2 * math.pi * 6.5 * t)
    att = np.clip(t / 0.012, 0, 1)
    rel = np.exp(-t / max(dur * 0.55, 0.03))
    y = y[:n] * mod * wob * att * rel
    return unit(y)


def dc_block(x: np.ndarray) -> np.ndarray:
    return highpass(x, 28.0, taps=255)


def compress(x: np.ndarray, thresh: float, ratio: float) -> np.ndarray:
    """Compressor de joelho macio. Segura o pico e deixa o corpo aparecer."""
    env = 0.0
    atk = math.exp(-1.0 / (0.0015 * FS))
    rel = math.exp(-1.0 / (0.06 * FS))
    y = np.empty_like(x)
    knee = thresh
    inv = 1.0 / max(ratio, 1.01)
    for i, s in enumerate(x):
        a = abs(float(s))
        coef = atk if a > env else rel
        env = coef * env + (1.0 - coef) * a
        if env <= knee:
            g = 1.0
        else:
            g = (knee + (env - knee) * inv) / env
        y[i] = s * g
    return y


def fft_convolve(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    n = a.size + b.size - 1
    nfft = 1 << (n - 1).bit_length()
    spec = np.fft.rfft(a, nfft) * np.fft.rfft(b, nfft)
    return np.fft.irfft(spec, nfft)[:n]


def make_ir(dur: float, reflections, rt: float, bright: float, rumble: float, rng: np.random.Generator) -> np.ndarray:
    """Resposta de terreiro: reflexos borrados (não um tapa) e um leito que apaga."""
    n = max(8, int(dur * FS))
    ir = np.zeros(n)
    for t, g, lp in reflections:
        if t >= dur:
            continue
        burst_n = int(0.018 * FS)
        burst = lowpass(rng.standard_normal(burst_n), lp)
        burst *= np.exp(-np.arange(burst_n) / (0.0045 * FS))
        place(ir, max(0.012, t), unit(burst), g)
    tt = np.arange(n) / FS
    bed = rng.standard_normal(n) * np.exp(-tt / max(rt, 0.05))
    early = lowpass(bed, bright)
    late = lowpass(bed, max(180.0, bright * 0.45))
    cut = int(0.12 * FS)
    late[:cut] *= np.linspace(0, 1, cut)
    ir += early * 0.12 + late * 0.20
    if rumble > 0:
        rum = lowpass(rng.standard_normal(n) * np.exp(-tt / max(rt * 1.35, 0.08)), 160)
        ir += rum * rumble
    ir[: int(0.01 * FS)] = 0
    return ir


def stereo_from(mono: np.ndarray, width: float, rng: np.random.Generator) -> np.ndarray:
    """O ataque fica no centro. A cauda abre um pouco (Haas), sem virar eco separado."""
    delay = int(0.0065 * FS)
    side = np.zeros_like(mono)
    if 0 < delay < mono.size:
        tail = highpass(mono, 800)
        side[delay:] = tail[:-delay] * width
        bed_n = side.size
        bed = bandpass(rng.standard_normal(bed_n), 400, 3200) * env_exp(bed_n, 0.5) * (0.035 * width)
        side += bed
    attack = min(int(0.015 * FS), side.size)
    if attack > 1:
        side[:attack] *= np.linspace(0, 1, attack)
    left = mono + side
    right = mono - side * 0.82
    return np.stack([left, right], axis=0)


def mix_shot(kind: str, rng: np.random.Generator, far: bool) -> np.ndarray:
    p = PROFILES[kind]
    dur = p["far"] if far else p["near"]
    n = int(dur * FS)
    dry = np.zeros(n)
    j = 0.94 + float(rng.random()) * 0.12

    place(dry, 0.0, unit(metal_click(p["mech_f"], 0.01, rng, 0.7)), p["mech_g"])

    nw = n_wave(p["n_pos"] * (0.92 + float(rng.random()) * 0.16))
    place(dry, 0.0, unit(nw), p["n_g"] * j)
    crack_n = int(0.05 * FS)
    crack = bandpass(noise(0.05, rng), *p["crack_band"]) * env_exp(crack_n, p["crack_tau"])
    place(dry, 0.0, unit(crack), p["crack_g"] * j)

    if p.get("crackle"):
        # Torresmo: segundo estalo curtíssimo, o "crocante", ainda dentro do mesmo tiro.
        place(dry, 0.0017, unit(n_wave(p["n_pos"] * 0.62)), p["n_g"] * 0.34)
        c2n = int(0.018 * FS)
        c2 = bandpass(noise(0.018, rng), 5200, 12000) * env_exp(c2n, 0.0024)
        place(dry, 0.0015, unit(c2), 0.22)

    bark_n = int(0.32 * FS)
    bark = bandpass(noise(0.32, rng), *p["bark_band"]) * env_exp(bark_n, p["bark_tau"])
    place(dry, 0.0004, unit(bark), p["bark_g"])

    body = lowpass(friedlander(0.36, p["body_td"]), p["body_lp"])
    place(dry, 0.0, unit(body), p["body_g"])

    sub = pitch_drop(p["sub_f0"], p["sub_f1"], p["sub_dur"], p["sub_tau"], p["sub_drive"])
    low_n = noise(p["sub_dur"], rng)
    low = lowpass(low_n, max(80.0, p["sub_f0"])) * env_exp(low_n.size, p["sub_tau"] * 1.15)
    sub = unit(sub) * 0.78 + unit(low) * 0.32
    if p.get("sub2_f"):
        sub2 = unit(pitch_drop(p["sub2_f"], 22.0, p["sub_dur"], p["sub_tau"] * 1.3, p["sub_drive"]))
        n2 = min(sub.size, sub2.size)
        sub = sub[:n2] + sub2[:n2] * 0.55
    place(dry, 0.0, unit(sub), p["sub_g"])

    if p.get("brake"):
        # Freio de boca do .50: segundo sopro, poucos ms depois, mais largo e grave.
        place(dry, 0.0105, unit(lowpass(friedlander(0.14, 0.012), 340)), 0.55)
        bn = int(0.07 * FS)
        bnoise = bandpass(noise(0.07, rng), 160, 900) * env_exp(bn, 0.022)
        place(dry, 0.011, unit(bnoise), 0.34)

    if p.get("ring_g"):
        rn = int(p["ring_tau"] * 4 * FS)
        rt = np.arange(rn) / FS
        ring = np.sin(2 * math.pi * p["ring_f"] * rt) * np.exp(-rt / p["ring_tau"])
        place(dry, 0.003, unit(ring), p["ring_g"])

    early = dry[: int(0.045 * FS)].copy()
    place(dry, p["ground_t"], lowpass(early, p["ground_lp"]), p["ground_g"])

    drive = p["drive"]
    dry = np.tanh(dry * drive) / math.tanh(min(drive, 6.0))
    dry = compress(dry, 0.34 if kind == "heavy" else 0.42, p["comp"])
    dry = unit(dc_block(dry), p["dry_peak"])

    refl = []
    for t, g, lp in p["refl"]:
        refl.append((t + float(rng.uniform(-0.0025, 0.0025)), g, lp))
    ir = make_ir(dur, refl, p["tail_rt"], p["tail_bright"], p["tail_rumble"], rng)
    exc_n = min(n, int(p["excite"] * FS))
    excite = dry[:exc_n] * np.linspace(1.0, 0.25, exc_n)
    tail = fft_convolve(excite, ir)[:n]
    tail = unit(tail, p["tail_g"] * (1.25 if far else 1.0))

    if far:
        pre = int(p["far_pre"] * FS)
        dull = p["far_lp"]
        direct = lowpass(dry, dull)
        kill = int(0.022 * FS)
        direct[:kill] *= np.linspace(0.04, 1.0, kill) ** 1.4
        bloom = lowpass(dry, 200 if kind == "heavy" else 280)
        sig = np.zeros(n)
        m = min(direct.size, n - pre)
        sig[pre : pre + m] += direct[:m] * (0.48 if kind == "heavy" else 0.58)
        sig[: min(bloom.size, n)] += bloom[:n] * (0.55 if kind == "heavy" else 0.28)
        sig += lowpass(tail, dull * 0.8)[:n] * (1.35 if kind != "light" else 0.85)
        width = min(0.12, p["width"])
    else:
        sig = dry + tail
        width = p["width"]

    sig = dc_block(sig)
    fade = int(0.045 * FS)
    if fade < sig.size:
        sig[-fade:] *= np.linspace(1, 0, fade)
    stereo = stereo_from(sig, width, rng)
    ceiling = 0.78 if far else 0.89
    stereo = stereo / (float(np.max(np.abs(stereo))) + 1e-12) * ceiling
    return stereo.astype(np.float64)


def render_bolt(kind: str, rate: float, rng: np.random.Generator) -> np.ndarray:
    p = PROFILES[kind]
    dur = rate + 0.12
    buf = silence(dur)
    g = p["bolt_g"]
    lo, hi = p["scrape"]
    ridges = {"light": 72, "mid": 46, "heavy": 26}[kind]

    place(buf, 0.03 * rate, scrape(0.08, 500, 1800, rng, 30), 0.10 * g)
    place(buf, BOLT_OPEN * rate, metal_click(p["f_open"], 0.045, rng, 0.85), 0.72 * g)
    place(buf, BOLT_OPEN * rate, scrape(0.16 * rate, lo, hi, rng, ridges), 0.38 * g)
    place(buf, BOLT_PULL * rate, scrape((0.58 - BOLT_PULL) * rate, lo * 0.85, hi * 0.9, rng, ridges * 0.85), 0.50 * g)
    place(buf, BOLT_SHELL * rate, metal_click(p["f_shell"], 0.04, rng, 1.3), 0.55 * g)
    place(buf, BOLT_SHELL2 * rate, metal_click(p["f_shell"] * 1.45, 0.025, rng, 0.6), 0.22 * g)
    place(buf, BOLT_PUSH * rate, scrape((0.82 - BOLT_PUSH) * rate, lo, hi * 0.92, rng, ridges), 0.40 * g)
    place(buf, BOLT_CLOSE * rate, metal_click(p["f_close"], 0.07, rng, 1.15), 1.05 * g)
    place(buf, BOLT_CLOSE * rate + 0.004, metal_click(p["f_close"] * 1.7, 0.03, rng, 0.8), 0.48 * g)
    thump_lp = 180 if kind == "heavy" else (320 if kind == "mid" else 520)
    thump_g = 0.72 if kind == "heavy" else (0.28 if kind == "mid" else 0.12)
    place(buf, BOLT_CLOSE * rate, lowpass(friedlander(0.07, 0.008 if kind != "heavy" else 0.016), thump_lp), thump_g)

    buf = dc_block(buf)
    fade = int(0.02 * FS)
    buf[-fade:] *= np.linspace(1, 0, fade)
    peak = float(np.max(np.abs(buf))) + 1e-12
    buf = np.tanh(buf / peak * 1.4) / math.tanh(1.4)
    # A cápsula sai pela direita. O ganho extra entra antes do teto, pra não clipar.
    left = buf.copy()
    right = buf.copy()
    i0 = int(BOLT_SHELL * rate * FS)
    i1 = min(buf.size, i0 + int(0.04 * FS))
    if i1 > i0:
        left[i0:i1] *= 0.90
        right[i0:i1] *= 1.10
    stereo = np.stack([left, right], axis=0)
    return stereo / (float(np.max(np.abs(stereo))) + 1e-12) * 0.8


def render_reload(kind: str, reload_t: float, rng: np.random.Generator) -> np.ndarray:
    p = PROFILES[kind]
    dur = reload_t + 0.16
    buf = silence(dur)
    g = p["reload_g"]
    lo, hi = p["scrape"]

    place(buf, RELOAD_OPEN * reload_t, metal_click(p["f_open"], 0.06, rng), 0.8 * g)
    place(buf, RELOAD_PULL * reload_t, scrape(0.14 * reload_t, lo * 0.8, hi, rng, 40 if kind != "heavy" else 22), 0.42 * g)
    for i, frac in enumerate(RELOAD_ROUNDS):
        f = p["f_round"] * (1 + 0.035 * i)
        if kind == "heavy":
            place(buf, frac * reload_t, lowpass(friedlander(0.055, 0.007), 360), 0.42)
            place(buf, frac * reload_t, metal_click(f, 0.05, rng, 0.7), 0.40 * g)
        elif kind == "light":
            place(buf, frac * reload_t, metal_click(f, 0.028, rng, 1.2), 0.46 * g)
        else:
            place(buf, frac * reload_t, metal_click(f, 0.04, rng), 0.52 * g)
    place(buf, RELOAD_CLOSE * reload_t, metal_click(p["f_close"], 0.08, rng, 1.1), 0.95 * g)
    place(buf, RELOAD_CLOSE * reload_t + 0.005, metal_click(p["f_close"] * 1.6, 0.03, rng, 0.75), 0.36 * g)
    if kind == "heavy":
        place(buf, RELOAD_CLOSE * reload_t, lowpass(friedlander(0.09, 0.014), 160), 0.62)
    if p.get("whistle"):
        # Assobio baixinho da granja, no meio da recarga — humor, sem cobrir o ferrolho.
        wn = int(0.16 * FS)
        wt = np.arange(wn) / FS
        f0, f1 = 980.0, 1420.0
        k = math.log(f1 / f0) / 0.16
        phase = (2 * math.pi * f0 / k) * (np.exp(k * wt) - 1.0)
        amp = np.sin(np.pi * np.clip(wt / 0.16, 0, 1)) ** 2
        air = bandpass(noise(0.16, rng), 700, 2200) * amp * 0.35
        place(buf, 0.70 * reload_t, np.sin(phase) * amp * 0.55 + air, 0.045)

    buf = dc_block(buf)
    fade = int(0.025 * FS)
    buf[-fade:] *= np.linspace(1, 0, fade)
    buf = unit(np.tanh(buf * 1.15) / math.tanh(1.15), 0.78)
    return stereo_from(buf, 0.08, rng)


def write_wav(path: Path, stereo: np.ndarray) -> None:
    stereo = np.clip(stereo, -1, 1)
    pcm = (stereo.T * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(pcm.tobytes())


def to_ogg(wav: Path, ogg: Path) -> None:
    ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5", str(ogg)]
    )


def mono_of(stereo: np.ndarray) -> np.ndarray:
    return stereo.mean(axis=0)


def measure(stereo: np.ndarray) -> dict:
    mono = mono_of(stereo)
    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(mono ** 2)) + 1e-12)
    n5 = max(1, int(0.005 * FS))
    atk = float(np.max(np.abs(mono[:n5])))
    hf = highpass(mono, 3500)
    hf_rms = float(np.sqrt(np.mean(hf ** 2)) + 1e-12)
    return {
        "peak": round(peak, 4),
        "rms_db": round(20 * math.log10(rms), 2),
        "atk5ms": round(atk, 4),
        "hf_rms_db": round(20 * math.log10(hf_rms), 2),
        "sec": round(mono.size / FS, 3),
    }


def rms_between(mono: np.ndarray, t0: float, t1: float, filtered: np.ndarray | None = None) -> float:
    src = mono if filtered is None else filtered
    a = max(0, int(t0 * FS))
    b = min(src.size, int(t1 * FS))
    if b <= a:
        return 0.0
    seg = src[a:b]
    return float(np.sqrt(np.mean(seg ** 2)) + 1e-12)


def share(stereo: np.ndarray, t0: float, t1: float, mode: str, fc: float) -> float:
    mono = mono_of(stereo)
    filt = highpass(mono, fc) if mode == "hp" else lowpass(mono, fc)
    base = rms_between(mono, t0, t1)
    return rms_between(mono, t0, t1, filt) / base


def tail_end(stereo: np.ndarray, floor_db: float = -42.0) -> float:
    mono = np.abs(mono_of(stereo))
    peak = float(np.max(mono)) + 1e-12
    win = int(0.03 * FS)
    limit = peak * (10 ** (floor_db / 20))
    last = 0
    for i in range(0, mono.size - win, win // 2):
        if float(np.sqrt(np.mean(mono[i : i + win] ** 2))) > limit:
            last = i + win
    return last / FS


def corr(a: np.ndarray, b: np.ndarray, t0: float, t1: float) -> float:
    ma, mb = mono_of(a), mono_of(b)
    i0, i1 = int(t0 * FS), int(t1 * FS)
    xa, xb = ma[i0:i1], mb[i0:i1]
    n = min(xa.size, xb.size)
    xa, xb = xa[:n] - xa[:n].mean(), xb[:n] - xb[:n].mean()
    den = float(np.linalg.norm(xa) * np.linalg.norm(xb)) + 1e-12
    return float(np.dot(xa, xb) / den)


def main() -> None:
    specs = [
        ("carabina", "light", 0.58, 2.9, 47),
        ("torresmo", "mid", 1.15, 2.3, 11),
        ("canhao", "heavy", 1.85, 3.1, 29),
    ]
    report = {}
    rendered = {}
    OUT.mkdir(parents=True, exist_ok=True)
    wav_dir = Path("/tmp/sniper-wav")
    for name, kind, rate, reload_t, seed in specs:
        jobs = {
            f"{name}-near-a": mix_shot(kind, np.random.default_rng(seed), False),
            f"{name}-near-b": mix_shot(kind, np.random.default_rng(seed + 100), False),
            f"{name}-far": mix_shot(kind, np.random.default_rng(seed + 7), True),
            f"{name}-bolt": render_bolt(kind, rate, np.random.default_rng(seed + 3)),
            f"{name}-reload": render_reload(kind, reload_t, np.random.default_rng(seed + 5)),
        }
        rendered[name] = jobs
        report[name] = {
            "kind": kind,
            "rate": rate,
            "reload": reload_t,
            "bolt_frac": {"open": BOLT_OPEN, "shell": BOLT_SHELL, "close": BOLT_CLOSE},
            "reload_frac": {"rounds": list(RELOAD_ROUNDS), "close": RELOAD_CLOSE},
            "files": {},
        }
        for fname, audio in jobs.items():
            wav = wav_dir / f"{fname}.wav"
            write_wav(wav, audio)
            ogg = OUT / f"{fname}.ogg"
            to_ogg(wav, ogg)
            meta = measure(audio)
            meta["ogg_bytes"] = ogg.stat().st_size
            if fname.endswith("bolt"):
                meta["open"] = round(rms_between(mono_of(audio), BOLT_OPEN * rate, BOLT_OPEN * rate + 0.04), 4)
                meta["shell"] = round(rms_between(mono_of(audio), BOLT_SHELL * rate, BOLT_SHELL * rate + 0.04), 4)
                meta["close"] = round(rms_between(mono_of(audio), BOLT_CLOSE * rate, BOLT_CLOSE * rate + 0.05), 4)
            if fname.endswith("reload"):
                meta["rounds"] = [round(rms_between(mono_of(audio), f * reload_t, f * reload_t + 0.035), 4) for f in RELOAD_ROUNDS]
                meta["close"] = round(rms_between(mono_of(audio), RELOAD_CLOSE * reload_t, RELOAD_CLOSE * reload_t + 0.05), 4)
            report[name]["files"][fname] = meta
            print(f"{fname:22} {meta['sec']:5.2f}s  pico {meta['peak']:.2f}  atk {meta['atk5ms']:.2f}  hf {meta['hf_rms_db']:7.1f} dB  {meta['ogg_bytes']:6d} B")

        near = jobs[f"{name}-near-a"]
        far = jobs[f"{name}-far"]
        hf = share(near, 0.0, 0.012, "hp", 4000)
        sub = share(near, 0.0, 0.18, "lp", 120)
        report[name]["hf_attack"] = round(hf, 4)
        report[name]["sub_body"] = round(sub, 4)
        report[name]["tail_s"] = round(tail_end(near), 3)
        report[name]["near_corr"] = round(corr(near, jobs[f"{name}-near-b"], 0.08, min(0.7, PROFILES[kind]["near"] - 0.05)), 4)
        print(f"  {name}: hf4k {hf:.3f}  sub120 {sub:.3f}  cauda {report[name]['tail_s']:.2f}s  corr {report[name]['near_corr']:.3f}")

        near_m = report[name]["files"][f"{name}-near-a"]
        far_m = report[name]["files"][f"{name}-far"]
        if far_m["hf_rms_db"] > near_m["hf_rms_db"] - 8:
            raise SystemExit(f"{name}: tiro longe pouco abafado ({far_m['hf_rms_db']} vs {near_m['hf_rms_db']})")
        if near_m["atk5ms"] < near_m["peak"] * 0.45:
            raise SystemExit(f"{name}: ataque lento ({near_m['atk5ms']} / {near_m['peak']})")
        if far_m["atk5ms"] > near_m["atk5ms"] * 0.55:
            raise SystemExit(f"{name}: tiro longe ainda está seco demais no ataque")
        bolt = report[name]["files"][f"{name}-bolt"]
        if min(bolt["open"], bolt["shell"], bolt["close"]) < 0.02:
            raise SystemExit(f"{name}: ferrolho sem uma das fases {bolt}")
        if any(r < 0.015 for r in report[name]["files"][f"{name}-reload"]["rounds"]):
            raise SystemExit(f"{name}: recarga sem cartucho")
        if near_m["ogg_bytes"] > 90000 or far_m["ogg_bytes"] > 90000:
            raise SystemExit(f"{name}: ogg passou de 90 KB")
        mono = mono_of(near)
        peak = float(np.max(np.abs(mono))) + 1e-9
        late_at = 0.07 if kind == "light" else (0.16 if kind == "heavy" else 0.11)
        late = float(np.max(np.abs(mono[int(late_at * FS) :]))) / peak
        report[name]["late_peak"] = round(late, 3)
        if late > 0.55:
            raise SystemExit(f"{name}: a cauda virou segundo tiro (pico tardio {late:.2f})")
        tail_rms = rms_between(mono, 0.18, 0.40) / peak
        report[name]["tail_rms"] = round(tail_rms, 4)
        floor = 0.012 if kind == "light" else 0.018
        if tail_rms < floor:
            raise SystemExit(f"{name}: cauda fraca demais ({tail_rms:.4f})")
        if report[name]["near_corr"] > 0.92:
            raise SystemExit(f"{name}: as duas variações de perto estão iguais demais ({report[name]['near_corr']})")

    order = ["carabina", "torresmo", "canhao"]
    hf = [report[k]["hf_attack"] for k in order]
    sub = [report[k]["sub_body"] for k in order]
    tails = [report[k]["tail_s"] for k in order]
    if not (hf[0] > hf[1] > hf[2]):
        raise SystemExit(f"crack não separa as armas (agudo→grave): {hf}")
    if not (sub[2] > sub[1] > sub[0]):
        raise SystemExit(f"grave não separa as armas: {sub}")
    if not (tails[0] < tails[1] < tails[2]):
        raise SystemExit(f"cauda não separa as armas: {tails}")
    for a, b in zip(order, order[1:]):
        if report[b]["hf_attack"] > report[a]["hf_attack"] - 0.04:
            raise SystemExit(f"{a} e {b} próximas demais no agudo")
        if report[b]["sub_body"] < report[a]["sub_body"] + 0.04:
            raise SystemExit(f"{a} e {b} próximas demais no grave")

    man = OUT / "manifest.json"
    man.write_text(json.dumps(report, indent=2) + "\n")
    if ZUMBI.parent.exists():
        ZUMBI.mkdir(parents=True, exist_ok=True)
        for src in OUT.iterdir():
            if src.suffix in {".ogg", ".json"}:
                shutil.copy2(src, ZUMBI / src.name)
        print("cópia", ZUMBI)
    print("ok", man)


if __name__ == "__main__":
    main()
