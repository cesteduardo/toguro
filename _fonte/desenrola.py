"""Desenrola o rótulo de uma embalagem cilíndrica a partir do render oficial (vista frontal).

Saídas por produto:
  <nome>.webp  textura 360°: a frente oficial centrada em u=.25 (o site gira a malha para
               ela olhar a câmera); o resto da volta é a cor da própria lata, linha a
               linha, porque não existe render do verso. O site nunca mostra as costas.
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
HT = max(256, min(HT, 2400))
ys = np.linspace(y0, y1, HT)
us = (np.arange(LT) + .5) / LT
# a frente fica centrada em u=.25; theta em [-pi, pi)
theta = ((us - .25 + .5) % 1.0 - .5) * 2 * np.pi
frente = np.abs(theta) <= TMAX
tex = np.zeros((HT, LT, 3), np.float32)
for j, yf in enumerate(ys):
    yi = int(round(yf)); rr = r_suave[min(yi - y0, len(r_suave) - 1)]
    if not np.isfinite(rr) or rr < 1:
        continue
    th = np.clip(theta, -TMAX, TMAX)
    xf = centro + rr * np.sin(th)
    x0 = np.clip(np.floor(xf).astype(int), 0, W - 2); t = (xf - x0)[:, None]
    yy = min(max(yi, 0), H - 1)
    tex[j] = rgb[yy, x0] * (1 - t) + rgb[yy, x0 + 1] * t

# --- tira a luz "assada" do render: as faixas verticais de brilho/sombra
# são normalizadas pela mediana de cada coluna (força 97%), só na frente
lum = tex.mean(axis=2)
colmed = np.median(lum[int(HT * .12):int(HT * .88)], axis=0)
alvo = np.median(colmed[frente])
ganho = np.clip(alvo / np.maximum(colmed, 1), .55, 1.8)
ganho = 1 + (ganho - 1) * .97
ganho = np.convolve(np.pad(ganho, 8, mode='wrap'), np.ones(9) / 9, mode='same')[8:-8]
ganho[~frente] = 1
tex = tex * ganho[None, :, None]

# --- o verso: cor da lata em cada linha (mediana de uma faixa logo dentro da borda
# do render, dos dois lados), costurada à frente num degradê de 14 graus
borda = (np.abs(theta) > TMAX - np.radians(14)) & (np.abs(theta) <= TMAX - np.radians(4))
cor = np.median(tex[:, borda], axis=1)                     # (HT, 3)
# mediana corrida na vertical: apaga os frisos/reflexos de cada linha sem borrar a
# divisa entre tampa e corpo; depois um alisamento leve
J = 25
pad = np.pad(cor, ((J, J), (0, 0)), mode='edge')
cor = np.stack([np.median(pad[i:i + 2 * J + 1], axis=0) for i in range(HT)])
cor = np.stack([np.convolve(np.pad(cor[:, c], 4, mode='edge'), np.ones(9) / 9, mode='same')[4:-4] for c in range(3)], 1)
costura = np.clip((np.abs(theta) - (TMAX - np.radians(14))) / np.radians(14), 0, 1)
costura = costura * costura * (3 - 2 * costura)
tex = tex * (1 - costura[None, :, None]) + cor[:, None, :] * costura[None, :, None]
tex = np.clip(tex, 0, 255).astype(np.uint8)

subprocess.run(['magick', '-size', f'{LT}x{HT}', '-depth', '8', 'rgb:-', '-quality', '86', saida + '.webp'], input=tex.tobytes(), check=True)

# --- mapa de material (<nome>-mat.webp, como o ORM do glTF: G = aspereza, B = metal)
# tinta prateada (pouca cor, clara) = metal polido; tinta preta = fosca; o resto é
# verniz colorido sobre alumínio (meio metálico). É o que faz o alien e as letras
# prateadas brilharem quando a lata balança, como numa lata de verdade.
f = tex.astype(np.float32) / 255
mx, mn = f.max(axis=2), f.min(axis=2)
sat = np.where(mx > 1e-3, (mx - mn) / np.maximum(mx, 1e-3), 0)
prata = np.clip((.22 - sat) / .12, 0, 1) * np.clip((mx - .42) / .15, 0, 1)
escuro = np.clip((.2 - mx) / .1, 0, 1)
metal = .55 * (1 - prata) * (1 - escuro) + 1.0 * prata + .1 * escuro
aspero = .3 * (1 - prata) * (1 - escuro) + .16 * prata + .42 * escuro
mat = np.stack([np.ones_like(metal), aspero, metal], 2)
mat = (np.clip(mat, 0, 1) * 255).astype(np.uint8)
subprocess.run(['magick', '-size', f'{LT}x{HT}', '-depth', '8', 'rgb:-', '-blur', '0x0.8', '-quality', '90', saida + '-mat.webp'], input=mat.tobytes(), check=True)

# --- perfil normalizado (de baixo para cima), ~120 pontos
n = 120
idx = np.linspace(0, len(r_suave) - 1, n).astype(int)
perfil = []
for i in idx[::-1]:  # de baixo (y1) para cima (y0)
    hh = (y1 - (y0 + i)) / altura
    perfil.append([round(float(r_suave[i] / altura), 5), round(float(hh), 5)])
json.dump({'perfil': perfil, 'proporcao': round(float(np.nanmax(r_suave) * 2 / altura), 4)}, open(saida + '.json', 'w'))
print(saida, 'textura', LT, 'x', HT, 'proporção', round(float(np.nanmax(r_suave) * 2 / altura), 3))
