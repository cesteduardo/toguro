/* ============================================================
   TOGURO · Luz no hover (a mesma receita do R38tao)
   Cada alvo ganha um <span class="luz">: um brilho suave que segue
   o cursor e um contorno que acende só perto dele. O desenho está
   no style.css (bloco "LUZ NO HOVER"). Sem mouse, nada aparece.
   ============================================================ */
(() => {
  'use strict';
  // [seletor, variante]: '' = brilho e contorno; 'clara' = botão magenta (luz branca)
  const ALVOS = [
    ['.marca, .rede, .numeros li, .sabores button, .seta, .rodape__redes a, .menu-m__links a:not(.menu-m__cta), .cab__burger', ''],
    ['.btn--verde, .menu-m__cta', 'clara'],
  ];

  const acender = () => {
    ALVOS.forEach(([sel, tipo]) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.querySelector(':scope > .luz')) return;
        const cs = getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';
        el.classList.add('tem-luz');
        const luz = document.createElement('span');
        luz.className = tipo ? `luz luz--${tipo}` : 'luz';
        luz.setAttribute('aria-hidden', 'true');
        const bw = parseFloat(cs.borderTopWidth) || 0;
        if (bw) luz.style.inset = `-${bw}px`;
        el.prepend(luz);
      });
    });
  };

  const mover = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    let el = e.target.closest && e.target.closest('.tem-luz');
    while (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el = el.parentElement && el.parentElement.closest('.tem-luz');
    }
  };

  /* inclinação 3D com reflexo (estilo "interactive tilt card"):
     o cartão gira até INCLINA graus na direção do cursor e volta macio */
  /* os cartões das empresas não inclinam: eles se empilham na rolagem (app.js) */
  const INCLINA = ['.numeros li', '.rede', '.cartao', '.fundador'];
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!calmo && fino) {
    document.querySelectorAll(INCLINA.join(',')).forEach((el) => {
      el.classList.add('inclina');
      const max = el.matches('.fundador, .cartao') ? 4 : 8;
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        el.classList.add('movendo');
        el.style.setProperty('--ry', (nx * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-ny * max * 2).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('movendo');
        el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg');
      });
    });
  }

  acender();
  window.addEventListener('load', acender);
  document.addEventListener('pointerover', mover, { passive: true });
  document.addEventListener('pointermove', mover, { passive: true });
})();
