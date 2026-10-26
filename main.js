
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CincoMaquinasSENAI } from './cinco-maquinas.js';

/* =========================================
   PARTE 3.1 — CONFIGURAÇÃO INICIAL
========================================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x9daeb8);
scene.fog = new THREE.Fog(0x9daeb8, 38, 105);

// Câmera do jogador
const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  180
);

camera.position.set(0, 1.68, 23);
camera.rotation.order = 'YXZ';

// Renderizador
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 1.7)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// Botão VR
const vrContainer = document.getElementById('vr-button-container');

if (vrContainer) {
  vrContainer.appendChild(
    VRButton.createButton(renderer)
  );
}

// Controles de mouse
const controls = new PointerLockControls(
  camera,
  renderer.domElement
);

// Carregar as cinco máquinas somente depois de criar a cena
const maquinas = new CincoMaquinasSENAI(
  scene,
  (mensagem) => {
    console.log(mensagem);

    const elemento = document.querySelector(
      '#mensagem-maquinas'
    );

    if (elemento) {
      elemento.textContent = mensagem;
    }
  }
);

await maquinas.carregarTodas();

// Continue aqui com os materiais, a iluminação,
// a estrutura do galpão e os controles existentes.

// ================================================
// PARTE 3.2 — MATERIAIS E TEXTURAS INDUSTRIAIS
// ================================================

function criarTexturaTijolos() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b6b0a8';
  ctx.fillRect(0, 0, 512, 512);

  const largura = 90;
  const altura = 32;
  const junta = 5;

  for (let y = 0; y < 512; y += altura + junta) {
    const deslocamento =
      Math.floor(y / (altura + junta)) % 2 === 0
        ? 0
        : largura / 2;

    for (let x = -largura; x < 512; x += largura + junta) {
      const variacao = Math.floor(Math.random() * 24);

      const vermelho = 125 + variacao;
      const verde = 48 + Math.floor(variacao / 3);
      const azul = 37 + Math.floor(variacao / 4);

      ctx.fillStyle = `rgb(${vermelho},${verde},${azul})`;
      ctx.fillRect(x + deslocamento, y, largura, altura);
    }
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return textura;
}

function criarTexturaConcreto() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#777b7d';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const tamanho = Math.random() * 3 + 1;
    const tom = Math.floor(75 + Math.random() * 90);

    ctx.fillStyle = `rgba(${tom},${tom},${tom},0.3)`;
    ctx.fillRect(x, y, tamanho, tamanho);
  }

  // Juntas discretas do piso
  ctx.strokeStyle = '#55595b';
  ctx.lineWidth = 2;

  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(8, 8);

  return textura;
}

function criarTexturaTelhado() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8c969a';
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = '#657075';
  ctx.lineWidth = 5;

  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  ctx.strokeStyle = '#b0b8bb';
  ctx.lineWidth = 1;

  for (let x = 8; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(5, 4);

  return textura;
}

const mats = {
  concreto: new THREE.MeshStandardMaterial({
    map: criarTexturaConcreto(),
    roughness: 0.95
  }),

  tijolo: new THREE.MeshStandardMaterial({
    map: criarTexturaTijolos(),
    roughness: 0.92
  }),

  reboco: new THREE.MeshStandardMaterial({
    color: 0xc6c8c5,
    roughness: 0.9
  }),

  telhado: new THREE.MeshStandardMaterial({
    map: criarTexturaTelhado(),
    roughness: 0.8,
    metalness: 0.35,
    side: THREE.DoubleSide
  }),

  verde: new THREE.MeshStandardMaterial({
    color: 0x17653c,
    roughness: 0.55,
    metalness: 0.45
  }),

  metal: new THREE.MeshStandardMaterial({
    color: 0x596267,
    roughness: 0.42,
    metalness: 0.75
  }),

  metalEscuro: new THREE.MeshStandardMaterial({
    color: 0x30373b,
    roughness: 0.6,
    metalness: 0.7
  }),

  azul: new THREE.MeshStandardMaterial({
    color: 0x174c79,
    roughness: 0.4,
    metalness: 0.35
  }),

  amarelo: new THREE.MeshStandardMaterial({
    color: 0xf2c62d,
    roughness: 0.6
  }),

  branco: new THREE.MeshStandardMaterial({
    color: 0xe8e8e4,
    roughness: 0.65
  }),

  vidro: new THREE.MeshStandardMaterial({
    color: 0x82c6df,
    transparent: true,
    opacity: 0.48,
    roughness: 0.2,
    side: THREE.DoubleSide
  }),

  luz: new THREE.MeshBasicMaterial({
    color: 0xfff2cb
  }),

  vermelho: new THREE.MeshStandardMaterial({
    color: 0xc52b2b,
    roughness: 0.55
  })
};

// ================================================
// PARTE 3.3 — ILUMINAÇÃO
// ================================================

scene.add(
  new THREE.HemisphereLight(
    0xe8f3ff,
    0x62584b,
    2.0
  )
);

const luzPrincipal = new THREE.DirectionalLight(
  0xfff0d8,
  2.5
);

luzPrincipal.position.set(-15, 24, 12);
luzPrincipal.castShadow = true;
luzPrincipal.shadow.mapSize.set(2048, 2048);
luzPrincipal.shadow.camera.left = -35;
luzPrincipal.shadow.camera.right = 35;
luzPrincipal.shadow.camera.top = 35;
luzPrincipal.shadow.camera.bottom = -35;

scene.add(luzPrincipal);

// ================================================
// PARTE 3.4 — FUNÇÕES PARA CONSTRUIR O GALPÃO
// ================================================

const galpao = new THREE.Group();
galpao.name = 'GalpaoIndustrial';
scene.add(galpao);

function criarCaixa(
  nome,
  tamanho,
  posicao,
  material,
  rotacao = [0, 0, 0]
) {
  const geometria = new THREE.BoxGeometry(
    tamanho[0],
    tamanho[1],
    tamanho[2]
  );

  const objeto = new THREE.Mesh(geometria, material);

  objeto.name = nome;
  objeto.position.set(posicao[0], posicao[1], posicao[2]);
  objeto.rotation.set(rotacao[0], rotacao[1], rotacao[2]);
  objeto.castShadow = true;
  objeto.receiveShadow = true;

  galpao.add(objeto);
  return objeto;
}

function criarVigaEntre(a, b, espessura, material) {
  const inicio = new THREE.Vector3(a[0], a[1], a[2]);
  const fim = new THREE.Vector3(b[0], b[1], b[2]);

  const direcao = new THREE.Vector3().subVectors(fim, inicio);

  const viga = new THREE.Mesh(
    new THREE.BoxGeometry(
      espessura,
      direcao.length(),
      espessura
    ),
    material
  );

  viga.position.copy(inicio).add(fim).multiplyScalar(0.5);
  viga.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direcao.normalize()
  );

  viga.castShadow = true;
  viga.receiveShadow = true;
  galpao.add(viga);

  return viga;
}

function criarPlaca(texto, largura = 3, altura = 0.7) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#153e32';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 256, 64, 480);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;

  const placa = new THREE.Mesh(
    new THREE.PlaneGeometry(largura, altura),
    new THREE.MeshBasicMaterial({
      map: textura,
      side: THREE.DoubleSide
    })
  );

  return placa;
}

// ================================================
// PARTE 3.5 — PISO INDUSTRIAL
// ================================================

criarCaixa(
  'Piso de concreto',
  [60, 0.3, 64],
  [0, -0.15, 0],
  mats.concreto
);

// Linhas de referência do piso
const gradePiso = new THREE.GridHelper(
  60,
  30,
  0x555b5e,
  0x656b6d
);

gradePiso.position.y = 0.006;
galpao.add(gradePiso);

// ================================================
// PARTE 3.6 — PAREDES DO GALPÃO
// Área aproximada: 60 x 64 metros
// ================================================

// Fundo: parede inferior de tijolos
criarCaixa(
  'Parede traseira tijolos esquerda',
  [21, 3.2, 0.5],
  [-19.5, 1.6, -31.8],
  mats.tijolo
);

criarCaixa(
  'Parede traseira tijolos direita',
  [21, 3.2, 0.5],
  [19.5, 1.6, -31.8],
  mats.tijolo
);

// Parte superior do fundo
criarCaixa(
  'Parede traseira superior',
  [60, 4.5, 0.5],
  [0, 5.45, -31.8],
  mats.reboco
);

// Paredes laterais
for (const x of [-29.8, 29.8]) {
  criarCaixa(
    'Parede lateral inferior de tijolos',
    [0.5, 3.2, 64],
    [x, 1.6, 0],
    mats.tijolo
  );

  criarCaixa(
    'Parede lateral superior',
    [0.5, 4.5, 64],
    [x, 5.45, 0],
    mats.reboco
  );

  criarCaixa(
    'Viga longitudinal verde',
    [0.35, 0.35, 64],
    [x * 0.985, 7.8, 0],
    mats.verde
  );
}

// Frente com abertura central para entrada
criarCaixa(
  'Parede frontal esquerda',
  [20, 3.2, 0.5],
  [-20, 1.6, 31.8],
  mats.tijolo
);

criarCaixa(
  'Parede frontal direita',
  [20, 3.2, 0.5],
  [20, 1.6, 31.8],
  mats.tijolo
);

criarCaixa(
  'Parede frontal superior',
  [60, 4.5, 0.5],
  [0, 5.45, 31.8],
  mats.reboco
);

// ================================================
// PARTE 3.7 — TELHADO METÁLICO INCLINADO
// ================================================

// Cobertura com inclinação suave de um lado ao outro.
const inclinacao = 0.10;
const larguraTelhado = 61;
const profundidadeTelhado = 65;

const cobertura = new THREE.Mesh(
  new THREE.PlaneGeometry(
    larguraTelhado,
    profundidadeTelhado
  ),
  mats.telhado
);

cobertura.rotation.x = -Math.PI / 2;
cobertura.rotation.z = inclinacao;
cobertura.position.set(
  0,
  8.3,
  0
);

cobertura.castShadow = true;
cobertura.receiveShadow = true;
galpao.add(cobertura);

// Treliças verdes transversais
for (let z = -28; z <= 28; z += 7) {
  const alturaEsquerda = 8.7;
  const alturaDireita = 5.7;

  criarVigaEntre(
    [-29, alturaEsquerda, z],
    [29, alturaDireita, z],
    0.28,
    mats.verde
  );

  criarVigaEntre(
    [-29, alturaEsquerda, z],
    [0, 8.0, z],
    0.22,
    mats.verde
  );

  criarVigaEntre(
    [0, 8.0, z],
    [29, alturaDireita, z],
    0.22,
    mats.verde
  );

  // Luminária industrial
  const luminaria = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.12, 0.35),
    mats.luz
  );

  luminaria.position.set(0, 7.2, z);
  galpao.add(luminaria);

  const luz = new THREE.PointLight(
    0xfff0d6,
    65,
    24
  );

  luz.position.set(0, 6.9, z);
  galpao.add(luz);
}

// Vigas longitudinais do telhado
criarCaixa(
  'Viga longitudinal central',
  [0.3, 0.3, 60],
  [0, 8.05, 0],
  mats.verde
);

// ================================================
// PARTE 3.8 — JANELAS ALTAS
// ================================================

for (let x = -24; x <= 24; x += 6) {
  criarCaixa(
    'Moldura metálica da janela',
    [4.5, 1.8, 0.18],
    [x, 6.5, -31.45],
    mats.metal
  );

  criarCaixa(
    'Vidro da janela',
    [4.2, 1.55, 0.1],
    [x, 6.5, -31.32],
    mats.vidro
  );

  criarCaixa(
    'Divisória vertical da janela',
    [0.08, 1.7, 0.12],
    [x, 6.5, -31.2],
    mats.metal
  );
}

// ================================================
// PARTE 3.9 — PORTÃO DE GARAGEM
// ================================================

// Portão lateral com réguas horizontais.
// A estrutura fica na lateral direita do galpão.
for (let i = 0; i < 10; i++) {
  criarCaixa(
    'Régua do portão industrial',
    [0.12, 0.22, 8],
    [29.45, 0.25 + i * 0.25, -20],
    i % 2 === 0 ? mats.branco : mats.metal
  );
}

criarCaixa(
  'Coluna esquerda do portão',
  [0.45, 4.2, 0.45],
  [29.2, 2.1, -24.3],
  mats.metal
);

criarCaixa(
  'Coluna direita do portão',
  [0.45, 4.2, 0.45],
  [29.2, 2.1, -15.7],
  mats.metal
);

// ================================================
// PARTE 3.10 — PORTAS E SINALIZAÇÃO
// ================================================

// Porta dupla de vidro na parede do fundo
criarCaixa(
  'Moldura porta dupla',
  [3.2, 3.2, 0.25],
  [-20, 1.6, -31.3],
  mats.metal
);

criarCaixa(
  'Vidro porta dupla',
  [2.9, 2.9, 0.12],
  [-20, 1.6, -31.12],
  mats.vidro
);

criarCaixa(
  'Divisória da porta dupla',
  [0.08, 2.9, 0.1],
  [-20, 1.6, -31.0],
  mats.metal
);

const placaFundo = criarPlaca('SAÍDA', 1.5, 0.45);
placaFundo.position.set(-20, 3.6, -31.0);
galpao.add(placaFundo);

// Porta lateral de saída na parede esquerda
criarCaixa(
  'Moldura porta lateral',
  [0.25, 2.5, 1.5],
  [-29.4, 1.25, 10],
  mats.metal
);

criarCaixa(
  'Folha porta lateral',
  [0.12, 2.3, 1.25],
  [-29.22, 1.25, 10],
  mats.verde
);

const placaLateral = criarPlaca('SAÍDA', 1.4, 0.45);
placaLateral.rotation.y = Math.PI / 2;
placaLateral.position.set(-29.0, 2.8, 10);
galpao.add(placaLateral);

// Placa principal da oficina
const placaOficina = criarPlaca(
  'ÁREA DE MECATRÔNICA',
  5,
  0.8
);

placaOficina.position.set(0, 4.3, 31.45);
galpao.add(placaOficina);

// ================================================
// PARTE 3.11 — MARCAÇÕES DE SEGURANÇA
// ================================================

function criarFaixaSeguranca(x, z, largura, profundidade) {
  const faixa = new THREE.Mesh(
    new THREE.BoxGeometry(largura, 0.018, profundidade),
    mats.amarelo
  );

  faixa.position.set(x, 0.02, z);
  faixa.receiveShadow = true;
  galpao.add(faixa);
}

criarFaixaSeguranca(-10, 0, 0.12, 35);
criarFaixaSeguranca(-10, -17, 10, 0.12);
criarFaixaSeguranca(10, 0, 0.12, 35);
criarFaixaSeguranca(10, -17, 10, 0.12);

// ================================================
// PARTE 3.12 — CONTROLES DO JOGADOR
// ================================================

const relogio = new THREE.Clock();

const teclas = {
  frente: false,
  tras: false,
  esquerda: false,
  direita: false,
  correr: false
};

const velocidade = 5;
const velocidadeCorrida = 8;

const direcao = new THREE.Vector3();
const movimento = new THREE.Vector3();

let jogadorAtivo = false;

// Botão de início opcional
const botaoInicio = document.getElementById('start-btn');

if (botaoInicio) {
  botaoInicio.addEventListener('click', () => {
    const instrucoes = document.getElementById('instructions');

    if (instrucoes) {
      instrucoes.style.display = 'none';
    }

    controls.lock();
  });
}

controls.addEventListener('lock', () => {
  jogadorAtivo = true;
});

controls.addEventListener('unlock', () => {
  jogadorAtivo = false;
});

document.addEventListener('keydown', (evento) => {
  switch (evento.code) {
    case 'KeyW':
    case 'ArrowUp':
      teclas.frente = true;
      break;

    case 'KeyS':
    case 'ArrowDown':
      teclas.tras = true;
      break;

    case 'KeyA':
    case 'ArrowLeft':
      teclas.esquerda = true;
      break;

    case 'KeyD':
    case 'ArrowRight':
      teclas.direita = true;
      break;

    case 'ShiftLeft':
    case 'ShiftRight':
      teclas.correr = true;
      break;
  }
});

document.addEventListener('keyup', (evento) => {
  switch (evento.code) {
    case 'KeyW':
    case 'ArrowUp':
      teclas.frente = false;
      break;

    case 'KeyS':
    case 'ArrowDown':
      teclas.tras = false;
      break;

    case 'KeyA':
    case 'ArrowLeft':
      teclas.esquerda = false;
      break;

    case 'KeyD':
    case 'ArrowRight':
      teclas.direita = false;
      break;

    case 'ShiftLeft':
    case 'ShiftRight':
      teclas.correr = false;
      break;
  }
});

// ================================================
// PARTE 3.13 — CONTROLES DE CELULAR
// ================================================

const controlesMobile = document.createElement('div');

controlesMobile.id = 'controles-mobile';

Object.assign(controlesMobile.style, {
  position: 'fixed',
  left: '16px',
  bottom: '20px',
  zIndex: '1000',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 58px)',
  gridTemplateRows: 'repeat(2, 58px)',
  gap: '6px',
  touchAction: 'none'
});

function criarBotaoMobile(texto, propriedade, coluna, linha) {
  const botao = document.createElement('button');

  botao.textContent = texto;

  Object.assign(botao.style, {
    gridColumn: String(coluna),
    gridRow: String(linha),
    fontSize: '22px',
    color: '#ffffff',
    background: 'rgba(20, 55, 75, 0.88)',
    border: '1px solid #ffffff',
    borderRadius: '12px',
    touchAction: 'none',
    userSelect: 'none'
  });

  const ativar = (evento) => {
    evento.preventDefault();
    teclas[propriedade] = true;

    if (botao.setPointerCapture && evento.pointerId !== undefined) {
      try {
        botao.setPointerCapture(evento.pointerId);
      } catch {
        // Alguns navegadores não permitem capturar o ponteiro.
      }
    }
  };

  const desativar = (evento) => {
    evento.preventDefault();
    teclas[propriedade] = false;
  };

  botao.addEventListener('pointerdown', ativar);
  botao.addEventListener('pointerup', desativar);
  botao.addEventListener('pointercancel', desativar);
  botao.addEventListener('lostpointercapture', () => {
    teclas[propriedade] = false;
  });

  controlesMobile.appendChild(botao);
}

criarBotaoMobile('↑', 'frente', 2, 1);
criarBotaoMobile('←', 'esquerda', 1, 2);
criarBotaoMobile('↓', 'tras', 2, 2);
criarBotaoMobile('→', 'direita', 3, 2);

document.body.appendChild(controlesMobile);

// Mostrar os botões apenas em dispositivos com toque
function atualizarInterfaceMobile() {
  const dispositivoTouch =
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0;

  controlesMobile.style.display =
    dispositivoTouch ? 'grid' : 'none';
}

atualizarInterfaceMobile();
window.addEventListener('resize', atualizarInterfaceMobile);

// ================================================
// PARTE 3.14 — INTERAÇÃO COM AS MÁQUINAS
// ================================================

const raycaster = new THREE.Raycaster();
const centroTela = new THREE.Vector2(0, 0);

const mensagemInteracao =
  document.getElementById('mensagem-maquinas');

function mostrarMensagem(texto) {
  if (mensagemInteracao) {
    mensagemInteracao.textContent = texto;
  }

  console.log(texto);
}

function selecionarObjeto() {
  raycaster.setFromCamera(centroTela, camera);

  const objetos = [];

  scene.traverse((objeto) => {
    if (
      objeto.isMesh &&
      objeto.visible &&
      objeto.name !== 'Piso de concreto'
    ) {
      objetos.push(objeto);
    }
  });

  const intersecoes = raycaster.intersectObjects(objetos, false);

  if (intersecoes.length === 0) {
    mostrarMensagem('Nenhum objeto selecionado.');
    return;
  }

  let objeto = intersecoes[0].object;

  // Procurar a máquina ancestral, se houver.
  let atual = objeto;

  while (atual && atual !== scene) {
    if (atual.userData && atual.userData.nome) {
      mostrarMensagem(
        'Máquina selecionada: ' + atual.userData.nome
      );
      return;
    }

    atual = atual.parent;
  }

  mostrarMensagem('Objeto: ' + (objeto.name || 'objeto industrial'));
}

document.addEventListener('mousedown', (evento) => {
  if (
    evento.button === 0 &&
    !renderer.xr.isPresenting &&
    controls.isLocked
  ) {
    selecionarObjeto();
  }
});

// ================================================
// PARTE 3.15 — MODO VR
// ================================================

// Controles do headset: os controladores são adicionados
// à cena para permitir interação por apontamento no futuro.
const controladorEsquerdo = renderer.xr.getController(0);
const controladorDireito = renderer.xr.getController(1);

scene.add(controladorEsquerdo);
scene.add(controladorDireito);

// ================================================
// PARTE 3.16 — LIMITES DO GALPÃO
// ================================================

function limitarJogador() {
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    -27.5,
    27.5
  );

  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    -29.5,
    29.5
  );

  camera.position.y = 1.68;
}

// ================================================
// PARTE 3.17 — LOOP PRINCIPAL
// ================================================

renderer.setAnimationLoop(() => {
  const delta = Math.min(relogio.getDelta(), 0.05);

  if (!renderer.xr.isPresenting && controls.isLocked) {
    direcao.set(
      Number(teclas.direita) - Number(teclas.esquerda),
      0,
      Number(teclas.tras) - Number(teclas.frente)
    );

    if (direcao.lengthSq() > 0) {
      direcao.normalize();

      const velocidadeAtual = teclas.correr
        ? velocidadeCorrida
        : velocidade;

      movimento.copy(direcao)
        .multiplyScalar(velocidadeAtual * delta);

      controls.moveRight(movimento.x);
      controls.moveForward(-movimento.z);

      limitarJogador();
    }
  }

  // Atualização das máquinas, caso a classe implemente animações.
  if (maquinas && typeof maquinas.atualizar === 'function') {
    maquinas.atualizar(delta);
  }

  renderer.render(scene, camera);
});

// ================================================
// PARTE 3.18 — REDIMENSIONAMENTO DA TELA
// ================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.7)
  );
});

console.log('Oficina industrial SENAI inicializada.');
console.log('Máquinas carregadas:', maquinas.maquinas.length);
