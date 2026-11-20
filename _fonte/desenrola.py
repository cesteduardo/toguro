"""Desenrola o rótulo de uma embalagem cilíndrica a partir do render oficial (vista frontal).

Saídas por produto:
  <nome>.webp  textura 360° (duas cópias da frente, como lata real com logo dos dois lados)
  <nome>.json  perfil da silhueta: lista de [raio, altura] normalizados (altura 0..1, raio na mesma escala)

Uso: python3 desenrola.py <render.jpg> <mascara.jpg> <saida_sem_ext> [theta_max_graus] [larg_textura]
"""
import json, subprocess, sys
import numpy as np

render, mascara, saida = sys.argv[1:4]
TMAX = np.radians(float(sys.argv[4]) if len(sys.argv) > 4 else 72)
LT = int(sys.argv[5]) if len(sys.argv) > 5 else 1024


def le(caminho, canais):
    out = subprocess.run(['magick', caminho, '-depth', '8', ('rgb:-' if canais == 3 else 'gray:-')], capture_output=True, check=True).stdout
    w, h = map(int, subprocess.run(['magick', 'identify', '-format', '%w %h', caminho], capture_output=True, text=True, check=True).stdout.split())
    return np.frombuffer(out, np.uint8).reshape(h, w, canais) if canais == 3 else np.frombuffer(out, np.uint8).reshape(h, w)


rgb = le(render, 3).astype(np.float32)
alfa = le(mascara, 1).astype(np.float32) / 255.0
H, W = alfa.shape

# --- silhueta: bordas esquerda/direita por linha
dentro = alfa > .5
linhas = np.where(dentro.any(axis=1))[0]
y0, y1 = linhas[0], linhas[-1]
esq = np.full(H, np.nan); dir_ = np.full(H, np.nan)
for y in range(y0, y1 + 1):
    xs = np.where(dentro[y])[0]
    if len(xs) > 2:
        esq[y], dir_[y] = xs[0], xs[-1] + 1
centro = np.nanmedian((esq + dir_) / 2)
raio = (dir_ - esq) / 2
# suaviza o raio (o render tem antisserrilhado)
r = raio[y0:y1 + 1].copy()
k = np.ones(5) / 5
r_suave = np.convolve(np.nan_to_num(r, nan=np.nanmean(r)), k, mode='same')
r_suave[:2], r_suave[-2:] = r[:2], r[-2:]
altura = (y1 - y0 + 1)

# --- textura desenrolada: altura = linhas do objeto, largura LT (360°)
HT = int(round(LT * altura / (2 * np.pi * np.nanmax(r_suave)) * 1.0))
HT = max(256, min(HT, 2048))
ys = np.linspace(y0, y1, HT)
us = (np.arange(LT) + .5) / LT
# duas cópias da frente: u em [0,.5) e [.5,1) varrem -TMAX..+TMAX
fr = (us % .5) / .5
theta = (fr - .5) * 2 * TMAX
tex = np.zeros((HT, LT, 3), np.float32)
for j, yf in enumerate(ys):
    yi = int(round(yf)); rr = r_suave[min(yi - y0, len(r_suave) - 1)]
    if not np.isfinite(rr) or rr < 1:
        continue
    xf = centro + rr * np.sin(theta)
    x0 = np.clip(np.floor(xf).astype(int), 0, W - 2); t = (xf - x0)[:, None]
    yy = min(max(yi, 0), H - 1)
    tex[j] = rgb[yy, x0] * (1 - t) + rgb[yy, x0 + 1] * t

# --- tira a luz "assada" do render: as faixas verticais de brilho/sombra
# são normalizadas pela mediana de cada coluna (força 85%)
lum = tex.mean(axis=2)
colmed = np.median(lum[int(HT * .12):int(HT * .88)], axis=0)
alvo = np.median(colmed)
ganho = np.clip(alvo / np.maximum(colmed, 1), .55, 1.8)
ganho = 1 + (ganho - 1) * .85
ganho = np.convolve(np.pad(ganho, 8, mode='wrap'), np.ones(9) / 9, mode='same')[8:-8]
tex = np.clip(tex * ganho[None, :, None], 0, 255).astype(np.uint8)

subprocess.run(['magick', '-size', f'{LT}x{HT}', '-depth', '8', 'rgb:-', '-quality', '86', saida + '.webp'], input=tex.tobytes(), check=True)

# --- perfil normalizado (de baixo para cima), ~120 pontos
n = 120
idx = np.linspace(0, len(r_suave) - 1, n).astype(int)
perfil = []
for i in idx[::-1]:  # de baixo (y1) para cima (y0)
    hh = (y1 - (y0 + i)) / altura
    perfil.append([round(float(r_suave[i] / altura), 5), round(float(hh), 5)])
json.dump({'perfil': perfil, 'proporcao': round(float(np.nanmax(r_suave) * 2 / altura), 4)}, open(saida + '.json', 'w'))
print(saida, 'textura', LT, 'x', HT, 'proporção', round(float(np.nanmax(r_suave) * 2 / altura), 3))
