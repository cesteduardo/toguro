# Toguro · Proposta institucional (GR Brands)

Site institucional das empresas de Tiago Toguro, feito como **proposta conceitual**
para apresentar por e-mail. HTML, CSS e JS puros, sem build. A única dependência
externa é o Three.js (jsDelivr, versão travada em 0.160.0) para o disco voador 3D.

> Enquanto for proposta: `noindex` no `<head>`, `robots.txt` bloqueando tudo e a
> faixa "Proposta conceitual" no topo. Se virar o site oficial, apague os três.

```
index.html     página única
style.css      sistema visual
app.js         entrada em cascata, ilha, texto que se decifra, luz neon do título,
               história que acende, seletor de sabores, catálogo, formulário,
               manifesto e rodapé digitados
ovni.js        disco voador 3D (abertura + hero), em Three.js
luz.js         luz que segue o cursor + inclinação 3D dos cartões (receita do R38tao)
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
- **Hero:** o mesmo disco paira sobre o leque de latas, com o raio verde "abduzindo" as
  latas; inclina na direção do mouse. Só renderiza com o hero na tela.
- **Título com luz neon:** "AO IMPÉRIO." é contorno verde; uma lanterna neon segue o
  mouse e acende as letras por onde passa. Sem mouse, ela passeia sozinha. Qualquer
  tecla solta um pulso que acende o título inteiro.
- **Texto que se decifra:** títulos, nomes das empresas e o formulário entram embaralhados
  em glifos e travam letra por letra (cada letra com largura fixa, nada pula de linha).
- **Cartões em 3D:** inclinam seguindo o cursor (até 8°) com a luz da casa por cima.
- **Seletor de sabores:** a lata gira em 3D ao trocar de sabor, a seção inteira muda de
  cor e a lata inclina com o mouse. Gira sozinho até a pessoa escolher.
- **Fita de campanhas** inclinada em perspectiva, **história** que acende com a rolagem,
  **manifesto** e **rodapé** digitados.
- Com "reduzir movimento": sem abertura, sem 3D, sem decifrar; tudo nasce visível.

## Pendências

- `ENVIO` no `app.js` (seção 8): endereço que recebe o cadastro de distribuidor.
  **Vazio, o formulário valida e confirma, mas não envia nada.** O site de bebidas
  deles usa o WhatsApp 11 99999-4314 para distribuidores.
- Copy da proposta: é texto nosso, a validar com o cliente. Números do hero: 4 empresas
  (CNPJs no nome dele), 20+ bebidas (catálogo oficial de 24/02/2025), 5 sabores de
  energético, 2018 (abertura da Toguro Comércio de Roupas).
- Fotos do Toguro vêm de matérias de imprensa: para o site oficial, pedir as originais.

## Origem das imagens (nenhuma gerada por IA)

| Arquivo | Origem |
|---|---|
| `logo-mansao-branco.webp`, `alien-verde.webp`, favicons | logo oficial (`bebidasmansaomaromba.com.br`, `logo-mansao-maromba.jpg`); o alienígena do favicon é a cabeça recortada do logo, pintada de verde |
| `produtos/lata-*`, `litro-*`, `lata473-*`, `pure-gin` | PDFs vetoriais oficiais das embalagens, no mesmo site (`MANSAO-MAROMBA_LATA-3D_*.pdf` etc.), renderizados com fundo transparente |
| `produtos/cat-*.webp` | páginas do catálogo oficial (`catalogo-mansao-maromba-oficial_compressed_page-*.jpg`) |
| `produtos/combos.webp`, `fita/*` | materiais promocionais do mesmo site |
| `fotos/aqui-tem.webp` | cartaz "Aqui tem" dos materiais promocionais |
| `fotos/polaroids.webp` | `toguro_2-removebg-preview.png` do mesmo site |
| `fotos/toguro-garrafa.webp` | foto de capa da matéria do Diário do Pará sobre o drink "sabor energético" (fev/2026) |
| `fotos/toguro-fortaleza.webp` | foto de capa da matéria da Rede 98 sobre o patrocínio ao Fortaleza (mar/2026) |
| `og.jpg` | captura do próprio hero |

## Testes feitos (19/11/2026)

- Abertura e hero no Chromium (WebGL por SwiftShader), sem erro de JS.
- Sem rolagem horizontal de 320 a 1920 px.
- Formulário: 24 verificações do padrão GR Brands (nome ao digitar e colar, telefone
  com máscara, +55, 55 de país, DDD 55, cada campo vazio, envio completo).

Desenvolvido por GR Brands.
