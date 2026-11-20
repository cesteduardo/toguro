/* ============================================================
   TOGURO · Proposta institucional (GR Brands)
   1) Entrada em cascata          6) Seletor de sabores
   2) Ilha e menu                 7) Catálogo + pop-up
   3) Números que contam          8) Formulário do distribuidor
   4) Fita de campanhas           9) Manifesto digitado
   5) História que acende      10) Rodapé digitado e ano
   ============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ANIM = document.documentElement.classList.contains('anim');
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* 1) Entrada em cascata: cada .cena revela suas peças .a em sequência */
  const cenas = $$('.cena');
  $$('.titulo, .titulo > span, .tl, .marca h3, .marca p, .distribuidor h2, .form h3, .linha__item h3, .bebidas__desc, .meme__texto p, .mansao__texto p, .fundador__texto p').forEach((el) => { el.dataset.decifra = ''; });
  cenas.forEach((c) => $$('.a', c).forEach((el, i) => el.style.setProperty('--i', i)));
  /* o hero só entra quando a abertura do disco voador termina */
  const revela = (c) => {
    if (c.classList.contains('hero') && !window.__aberturaFim) {
      addEventListener('abertura-fim', () => revela(c), { once: true });
      return;
    }
    c.classList.add('visto');
    if (ANIM) $$('[data-decifra]', c).forEach((el, i) => setTimeout(() => decifra(el), 120 + i * 90));
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { revela(e.target); io.unobserve(e.target); }
    }), { threshold: 0.05 });
    cenas.forEach((c) => io.observe(c));
  } else cenas.forEach((c) => c.classList.add('visto'));

  /* 1a) Texto que se decifra (efeito "decrypted text"): cada letra
     passa por glifos aleatórios e trava na certa, da esquerda para a
     direita. Cada letra ganha largura fixa, então nada pula de linha. */
  const MAI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&$@', MIN = 'abcdefghijklmnopqrstuvwxyz', NUM = '0123456789';
  /* glifo aleatório da mesma 'família' da letra: a frase vira lero-lero com cara de texto */
  const glifo = (ch) => { const g = /[0-9]/.test(ch) ? NUM : ch === ch.toLowerCase() && ch !== ch.toUpperCase() ? MIN : MAI; return g[(Math.random() * g.length) | 0]; };
  function decifra(el) {
    if (!ANIM || el.dataset.decifrando) return;
    const nos = [];
    const anda = (n) => n.childNodes.forEach((c) => {
      if (c.nodeType === 3 && c.textContent.trim()) nos.push(c);
      /* filhos que se decifram sozinhos (ex.: a 2ª linha cinza do .titulo) ficam de fora */
      else if (c.nodeType === 1 && c.tagName !== 'BR' && !c.hasAttribute('data-decifra')) anda(c);
    });
    anda(el);
    if (!nos.length) return;
    el.dataset.decifrando = '1';
    const letras = [], minhas = [];
    nos.forEach((no) => {
      const frag = document.createDocumentFragment();
      no.textContent.split(/(\s+)/).forEach((pal) => {
        if (!pal) return;
        if (/^\s+$/.test(pal)) { frag.append(pal); return; }
        const p = document.createElement('span'); p.className = 'dc-pal'; minhas.push(p);
        [...pal].forEach((ch) => { const s = document.createElement('span'); s.className = 'dc'; s.textContent = ch; p.append(s); letras.push({ s, ch }); });
        frag.append(p);
      });
      no.replaceWith(frag);
    });
    letras.forEach((l) => { l.w = l.s.getBoundingClientRect().width; });
    letras.forEach((l) => { l.s.style.width = l.w + 'px'; });
    /* começa já embaralhado: a frase aparece como lero-lero e vai se arrumando */
    letras.forEach((l) => { if (/[A-Za-zÀ-ÿ0-9]/.test(l.ch)) l.s.textContent = glifo(l.ch); });
    const t0 = performance.now(), DUR = Math.min(1900, 420 + letras.length * 34);
    const passo = (agora) => {
      const p = (agora - t0) / DUR;
      letras.forEach((l, i) => {
        const trava = (i / letras.length) * .75 + .25;
        if (p >= trava) { if (l.s.textContent !== l.ch) { l.s.textContent = l.ch; l.s.classList.add('ok'); } }
        else if (Math.random() < .5 && /[A-Za-zÀ-ÿ0-9]/.test(l.ch)) l.s.textContent = glifo(l.ch);
      });
      if (p < 1) requestAnimationFrame(passo);
      else {
        /* devolve o texto puro (melhor para seleção e leitores de tela) */
        /* só as palavras DESTA decifração: a de um filho pode estar no meio */
        minhas.forEach((pal) => pal.replaceWith(pal.textContent));
        el.normalize(); delete el.dataset.decifrando;
      }
    };
    requestAnimationFrame(passo);
  }
  addEventListener('decifra', (e) => decifra(e.detail));

  /* 1b) Luz neon no título do hero: segue o mouse; sem mouse, passeia
     sozinha; cada tecla apertada solta um pulso que acende tudo. */
  const titulo = $('.hero__titulo');
  if (titulo && ANIM) {
    const linhas = $$('.tl', titulo);
    let mx = null, my = null, ultimoMouse = 0, raio = 190, pulso = 0;
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; ultimoMouse = performance.now(); } }, { passive: true });
    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      pulso = 1;
    });
    let lx = innerWidth / 2, ly = 0;
    const loop = (agora) => {
      const r = titulo.getBoundingClientRect();
      if (r.bottom > -50 && r.top < innerHeight + 50) {
        const parado = !mx || agora - ultimoMouse > 2600;
        const t = agora / 1000;
        const ax = parado ? r.left + r.width * (.5 + .46 * Math.sin(t * .9)) : mx;
        const ay = parado ? r.top + r.height * (.5 + .38 * Math.sin(t * 1.7)) : my;
        lx += (ax - lx) * .14; ly += (ay - ly) * .14;
        pulso *= .955;
        raio = 190 + pulso * 900;
        linhas.forEach((l) => {
          const b = l.getBoundingClientRect();
          l.style.setProperty('--lx', (lx - b.left).toFixed(1) + 'px');
          l.style.setProperty('--ly', (ly - b.top).toFixed(1) + 'px');
          l.style.setProperty('--r', raio.toFixed(0) + 'px');
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* 2) Ilha: barra na largura do conteúdo no topo; ao rolar vira pílula
     que abraça marca + links + botão (--ilha medido aqui). */
  const cab = $('#cab'), cabIn = $('#cabIn');
  const links = $$('.cab__nav a');
  const secoes = $$('[data-secao]').filter((s) => s.tagName === 'SECTION');
  const medeIlha = () => {
    const pecas = [$('.cab__marca'), $('.cab__nav'), $('.cab__cta')].filter((el) => el && el.offsetParent);
    const cs = getComputedStyle(cabIn);
    const gap = parseFloat(cs.columnGap) || 30;
    const total = pecas.reduce((s, el) => s + el.getBoundingClientRect().width, 0)
      + gap * (pecas.length - 1) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2;
    cabIn.style.setProperty('--ilha', Math.ceil(total + 24) + 'px');
  };
  const atualiza = () => {
    cab.classList.toggle('preso', scrollY > 60);
    let atual = '';
    secoes.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * .4) atual = s.dataset.secao; });
    links.forEach((a) => a.classList.toggle('atual', a.dataset.secao === atual));
  };
  addEventListener('scroll', atualiza, { passive: true });
  addEventListener('resize', medeIlha);
  document.fonts && document.fonts.ready.then(medeIlha);
  medeIlha(); atualiza();

  const menu = $('#menuM'), burger = $('.cab__burger');
  burger.addEventListener('click', () => { menu.showModal(); burger.setAttribute('aria-expanded', 'true'); });
  menu.addEventListener('close', () => burger.setAttribute('aria-expanded', 'false'));
  $('[data-fechar-menu]').addEventListener('click', () => menu.close());
  menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });
  $$('a', menu).forEach((a) => a.addEventListener('click', () => menu.close()));

  /* 3) Números que contam quando aparecem */
  const fmt = (v, dec) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  $$('[data-conta]').forEach((b) => {
    if (!ANIM) return;
    const alvo = parseFloat(b.dataset.conta), dec = String(b.dataset.conta).includes('.') ? 1 : 0, suf = b.dataset.sufixo || '';
    b.textContent = fmt(0, dec) + suf;
    new IntersectionObserver((es, o) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now(), dur = 1500;
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
        b.textContent = fmt(alvo * k, dec) + suf;
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }), { threshold: .6 }).observe(b);
  });

  /* 4) Anel 3D dos produtos: gira sem fim; arrastar gira com inércia;
     o mouse em cima pausa; setas do teclado avançam uma carta. A carta
     da frente acende (--f = 1), as de trás apagam. */
  const anel = $('#anel'), giro = $('#anelGiro');
  if (anel && giro) {
    const cartas = $$('.anel__carta', giro), N = cartas.length, PASSO = 360 / N;
    let ang = 0, inercia = 0, alvo = null, arrasto = null, pausa = false, visivel = false, ultimo = 0;
    const VEL = ANIM ? -12 : 0; /* graus por segundo */
    const posiciona = () => {
      const w = cartas[0].offsetWidth || 220;
      giro.style.setProperty('--r', Math.round((w / 2) / Math.tan(Math.PI / N) + w * .16) + 'px');
      cartas.forEach((c, i) => c.style.setProperty('--a', (i * PASSO) + 'deg'));
    };
    const pinta = () => {
      giro.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(-7deg) rotateY(${ang.toFixed(2)}deg)`;
      cartas.forEach((c, i) => {
        const rel = ((i * PASSO + ang) % 360 + 360) % 360;
        const f = Math.max(0, Math.cos(rel * Math.PI / 180));
        c.style.setProperty('--f', (f * f).toFixed(3));
      });
    };
    const quadro = (agora) => {
      const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
      if (!arrasto) {
        if (alvo !== null) { ang += (alvo - ang) * .14; if (Math.abs(alvo - ang) < .05) { ang = alvo; alvo = null; } }
        else { ang += (pausa ? 0 : VEL) * dt + inercia * dt; inercia *= .94; }
      }
      pinta();
      if (visivel) requestAnimationFrame(quadro);
    };
    posiciona(); pinta();
    addEventListener('resize', posiciona);
    new IntersectionObserver((es) => es.forEach((e) => {
      const antes = visivel; visivel = e.isIntersecting;
      if (visivel && !antes) { ultimo = performance.now(); requestAnimationFrame(quadro); }
    })).observe(anel);
    anel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pausa = true; });
    anel.addEventListener('pointerleave', () => { pausa = false; });
    anel.addEventListener('pointerdown', (e) => {
      arrasto = { x: e.clientX, ang0: ang, t: performance.now(), ultX: e.clientX }; alvo = null; inercia = 0;
      anel.setPointerCapture(e.pointerId);
    });
    anel.addEventListener('pointermove', (e) => {
      if (!arrasto) return;
      const agora = performance.now(), dx = e.clientX - arrasto.ultX, dtm = Math.max(1, agora - arrasto.t);
      inercia = (dx * .32) / (dtm / 1000);
      arrasto.ultX = e.clientX; arrasto.t = agora;
      ang = arrasto.ang0 + (e.clientX - arrasto.x) * .32;
    });
    const solta = () => { if (!arrasto) return; arrasto = null; inercia = Math.max(-320, Math.min(320, inercia)); };
    anel.addEventListener('pointerup', solta); anel.addEventListener('pointercancel', solta);
    anel.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: 1, ArrowRight: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); inercia = 0;
      alvo = Math.round(((alvo ?? ang) + d * PASSO) / PASSO) * PASSO;
    });
  }

  /* 5) História: o trilho enche até a linha de leitura (55% da tela);
     os anos que ela já passou acendem e o último ganha o fundo lavado */
  const linha = $('#linha'), itens = $$('.linha__item');
  const acende = () => {
    if (!linha) return;
    const leitura = innerHeight * .55, r = linha.getBoundingClientRect();
    const fill = Math.max(0, Math.min(100, (leitura - r.top) / r.height * 100));
    linha.style.setProperty('--fill', fill.toFixed(1) + '%');
    let ultimo = null;
    itens.forEach((li) => {
      const on = li.getBoundingClientRect().top + 30 < leitura;
      li.classList.toggle('aceso', on);
      if (on) ultimo = li;
    });
    itens.forEach((li) => li.classList.toggle('atual', li === ultimo));
  };
  addEventListener('scroll', acende, { passive: true });
  addEventListener('resize', acende);
  acende();

  /* 6) Seletor de sabores do energético: a seção inteira muda de cor.
     Gira sozinho enquanto está na tela, até a pessoa escolher um. */
  const bebidas = $('#bebidas');
  if (bebidas) {
    const botoes = $$('.sabores button', bebidas), nome = $('#saborNome');
    let atual = 0, girando = null, mexeu = false;
    const escolhe = (i, foco) => {
      atual = (i + botoes.length) % botoes.length;
      const b = botoes[atual], s = b.dataset.sabor;
      botoes.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
      $$('.lata, .litro', bebidas).forEach((img) => img.classList.toggle('ativa', img.dataset.sabor === s));
      bebidas.style.setProperty('--sabor', b.dataset.cor);
      window.dispatchEvent(new CustomEvent('sabor', { detail: { sabor: s, cor: b.dataset.cor } }));
      if (nome.textContent !== b.dataset.nome) {
        nome.textContent = b.dataset.nome;
        if (ANIM && nome.animate) nome.animate([{ opacity: 0, transform: 'translateY(18px) skewX(-6deg)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 520, easing: 'cubic-bezier(.22,.8,.24,1)' });
      }
      if (foco) b.focus();
    };
    const para = () => { mexeu = true; clearInterval(girando); girando = null; };
    botoes.forEach((b, i) => {
      b.addEventListener('click', () => { para(); escolhe(i); });
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault(); para(); escolhe(atual + d, true);
      });
    });
    escolhe(0);
    /* a lata inclina em 3D seguindo o mouse sobre a seção */
    const palcoB = $('.bebidas__palco', bebidas);
    if (ANIM) {
      bebidas.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = palcoB.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        $$('.bebidas__latas, .bebidas__litros', bebidas).forEach((el) => { el.style.setProperty('--ty', (nx * 26).toFixed(1) + 'deg'); el.style.setProperty('--tx', (-ny * 14).toFixed(1) + 'deg'); });
      });
      bebidas.addEventListener('pointerleave', () => $$('.bebidas__latas, .bebidas__litros', bebidas).forEach((el) => { el.style.setProperty('--ty', '0deg'); el.style.setProperty('--tx', '0deg'); }));
    }
    if (ANIM && 'IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && !mexeu && !girando) girando = setInterval(() => escolhe(atual + 1), 3200);
        if (!e.isIntersecting && girando) { clearInterval(girando); girando = null; }
      }), { threshold: .45 }).observe(bebidas);
    }
  }

  /* 7) Catálogo: setas que dão a volta e pop-up com setas */
  const car = $('#carrossel');
  if (car) {
    const cartoes = $$('.cartao', car);
    const passo = () => cartoes[0].getBoundingClientRect().width + 16;
    $$('[data-car]').forEach((b) => b.addEventListener('click', () => {
      const d = +b.dataset.car, fim = car.scrollWidth - car.clientWidth - 4;
      if (d > 0 && car.scrollLeft >= fim) car.scrollTo({ left: 0 });
      else if (d < 0 && car.scrollLeft <= 4) car.scrollTo({ left: car.scrollWidth });
      else car.scrollBy({ left: d * passo() });
    }));
    car.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); $('[data-car="1"]').click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); $('[data-car="-1"]').click(); }
    });

    const lupa = $('#lupa'), img = $('#lupaImg'), conta = $('#lupaConta'), leg = $('#lupaLegenda');
    let i = 0;
    const mostra = (n) => {
      i = (n + cartoes.length) % cartoes.length;
      const o = $('img', cartoes[i]);
      img.src = o.currentSrc || o.src; img.alt = o.alt;
      conta.textContent = `${i + 1} / ${cartoes.length}`; leg.textContent = o.alt;
    };
    cartoes.forEach((c, n) => c.addEventListener('click', () => { mostra(n); lupa.showModal(); }));
    $$('[data-lupa]').forEach((b) => b.addEventListener('click', () => mostra(i + +b.dataset.lupa)));
    $('[data-fechar-lupa]').addEventListener('click', () => lupa.close());
    lupa.addEventListener('click', (e) => { if (e.target === lupa) lupa.close(); });
    lupa.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') mostra(i + 1);
      if (e.key === 'ArrowLeft') mostra(i - 1);
    });
    let x0 = null;
    img.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    img.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) mostra(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  }

  /* 8) Formulário do distribuidor (padrão GR Brands de formulários)
     ENVIO: endereço que recebe o cadastro (webhook, Apps Script, CRM).
     Vazio, o formulário valida e confirma, mas não envia nada. */
  const ENVIO = '';
  const form = $('#form');
  if (form) {
    const NOME_OK = /[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g;
    const limpaNome = (v) => v.replace(NOME_OK, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
    /* telefone: DDD + número, sem o 55 do país. Um 55 só sai quando é
       inequívoco (+55 na frente, ou mais de 11 dígitos começando por 55);
       "55999999999" é o DDD 55 e fica. */
    const soTel = (v) => {
      const raw = String(v || '');
      let d = raw.replace(/\D/g, '');
      if (/^\s*\+\s*55/.test(raw) || (d.length > 11 && d.startsWith('55'))) d = d.slice(2);
      return d.slice(0, 11);
    };
    const mascara = (d) => {
      if (d.length <= 2) return d ? '(' + d : '';
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };
    const telOk = (d) => /^[1-9][1-9]\d{8,9}$/.test(d) && (d.length === 10 ? /^[2-5]/.test(d[2]) : d[2] === '9');

    const { nome, telefone, cidade, uf, empresa } = form.elements;
    const textoLivre = (el) => { el.value = el.value.replace(/^\s+/, '').replace(/\s{2,}/g, ' '); };

    /* o caractere inválido não chega a aparecer: filtra ao digitar e ao colar */
    const filtra = (el, fn) => {
      el.addEventListener('beforeinput', (e) => {
        if (!e.data || e.inputType.startsWith('delete')) return;
        /* no nome, o caractere proibido nem chega ao campo (o espaço passa) */
        if (el === nome && /[^A-Za-zÀ-ÖØ-öø-ÿ' -]/.test(e.data)) e.preventDefault();
      });
      el.addEventListener('input', () => {
        const pos = el.selectionStart, antes = el.value.length;
        el.value = fn(el.value);
        const p = Math.max(0, pos - (antes - el.value.length));
        try { el.setSelectionRange(p, p); } catch (_) { /* tel não aceita em alguns navegadores */ }
        el.closest('.campo').classList.remove('erro');
      });
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
        const ini = el.selectionStart ?? el.value.length, fim = el.selectionEnd ?? el.value.length;
        el.value = fn(el.value.slice(0, ini) + txt + el.value.slice(fim));
        el.closest('.campo').classList.remove('erro');
      });
    };
    filtra(nome, limpaNome);
    filtra(telefone, (v) => mascara(soTel(v)));
    telefone.addEventListener('keydown', (e) => {
      if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    });
    [cidade, empresa].forEach((el) => el.addEventListener('input', () => { textoLivre(el); el.closest('.campo').classList.remove('erro'); }));
    uf.addEventListener('change', () => uf.closest('.campo').classList.remove('erro'));

    const nota = $('.form__nota', form), notaOriginal = nota.textContent;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const n = limpaNome(nome.value).trim(), d = soTel(telefone.value);
      const regras = [
        [nome, n.length >= 5 && /\S+\s+\S+/.test(n)],
        [telefone, telOk(d)],
        [cidade, cidade.value.trim().length >= 2],
        [uf, !!uf.value],
        [empresa, empresa.value.trim().length >= 2],
      ];
      regras.forEach(([el, ok]) => el.closest('.campo').classList.toggle('erro', !ok));
      const primeiro = regras.find(([, ok]) => !ok);
      if (primeiro) {
        nota.classList.remove('ok'); nota.textContent = 'Confira os campos destacados.';
        primeiro[0].focus();
        return;
      }
      const dados = { nome: n, telefone: d, cidade: cidade.value.trim(), uf: uf.value, empresa: empresa.value.trim(), origem: 'site-toguro' };
      if (ENVIO) {
        try { await fetch(ENVIO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }); } catch (_) { /* a confirmação não depende da resposta */ }
      }
      nota.classList.add('ok');
      nota.textContent = `Recebido, ${n.split(' ')[0]}! A equipe comercial chama você no WhatsApp.`;
      form.reset();
      setTimeout(() => { nota.classList.remove('ok'); nota.textContent = notaOriginal; }, 9000);
    });
  }

  /* 9) Manifesto: digitado quando entra na tela, uma vez só */
  const dig = $('.manifesto__digita');
  if (dig && ANIM && 'IntersectionObserver' in window) {
    const PARTES = [['Marca forte, sim: se constrói ', false], ['todo dia', true], ['.', false]];
    const cursor = document.createElement('i');
    cursor.className = 'manifesto__cursor';
    dig.append(cursor);
    const digita = async () => {
      for (const [txt, destaque] of PARTES) {
        const alvo = destaque ? document.createElement('em') : document.createTextNode('');
        dig.insertBefore(alvo, cursor);
        for (const ch of txt) { alvo.textContent += ch; await espera(ch === ' ' ? 30 : 42 + Math.random() * 34); }
      }
    };
    new IntersectionObserver((es, o) => es.forEach((e) => {
      if (e.isIntersecting) { o.disconnect(); setTimeout(digita, 300); }
    }), { threshold: .6 }).observe(dig.parentElement);
  }

  /* 10) Rodapé: "Toguro." ↔ "Mansão Maromba." na máquina de escrever.
     Só roda com o rodapé na tela; o ponto final fica sempre magenta. */
  const dt = $('.digita__texto');
  if (dt && ANIM && 'IntersectionObserver' in window) {
    const pinta = (t) => {
      dt.textContent = '';
      if (t.endsWith('.')) { dt.append(t.slice(0, -1)); const em = document.createElement('em'); em.textContent = '.'; dt.append(em); }
      else dt.textContent = t;
    };
    const ate = async (de, para, vel) => {
      let t = de, k = 0;
      while (k < de.length && k < para.length && de[k] === para[k]) k++;
      while (t.length > k) { t = t.slice(0, -1); pinta(t); await espera(vel * .55); }
      while (t.length < para.length) { t = para.slice(0, t.length + 1); pinta(t); await espera(vel + Math.random() * 40); }
      return t;
    };
    let rodando = false, visivel = false;
    const ciclo = async () => {
      if (rodando) return;
      rodando = true;
      let t = 'Toguro.';
      while (visivel) {
        await espera(2000); if (!visivel) break;
        t = await ate(t, 'Mansão Maromba.', 80);
        await espera(2200);
        t = await ate(t, 'Toguro.', 80);
      }
      pinta('Toguro.');
      rodando = false;
    };
    new IntersectionObserver((es) => es.forEach((e) => { visivel = e.isIntersecting; if (visivel) ciclo(); })).observe(dt);
  }

  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();
})();
