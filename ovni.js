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
/* mapas de material (aspereza no verde, metal no azul) são dados, não cor */
const cacheDados = new Map();
const dados = (url) => {
  if (!cacheDados.has(url)) {
    cacheDados.set(url, new Promise((ok) => carregador.load(url, (t) => { t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; ok(t); }, undefined, () => ok(null))));
  }
  return cacheDados.get(url);
};
const cachePerfil = new Map();
const perfil = (tipo) => {
  if (!cachePerfil.has(tipo)) cachePerfil.set(tipo, fetch(`assets/3d/${tipo}.json`).then((r) => r.json()));
  return cachePerfil.get(tipo);
};
/* topo da lata: a silhueta do render para na borda; daqui para cima a malha
   faz a borda enrolada e desce até a tampa, que é uma peça à parte */
const TAMPA_Y = .968;
const cacheGeo = new Map();
async function geometria(tipo) {
  if (!cacheGeo.has(tipo)) {
    cacheGeo.set(tipo, perfil(tipo).then((p) => {
      const pts = [new THREE.Vector2(0, 0)];
      if (tipo === 'lata') {
        const corpo = p.perfil.filter(([, h]) => h <= .97);
        corpo.forEach(([r, h]) => pts.push(new THREE.Vector2(r, h)));
        const R = corpo[corpo.length - 1][0];
        [[R + .004, .981], [R + .003, .993], [R - .003, .999], [R - .009, .996], [R - .013, .986], [R - .016, TAMPA_Y]]
          .forEach(([r, h]) => pts.push(new THREE.Vector2(r, h)));
        p.raioTampa = R - .016;
      } else {
        p.perfil.forEach(([r, h]) => pts.push(new THREE.Vector2(r, h)));
        pts.push(new THREE.Vector2(0, 1));
      }
      const g = new THREE.LatheGeometry(pts, 160);
      /* o rótulo segue a ALTURA (não o índice do ponto): a borda e a tampa
         pegam a faixa prateada do topo, sem esticar o desenho */
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, Math.min(1, pos.getY(i)));
      g.translate(0, -.5, 0);
      g.computeVertexNormals();
      return { geo: g, raioTampa: p.raioTampa };
    }));
  }
  return cacheGeo.get(tipo);
}

/* tampa de alumínio desenhada: friso, abertura marcada e rebite */
let texTampa = null;
function texturaTampa() {
  if (texTampa) return texTampa;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), m = 256;
  const fundo = g.createRadialGradient(m - 60, m - 80, 20, m, m, 256);
  fundo.addColorStop(0, '#f1f3f5'); fundo.addColorStop(.7, '#c9ced4'); fundo.addColorStop(1, '#9aa1a9');
  g.fillStyle = fundo; g.fillRect(0, 0, 512, 512);
  const anel = (r, cor, lw) => { g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.strokeStyle = cor; g.lineWidth = lw; g.stroke(); };
  anel(232, 'rgba(40,44,50,.55)', 6); anel(224, 'rgba(255,255,255,.7)', 3); anel(244, 'rgba(255,255,255,.35)', 4);
  /* abertura: gota voltada para a frente da lata (parte de baixo do desenho) */
  const gota = () => {
    g.beginPath();
    g.moveTo(m - 70, m + 60);
    g.quadraticCurveTo(m - 92, m + 168, m, m + 186);
    g.quadraticCurveTo(m + 92, m + 168, m + 70, m + 60);
    g.quadraticCurveTo(m, m + 34, m - 70, m + 60);
    g.closePath();
  };
  gota(); g.fillStyle = 'rgba(120,128,138,.18)'; g.fill();
  gota(); g.strokeStyle = 'rgba(30,34,40,.7)'; g.lineWidth = 4; g.stroke();
  g.save(); g.translate(0, -3); gota(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke(); g.restore();
  /* rebite */
  const rb = g.createRadialGradient(m - 6, m - 6, 2, m, m, 26);
  rb.addColorStop(0, '#ffffff'); rb.addColorStop(1, '#8d949c');
  g.beginPath(); g.arc(m, m, 24, 0, Math.PI * 2); g.fillStyle = rb; g.fill();
  texTampa = new THREE.CanvasTexture(c); texTampa.colorSpace = THREE.SRGBColorSpace; texTampa.anisotropy = 8;
  return texTampa;
}
function criaTampa(raio) {
  const g = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: texturaTampa(), metalness: .8, roughness: .34, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.5 });
  const disco = new THREE.Mesh(new THREE.CircleGeometry(raio, 96), metal);
  disco.rotation.x = -Math.PI / 2; g.add(disco);
  /* lacre (anel de puxar): sai do rebite e aponta para trás, longe da abertura */
  const L = raio * .62, W = raio * .42;
  const forma = new THREE.Shape();
  forma.moveTo(-W / 2, -W * .32);
  forma.lineTo(W / 2, -W * .32);
  forma.quadraticCurveTo(W * .62, L * .55, W * .34, L);
  forma.lineTo(-W * .34, L);
  forma.quadraticCurveTo(-W * .62, L * .55, -W / 2, -W * .32);
  const furo = new THREE.Path();
  furo.absellipse(0, L * .62, W * .27, L * .2, 0, Math.PI * 2, true);
  forma.holes.push(furo);
  const geoLacre = new THREE.ExtrudeGeometry(forma, { depth: raio * .025, bevelEnabled: true, bevelThickness: raio * .012, bevelSize: raio * .012, bevelSegments: 3, curveSegments: 24 });
  const lacre = new THREE.Mesh(geoLacre, new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, metalness: .95, roughness: .2, clearcoat: .6, envMapIntensity: 1.6 }));
  /* deitado sobre a tampa, um fio acima; +y do desenho vira -z (para trás) */
  lacre.rotation.x = -Math.PI / 2; lacre.position.y = raio * .03; lacre.position.z = raio * .05;
  g.add(lacre);
  return g;
}

/* ---------- embalagem 3D (lata ou litro) com o rótulo oficial ---------- */
async function criaEmbalagem(tipo, sabor) {
  const base = `assets/3d/${tipo}-${sabor}`;
  const [{ geo, raioTampa }, tex, mapa] = await Promise.all([geometria(tipo), textura(base + '.webp'), dados(base + '-mat.webp')]);
  /* o mapa diz onde é tinta prateada (metal polido) e onde é verniz colorido:
     o alien, as espadas e os contornos brilham quando a lata balança.
     Lata: alumínio impresso. Garrafa: PET com verniz, bem menos metal. */
  const mat = tipo === 'lata'
    ? new THREE.MeshPhysicalMaterial({ map: tex, metalnessMap: mapa, roughnessMap: mapa, metalness: .74, roughness: 1, clearcoat: .6, clearcoatRoughness: .12, envMapIntensity: 1.15 })
    : new THREE.MeshPhysicalMaterial({ map: tex, metalnessMap: mapa, roughnessMap: mapa, metalness: .45, roughness: .9, clearcoat: .8, clearcoatRoughness: .1, envMapIntensity: 1 });
  /* um fio de luz própria segura o rótulo legível dentro do raio verde */
  mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = tex; mat.emissiveIntensity = .07;
  const malha = new THREE.Mesh(geo, mat);
  malha.rotation.y = -Math.PI / 2; /* a frente do rótulo olhando para a câmera */
  const g = new THREE.Group(); g.add(malha);
  if (tipo === 'lata') { const t = criaTampa(raioTampa); t.position.y = TAMPA_Y - .5; g.add(t); }
  g.userData = { malha, tipo, sabor,
    async troca(novo) {
      if (novo === g.userData.sabor) return;
      const b = `assets/3d/${tipo}-${novo}`;
      const [t, m] = await Promise.all([textura(b + '.webp'), dados(b + '-mat.webp')]);
      if (t) { mat.map = t; mat.emissiveMap = t; if (m) { mat.metalnessMap = m; mat.roughnessMap = m; } mat.needsUpdate = true; g.userData.sabor = novo; }
    },
  };
  return g;
}
/* a embalagem balança mostrando a frente e nunca vira de costas (o verso
   oficial não existe em render): ±BALANCO em torno da frente */
const BALANCO = .5;
const balanca = (t, vel, fase = 0) => Math.sin(t * vel + fase) * BALANCO;

/* sombra de contato: mancha escura e macia sob a embalagem */
let texSombra = null;
function criaSombra() {
  if (!texSombra) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(.35, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    texSombra = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, toneMapped: false }));
  s.rotation.x = -Math.PI / 2;
  return s;
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
        gl_FragColor = vec4(uCor * 1.2, topo * borda * aneis * pe * uForca * .74);
      }`,
    /* só a parede de trás do cone: o raio brilha ATRÁS da lata e não lava o rótulo de verde */
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
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

/* ---------- estúdio de foto de produto (mapa de reflexos) ----------
   Sala escura com softboxes grandes: um teto, uma chave na frente à esquerda e
   tiras verticais nas laterais. É o que dá os reflexos longos e limpos de foto
   de lata, no lugar das lâmpadas pequenas do RoomEnvironment (que salpicavam
   pontinhos de brilho na garrafa). Gerado uma vez por palco. */
function estudio(r, claro = false) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: claro ? 0x4a524d : 0x0b0d0c, side: THREE.BackSide })));
  const painel = (w, h, pos, cor, forca) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  painel(16, 9, [0, 13, 3], 0xffffff, 2.6);      /* teto */
  painel(7, 10, [-10, 4, 9], 0xffffff, 4.2);     /* chave na frente, à esquerda */
  painel(2.4, 16, [12, 0, 2], 0xffffff, 5);      /* tira à direita: o filete vertical da lata */
  painel(2, 14, [-12, 0, -3], 0xffffff, 2.4);    /* tira atrás, à esquerda */
  painel(2, 14, [10, 0, -10], 0xffffff, 2.4);    /* tira atrás, à direita */
  painel(18, 12, [0, 1, 17], 0xffffff, 2.2);     /* rebatedor grande atrás da câmera: a tinta prateada de frente fica prata, não preta */
  painel(40, 40, [0, -16, 0], 0x1a3a12, .5);     /* chão verde fraco */
  const pm = new THREE.PMREMGenerator(r);
  const env = pm.fromScene(s, .02).texture;
  pm.dispose();
  return env;
}

const cromo = (obj, env) => obj.traverse((o) => { if (o.material && o.material.metalness === 1) o.material.envMap = env; });

/* ---------- palco: renderizador + cena + câmera ---------- */
function criaPalco(canvas, fov = 30) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  const cena = new THREE.Scene();
  cena.environment = estudio(r);
  /* o cromo do disco reflete uma sala mais clara (na sala escura ele fica preto) */
  const envClaro = estudio(r, true);
  const cam = new THREE.PerspectiveCamera(fov, 1, .1, 400); cam.position.set(0, 0, 12);
  /* luzes diretas, leves: o grosso do volume vem dos reflexos do estúdio.
     Chave do alto à esquerda, preenchimento fraco e dois recortes brancos por
     trás que desenham as bordas (recorte colorido deixava a borda com cara de
     efeito barato; a cor da casa fica no raio e no fundo) */
  const chave = new THREE.DirectionalLight(0xffffff, 1.5); chave.position.set(-5, 7, 9); cena.add(chave);
  const preenche = new THREE.DirectionalLight(0xe8fff0, .35); preenche.position.set(7, 1, 6); cena.add(preenche);
  const recorteE = new THREE.DirectionalLight(0xeefff6, 1.6); recorteE.position.set(-9, 2, -6); cena.add(recorteE);
  const recorteD = new THREE.DirectionalLight(0xf6fff0, 1.6); recorteD.position.set(9, 3, -6); cena.add(recorteD);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x0b1a0d, .2));
  const vis = { w: 1, h: 1 };
  const medir = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    vis.h = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z; vis.w = vis.h * cam.aspect;
  };
  medir();
  return { r, cena, cam, vis, medir, envClaro };
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
    const ovni = criaOvni(brilho, alien); p.cena.add(ovni.g); cromo(ovni.g, p.envClaro);

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
      if (t > 1.95 && !nome.classList.contains('on')) { nome.classList.add('on'); sub.classList.add('on'); }
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
  const ovni = criaOvni(brilho, alien); p.cena.add(ovni.g); cromo(ovni.g, p.envClaro);
  const [latA, litro, latB] = await Promise.all([criaEmbalagem('lata', 'original'), criaEmbalagem('litro', 'maca-verde'), criaEmbalagem('lata', 'melancia')]);
  [latA, litro, latB].forEach((o) => { vivo(o); p.cena.add(o); });
  palco.classList.add('com-3d');
  new ResizeObserver(() => p.medir()).observe(canvas);
  const sm = { z: 0, x: .1, px: 0, gy: 0, gx: 0 };
  laco(palco, (t, dt) => {
    const { w, h } = p.vis;
    const estreito = w < h * .9;
    /* palco largo e centralizado sob o texto: disco no alto, a lata no raio
       e as outras duas ao lado, perto do centro (não nas pontas da tela) */
    const lado = Math.min(w * (estreito ? .3 : .26), h * .62);
    const s = Math.min(1.05, (w * (estreito ? .58 : .5)) / 3.5, h * .3);
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
    /* balança mostrando a frente; inclinada para a câmera, deixa ver a tampa */
    latA.rotation.set(.32 + sm.gx + .05 * Math.sin(t * .9), balanca(t, .8) + sm.gy * .5, .08 * Math.sin(t * .7));
    /* garrafa e lata da frente: flutuam, balançam devagar e seguem o mouse */
    const entra = easeOut(clamp01((t - .4) / 1.2));
    litro.scale.setScalar(h * (estreito ? .36 : .42));
    litro.position.set(-lado, lerp(-h, -h * .2, entra) + Math.sin(t * 1.1 + 1) * .12, 1.4);
    litro.rotation.set(.14 + sm.gx, .35 + balanca(t, .55, 1) * .7 + sm.gy, .16);
    latB.scale.setScalar(h * (estreito ? .27 : .3));
    latB.position.set(lado, lerp(-h, -h * .26, entra) + Math.sin(t * 1.2 + 2) * .12, 1.8);
    latB.rotation.set(.36 + sm.gx, -.35 + balanca(t, .65, 2) * .7 + sm.gy, -.2);
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
  /* chão: sombra de contato escura sob cada peça + um brilho fraco na cor do sabor */
  const cor = new THREE.Color('#FF1F8E');
  const brilhoChao = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: texturaBrilho(), color: cor, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  brilhoChao.rotation.x = -Math.PI / 2; p.cena.add(brilhoChao);
  const sombraLata = criaSombra(), sombraLitro = criaSombra();
  p.cena.add(sombraLata, sombraLitro);
  const luzCor = new THREE.PointLight(cor, 14, 12); luzCor.position.set(-3, -2, 4); p.cena.add(luzCor);
  sec.classList.add('com-3d');
  new ResizeObserver(() => p.medir()).observe(canvas);
  let troca = 0, alvoCor = cor.clone();
  window.addEventListener('sabor', async (e) => {
    const { sabor, cor: c } = e.detail;
    alvoCor.set(c);
    /* troca de sabor: as peças viram de lado (o rótulo sai de cena), trocam
       o rótulo e voltam de frente. Nunca mostram as costas. */
    troca = 1;
    setTimeout(() => { lata.userData.troca(sabor); litro.userData.troca(sabor); }, 300);
  });
  const sm = { y: 0, x: 0 };
  laco(sec, (t, dt) => {
    const { w, h } = p.vis;
    troca = Math.max(0, troca - dt * 1.6);
    const vira = Math.sin(Math.PI * (1 - troca)) * 1.15 * (troca > 0 ? 1 : 0);
    sm.y = lerp(sm.y, mouse.x * .35, .06); sm.x = lerp(sm.x, mouse.y * .12, .06);
    const Hl = h * .62, chaoY = -h * .05 - Hl / 2;
    lata.scale.setScalar(Hl);
    const flutuaLata = Math.sin(t * 1.4) * .06, flutuaLitro = Math.sin(t * 1.2 + 1) * .06;
    lata.position.set(-w * .1, -h * .05 + .1 + flutuaLata, .6);
    lata.rotation.set(.26 + sm.x, -.15 + sm.y + balanca(t, .6) * .6 + vira, -.04);
    litro.scale.setScalar(h * .74);
    litro.position.set(w * .2, chaoY + h * .37 + .1 + flutuaLitro, -1.2);
    litro.rotation.set(.1 + sm.x * .6, .25 + sm.y * .6 - balanca(t, .5, 1) * .4 - vira * .8, .05);
    cor.lerp(alvoCor, .08); brilhoChao.material.color.copy(cor); luzCor.color.copy(cor);
    brilhoChao.position.set(0, chaoY - .01, 0); brilhoChao.scale.setScalar(w * .36);
    /* a sombra fica no chão e encolhe/clareia quando a peça sobe */
    sombraLata.position.set(lata.position.x, chaoY, lata.position.z);
    sombraLata.scale.set(Hl * .62 * (1 - flutuaLata * .8), Hl * .3, 1);
    sombraLata.material.opacity = .75 - flutuaLata * 2;
    sombraLitro.position.set(litro.position.x, chaoY, litro.position.z);
    sombraLitro.scale.set(h * .74 * .46, h * .74 * .2, 1);
    sombraLitro.material.opacity = .65 - flutuaLitro * 2;
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
