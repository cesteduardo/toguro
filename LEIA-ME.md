# Toguro · Proposta institucional (GR Brands)

Site institucional das empresas de Tiago Toguro, feito como **proposta conceitual**
para apresentar por e-mail. HTML, CSS e JS puros, sem build. O Three.js 0.160.0 (licença MIT,
`vendor/LICENSE-three.txt`) fica **hospedado no próprio site** (`vendor/`): nenhum
bloqueador de anúncio derruba o 3D, como acontecia com o CDN.

> Enquanto for proposta: `noindex` no `<head>`, `robots.txt` bloqueando tudo e a
> faixa "Proposta conceitual" no topo. Se virar o site oficial, apague os três.

```
index.html     página única
style.css      sistema visual
app.js         entrada em cascata, ilha, luz neon do título, vitrine que anda com a
               rolagem, cartões das empresas empilhados, história que acende,
               seletor de sabores, catálogo, formulário, manifesto e rodapé digitados
ovni.js        cena 3D: disco voador (abertura + hero), lata (com tampa e lacre) e
               garrafa 3D com o rótulo oficial (hero e seletor de sabores)
vendor/        Three.js e o RoomEnvironment (reflexos)
luz.js         luz que segue o cursor + inclinação 3D dos cartões (receita do R38tao)
_fonte/        desenrola.py (rótulos) e icones.html (ícones 3D das empresas)
assets/        imagens (ver "Origem das imagens"), favicon e og.jpg
robots.txt     bloqueia buscadores enquanto for proposta
```

## Direção

- **Foco nas empresas**, não no influenciador: Mansão Maromba (conteúdo e publicidade),
  Bebidas Mansão Maromba, Mansão Maromba Produções e Toguro Vestuário. O Toguro aparece
  só no bloco curto "O fundador".
- **Alienígena e Tron:** preto, verde neon `#8CFF2E` como cor principal, menta `#00FFA3`
  e ciano de apoio. As cores das latas (magenta, limão, amarelo, vermelho, prata) só
  aparecem no seletor de sabores.
- **Fontes:** Audiowide nos destaques (a mais "Tron" que lê bem e mostra os acentos;
  a Orbitron troca "Ã" por "À") e Inter no texto. O crédito GR Brands fica em Inter.

## Efeitos

- **Abertura (ovni.js):** o disco cruza um túnel de estrelas, para, acende o raio trator,
  o nome "Toguro." se decifra dentro do raio e o disco sobe. Cerca de 4 s, uma vez por
  sessão (`sessionStorage 'ovni-visto'`), com botão "Pular abertura" e Esc/Enter/Espaço.
  A capa preta (`html.abrindo`) segura a página só enquanto o Three.js chega: se não
  chegar em 2,5 s, a página abre sem abertura. Não espera `window.load`.
- **Hero (centralizado):** "Da Mansão ao império." no alto e, logo abaixo do texto, o
  disco puxando pelo raio uma **lata 3D** (Original); uma **garrafa** (Maçã Verde) e outra
  lata (Melancia) flutuam dos lados. Tudo inclina com o mouse. Só renderiza na tela.
- **Lata e garrafa em 3D de verdade:** malha torneada em 160 lados a partir da
  **silhueta das embalagens oficiais** (`assets/3d/lata.json`, `litro.json`) e o rótulo
  oficial **desenrolado** por cima como textura (`assets/3d/<lata|litro>-<sabor>.webp`).
  O rótulo vem dos renders frontais oficiais: cada coluna do render é levada ao seu
  ângulo no cilindro (±72°); a luz que vinha "assada" no render foi neutralizada.
  **Não existe render oficial do verso** (nem no site, nem no catálogo, nem nos
  materiais promocionais), então o resto da volta é a cor da própria lata, linha a
  linha, e as embalagens **só balançam mostrando a frente**: nunca viram de costas.
  Quando o cliente mandar o verso, é só passar a segunda imagem no `desenrola.py`.
- **Tampa da lata:** borda enrolada na malha, tampa de alumínio com friso, abertura
  marcada e rebite, e o lacre em 3D. As latas ficam inclinadas para a tampa aparecer.
- **Luz:** estúdio de produto próprio (`estudio()` no ovni.js): sala escura com
  softboxes grandes (teto, chave à esquerda, tira vertical à direita e tiras verde e
  menta atrás), que dão os reflexos longos de foto de lata; o disco reflete uma versão
  clara da sala para o cromo não ficar preto. O raio trator desenha só a parede de trás
  do cone, então brilha atrás da lata sem lavar o rótulo. Rótulos em 2048 px. No
  seletor, sombra de contato macia sob cada peça. Os modelos abertos que achei (Poly Haven,
  Poly Pizza) eram lata de conserva ou low-poly de 16 lados e proporção errada, por isso
  a malha saiu da silhueta da embalagem real. Script: `_fonte/desenrola.py`
  (entrada: render + máscara extraídos do PDF oficial com `pdfimages -j`).
- **Seletor de sabores:** a lata e a garrafa do sabor escolhido em 3D; ao trocar, viram
  de lado, trocam o rótulo e voltam de frente, e o brilho do chão muda de cor.
- **Vitrine de produtos** (logo abaixo do hero): fotos oficiais numa fileira que anda
  do primeiro ao último produto enquanto a seção cruza a tela, e para no fim (não é
  infinita). Com "reduzir movimento", vira rolagem lateral comum.
- **Cartões das empresas:** grandes, com ícone 3D estilo Apple (alien, raio, microfone,
  camiseta com o alien oficial), fatos de cada empresa e o empilhamento do warbox.tv:
  cada cartão gruda no topo, o próximo sobe por cima e o de baixo encolhe e escurece.
  No celular, lista comum. Os ícones são modelados em `_fonte/icones.html` e
  renderizados uma vez na GPU para `assets/icones/*.webp`.
- **Título com luz neon:** "AO IMPÉRIO." é contorno verde; uma lanterna neon segue o
  mouse e acende as letras por onde passa. Sem mouse, ela passeia sozinha. Qualquer
  tecla solta um pulso que acende o título inteiro.
- **Números e redes:** inclinam seguindo o cursor (até 8°) com a luz da casa por cima.
- **Seletor de sabores:** a seção inteira muda de cor e a lata inclina com o mouse.
  Troca de sabor sozinho até a pessoa escolher.
- **História** que acende com a rolagem, **manifesto** e **rodapé** digitados.
- **Piadas do shape:** "Tem shape que não se explica." no manifesto e "O shape continua
  sem explicação. O resto virou CNPJ." no fundador.
- **Distribuidor:** o bloco inteiro é um vidro escuro translúcido com contorno verde
  brilhante (o preto chapado ficou pesado).
- Com "reduzir movimento": sem abertura; o 3D continua. Sem WebGL, o
  hero e o seletor mostram as imagens oficiais das latas no lugar.

## Pendências

- `ENVIO` no `app.js` (seção 8): endereço que recebe o cadastro de distribuidor.
  **Vazio, o formulário valida e confirma, mas não envia nada.** O site de bebidas
  deles usa o WhatsApp 11 99999-4314 para distribuidores.
- Copy da proposta: é texto nosso, a validar com o cliente. Números do hero: 4 empresas
  (CNPJs no nome dele), 20+ bebidas (catálogo oficial de 24/02/2025), 5 sabores de
  energético, 2018 (abertura da Toguro Comércio de Roupas).
- Verso das latas e garrafas: pedir o arquivo ao cliente (ver "Lata e garrafa").

## Origem das imagens (nenhuma gerada por IA)

| Arquivo | Origem |
|---|---|
| `logo-mansao-branco.webp`, `alien-verde.webp`, favicons | logo oficial (`bebidasmansaomaromba.com.br`, `logo-mansao-maromba.jpg`); o alienígena do favicon é a cabeça recortada do logo, pintada de verde |
| `produtos/lata-*`, `litro-*`, `lata473-*`, `pure-gin` | PDFs vetoriais oficiais das embalagens, no mesmo site (`MANSAO-MAROMBA_LATA-3D_*.pdf` etc.), renderizados com fundo transparente |
| `produtos/cat-*.webp` | páginas do catálogo oficial (`catalogo-mansao-maromba-oficial_compressed_page-*.jpg`) |
| `produtos/combos.webp` | materiais promocionais do mesmo site |
| `3d/*.webp` (rótulos) e `3d/*.json` (silhuetas) | renders oficiais em alta dos PDFs `MANSAO-MAROMBA_LATA-3D_*` e `ENERGY-DRINK-_1-LITRO_*` do mesmo site, desenrolados |
| `anel/*.webp` | fotos oficiais dos produtos nos materiais promocionais (`whisky.jpg`, `vodka.jpg`, `maca-verde.jpg` etc.) |
| `fotos/mansao-predio.webp` | miniatura oficial do canal Mansão Maromba no YouTube (vídeo `mZ17stIQwdw`), recortada sem o texto |
| `fotos/colors-berry-arte.webp` | arte oficial do Whisky Colors Berry (`colors-berry-arte.jpg`, materiais promocionais) |
| `fotos/aqui-tem.webp` | cartaz "Aqui tem" dos materiais promocionais |
| `fotos/toguro-oficial.webp` | foto do Toguro no site oficial da Bebidas Mansão Maromba (`2023/07/toguro.png`, já sem fundo). O arquivo deles vem cortado no quadril e no braço esquerdo: por isso a foto encosta no canto de baixo à direita do cartão do fundador, onde o corte some na borda |
| `icones/*.webp` | ícones 3D modelados em `_fonte/icones.html`; a estampa da camiseta é o `alien-verde.webp` |
| `og.jpg` | captura do próprio hero |

## Testes feitos (21/11/2026)

- Abertura, hero 3D, vitrine, cartões empilhados e seletor 3D no Chromium com a **GPU
  NVIDIA (Vulkan)**, sem erro de JS, no desktop (1440) e no celular (390).
- Sem rolagem horizontal de 320 a 1920 px.
- Formulário: 24 verificações do padrão GR Brands (nome ao digitar e colar, telefone
  com máscara, +55, 55 de país, DDD 55, cada campo vazio, envio completo).

Desenvolvido por GR Brands.
