/* ============================================================
   TOGURO · Disco voador 3D (Three.js)
   1) Abertura: o disco cruza o céu estrelado, acende o raio trator,
      "abduz" o nome e sobe. Uma vez por sessão; pula no clique/tecla.
   2) Hero: o mesmo disco paira sobre o leque de latas, com o raio
      verde iluminando as latas. Segue o mouse de leve.
   Sem WebGL ou com "reduzir movimento": sem abertura e o hero fica
   só com as latas. Nada aqui espera o window.load.
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

/* ---------- texturas ---------- */
function texturaBrilho() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const carregador = new THREE.TextureLoader();
const texAlien = new Promise((ok) => carregador.load('assets/alien-verde.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; ok(t); }, undefined, () => ok(null)));

/* ---------- o disco ---------- */
function criaOvni(brilho, alien) {
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);

  const metal = new THREE.MeshPhysicalMaterial({ color: 0xd6e0da, metalness: 1, roughness: .17, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.25 });
  const perfil = [[0, -.30], [.35, -.30], [.8, -.245], [1.25, -.15], [1.62, -.035], [1.75, .03], [1.66, .095], [1.3, .175], [.9, .245], [.62, .285], [0, .30]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  corpo.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 128), metal));

  const faixa = new THREE.Mesh(new THREE.TorusGeometry(1.71, .045, 16, 180),
    new THREE.MeshStandardMaterial({ color: 0x0a1a0d, metalness: .6, roughness: .35, emissive: 0x1d6b12, emissiveIntensity: .7 }));
  faixa.rotation.x = Math.PI / 2; faixa.position.y = .03; corpo.add(faixa);

  const motor = new THREE.Mesh(new THREE.TorusGeometry(.6, .04, 12, 96), new THREE.MeshBasicMaterial({ color: VERDE }));
  motor.rotation.x = Math.PI / 2; motor.position.y = -.3; corpo.add(motor);
  const motorMiolo = new THREE.Mesh(new THREE.CircleGeometry(.56, 64), new THREE.MeshBasicMaterial({ color: 0x2c7a14 }));
  motorMiolo.rotation.x = Math.PI / 2; motorMiolo.position.y = -.302; corpo.add(motorMiolo);

  /* luzes que correm pela borda */
  const luzes = [], N = 22, geoL = new THREE.SphereGeometry(.058, 16, 12);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const mat = new THREE.MeshBasicMaterial({ color: VERDE });
    const l = new THREE.Mesh(geoL, mat);
    l.position.set(Math.cos(a) * 1.47, .12, Math.sin(a) * 1.47);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: i % 2 ? MENTA : VERDE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(.5); l.add(s); corpo.add(l);
    luzes.push({ mat, s, i, base: new THREE.Color(i % 2 ? MENTA : VERDE) });
  }

  /* piloto: o alienígena do logo, dentro da cúpula */
  if (alien) {
    const piloto = new THREE.Sprite(new THREE.SpriteMaterial({ map: alien, transparent: true, depthWrite: false }));
    piloto.scale.set(.44, .52, 1); piloto.position.y = .56; piloto.renderOrder = 1; g.add(piloto);
  }
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(.64, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xbfffd6, metalness: 0, roughness: .02, transparent: true, opacity: .26, clearcoat: 1, envMapIntensity: 1.8, emissive: 0x2aff6a, emissiveIntensity: .1, depthWrite: false }));
  cupula.position.y = .29; cupula.renderOrder = 2; g.add(cupula);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(.64, .028, 12, 96), metal);
  aro.rotation.x = Math.PI / 2; aro.position.y = .29; g.add(aro);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: VERDE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .85 }));
  halo.scale.set(2.8, 1.1, 1); halo.position.y = -.38; g.add(halo);

  /* raio trator: cone aberto com anéis que descem */
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
        gl_FragColor = vec4(uCor * 1.25, topo * borda * aneis * pe * uForca * .7);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const feixe = new THREE.Mesh(geoF, matF); feixe.position.y = -.3; g.add(feixe);

  /* partículas subindo dentro do raio */
  const NP = 170, pos = new Float32Array(NP * 3), vel = new Float32Array(NP);
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const matP = new THREE.PointsMaterial({ map: brilho, color: 0xd4ff8a, size: .1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geoP, matP); pts.position.y = -.3; pts.frustumCulled = false; g.add(pts);
  let L = 3;
  const solta = (i, emQualquerAltura) => {
    const y = emQualquerAltura ? -Math.random() * L : -L;
    const raio = (.5 + (1.9 - .5) * (-y / L)) * Math.sqrt(Math.random()) * .9, ang = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(ang) * raio; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(ang) * raio;
    vel[i] = .5 + Math.random() * 1.1;
  };
  for (let i = 0; i < NP; i++) solta(i, true);

  return {
    g, corpo, halo,
    feixe(comprimento, forca) {
      L = Math.max(.01, comprimento);
      feixe.scale.y = L; feixe.visible = forca > .002;
      matF.uniforms.uForca.value = forca;
      matP.opacity = forca * .9; pts.visible = forca > .002;
    },
    tick(t, dt) {
      corpo.rotation.y = t * .55;
      luzes.forEach(({ mat, s, i, base }) => {
        const k = .5 + .5 * Math.sin(i * .9 - t * 7);
        mat.color.copy(base).multiplyScalar(.35 + k * 1.1);
        s.material.opacity = .25 + .75 * k;
      });
      matF.uniforms.uTempo.value = t;
      halo.material.opacity = .65 + .2 * Math.sin(t * 3.1);
      if (pts.visible) {
        for (let i = 0; i < NP; i++) {
          pos[i * 3 + 1] += vel[i] * dt * (L / 3);
          if (pos[i * 3 + 1] > -.05) solta(i, false);
        }
        geoP.attributes.position.needsUpdate = true;
      }
    },
  };
}

/* ---------- palco: renderizador + cena + câmera ---------- */
function criaPalco(canvas, alien, brilho) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  const cena = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  cena.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 400); cam.position.set(0, 0, 10);
  const chave = new THREE.DirectionalLight(0xffffff, 1.6); chave.position.set(3, 6, 6); cena.add(chave);
  const verdeBaixo = new THREE.PointLight(VERDE, 30, 12); verdeBaixo.position.set(0, -2, 2); cena.add(verdeBaixo);
  const menta = new THREE.DirectionalLight(MENTA, 1.2); menta.position.set(-6, 1, -2); cena.add(menta);
  const ovni = criaOvni(brilho, alien); cena.add(ovni.g);
  const vis = { w: 1, h: 1 };
  const medir = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    vis.h = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z; vis.w = vis.h * cam.aspect;
  };
  medir();
  return { r, cena, cam, ovni, vis, medir };
}

/* ---------- mouse (o disco inclina na direção dele) ---------- */
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

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
    const canvas = capa.querySelector('canvas');
    const p = criaPalco(canvas, alien, brilho);

    /* estrelas em túnel */
    const NE = 1400, pe = new Float32Array(NE * 3);
    for (let i = 0; i < NE; i++) { pe[i * 3] = (Math.random() - .5) * 90; pe[i * 3 + 1] = (Math.random() - .5) * 60; pe[i * 3 + 2] = -Math.random() * 160; }
    const geoE = new THREE.BufferGeometry(); geoE.setAttribute('position', new THREE.BufferAttribute(pe, 3));
    const estrelas = new THREE.Points(geoE, new THREE.PointsMaterial({ map: brilho, color: 0xdfffe8, size: .32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    p.cena.add(estrelas);

    const nome = capa.querySelector('.abertura__nome'), sub = capa.querySelector('.abertura__sub');
    const DUR = 3.9;
    let t0 = performance.now(), ant = t0, acabou = false, pedido;
    const fecha = (rapido) => {
      if (acabou) return; acabou = true;
      try { sessionStorage.setItem('ovni-visto', '1'); } catch (_) { /* aba anônima */ }
      capa.classList.add('saindo');
      avisaFim();
      setTimeout(() => { cancelAnimationFrame(pedido); p.r.dispose(); capa.remove(); pronto(); }, rapido ? 380 : 750);
    };
    capa.querySelector('.abertura__pular').addEventListener('click', () => fecha(true));
    addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { removeEventListener('keydown', k); fecha(true); } });
    addEventListener('resize', p.medir);

    const quadro = (agora) => {
      const t = (agora - t0) / 1000, dt = Math.min(.05, (agora - ant) / 1000); ant = agora;
      const { w, h } = p.vis;
      /* estrelas: dobra espacial no começo, freando até a chegada */
      const vel = lerp(140, 6, easeOut(clamp01(t / 1.8)));
      for (let i = 0; i < NE; i++) { pe[i * 3 + 2] += vel * dt; if (pe[i * 3 + 2] > 10) pe[i * 3 + 2] -= 170; }
      geoE.attributes.position.needsUpdate = true;

      const s = Math.min(1.05, (w * .5) / 3.5);
      const o = p.ovni.g;
      const alvoY = h * .2;
      if (t < 1.8) { /* chegada em curva, do fundo à direita */
        const k = easeOut(clamp01(t / 1.8));
        o.position.set(lerp(w * .9, 0, k), lerp(h * .55, alvoY, k) + Math.sin(k * Math.PI) * .6, lerp(-60, 0, k));
        o.rotation.z = lerp(.5, 0, k); o.rotation.x = lerp(.35, .12, k);
      } else if (t < 3.05) { /* paira */
        o.position.set(Math.sin(t * 2) * .05, alvoY + Math.sin(t * 2.4) * .07, 0);
        o.rotation.z = lerp(o.rotation.z, -mouse.x * .2, .06); o.rotation.x = .12;
      } else { /* sobe e some */
        const k = easeIn(clamp01((t - 3.05) / .8));
        o.position.y = alvoY + k * h * 1.1; o.position.z = k * 3; o.rotation.x = .12 - k * .3;
      }
      o.scale.setScalar(s);
      const forca = t < 1.75 ? 0 : t < 2.15 ? easeOut((t - 1.75) / .4) : t < 2.95 ? 1 : 1 - clamp01((t - 2.95) / .25);
      const pe0 = o.position.y - .3 * s, chao = -h * .32;
      p.ovni.feixe((pe0 - chao) / s, forca);
      p.ovni.tick(t, dt);
      if (t > 1.95 && !nome.classList.contains('on')) { nome.classList.add('on'); sub.classList.add('on'); window.dispatchEvent(new CustomEvent('decifra', { detail: nome })); }
      p.r.render(p.cena, p.cam);
      if (t >= DUR) fecha(false);
      if (!acabou || t < DUR + 1) pedido = requestAnimationFrame(quadro);
    };
    pedido = requestAnimationFrame(quadro);
    setTimeout(() => fecha(true), 9000); /* trava de segurança */
  });
}

/* ============================================================
   2) HERO
   ============================================================ */
function hero(alien, brilho, veioDaAbertura) {
  const canvas = document.getElementById('ovniHero');
  const palco = document.getElementById('palco');
  if (!canvas || !palco) return;
  const p = criaPalco(canvas, alien, brilho);
  palco.classList.add('com-ovni');
  new ResizeObserver(() => p.medir()).observe(canvas);

  let visivel = true, t0 = null, ant = 0, pedido = null;
  const rx = { z: 0, x: .1, px: 0 };
  const quadro = (agora) => {
    pedido = null;
    if (!visivel || document.hidden) return;
    if (t0 === null) { t0 = agora; ant = agora; }
    const t = (agora - t0) / 1000, dt = Math.min(.05, (agora - ant) / 1000); ant = agora;
    const { w, h } = p.vis, o = p.ovni.g;
    const s = Math.min(1.0, (w * (w < h ? .62 : .36)) / 3.5);
    const alvoY = h / 2 - h * .19;
    const chegada = easeOut(clamp01(t / (veioDaAbertura ? 1.3 : 1.6)));
    rx.z = lerp(rx.z, -mouse.x * .22, .05); rx.x = lerp(rx.x, .1 + mouse.y * .08, .05); rx.px = lerp(rx.px, mouse.x * w * .03, .04);
    o.position.set(rx.px, lerp(alvoY + h * .75, alvoY, chegada) + Math.sin(t * 1.6) * .07, 0);
    o.rotation.z = rx.z + (1 - chegada) * .3; o.rotation.x = rx.x;
    o.scale.setScalar(s);
    const forca = easeInOut(clamp01((t - (veioDaAbertura ? 1.0 : 1.3)) / .6)) * (.85 + .15 * Math.sin(t * 2.3));
    palco.classList.toggle('feixe-on', forca > .5);
    const pe0 = o.position.y - .3 * s, chao = -h / 2 + h * .06;
    p.ovni.feixe((pe0 - chao) / s, forca);
    p.ovni.tick(t, dt);
    p.r.render(p.cena, p.cam);
    pedido = requestAnimationFrame(quadro);
  };
  const liga = () => { if (!pedido && visivel && !document.hidden) pedido = requestAnimationFrame(quadro); };
  new IntersectionObserver((es) => es.forEach((e) => { visivel = e.isIntersecting; liga(); })).observe(palco);
  document.addEventListener('visibilitychange', liga);
  liga();
}

/* ---------- partida ---------- */
(async () => {
  if (!temWebGL || REDUZ) { avisaFim(); return; }
  try {
    const [alien] = await Promise.all([texAlien]);
    const brilho = texturaBrilho();
    let visto = false;
    try { visto = !!sessionStorage.getItem('ovni-visto'); } catch (_) { visto = true; }
    if (!visto && html.classList.contains('abrindo')) {
      const fim = abertura(alien, brilho);
      /* o hero começa junto com a saída da abertura */
      window.addEventListener('abertura-fim', () => hero(alien, brilho, true), { once: true });
      await fim;
    } else {
      avisaFim();
      hero(alien, brilho, false);
    }
  } catch (e) {
    document.querySelector('.abertura')?.remove();
    avisaFim();
  }
})();
