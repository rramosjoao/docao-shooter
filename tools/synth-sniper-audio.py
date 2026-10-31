#!/usr/bin/env python3
"""Sintetiza os sons das snipers do Docão Shooter.

Tudo é gerado aqui (numpy + ffmpeg). Não usa sample de jogo, vídeo ou banco.
Cada tiro é em camadas: transiente mecânico, crack, corpo e cauda.
O ferrolho e a recarga seguem as frações da animação em sniper-view.js / main.js.

Saída: assets/audio/sniper/*.ogg (e WAV intermediário em /tmp se --keep-wav).
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

FS = 48000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "sniper"

# Frações da animação do ferrolho (poseSniperBolt): mão chega, abre, puxa, empurra, fecha.
BOLT_OPEN = 0.18
BOLT_PULL = 0.36
BOLT_SHELL = 0.46
BOLT_SHELL2 = 0.54
BOLT_PUSH = 0.64
BOLT_CLOSE = 0.86
# Recarga (RELOAD_SFX + pose da 1ª pessoa): abre, três cartuchos, fecha.
RELOAD_OPEN = 0.12
RELOAD_PULL = 0.20
RELOAD_ROUNDS = (0.40, 0.53, 0.66)
RELOAD_CLOSE = 0.86


def sinc_kernel(cutoff: float, taps: int = 191) -> np.ndarray:
    cutoff = float(np.clip(cutoff, 40.0, FS * 0.45))
    n = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * cutoff / FS * n) * np.hamming(taps)
    s = h.sum()
    return h / s if s else h


def lowpass(x: np.ndarray, cutoff: float, taps: int = 191) -> np.ndarray:
    return np.convolve(x, sinc_kernel(cutoff, taps), mode="same")


def highpass(x: np.ndarray, cutoff: float, taps: int = 191) -> np.ndarray:
    return x - lowpass(x, cutoff, taps)


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return highpass(lowpass(x, hi), lo)


def env_exp(n: int, tau: float) -> np.ndarray:
    t = np.arange(n) / FS
    return np.exp(-t / max(tau, 1e-4))


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


def friedlander(dur: float, td: float) -> np.ndarray:
    """Onda de choque: sobe na hora, cruza zero e volta. td = duração positiva."""
    n = int(dur * FS)
    t = np.arange(n) / FS
    y = (1.0 - t / td) * np.exp(-t / td)
    y[t < 0] = 0
    return y


def noise(dur: float, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(int(dur * FS))


def metal(f0: float, dur: float, bright: float, rng: np.random.Generator, ratios=None) -> np.ndarray:
    """Parciais inarmônicas + um tique de ruído. Não é nota musical."""
    n = int(dur * FS)
    t = np.arange(n) / FS
    y = np.zeros(n)
    ratios = ratios or (1.0, 1.97, 2.73, 3.91, 5.4, 7.15, 9.2)
    for i, r in enumerate(ratios):
        amp = (0.62 ** i) * bright
        decay = np.exp(-t * (28 + i * 22) * (0.7 + 0.3 * bright))
        # leve desafinação por parcial pra não soar seno puro
        f = f0 * r * (1 + 0.004 * math.sin(i * 2.3))
        y += np.sin(2 * math.pi * f * t + rng.random() * 6) * decay * amp
    tick = noise(dur, rng) * np.exp(-t * 180)
    y += highpass(tick, f0 * 1.4) * (0.22 * bright)
    return y


def scrape(dur: float, lo: float, hi: float, rng: np.random.Generator, swell: float = 0.35) -> np.ndarray:
    nse = noise(dur, rng)
    y = bandpass(nse, lo, hi)
    t = np.linspace(0, 1, y.size)
    # sobe rápido e morre — o metal deslizando no trilho
    att = np.clip(t / max(swell, 0.05), 0, 1)
    rel = np.exp(-t * 3.2)
    y *= att * rel
    peak = np.max(np.abs(y)) + 1e-9
    return y / peak


def soft_limit(x: np.ndarray, ceiling: float = 0.89) -> np.ndarray:
    """Teto. Não aumenta um som que já está abaixo do teto (isso engolia a cauda)."""
    peak = float(np.max(np.abs(x))) + 1e-12
    drive = 1.25 if peak > ceiling else 1.05
    y = np.tanh((x / peak) * drive) / math.tanh(drive)
    y_peak = float(np.max(np.abs(y))) + 1e-12
    target = ceiling if peak > ceiling else peak
    return y / y_peak * target


def dc_block(x: np.ndarray) -> np.ndarray:
    return highpass(x, 28.0, taps=255)


def stereo_tail(mono: np.ndarray, width: float, rng: np.random.Generator) -> np.ndarray:
    """Crack no centro; a cauda abre um pouco pros lados (Haas curto)."""
    delay = int(0.0075 * FS)
    side = np.zeros_like(mono)
    if delay < mono.size:
        tail = highpass(mono, 400)
        side[delay:] = tail[:-delay] * width
        # um pouco de decorrelação na cauda, sem mexer no ataque
        n = side.size
        bed = bandpass(rng.standard_normal(n), 500, 4000) * env_exp(n, 0.45) * 0.04 * width
        side += bed
    attack = int(0.012 * FS)
    side[:attack] *= np.linspace(0, 1, attack) if attack < side.size else 1
    left = mono + side
    right = mono - side * 0.85
    return np.stack([left, right], axis=0)


def echoes(dry: np.ndarray, taps, rng: np.random.Generator) -> np.ndarray:
    """Reflexos discretos. taps = (segundos, pico relativo, lowpass Hz). Cada um é normalizado."""
    n = int(FS * (taps[-1][0] + 0.45))
    out = np.zeros(n)
    smear = int(0.02 * FS)
    ker = np.exp(-np.linspace(0, 3.2, smear))
    ker /= ker.sum()
    for t, g, lp in taps:
        sig = lowpass(dry, lp)
        sig = np.convolve(sig, ker, mode="full")
        sig = unit(sig, g)
        i = int(t * FS)
        j = min(sig.size, n - i)
        if i < n and j > 0:
            out[i : i + j] += sig[:j]
    # leito que cola os reflexos: o pico fica no começo, não num estalo aleatório no fim
    bed = rng.standard_normal(n) * env_exp(n, 0.62)
    bed = lowpass(bed, 1600)
    early = bed[: max(1, int(0.08 * FS))]
    bed = bed / (float(np.max(np.abs(early))) + 1e-9) * 0.035
    out += bed
    return out


def unit(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = float(np.max(np.abs(x))) + 1e-9
    return x / m * peak


def mix_shot(kind: str, rng: np.random.Generator, far: bool) -> np.ndarray:
    """Cada camada entra já normalizada. O pico do crack não pode engolir corpo e cauda."""
    if kind == "mid":
        dur = 2.45 if far else 1.85
        crack_band = (2400, 7800)
        crack_tau = 0.009
        body_td, body_lp = 0.014, 480
        bark = (280, 1400, 0.11)
        sub_f, sub_tau, sub_dur = 84, 0.09, 0.28
        mech_f = 1900
        # ganhos relativos, pico de cada camada = 1 antes do ganho
        g = dict(mech=0.22, crack=0.92, edge=0.48, body=0.62, bark=0.5, sub=0.16, tranco=0.0, sub2=0.0)
        taps = [(0.012, 0.26, 4800), (0.046, 0.4, 3600), (0.098, 0.28, 2500), (0.175, 0.2, 1800),
                (0.3, 0.15, 1300), (0.48, 0.18, 980), (0.74, 0.14, 760), (1.08, 0.11, 600), (1.45, 0.08, 480)]
    elif kind == "heavy":
        dur = 3.05 if far else 2.4
        crack_band = (1200, 4200)
        crack_tau = 0.016
        body_td, body_lp = 0.032, 160
        bark = (120, 640, 0.16)
        sub_f, sub_tau, sub_dur = 42, 0.26, 0.55
        mech_f = 680
        g = dict(mech=0.32, crack=0.5, edge=0.28, body=0.95, bark=0.62, sub=0.78, tranco=0.7, sub2=0.55)
        taps = [(0.016, 0.3, 2000), (0.058, 0.46, 1200), (0.12, 0.34, 900), (0.23, 0.26, 720),
                (0.4, 0.2, 560), (0.64, 0.18, 460), (1.0, 0.14, 380), (1.45, 0.11, 320), (1.95, 0.08, 280)]
    else:
        dur = 1.45 if far else 1.05
        crack_band = (3000, 8600)
        crack_tau = 0.006
        body_td, body_lp = 0.008, 700
        bark = (480, 1800, 0.05)
        sub_f, sub_tau, sub_dur = 130, 0.045, 0.16
        mech_f = 2500
        g = dict(mech=0.3, crack=0.78, edge=0.4, body=0.42, bark=0.36, sub=0.1, tranco=0.0, sub2=0.0)
        taps = [(0.01, 0.14, 5200), (0.042, 0.22, 3400), (0.095, 0.12, 2200), (0.18, 0.06, 1500), (0.34, 0.48, 1800), (0.55, 0.36, 1300)]

    n = int(dur * FS)
    dry = np.zeros(n)

    place(dry, 0.0, unit(metal(mech_f, 0.018, 1.0, rng)), g["mech"])

    # crack: ruído de banda alta com ataque de 1 sample e caimento curto (não um impulso de 1 amostra)
    crack_n = int(0.07 * FS)
    crack = bandpass(noise(0.07, rng), *crack_band) * env_exp(crack_n, crack_tau)
    place(dry, 0.0, unit(crack), g["crack"])
    edge = highpass(friedlander(0.04, 0.00055 if kind != "heavy" else 0.0009), 900 if kind == "heavy" else 1600)
    place(dry, 0.0003, unit(edge), g["edge"])

    body = lowpass(friedlander(0.32, body_td), body_lp)
    place(dry, 0.0, unit(body), g["body"])
    if g["tranco"]:
        place(dry, 0.015, unit(lowpass(friedlander(0.24, 0.02), 220)), g["tranco"])
        place(dry, 0.003, unit(lowpass(friedlander(0.4, 0.045), 95)), g["sub2"])
    blo, bhi, btau = bark
    bark_n = int(0.36 * FS)
    bark_sig = bandpass(noise(0.36, rng), blo, bhi) * env_exp(bark_n, btau)
    place(dry, 0.0, unit(bark_sig), g["bark"])
    tsub = np.arange(int(sub_dur * FS)) / FS
    sub = np.sin(2 * math.pi * sub_f * tsub) * np.exp(-tsub / sub_tau)
    if g["sub2"]:
        sub = sub + 0.8 * np.sin(2 * math.pi * 30 * tsub) * np.exp(-tsub / (sub_tau * 1.3))
    place(dry, 0.0, unit(sub), g["sub"])

    if kind == "heavy":
        dry = np.tanh(dry * 0.9) / math.tanh(0.9)
    # nivela o disparo direto ANTES da cauda, senão o pico do crack reduz o eco a nada
    dry = soft_limit(dc_block(dry), 0.62 if kind == "light" else 0.7)

    excite = dry[: int(0.08 * FS)].copy()
    tail = echoes(excite, taps, rng)
    if tail.size < n:
        tail = np.pad(tail, (0, n - tail.size))
    tail = tail[:n]

    if far:
        pre = int(0.028 * FS)
        dull = {"mid": 1150, "heavy": 700, "light": 1400}[kind]
        dry_f = lowpass(dry, dull)
        kill = int(0.016 * FS)
        ramp = np.linspace(0.15, 1.0, kill)
        dry_f[:kill] *= ramp
        tail_f = lowpass(tail, dull * 0.9)
        # cauda mais presente que o disparo direto
        sig = np.zeros(n)
        m = min(dry_f.size, n - pre)
        sig[pre : pre + m] += dry_f[:m] * 0.55
        sig += tail_f[:n] * 1.15
        width = 0.06
    else:
        tail_g = {"mid": 0.9, "heavy": 1.0, "light": 1.15}[kind]
        sig = dry + tail * tail_g
        width = {"mid": 0.22, "heavy": 0.26, "light": 0.12}[kind]

    sig = dc_block(sig)
    fade = int(0.04 * FS)
    if fade < sig.size:
        sig[-fade:] *= np.linspace(1, 0, fade)
    stereo = stereo_tail(sig, width, rng)
    # pico consistente entre variantes; a proporção crack/corpo/cauda já foi definida
    ceiling = 0.8 if far else 0.89
    stereo = stereo / (float(np.max(np.abs(stereo))) + 1e-12) * ceiling
    return stereo


def render_bolt(kind: str, rate: float, rng: np.random.Generator) -> np.ndarray:
    dur = rate + 0.12
    buf = silence(dur)
    if kind == "mid":
        f_open, f_close, f_shell = 1680, 980, 2500
        scrape_lo, scrape_hi = 900, 2400
        g = 1.0
    elif kind == "heavy":
        f_open, f_close, f_shell = 620, 340, 880
        scrape_lo, scrape_hi = 280, 1100
        g = 1.15
    else:
        f_open, f_close, f_shell = 2300, 1500, 3400
        scrape_lo, scrape_hi = 1400, 3600
        g = 0.85

    # mão chega no ferrolho (bem baixo)
    place(buf, 0.04 * rate, scrape(0.08, 400, 1800, rng, 0.5), 0.12 * g)
    # abre / levanta
    place(buf, BOLT_OPEN * rate, metal(f_open, 0.07, 1.0, rng), 0.7 * g)
    place(buf, BOLT_OPEN * rate, scrape(0.11 * rate, scrape_lo, scrape_hi, rng), 0.45 * g)
    # puxa
    place(buf, BOLT_PULL * rate, scrape(0.22 * rate, scrape_lo * 0.8, scrape_hi * 0.85, rng, 0.25), 0.7 * g)
    # cartucho ejetado + quique
    place(buf, BOLT_SHELL * rate, metal(f_shell, 0.09, 1.15, rng, (1, 2.3, 3.7, 5.9)), 0.55 * g)
    place(buf, BOLT_SHELL2 * rate, metal(f_shell * 1.35, 0.05, 0.7, rng, (1, 2.6, 4.4)), 0.28 * g)
    # empurra de volta
    place(buf, BOLT_PUSH * rate, scrape(0.16 * rate, scrape_lo, scrape_hi * 0.9, rng, 0.2), 0.5 * g)
    # fecha — o impacto mais cheio
    place(buf, BOLT_CLOSE * rate, metal(f_close, 0.12, 1.3, rng), 0.95 * g)
    if kind == "heavy":
        place(buf, BOLT_CLOSE * rate, lowpass(friedlander(0.08, 0.012), 200), 0.55)
    thump = lowpass(friedlander(0.04, 0.004), 500)
    place(buf, BOLT_CLOSE * rate, thump, 0.35 * g)

    buf = dc_block(buf)
    fade = int(0.02 * FS)
    buf[-fade:] *= np.linspace(1, 0, fade)
    buf = soft_limit(buf, 0.8)
    # cápsula sai pela direita: o tilintar um pouco pro lado
    stereo = stereo_tail(buf, 0.12 if kind != "light" else 0.08, rng)
    return stereo


def render_reload(kind: str, reload_t: float, rng: np.random.Generator) -> np.ndarray:
    dur = reload_t + 0.16
    buf = silence(dur)
    if kind == "mid":
        f_open, f_close, f_round = 1500, 920, 1750
        g = 1.0
    elif kind == "heavy":
        f_open, f_close, f_round = 540, 300, 640
        g = 1.2
    else:
        f_open, f_close, f_round = 2100, 1400, 2400
        g = 0.8

    place(buf, RELOAD_OPEN * reload_t, metal(f_open, 0.09, 1.0, rng), 0.75 * g)
    place(buf, RELOAD_PULL * reload_t, scrape(0.12 * reload_t, 500 if kind == "heavy" else 900, 2000 if kind != "light" else 3200, rng), 0.4 * g)
    for i, frac in enumerate(RELOAD_ROUNDS):
        # três cartuchos, como a animação (a carabina tem mais bala, mas a mão mostra três)
        f = f_round * (1 + 0.04 * i)
        if kind == "heavy":
            place(buf, frac * reload_t, lowpass(friedlander(0.06, 0.008), 400), 0.5)
            place(buf, frac * reload_t, metal(f, 0.07, 0.8, rng), 0.45 * g)
        elif kind == "light":
            place(buf, frac * reload_t, metal(f, 0.045, 0.9, rng, (1, 2.4, 4.1)), 0.5 * g)
        else:
            place(buf, frac * reload_t, metal(f, 0.06, 1.0, rng), 0.55 * g)
            place(buf, frac * reload_t + 0.012, metal(f * 1.7, 0.03, 0.4, rng, (1, 2.8)), 0.2)
    place(buf, RELOAD_CLOSE * reload_t, metal(f_close, 0.12, 1.25, rng), 0.9 * g)
    if kind == "heavy":
        place(buf, RELOAD_CLOSE * reload_t, lowpass(friedlander(0.09, 0.014), 180), 0.6)
    place(buf, RELOAD_CLOSE * reload_t, lowpass(friedlander(0.04, 0.004), 600), 0.3 * g)

    buf = dc_block(buf)
    fade = int(0.025 * FS)
    buf[-fade:] *= np.linspace(1, 0, fade)
    buf = soft_limit(buf, 0.78)
    return stereo_tail(buf, 0.1, rng)


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
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5", "-ar", str(FS), str(ogg)]
    )


def measure(stereo: np.ndarray) -> dict:
    mono = stereo.mean(axis=0)
    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(mono ** 2)) + 1e-12)
    n5 = max(1, int(0.005 * FS))
    atk = float(np.max(np.abs(mono[:n5])))
    hf = highpass(mono, 3000)
    hf_rms = float(np.sqrt(np.mean(hf ** 2)) + 1e-12)
    return {"peak": round(peak, 4), "rms_db": round(20 * math.log10(rms), 2), "atk5ms": round(atk, 4), "hf_rms_db": round(20 * math.log10(hf_rms), 2), "sec": round(mono.size / FS, 3)}


def band_energy(stereo: np.ndarray, t0: float, t1: float) -> float:
    mono = stereo.mean(axis=0)
    a, b = int(t0 * FS), int(t1 * FS)
    seg = mono[a:b]
    if seg.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(seg ** 2)))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep-wav", type=Path, default=None)
    args = ap.parse_args()
    specs = [
        ("torresmo", "mid", 1.15, 2.3, 11),
        ("canhao", "heavy", 1.85, 3.1, 29),
        ("carabina", "light", 0.58, 2.9, 47),
    ]
    report = {}
    OUT.mkdir(parents=True, exist_ok=True)
    for name, kind, rate, reload_t, seed in specs:
        jobs = {
            f"{name}-near-a": mix_shot(kind, np.random.default_rng(seed), False),
            f"{name}-near-b": mix_shot(kind, np.random.default_rng(seed + 100), False),
            f"{name}-far": mix_shot(kind, np.random.default_rng(seed + 7), True),
            f"{name}-bolt": render_bolt(kind, rate, np.random.default_rng(seed + 3)),
            f"{name}-reload": render_reload(kind, reload_t, np.random.default_rng(seed + 5)),
        }
        report[name] = {"kind": kind, "rate": rate, "reload": reload_t, "files": {}}
        for fname, audio in jobs.items():
            wav = (args.keep_wav or Path("/tmp/sniper-wav")) / f"{fname}.wav"
            write_wav(wav, audio)
            ogg = OUT / f"{fname}.ogg"
            to_ogg(wav, ogg)
            meta = measure(audio)
            meta["ogg_bytes"] = ogg.stat().st_size
            if fname.endswith("bolt"):
                meta["open"] = round(band_energy(audio, BOLT_OPEN * rate, BOLT_OPEN * rate + 0.05), 4)
                meta["shell"] = round(band_energy(audio, BOLT_SHELL * rate, BOLT_SHELL * rate + 0.05), 4)
                meta["close"] = round(band_energy(audio, BOLT_CLOSE * rate, BOLT_CLOSE * rate + 0.06), 4)
            if fname.endswith("reload"):
                meta["rounds"] = [round(band_energy(audio, f * reload_t, f * reload_t + 0.04), 4) for f in RELOAD_ROUNDS]
                meta["close"] = round(band_energy(audio, RELOAD_CLOSE * reload_t, RELOAD_CLOSE * reload_t + 0.06), 4)
            report[name]["files"][fname] = meta
            print(f"{fname:22} {meta}")
        near_a = jobs[f"{name}-near-a"]
        far_a = jobs[f"{name}-far"]
        def win(stereo, t0, t1):
            mono = stereo.mean(axis=0)
            seg = mono[int(t0 * FS) : int(t1 * FS)]
            return 20 * math.log10(float(np.sqrt(np.mean(seg ** 2))) + 1e-12)
        slap_t = 0.5 if kind == "light" else (0.62 if kind == "heavy" else 0.47)
        def win_peak(stereo, t0, t1):
            mono = stereo.mean(axis=0)
            seg = mono[int(t0 * FS) : int(t1 * FS)]
            return 20 * math.log10(float(np.max(np.abs(seg))) + 1e-12)
        slap_db = win_peak(near_a, slap_t, slap_t + 0.06)
        gap_db = win_peak(near_a, max(0.08, slap_t - 0.1), slap_t - 0.03)
        report[name]["near_slap_db"] = round(slap_db, 1)
        report[name]["near_gap_db"] = round(gap_db, 1)
        if slap_db < -22 or slap_db < gap_db + 6:
            raise SystemExit(f"{name}: eco do tiro perto não se destaca (pico {slap_db:.1f} dB vs vão {gap_db:.1f} dB)")
        near = report[name]["files"][f"{name}-near-a"]
        far = report[name]["files"][f"{name}-far"]
        if far["hf_rms_db"] > near["hf_rms_db"] - 3:
            raise SystemExit(f"{name}: o tiro longe não ficou mais abafado que o perto ({far['hf_rms_db']} vs {near['hf_rms_db']})")
        if near["atk5ms"] < near["peak"] * 0.25:
            raise SystemExit(f"{name}: ataque do tiro perto lento demais ({near['atk5ms']} / {near['peak']})")
        bolt = report[name]["files"][f"{name}-bolt"]
        if min(bolt["open"], bolt["shell"], bolt["close"]) < 0.01:
            raise SystemExit(f"{name}: ferrolho sem uma das fases {bolt}")
    man = OUT / "manifest.json"
    man.write_text(json.dumps(report, indent=2) + "\n")
    print("ok", man)


if __name__ == "__main__":
    main()
