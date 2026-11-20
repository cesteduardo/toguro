/* ============================================================
   TOGURO · Cena 3D (Three.js, hospedado em vendor/)
   - Disco voador: casco cromado, cúpula de vidro com o alienígena do
     logo, luzes que correm, raio trator e partículas.
   - Lata e garrafa em 3D DE VERDADE: malha torneada (160 lados) a
     partir da silhueta da embalagem oficial, com o rótulo oficial
     desenrolado por cima (assets/3d/*.webp, perfis em *.json).
   1) Abertura: o disco cruza o céu e "abduz" o nome. Uma vez por sessão.
   2) Hero: o disco paira e puxa uma lata girando no raio; uma garrafa
      e outra lata flutuam na frente. Tudo inclina com o mouse.
   3) Seletor de sabores: a lata e a garrafa do sabor escolhido giram.
   Sem WebGL: a página fica com as imagens comuns (nada quebra).
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const html = document.documentElement;
const REDUZ = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VERDE = 0x8cff2e, MENTA = 0x00ffa3;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, k) => a + (b - a) * k;

const avisaFim = () => {
  html.classList.remove('abrindo');
  window.__aberturaFim = true;
  window.dispatchEvent(new Event('abertura-fim'));
};
const temWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; }
})();

/* ---------- texturas e perfis ---------- */
function texturaBrilho() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const carregador = new THREE.TextureLoader();
const cacheTex = new Map();
const textura = (url) => {
  if (!cacheTex.has(url)) {
    cacheTex.set(url, new Promise((ok) => carregador.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; ok(t); }, undefined, () => ok(null))));
  }
  return cacheTex.get(url);
};
const cachePerfil = new Map();
const perfil = (tipo) => {
  if (!cachePerfil.has(tipo)) cachePerfil.set(tipo, fetch(`assets/3d/${tipo}.json`).then((r) => r.json()));
  return cachePerfil.get(tipo);
};
const cacheGeo = new Map();
async function geometria(tipo) {
  if (!cacheGeo.has(tipo)) {
    cacheGeo.set(tipo, perfil(tipo).then((p) => {
      const pts = [new THREE.Vector2(0, 0)];
      p.perfil.forEach(([r, h]) => pts.push(new THREE.Vector2(r, h)));
      pts.push(new THREE.Vector2(0, 1));
      const g = new THREE.LatheGeometry(pts, 160);
      g.translate(0, -.5, 0);
      g.computeVertexNormals();
      return g;
    }));
  }
  return cacheGeo.get(tipo);
}

/* ---------- embalagem 3D (lata ou litro) com o rótulo oficial ---------- */
async function criaEmbalagem(tipo, sabor) {
  const [geo, tex] = await Promise.all([geometria(tipo), textura(`assets/3d/${tipo}-${sabor}.webp`)]);
  const mat = tipo === 'lata'
    ? new THREE.MeshPhysicalMaterial({ map: tex, metalness: .25, roughness: .24, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: 1.0 })
    : new THREE.MeshPhysicalMaterial({ map: tex, metalness: .02, roughness: .2, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .9 });
  /* o rótulo tem luz própria: continua vivo dentro do raio verde e na sombra */
  mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = tex; mat.emissiveIntensity = tipo === 'lata' ? .42 : .34;
  const malha = new THREE.Mesh(geo, mat);
  malha.rotation.y = -Math.PI / 2; /* a frente do rótulo olhando para a câmera */
  const g = new THREE.Group(); g.add(malha);
  g.userData = { malha, tipo, sabor,
    async troca(novo) {
      if (novo === g.userData.sabor) return;
      const t = await textura(`assets/3d/${tipo}-${novo}.webp`);
      if (t) { mat.map = t; mat.emissiveMap = t; mat.needsUpdate = true; g.userData.sabor = novo; }
    },
  };
  return g;
}

/* ---------- o disco ---------- */
function criaOvni(brilho, alien) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xd6e0da, metalness: 1, roughness: .17, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.25 });
  const perfilDisco = [[0, -.30], [.35, -.30], [.8, -.245], [1.25, -.15], [1.62, -.035], [1.75, .03], [1.66, .095], [1.3, .175], [.9, .245], [.62, .285], [0, .30]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  corpo.add(new THREE.Mesh(new THREE.LatheGeometry(perfilDisco, 128), metal));
  const faixa = new THREE.Mesh(new THREE.TorusGeometry(1.71, .045, 16, 180),
    new THREE.MeshStandardMaterial({ color: 0x0a1a0d, metalness: .6, roughness: .35, emissive: 0x1d6b12, emissiveIntensity: .7 }));
  faixa.rotation.x = Math.PI / 2; faixa.position.y = .03; corpo.add(faixa);
  const motor = new THREE.Mesh(new THREE.TorusGeometry(.6, .04, 12, 96), new THREE.MeshBasicMaterial({ color: VERDE }));
  motor.rotation.x = Math.PI / 2; motor.position.y = -.3; corpo.add(motor);
  const miolo = new THREE.Mesh(new THREE.CircleGeometry(.56, 64), new THREE.MeshBasicMaterial({ color: 0x2c7a14 }));
  miolo.rotation.x = Math.PI / 2; miolo.position.y = -.302; corpo.add(miolo);

  const luzes = [], N = 22, geoL = new THREE.SphereGeometry(.058, 16, 12);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, mat = new THREE.MeshBasicMaterial({ color: VERDE });
    const l = new THREE.Mesh(geoL, mat); l.position.set(Math.cos(a) * 1.47, .12, Math.sin(a) * 1.47);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: i % 2 ? MENTA : VERDE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(.5); l.add(s); corpo.add(l);
    luzes.push({ mat, s, i, base: new THREE.Color(i % 2 ? MENTA : VERDE) });
  }
  if (alien) {
    const piloto = new THREE.Sprite(new THREE.SpriteMaterial({ map: alien, transparent: true, depthWrite: false }));
    piloto.scale.set(.44, .52, 1); piloto.position.y = .56; piloto.renderOrder = 1; g.add(piloto);
  }
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(.64, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xbfffd6, metalness: 0, roughness: .02, transparent: true, opacity: .26, clearcoat: 1, envMapIntensity: 1.8, emissive: 0x2aff6a, emissiveIntensity: .1, depthWrite: false }));
  cupula.position.y = .29; cupula.renderOrder = 2; g.add(cupula);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(.64, .028, 12, 96), metal); aro.rotation.x = Math.PI / 2; aro.position.y = .29; g.add(aro);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: VERDE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .85 }));
  halo.scale.set(2.8, 1.1, 1); halo.position.y = -.38; g.add(halo);

  const geoF = new THREE.CylinderGeometry(.56, 2.0, 1, 96, 1, true); geoF.translate(0, -.5, 0);
  const matF = new THREE.ShaderMaterial({
    uniforms: { uTempo: { value: 0 }, uForca: { value: 0 }, uCor: { value: new THREE.Color(VERDE) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTempo, uForca; uniform vec3 uCor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float topo = pow(vUv.y, 1.3);
        float borda = pow(1.0 - abs(dot(vN, vV)), 1.6) * .85 + .22;
        float aneis = .62 + .38 * sin(vUv.y * 44.0 + uTempo * 7.0);
        float pe = smoothstep(0.0, .18, vUv.y);
        gl_FragColor = vec4(uCor * 1.2, topo * borda * aneis * pe * uForca * .46);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const feixe = new THREE.Mesh(geoF, matF); feixe.position.y = -.3; feixe.renderOrder = 5; g.add(feixe);

  const NP = 170, pos = new Float32Array(NP * 3), vel = new Float32Array(NP);
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const matP = new THREE.PointsMaterial({ map: brilho, color: 0xd4ff8a, size: .1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geoP, matP); pts.position.y = -.3; pts.frustumCulled = false; g.add(pts);
  let L = 3;
  const solta = (i, qualquer) => {
    const y = qualquer ? -Math.random() * L : -L;
    const raio = (.5 + 1.4 * (-y / L)) * Math.sqrt(Math.random()) * .9, ang = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(ang) * raio; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(ang) * raio;
    vel[i] = .5 + Math.random() * 1.1;
  };
  for (let i = 0; i < NP; i++) solta(i, true);

  return {
    g,
    feixe(comprimento, forca) {
      L = Math.max(.01, comprimento); feixe.scale.y = L; feixe.visible = forca > .002;
      matF.uniforms.uForca.value = forca; matP.opacity = forca * .9; pts.visible = forca > .002;
    },
    tick(t, dt) {
      corpo.rotation.y = t * .55;
      luzes.forEach(({ mat, s, i, base }) => {
        const k = .5 + .5 * Math.sin(i * .9 - t * 7);
        mat.color.copy(base).multiplyScalar(.35 + k * 1.1); s.material.opacity = .25 + .75 * k;
      });
      matF.uniforms.uTempo.value = t;
      halo.material.opacity = .65 + .2 * Math.sin(t * 3.1);
      if (pts.visible) {
        for (let i = 0; i < NP; i++) { pos[i * 3 + 1] += vel[i] * dt * (L / 3); if (pos[i * 3 + 1] > -.05) solta(i, false); }
        geoP.attributes.position.needsUpdate = true;
      }
    },
  };
}

/* ---------- palco: renderizador + cena + câmera ---------- */
function criaPalco(canvas, fov = 30) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  const cena = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  cena.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const cam = new THREE.PerspectiveCamera(fov, 1, .1, 400); cam.position.set(0, 0, 12);
  const chave = new THREE.DirectionalLight(0xffffff, 1.4); chave.position.set(4, 6, 8); cena.add(chave);
  const verdeBaixo = new THREE.PointLight(VERDE, 40, 14); verdeBaixo.position.set(0, -1, 3); cena.add(verdeBaixo);
  const menta = new THREE.DirectionalLight(MENTA, 1.1); menta.position.set(-7, 1, -2); cena.add(menta);
  const vis = { w: 1, h: 1 };
  const medir = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    vis.h = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z; vis.w = vis.h * cam.aspect;
  };
  medir();
  return { r, cena, cam, vis, medir };
}
/* deixa o rótulo com a cor viva (sem o tone mapping que lava o magenta) */
const vivo = (obj) => obj.traverse((o) => { if (o.material) o.material.toneMapped = false; });

const mouse = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

/* loop que só roda com o canvas na tela e a aba visível */
function laco(alvo, quadro) {
  let visivel = true, pedido = null, t0 = null, ant = 0;
  const passo = (agora) => {
    pedido = null;
    if (!visivel || document.hidden) return;
    if (t0 === null) { t0 = agora; ant = agora; }
    quadro((agora - t0) / 1000, Math.min(.05, (agora - ant) / 1000)); ant = agora;
    pedido = requestAnimationFrame(passo);
  };
  const liga = () => { if (!pedido && visivel && !document.hidden) pedido = requestAnimationFrame(passo); };
  new IntersectionObserver((es) => es.forEach((e) => { visivel = e.isIntersecting; liga(); }), { rootMargin: '120px' }).observe(alvo);
  document.addEventListener('visibilitychange', liga);
  liga();
}

/* ============================================================
   1) ABERTURA
   ============================================================ */
function abertura(alien, brilho) {
  return new Promise((pronto) => {
    window.__ovni = true;
    const capa = document.createElement('div');
    capa.className = 'abertura';
    capa.innerHTML = '<canvas aria-hidden="true"></canvas><p class="abertura__nome" aria-hidden="true">Toguro<em>.</em></p><p class="abertura__sub" aria-hidden="true">Empresas e marcas</p><button type="button" class="abertura__pular">Pular abertura</button>';
    document.body.append(capa);
    html.classList.remove('abrindo');
    const p = criaPalco(capa.querySelector('canvas'), 32);
    const ovni = criaOvni(brilho, alien); p.cena.add(ovni.g);

    const NE = 1400, pe = new Float32Array(NE * 3);
    for (let i = 0; i < NE; i++) { pe[i * 3] = (Math.random() - .5) * 90; pe[i * 3 + 1] = (Math.random() - .5) * 60; pe[i * 3 + 2] = -Math.random() * 160; }
    const geoE = new THREE.BufferGeometry(); geoE.setAttribute('position', new THREE.BufferAttribute(pe, 3));
    p.cena.add(new THREE.Points(geoE, new THREE.PointsMaterial({ map: brilho, color: 0xdfffe8, size: .32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    const nome = capa.querySelector('.abertura__nome'), sub = capa.querySelector('.abertura__sub');
    const DUR = 3.9;
    let t0 = performance.now(), ant = t0, acabou = false, pedido;
    const fecha = (rapido) => {
      if (acabou) return; acabou = true;
      try { sessionStorage.setItem('ovni-visto', '1'); } catch (_) { /* aba anônima */ }
      capa.classList.add('saindo'); avisaFim();
      setTimeout(() => { cancelAnimationFrame(pedido); p.r.dispose(); capa.remove(); pronto(); }, rapido ? 380 : 750);
    };
    capa.querySelector('.abertura__pular').addEventListener('click', () => fecha(true));
    addEventListener('keydown', function k(e) { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', k); fecha(true); } });
    addEventListener('resize', p.medir);

    const quadro = (agora) => {
      const t = (agora - t0) / 1000, dt = Math.min(.05, (agora - ant) / 1000); ant = agora;
      const { w, h } = p.vis;
      const vel = lerp(140, 6, easeOut(clamp01(t / 1.8)));
      for (let i = 0; i < NE; i++) { pe[i * 3 + 2] += vel * dt; if (pe[i * 3 + 2] > 10) pe[i * 3 + 2] -= 170; }
      geoE.attributes.position.needsUpdate = true;
      const s = Math.min(1.25, (w * .5) / 3.5), o = ovni.g, alvoY = h * .2;
      if (t < 1.8) {
        const k = easeOut(clamp01(t / 1.8));
        o.position.set(lerp(w * .9, 0, k), lerp(h * .55, alvoY, k) + Math.sin(k * Math.PI) * .6, lerp(-60, 0, k));
        o.rotation.z = lerp(.5, 0, k); o.rotation.x = lerp(.35, .12, k);
      } else if (t < 3.05) {
        o.position.set(Math.sin(t * 2) * .05, alvoY + Math.sin(t * 2.4) * .07, 0);
        o.rotation.z = lerp(o.rotation.z, -mouse.x * .2, .06); o.rotation.x = .12;
      } else {
        const k = easeIn(clamp01((t - 3.05) / .8));
        o.position.y = alvoY + k * h * 1.1; o.position.z = k * 3; o.rotation.x = .12 - k * .3;
      }
      o.scale.setScalar(s);
      const forca = t < 1.75 ? 0 : t < 2.15 ? easeOut((t - 1.75) / .4) : t < 2.95 ? 1 : 1 - clamp01((t - 2.95) / .25);
      ovni.feixe((o.position.y - .3 * s + h * .32) / s, forca);
      ovni.tick(t, dt);
      if (t > 1.95 && !nome.classList.contains('on')) { nome.classList.add('on'); sub.classList.add('on'); window.dispatchEvent(new CustomEvent('decifra', { detail: nome })); }
      p.r.render(p.cena, p.cam);
      if (t >= DUR) fecha(false);
      if (!acabou || t < DUR + 1) pedido = requestAnimationFrame(quadro);
    };
    pedido = requestAnimationFrame(quadro);
    setTimeout(() => fecha(true), 9000);
  });
}

/* ============================================================
   2) HERO: disco + lata abduzida + garrafa e lata flutuando
   ============================================================ */
async function hero(alien, brilho, veioDaAbertura) {
  const canvas = document.getElementById('ovniHero'), palco = document.getElementById('palco');
  if (!canvas || !palco) return;
  const p = criaPalco(canvas, 30);
  const ovni = criaOvni(brilho, alien); p.cena.add(ovni.g);
  const [latA, litro, latB] = await Promise.all([criaEmbalagem('lata', 'original'), criaEmbalagem('litro', 'maca-verde'), criaEmbalagem('lata', 'melancia')]);
  [latA, litro, latB].forEach((o) => { vivo(o); p.cena.add(o); });
  palco.classList.add('com-3d');
  new ResizeObserver(() => p.medir()).observe(canvas);
  const sm = { z: 0, x: .1, px: 0, gy: 0, gx: 0 };
  laco(palco, (t, dt) => {
    const { w, h } = p.vis;
    const estreito = w < h * .9;
    /* tamanho de cada peça em função da altura visível */
    const s = Math.min(1.05, (w * (estreito ? .58 : .5)) / 3.5);
    const alvoY = h / 2 - h * .17;
    const chegada = easeOut(clamp01(t / (veioDaAbertura ? 1.2 : 1.5)));
    sm.z = lerp(sm.z, -mouse.x * .2, .05); sm.x = lerp(sm.x, .1 + mouse.y * .07, .05);
    sm.px = lerp(sm.px, mouse.x * w * .02, .04);
    sm.gy = lerp(sm.gy, mouse.x * .35, .05); sm.gx = lerp(sm.gx, mouse.y * .12, .05);
    const o = ovni.g;
    o.position.set(sm.px, lerp(alvoY + h * .8, alvoY, chegada) + Math.sin(t * 1.6) * .07, 0);
    o.rotation.z = sm.z + (1 - chegada) * .3; o.rotation.x = sm.x; o.scale.setScalar(s);
    const forca = easeInOut(clamp01((t - (veioDaAbertura ? .9 : 1.1)) / .6)) * (.88 + .12 * Math.sin(t * 2.3));
    ovni.feixe((o.position.y - .3 * s + h * .46) / s, forca);
    ovni.tick(t, dt);

    /* lata abduzida: sobe devagar girando dentro do raio */
    const Ha = h * (estreito ? .34 : .4);
    const sobe = easeOut(clamp01((t - 1.1) / 1.4));
    latA.scale.setScalar(Ha);
    latA.position.set(sm.px * .6, lerp(-h * .55, -h * .07, sobe) + Math.sin(t * 1.3) * .1, .2);
    latA.rotation.set(sm.gx + .06 * Math.sin(t * .9), t * .9, .1 * Math.sin(t * .7));
    /* garrafa e lata da frente: flutuam, giram devagar e seguem o mouse */
    const entra = easeOut(clamp01((t - .4) / 1.2));
    litro.scale.setScalar(h * (estreito ? .36 : .42));
    litro.position.set(-w * (estreito ? .3 : .31), lerp(-h, -h * .2, entra) + Math.sin(t * 1.1 + 1) * .12, 1.4);
    litro.rotation.set(sm.gx, -.5 + t * .35 + sm.gy, .2);
    latB.scale.setScalar(h * (estreito ? .27 : .3));
    latB.position.set(w * (estreito ? .3 : .31), lerp(-h, -h * .26, entra) + Math.sin(t * 1.2 + 2) * .12, 1.8);
    latB.rotation.set(sm.gx - .05, .6 - t * .45 + sm.gy, -.24);
    p.r.render(p.cena, p.cam);
  });
}

/* ============================================================
   3) SELETOR DE SABORES: lata + garrafa do sabor escolhido
   ============================================================ */
async function seletor() {
  const sec = document.getElementById('bebidas'), canvas = document.getElementById('sabor3d');
  if (!sec || !canvas) return;
  const p = criaPalco(canvas, 28);
  p.cam.position.set(0, .3, 12);
  const [lata, litro] = await Promise.all([criaEmbalagem('lata', 'original'), criaEmbalagem('litro', 'original')]);
  [lata, litro].forEach((o) => { vivo(o); p.cena.add(o); });
  /* chão de luz na cor do sabor */
  const cor = new THREE.Color('#FF1F8E');
  const chao = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  chao.rotation.x = -Math.PI / 2; p.cena.add(chao);
  const luzCor = new THREE.PointLight(cor, 30, 12); luzCor.position.set(-2, -1, 3); p.cena.add(luzCor);
  sec.classList.add('com-3d');
  new ResizeObserver(() => p.medir()).observe(canvas);
  let giro = 0, alvoCor = cor.clone();
  window.addEventListener('sabor', async (e) => {
    const { sabor, cor: c } = e.detail;
    alvoCor.set(c);
    giro = 1; /* dá um giro completo enquanto troca o rótulo */
    setTimeout(() => { lata.userData.troca(sabor); litro.userData.troca(sabor); }, 260);
  });
  const sm = { y: 0, x: 0 };
  laco(sec, (t, dt) => {
    const { w, h } = p.vis;
    giro = Math.max(0, giro - dt * 1.1);
    const extra = easeInOut(1 - giro) * Math.PI * 2 * (giro > 0 ? 1 : 0);
    sm.y = lerp(sm.y, mouse.x * .5, .06); sm.x = lerp(sm.x, mouse.y * .15, .06);
    const Hl = h * .62;
    lata.scale.setScalar(Hl);
    lata.position.set(-w * .1, -h * .05 + Math.sin(t * 1.4) * .08, .6);
    lata.rotation.set(sm.x, -.25 + sm.y + Math.sin(t * .6) * .25 + extra, -.06);
    litro.scale.setScalar(h * .74);
    litro.position.set(w * .2, -h * .0 + Math.sin(t * 1.2 + 1) * .08, -1.2);
    litro.rotation.set(sm.x * .6, .3 + sm.y * .6 - Math.sin(t * .5) * .2 - extra * .5, .08);
    cor.lerp(alvoCor, .08); chao.material.color.copy(cor); luzCor.color.copy(cor);
    chao.position.set(0, -h * .05 - Hl / 2 - .02, 0); chao.scale.setScalar(w * .42);
    p.r.render(p.cena, p.cam);
  });
}

/* ---------- partida ---------- */
(async () => {
  if (!temWebGL) { avisaFim(); return; }
  try {
    const alien = await textura('assets/alien-verde.webp');
    const brilho = texturaBrilho();
    let visto = false;
    try { visto = !!sessionStorage.getItem('ovni-visto'); } catch (_) { visto = true; }
    if (!REDUZ && !visto && html.classList.contains('abrindo')) {
      const fim = abertura(alien, brilho);
      window.addEventListener('abertura-fim', () => hero(alien, brilho, true), { once: true });
      seletor();
      await fim;
    } else {
      avisaFim();
      hero(alien, brilho, false);
      seletor();
    }
  } catch (e) {
    console.error(e);
    document.querySelector('.abertura')?.remove();
    avisaFim();
  }
})();
