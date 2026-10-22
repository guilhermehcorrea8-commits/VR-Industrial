
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/*
  OFICINA INDUSTRIAL VR — SENAI
  Parte 3.1: cena, câmera, iluminação e materiais.
  As próximas partes serão adicionadas abaixo deste código.
*/

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

// Renderizador 3D
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// Botão para entrar no modo VR
const vrContainer = document.getElementById('vr-button-container');

vrContainer.appendChild(
  VRButton.createButton(renderer)
);

// Controles do mouse
const controls = new PointerLockControls(
  camera,
  renderer.domElement
);

// Materiais da oficina
const mats = {
  concrete: new THREE.MeshStandardMaterial({
    color: 0x777d80,
    roughness: 0.92
  }),

  brick: new THREE.MeshStandardMaterial({
    color: 0x944b3d,
    roughness: 0.95
  }),

  plaster: new THREE.MeshStandardMaterial({
    color: 0xd0d0c9,
    roughness: 0.9
  }),

  roof: new THREE.MeshStandardMaterial({
    color: 0xc2c9cb,
    roughness: 0.8,
    metalness: 0.35,
    side: THREE.DoubleSide
  }),

  green: new THREE.MeshStandardMaterial({
    color: 0x176744,
    roughness: 0.55,
    metalness: 0.35
  }),

  blue: new THREE.MeshStandardMaterial({
    color: 0x174c79,
    roughness: 0.4,
    metalness: 0.35
  }),

  blueLight: new THREE.MeshStandardMaterial({
    color: 0x2878a8,
    roughness: 0.4,
    metalness: 0.3
  }),

  steel: new THREE.MeshStandardMaterial({
    color: 0x646e73,
    roughness: 0.45,
    metalness: 0.75
  }),

  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x30383d,
    roughness: 0.6,
    metalness: 0.65
  }),

  yellow: new THREE.MeshStandardMaterial({
    color: 0xf4c62f,
    roughness: 0.55
  }),

  red: new THREE.MeshStandardMaterial({
    color: 0xb92727,
    roughness: 0.55
  }),

  white: new THREE.MeshStandardMaterial({
    color: 0xe8e9e5,
    roughness: 0.65
  }),

  glass: new THREE.MeshStandardMaterial({
    color: 0x8dc6dd,
    transparent: true,
    opacity: 0.42,
    roughness: 0.18,
    metalness: 0.1
  }),

  rubber: new THREE.MeshStandardMaterial({
    color: 0x202326,
    roughness: 0.95
  }),

  wood: new THREE.MeshStandardMaterial({
    color: 0x8b6544,
    roughness: 0.8
  }),

  lamp: new THREE.MeshBasicMaterial({
    color: 0xfff3ce
  })
};

// Iluminação geral do galpão
scene.add(
  new THREE.HemisphereLight(
    0xeaf4ff,
    0x555047,
    2.0
  )
);

// Luz principal
const sun = new THREE.DirectionalLight(
  0xfff0d7,
  2.3
);

sun.position.set(-18, 30, 12);
sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -42;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42;
sun.shadow.camera.bottom = -42;

scene.add(sun);

// Grupo principal da estrutura
const building = new THREE.Group();
scene.add(building);

// Função para criar blocos e peças retangulares
function addBox(
  parent,
  name,
  size,
  pos,
  material,
  opts = {}
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      size[0],
      size[1],
      size[2]
    ),
    material
  );

  mesh.name = name || '';

  mesh.position.set(
    pos[0],
    pos[1],
    pos[2]
  );

  if (opts.rot) {
    mesh.rotation.set(
      opts.rot[0],
      opts.rot[1],
      opts.rot[2]
    );
  }

  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

// Função para criar cilindros
function addCylinder(
  parent,
  name,
  radiusTop,
  radiusBottom,
  height,
  pos,
  material,
  segments = 20
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      segments
    ),
    material
  );

  mesh.name = name || '';

  mesh.position.set(
    pos[0],
    pos[1],
    pos[2]
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

// Função para criar vigas inclinadas entre dois pontos
function beamBetween(
  parent,
  a,
  b,
  thickness,
  material
) {
  const A = new THREE.Vector3(
    a[0], a[1], a[2]
  );

  const B = new THREE.Vector3(
    b[0], b[1], b[2]
  );

  const direction = new THREE.Vector3()
    .subVectors(B, A);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      thickness,
      direction.length(),
      thickness
    ),
    material
  );

  mesh.position.copy(A)
    .add(B)
    .multiplyScalar(0.5);

  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

// Função para criar placas com texto
function makeLabel(
  text,
  width = 512,
  height = 128,
  bg = '#143449',
  fg = '#ffffff'
) {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = fg;
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(
    text,
    width / 2,
    height / 2,
    width - 24
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshBasicMaterial({
    map: texture
  });
}

// Placas que serão usadas nas próximas partes
const signMat = makeLabel(
  'ÁREA DE MECATRÔNICA'
);

const drillSignMat = makeLabel(
  'FURAÇÃO • USE EPI',
  512,
  128,
  '#174c79'
);

const maintenanceSignMat = makeLabel(
  'BANCADA DE MANUTENÇÃO',
  512,
  128,
  '#37434b'
);

const safetySignMat = makeLabel(
  'SEGURANÇA • EPIs',
  512,
  128,
  '#a32222'
);

/* =========================================================
   PARTE 3.2 — ESTRUTURA DO GALPÃO INDUSTRIAL
   Cole abaixo da Parte 3.1.
   ========================================================= */

// Piso industrial
addBox(
  building,
  'Piso industrial',
  [60, 0.25, 64],
  [0, -0.15, 0],
  mats.concrete
);

// Grade visual discreta no piso
const floorGrid = new THREE.GridHelper(
  60,
  30,
  0x555d60,
  0x666d70
);

floorGrid.position.y = -0.015;
building.add(floorGrid);

// ---------------------------------------------------------
// PAREDE DO FUNDO
// ---------------------------------------------------------

addBox(
  building,
  'Parede traseira inferior esquerda',
  [21, 3.2, 0.5],
  [-19.5, 1.6, -31.8],
  mats.brick
);

addBox(
  building,
  'Parede traseira inferior direita',
  [21, 3.2, 0.5],
  [19.5, 1.6, -31.8],
  mats.brick
);

// Parte superior da parede do fundo
addBox(
  building,
  'Parede traseira superior',
  [60, 3.1, 0.5],
  [0, 5.55, -31.8],
  mats.plaster
);

addBox(
  building,
  'Parede traseira acima das janelas',
  [60, 1.2, 0.5],
  [0, 7.7, -31.8],
  mats.plaster
);

// ---------------------------------------------------------
// PAREDES LATERAIS
// ---------------------------------------------------------

for (const x of [-29.8, 29.8]) {
  // Parte inferior em tijolo
  addBox(
    building,
    'Parede lateral de tijolos',
    [0.5, 3.2, 64],
    [x, 1.6, 0],
    mats.brick
  );

  // Parte superior rebocada
  addBox(
    building,
    'Parede lateral rebocada',
    [0.5, 4.2, 64],
    [x, 5.3, 0],
    mats.plaster
  );

  // Viga estrutural verde
  addBox(
    building,
    'Viga lateral verde',
    [0.35, 0.35, 64],
    [x * 0.985, 7.55, 0],
    mats.green
  );
}

// ---------------------------------------------------------
// FRENTE DO GALPÃO E ACESSO PRINCIPAL
// ---------------------------------------------------------

// Paredes laterais deixam um vão central para o portão
addBox(
  building,
  'Frente esquerda',
  [20, 3.2, 0.5],
  [-20, 1.6, 31.8],
  mats.brick
);

addBox(
  building,
  'Frente direita',
  [20, 3.2, 0.5],
  [20, 1.6, 31.8],
  mats.brick
);

addBox(
  building,
  'Frente superior',
  [60, 3.7, 0.5],
  [0, 5.65, 31.8],
  mats.plaster
);

addBox(
  building,
  'Viga frontal verde',
  [60, 0.35, 0.45],
  [0, 7.55, 31.6],
  mats.green
);

// Guias do portão
addBox(
  building,
  'Guia portão esquerda',
  [0.18, 3.2, 0.18],
  [-10, 1.6, 31.35],
  mats.darkSteel
);

addBox(
  building,
  'Guia portão direita',
  [0.18, 3.2, 0.18],
  [10, 1.6, 31.35],
  mats.darkSteel
);

// Réguas do portão recolhido
for (let i = 0; i < 8; i++) {
  addBox(
    building,
    'Régua portão recolhida',
    [19.8, 0.16, 0.12],
    [0, 3.25 + i * 0.17, 31.25],
    mats.steel
  );
}

// ---------------------------------------------------------
// TELHADO INDUSTRIAL
// ---------------------------------------------------------

const roof = new THREE.Mesh(
  new THREE.PlaneGeometry(61, 65),
  mats.roof
);

roof.rotation.x = Math.PI / 2;
roof.rotation.z = -0.055;
roof.position.set(0, 8.05, 0);
roof.receiveShadow = true;

building.add(roof);

// ---------------------------------------------------------
// TRELIÇAS METÁLICAS VERDES
// ---------------------------------------------------------

for (let z = -28; z <= 28; z += 7) {
  // Estrutura transversal
  beamBetween(
    building,
    [-29, 7.1, z],
    [-29, 7.45, z],
    0.25,
    mats.green
  );

  beamBetween(
    building,
    [-29, 7.45, z],
    [29, 7.1, z],
    0.28,
    mats.green
  );

  beamBetween(
    building,
    [29, 7.1, z],
    [29, 7.45, z],
    0.25,
    mats.green
  );

  // Travessa inferior
  beamBetween(
    building,
    [-29, 7.1, z],
    [29, 7.1, z],
    0.18,
    mats.green
  );

  // Diagonais da treliça
  for (let x = -24; x < 25; x += 8) {
    beamBetween(
      building,
      [x, 7.1, z],
      [x + 4, 7.42, z],
      0.12,
      mats.green
    );

    beamBetween(
      building,
      [x + 4, 7.42, z],
      [x + 8, 7.1, z],
      0.12,
      mats.green
    );
  }

  // Luminária industrial
  addBox(
    building,
    'Luminária industrial',
    [5.5, 0.12, 0.35],
    [0, 7.05, z],
    mats.lamp,
    { castShadow: false }
  );

  const light = new THREE.PointLight(
    0xfff0d0,
    1.1,
    20
  );

  light.position.set(0, 6.6, z);
  building.add(light);
}

// ---------------------------------------------------------
// JANELAS ALTAS NO FUNDO
// ---------------------------------------------------------

for (let x = -25; x <= 25; x += 5) {
  // Moldura metálica
  addBox(
    building,
    'Moldura janela',
    [4.2, 1.65, 0.16],
    [x, 5.45, -31.48],
    mats.darkSteel
  );

  // Vidro
  addBox(
    building,
    'Vidro janela',
    [3.95, 1.4, 0.08],
    [x, 5.45, -31.36],
    mats.glass
  );

  // Travessa
  addBox(
    building,
    'Travessa janela',
    [4, 0.07, 0.08],
    [x, 5.45, -31.28],
    mats.steel
  );
}

// ---------------------------------------------------------
// PORTA LATERAL DE SAÍDA
// ---------------------------------------------------------

addBox(
  building,
  'Porta lateral',
  [0.12, 2.3, 1.25],
  [-29.35, 1.15, 17],
  mats.darkSteel
);

addBox(
  building,
  'Vidro porta lateral',
  [0.08, 1.9, 0.95],
  [-29.27, 1.15, 17],
  mats.glass
);

addBox(
  building,
  'Placa saída',
  [0.08, 0.28, 1.1],
  [-29.25, 2.65, 17],
  mats.green
);

const exitLabel = new THREE.Mesh(
  new THREE.PlaneGeometry(0.95, 0.19),
  makeLabel('SAÍDA', 256, 64, '#176744')
);

exitLabel.rotation.y = Math.PI / 2;
exitLabel.position.set(-29.19, 2.65, 17);
building.add(exitLabel);

// ---------------------------------------------------------
// FAIXAS AMARELAS DE CIRCULAÇÃO E SEGURANÇA
// ---------------------------------------------------------

function floorStripe(x, z, width, depth) {
  addBox(
    building,
    'Faixa amarela de circulação',
    [width, 0.025, depth],
    [x, 0.005, z],
    mats.yellow,
    { castShadow: false }
  );
}

// Corredor central
floorStripe(0, 5, 2.4, 49);

// Delimitação das áreas de máquinas
floorStripe(-17, -3, 0.14, 44);
floorStripe(-3, -3, 0.14, 44);
floorStripe(11, -3, 0.14, 44);
floorStripe(24, -3, 0.14, 44);

// Limites de áreas de trabalho
floorStripe(-10, -25, 15, 0.14);
floorStripe(10, -25, 15, 0.14);
floorStripe(-10, 15, 15, 0.14);
floorStripe(10, 15, 15, 0.14);

// ---------------------------------------------------------
// PLACA PRINCIPAL DA OFICINA
// ---------------------------------------------------------

const mainSign = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 1.25),
  signMat
);

mainSign.position.set(0, 5.4, -30.95);
building.add(mainSign);

// Fim da Parte 3.2.
// A Parte 3.3 adicionará as máquinas e os equipamentos.

/* =========================================================
   PARTE 3.3 — MÁQUINAS E EQUIPAMENTOS INDUSTRIAIS
   Cole abaixo da Parte 3.2.
   ========================================================= */

// Lista de objetos que permitem interação
const interactiveObjects = [];

function registerInteractive(mesh, action, prompt) {
  mesh.userData.action = action;
  mesh.userData.prompt = prompt;

  interactiveObjects.push(mesh);

  return mesh;
}

// ---------------------------------------------------------
// FURADEIRA DE BANCADA
// ---------------------------------------------------------

function createDrillPress(x, z, index) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  // Base e pedestal
  addBox(
    g, 'Base furadeira',
    [1.5, 0.2, 1.5],
    [0, 0.12, 0],
    mats.blue
  );

  addBox(
    g, 'Pedestal furadeira',
    [1.1, 0.75, 1.1],
    [0, 0.58, 0],
    mats.blue
  );

  // Coluna vertical
  addCylinder(
    g, 'Coluna furadeira',
    0.12, 0.12, 2.75,
    [-0.38, 2.15, 0],
    mats.steel
  );

  // Cabeçote e motor
  addBox(
    g, 'Cabeçote furadeira',
    [1.35, 0.72, 0.95],
    [0.05, 3.25, 0],
    mats.blue
  );

  addCylinder(
    g, 'Motor furadeira',
    0.28, 0.28, 0.75,
    [0.42, 3.82, 0],
    mats.blueLight
  );

  // Mesa de trabalho
  addBox(
    g, 'Mesa furadeira',
    [1.05, 0.13, 1.0],
    [0.25, 1.65, 0],
    mats.steel
  );

  // Mandril e broca
  addCylinder(
    g, 'Mandril',
    0.12, 0.07, 0.42,
    [0.12, 2.75, 0.05],
    mats.darkSteel
  );

  addCylinder(
    g, 'Broca',
    0.025, 0.025, 0.38,
    [0.12, 2.35, 0.05],
    mats.steel,
    12
  );

  // Alavanca móvel
  const leverPivot = new THREE.Group();

  leverPivot.position.set(0.57, 3.25, 0.35);
  g.add(leverPivot);

  const lever = addCylinder(
    leverPivot, 'Alavanca furadeira',
    0.035, 0.035, 0.65,
    [0.25, -0.02, 0],
    mats.darkSteel,
    12
  );

  lever.rotation.z = Math.PI / 2.8;

  const knob = addCylinder(
    leverPivot, 'Manopla alavanca',
    0.095, 0.095, 0.15,
    [0.53, -0.03, 0],
    mats.red,
    16
  );

  knob.rotation.z = Math.PI / 2;

  // Interação com a alavanca
  registerInteractive(
    knob,
    () => {
      leverPivot.rotation.z =
        leverPivot.rotation.z === 0 ? -0.5 : 0;

      showToast(
        `Furadeira ${index}: alavanca acionada. ` +
        'Mantenha as mãos afastadas da broca.'
      );

      if (state.mission === 1) {
        completeMission();
      }
    },
    'E / clique: acionar alavanca da furadeira'
  );

  // Proteção frontal transparente
  addBox(
    g, 'Proteção furadeira',
    [0.8, 0.45, 0.05],
    [0.12, 2.12, 0.42],
    mats.glass
  );

  // Painel e botão
  addBox(
    g, 'Painel furadeira',
    [0.25, 0.32, 0.12],
    [0.52, 2.95, 0.52],
    mats.darkSteel
  );

  const greenButton = addCylinder(
    g, 'Botão verde furadeira',
    0.07, 0.07, 0.08,
    [0.52, 3.02, 0.6],
    mats.green,
    16
  );

  greenButton.rotation.x = Math.PI / 2;

  // Identificação da máquina
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.36),
    drillSignMat
  );

  sign.position.set(0, 4.15, -0.05);
  g.add(sign);

  return g;
}

// ---------------------------------------------------------
// BANCADA DE MANUTENÇÃO
// ---------------------------------------------------------

function createWorkbench(x, z, index) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  // Tampo
  addBox(
    g, 'Estrutura bancada',
    [3.5, 0.12, 1.45],
    [0, 0.92, 0],
    mats.wood
  );

  // Pés
  for (const px of [-1.55, 1.55]) {
    for (const pz of [-0.55, 0.55]) {
      addBox(
        g, 'Pé bancada',
        [0.13, 0.9, 0.13],
        [px, 0.45, pz],
        mats.darkSteel
      );
    }
  }

  // Prateleira inferior
  addBox(
    g, 'Prateleira bancada',
    [3.1, 0.1, 1.1],
    [0, 0.38, 0],
    mats.steel
  );

  // Gavetas e puxadores
  for (let i = 0; i < 3; i++) {
    addBox(
      g, 'Gaveta bancada',
      [0.85, 0.27, 0.08],
      [-1.05 + i * 1.05, 0.65, 0.74],
      mats.blue
    );

    addBox(
      g, 'Puxador gaveta',
      [0.22, 0.035, 0.035],
      [-1.05 + i * 1.05, 0.66, 0.79],
      mats.steel
    );
  }

  // Tapete de trabalho
  addBox(
    g, 'Tapete de bancada',
    [1.45, 0.025, 0.8],
    [-0.85, 1.0, -0.12],
    mats.rubber
  );

  // Ferramentas organizadas
  for (let i = 0; i < 3; i++) {
    const tool = addBox(
      g, 'Ferramenta organizada',
      [0.12, 0.045, 0.55],
      [-1.3 + i * 0.42, 1.045, -0.12],
      mats.yellow
    );

    tool.rotation.y = (i - 1) * 0.08;
  }

  // Morsa
  addBox(
    g, 'Morsa base',
    [0.45, 0.12, 0.35],
    [0.95, 1.08, 0.1],
    mats.blue
  );

  addBox(
    g, 'Morsa mordente',
    [0.12, 0.22, 0.35],
    [0.78, 1.2, 0.1],
    mats.steel
  );

  addBox(
    g, 'Morsa mordente móvel',
    [0.12, 0.22, 0.35],
    [1.12, 1.2, 0.1],
    mats.steel
  );

  // Interação com a bancada
  const top = g.children.find(
    object => object.name === 'Estrutura bancada'
  );

  registerInteractive(
    top,
    () => {
      showToast(
        `Bancada ${index}: ferramentas conferidas e organizadas.`
      );

      if (state.mission === 2) {
        completeMission();
      }
    },
    'E / clique: conferir bancada'
  );

  // Placa de identificação
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.38),
    maintenanceSignMat
  );

  label.position.set(0, 1.65, 0.72);
  g.add(label);

  return g;
}

// ---------------------------------------------------------
// CENTRO DE USINAGEM CNC
// ---------------------------------------------------------

function createCNC(x, z) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  // Base e corpo
  addBox(
    g, 'Base máquina CNC',
    [3.1, 1.0, 2.0],
    [0, 0.5, 0],
    mats.blue
  );

  addBox(
    g, 'Corpo máquina CNC',
    [3.0, 2.25, 1.8],
    [0, 2.1, 0],
    mats.white
  );

  // Janela frontal
  addBox(
    g, 'Janela CNC moldura',
    [2.1, 1.05, 0.12],
    [0, 2.35, 0.94],
    mats.darkSteel
  );

  addBox(
    g, 'Janela CNC vidro',
    [1.9, 0.85, 0.06],
    [0, 2.35, 1.03],
    mats.glass
  );

  // Braço e painel
  addBox(
    g, 'Painel CNC braço',
    [0.12, 1.1, 0.12],
    [1.85, 2.1, 0.35],
    mats.darkSteel
  );

  addBox(
    g, 'Tela CNC',
    [0.55, 0.48, 0.08],
    [1.88, 2.38, 0.43],
    mats.blueLight
  );

  // Botões do painel
  for (let i = 0; i < 3; i++) {
    const button = addCylinder(
      g, 'Botão CNC',
      0.07, 0.07, 0.08,
      [1.88 + (i - 1) * 0.19, 1.95, 0.45],
      i === 0 ? mats.green : mats.red,
      16
    );

    button.rotation.x = Math.PI / 2;
  }

  // Placa da máquina
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.38),
    makeLabel(
      'CENTRO DE USINAGEM CNC',
      512,
      128,
      '#174c79'
    )
  );

  sign.position.set(0, 3.5, 0.93);
  g.add(sign);
}

// ---------------------------------------------------------
// ARMÁRIO DE SEGURANÇA E EPIs
// ---------------------------------------------------------

function createSafetyCabinet(x, z) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  addBox(
    g, 'Armário segurança corpo',
    [1.6, 2.4, 0.7],
    [0, 1.2, 0],
    mats.red
  );

  const door = addBox(
    g, 'Armário segurança porta',
    [1.42, 2.16, 0.08],
    [0, 1.22, 0.39],
    mats.red
  );

  addBox(
    g, 'Armário segurança puxador',
    [0.07, 0.35, 0.08],
    [0.52, 1.2, 0.46],
    mats.steel
  );

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.35),
    safetySignMat
  );

  sign.position.set(0, 2.1, 0.45);
  g.add(sign);

  // Interação com o armário
  registerInteractive(
    door,
    () => {
      showToast(
        'Segurança: verifique os EPIs antes de iniciar qualquer operação.'
      );

      if (state.mission === 0) {
        completeMission();
      }
    },
    'E / clique: verificar armário de segurança'
  );
}

// ---------------------------------------------------------
// ESTANTES DE COMPONENTES
// ---------------------------------------------------------

function createShelf(x, z) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  // Prateleiras e montantes
  for (const y of [0.65, 1.55, 2.45]) {
    addBox(
      g, 'Prateleira industrial',
      [3.8, 0.12, 0.75],
      [0, y, 0],
      mats.steel
    );

    for (const px of [-1.75, 1.75]) {
      addBox(
        g, 'Montante estante',
        [0.1, 2.8, 0.1],
        [px, 1.4, 0],
        mats.blue
      );
    }
  }

  // Caixas de componentes
  const colors = [
    mats.yellow,
    mats.blue,
    mats.red,
    mats.white,
    mats.green
  ];

  for (let i = 0; i < 5; i++) {
    addBox(
      g, 'Caixa de componentes',
      [0.48, 0.42, 0.5],
      [-1.45 + i * 0.72, 0.94, 0],
      colors[i]
    );

    addBox(
      g, 'Caixa de componentes',
      [0.48, 0.42, 0.5],
      [-1.45 + i * 0.72, 1.84, 0],
      colors[(i + 2) % colors.length]
    );
  }
}

// ---------------------------------------------------------
// CARRINHO DE FERRAMENTAS
// ---------------------------------------------------------

function createToolCart(x, z) {
  const g = new THREE.Group();

  g.position.set(x, 0, z);
  scene.add(g);

  addBox(
    g, 'Carrinho ferramentas bandeja',
    [1.2, 0.12, 0.7],
    [0, 0.8, 0],
    mats.red
  );

  // Pernas e rodas
  for (const px of [-0.48, 0.48]) {
    for (const pz of [-0.25, 0.25]) {
      addBox(
        g, 'Perna carrinho',
        [0.07, 0.75, 0.07],
        [px, 0.4, pz],
        mats.darkSteel
      );

      const wheel = addCylinder(
        g, 'Roda carrinho',
        0.13, 0.13, 0.08,
        [px, 0.13, pz],
        mats.rubber,
        16
      );

      wheel.rotation.z = Math.PI / 2;
    }
  }

  // Ferramentas sobre a bandeja
  for (let i = 0; i < 4; i++) {
    addBox(
      g, 'Ferramenta carrinho',
      [0.12, 0.04, 0.32],
      [-0.35 + i * 0.22, 0.9, 0],
      mats.yellow
    );
  }
}

// ---------------------------------------------------------
// POSICIONAMENTO DOS EQUIPAMENTOS NA OFICINA
// ---------------------------------------------------------

// Armário de segurança
createSafetyCabinet(-23, 19);

// Fileira de furadeiras de bancada
createDrillPress(-20, -16, 1);
createDrillPress(-14, -16, 2);
createDrillPress(-8, -16, 3);
createDrillPress(-2, -16, 4);

// Centros de usinagem CNC
createCNC(11, -17);
createCNC(20, -17);

// Bancadas de manutenção
createWorkbench(-20, -5, 1);
createWorkbench(-11, -5, 2);
createWorkbench(1, -4, 3);
createWorkbench(10, 0, 4);
createWorkbench(20, 2, 5);

// Estantes de componentes
createShelf(-23, -27);
createShelf(23, -27);

// Carrinhos de ferramentas
createToolCart(-4, 7);
createToolCart(14, 9);

// ---------------------------------------------------------
// PAINEL FÍSICO DE EPIs
// ---------------------------------------------------------

addBox(
  scene,
  'Painel EPI suporte',
  [2.4, 1.7, 0.18],
  [-23, 3.4, 18.5],
  mats.white
);

// Capacetes de treinamento
for (let i = 0; i < 3; i++) {
  addBox(
    scene,
    'Capacete EPI',
    [0.42, 0.2, 0.38],
    [-23.65 + i * 0.65, 4.05, 18.35],
    i === 1 ? mats.yellow : mats.blue
  );
}

// Identificação do painel
const epiText = new THREE.Mesh(
  new THREE.PlaneGeometry(2.1, 0.4),
  makeLabel(
    'CAPACETES • ÓCULOS • LUVAS',
    512,
    128,
    '#a32222'
  )
);

epiText.position.set(-23, 3.9, 18.38);
scene.add(epiText);

// Fim da Parte 3.3.
// A Parte 3.4 adicionará missões, interações,
// controles do jogador, movimento e animação.

/* =========================================================
   PARTE 3.4 — MISSÕES, CONTROLES, MOVIMENTO E VR
   Cole abaixo da Parte 3.3.
   ========================================================= */

// ---------------------------------------------------------
// SISTEMA DE MISSÕES E PONTUAÇÃO
// ---------------------------------------------------------

const state = {
  mission: 0,
  score: 0,
  completed: false
};

const missions = [
  {
    title: 'Missão 1 — Segurança',
    desc: 'Encontre o armário vermelho e confira os procedimentos de segurança.'
  },
  {
    title: 'Missão 2 — Operação',
    desc: 'Localize uma furadeira de bancada e acione a alavanca de treinamento.'
  },
  {
    title: 'Missão 3 — Organização',
    desc: 'Confira a bancada de manutenção e as ferramentas organizadas.'
  }
];

// Elementos da interface HTML
const titleEl = document.getElementById('mission-title');
const descEl = document.getElementById('mission-desc');
const scoreEl = document.getElementById('score');
const countEl = document.getElementById('mission-count');
const progressEl = document.getElementById('progress-bar');
const toastEl = document.getElementById('toast');

let toastTimer;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2600);
}

function updateMissionUI() {
  if (state.completed) {
    titleEl.textContent = 'Treinamento concluído!';

    descEl.textContent =
      'Você concluiu as três etapas. Revise os procedimentos ' +
      'antes de operar máquinas reais.';

    countEl.textContent = '3 de 3 concluídas';
    progressEl.style.width = '100%';

    return;
  }

  titleEl.textContent = missions[state.mission].title;
  descEl.textContent = missions[state.mission].desc;

  countEl.textContent =
    `Missão ${state.mission + 1} de ${missions.length}`;

  progressEl.style.width =
    `${(state.mission / missions.length) * 100}%`;
}

function completeMission() {
  // Evita pontuação depois de concluir o treinamento
  if (state.completed) return;

  state.score += 100;
  scoreEl.textContent = state.score;

  state.mission++;

  if (state.mission >= missions.length) {
    state.completed = true;

    showToast(
      'Excelente! Treinamento concluído: +100 XP.'
    );
  } else {
    showToast(
      `Missão concluída! +100 XP. Próxima etapa: ` +
      `${missions[state.mission].title}.`
    );
  }

  updateMissionUI();
}

// Mostrar a primeira missão
updateMissionUI();

// ---------------------------------------------------------
// SISTEMA DE INTERAÇÃO COM EQUIPAMENTOS
// ---------------------------------------------------------

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const tempMatrix = new THREE.Matrix4();

// Procura um objeto interativo no objeto atingido
// ou em algum dos seus objetos pais.
function findInteractiveParent(object) {
  let node = object;

  while (node) {
    if (
      node.userData &&
      typeof node.userData.action === 'function'
    ) {
      return node;
    }

    node = node.parent;
  }

  return null;
}

// Interação pela mira central da câmera
function interactFromCamera() {
  raycaster.setFromCamera(center, camera);

  const hits = raycaster.intersectObjects(
    scene.children,
    true
  );

  for (const hit of hits) {
    const target = findInteractiveParent(hit.object);

    if (target) {
      target.userData.action();
      return;
    }
  }

  showToast(
    'Aponte para o armário, a alavanca da furadeira ' +
    'ou uma bancada.'
  );
}

// Interação com o controle VR
function interactFromController(controller) {
  tempMatrix.identity().extractRotation(
    controller.matrixWorld
  );

  raycaster.ray.origin.setFromMatrixPosition(
    controller.matrixWorld
  );

  raycaster.ray.direction
    .set(0, 0, -1)
    .applyMatrix4(tempMatrix);

  const hits = raycaster.intersectObjects(
    scene.children,
    true
  );

  for (const hit of hits) {
    const target = findInteractiveParent(hit.object);

    if (target) {
      target.userData.action();
      return;
    }
  }

  showToast(
    'Aponte o controle para um equipamento interativo.'
  );
}

// ---------------------------------------------------------
// CONTROLES E EVENTOS DO VR
// ---------------------------------------------------------

// Ao entrar em VR, esconde a tela inicial
renderer.xr.addEventListener('sessionstart', () => {
  document.getElementById('start-overlay').style.display =
    'none';

  showToast(
    'VR ativo: use o gatilho do controle para interagir.'
  );
});

// Controle VR esquerdo
const controller0 = renderer.xr.getController(0);

controller0.addEventListener('select', () => {
  interactFromController(controller0);
});

scene.add(controller0);

const controllerGrip0 = renderer.xr.getControllerGrip(0);
scene.add(controllerGrip0);

// Controle VR direito
const controller1 = renderer.xr.getController(1);

controller1.addEventListener('select', () => {
  interactFromController(controller1);
});

scene.add(controller1);

const controllerGrip1 = renderer.xr.getControllerGrip(1);
scene.add(controllerGrip1);

// ---------------------------------------------------------
// TECLADO DO COMPUTADOR
// ---------------------------------------------------------

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

const keyMap = {
  KeyW: 'forward',
  ArrowUp: 'forward',

  KeyS: 'backward',
  ArrowDown: 'backward',

  KeyA: 'left',
  ArrowLeft: 'left',

  KeyD: 'right',
  ArrowRight: 'right'
};

// Captura as teclas de movimento
document.addEventListener('keydown', event => {
  if (keyMap[event.code]) {
    keys[keyMap[event.code]] = true;
    event.preventDefault();
  }

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft',
     'ArrowRight', 'Space'].includes(event.code)
  ) {
    event.preventDefault();
  }

  // E interage com equipamentos
  if (
    event.code === 'KeyE' &&
    !renderer.xr.isPresenting
  ) {
    interactFromCamera();
  }
});

// Solta as teclas quando o jogador para de pressioná-las
document.addEventListener('keyup', event => {
  if (keyMap[event.code]) {
    keys[keyMap[event.code]] = false;
  }
});

// Evita que uma tecla fique pressionada se a janela perder foco
window.addEventListener('blur', () => {
  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });
});

// Clique esquerdo para interagir quando o mouse está capturado
document.addEventListener('mousedown', event => {
  if (
    event.button === 0 &&
    controls.isLocked &&
    !renderer.xr.isPresenting
  ) {
    interactFromCamera();
  }
});

// ---------------------------------------------------------
// TELA INICIAL E CONTROLE DO MOUSE
// ---------------------------------------------------------

const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-btn');

startButton.addEventListener('click', () => {
  startOverlay.style.display = 'none';

  if (window.matchMedia('(pointer:fine)').matches) {
    controls.lock();
  } else {
    showToast(
      'Use os botões de direção e toque em INTERAGIR.'
    );
  }
});

// Ao liberar o mouse no computador, mostra a tela inicial
controls.addEventListener('unlock', () => {
  if (
    !renderer.xr.isPresenting &&
    window.matchMedia('(pointer:fine)').matches
  ) {
    startOverlay.style.display = 'grid';
  }
});

// Ao sair do VR, mantém a experiência acessível
if (renderer.xr) {
  renderer.xr.addEventListener('sessionend', () => {
    if (
      !window.matchMedia('(pointer:fine)').matches
    ) {
      startOverlay.style.display = 'none';
    }
  });
}

// ---------------------------------------------------------
// CONTROLES DE MOVIMENTO PARA CELULAR
// ---------------------------------------------------------

// Os botões precisam ter data-move no HTML:
// data-move="forward"
// data-move="backward"
// data-move="left"
// data-move="right"

document.querySelectorAll('[data-move]').forEach(button => {
  const key = button.dataset.move;

  const down = event => {
    event.preventDefault();
    keys[key] = true;
  };

  const up = event => {
    event.preventDefault();
    keys[key] = false;
  };

  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
});

// Botão de interação do celular
document.getElementById('interact-btn')
  .addEventListener('click', () => {
    interactFromCamera();
  });

// ---------------------------------------------------------
// OLHAR AO ARRASTAR O DEDO NO CELULAR
// ---------------------------------------------------------

let touchLook = null;

renderer.domElement.addEventListener(
  'pointerdown',
  event => {
    if (
      event.pointerType !== 'touch' ||
      event.target.closest('#mobile-controls')
    ) {
      return;
    }

    touchLook = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
  }
);

renderer.domElement.addEventListener(
  'pointermove',
  event => {
    if (
      !touchLook ||
      touchLook.id !== event.pointerId ||
      renderer.xr.isPresenting
    ) {
      return;
    }

    const dx = event.clientX - touchLook.x;
    const dy = event.clientY - touchLook.y;

    camera.rotation.order = 'YXZ';

    camera.rotation.y -= dx * 0.004;
    camera.rotation.x -= dy * 0.003;

    // Limita o ângulo vertical da câmera
    camera.rotation.x = THREE.MathUtils.clamp(
      camera.rotation.x,
      -1.35,
      1.35
    );

    touchLook.x = event.clientX;
    touchLook.y = event.clientY;
  }
);

renderer.domElement.addEventListener(
  'pointerup',
  event => {
    if (touchLook?.id === event.pointerId) {
      touchLook = null;
    }
  }
);

renderer.domElement.addEventListener(
  'pointercancel',
  () => {
    touchLook = null;
  }
);

// ---------------------------------------------------------
// MOVIMENTO DO JOGADOR
// ---------------------------------------------------------

const clock = new THREE.Clock();

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();

// Limites internos do galpão
const WORLD_LIMIT_X = 27.2;
const WORLD_LIMIT_Z = 29.2;

// Velocidade em unidades por segundo
const PLAYER_SPEED = 5.2;

function updateMovement(delta) {
  // O movimento convencional do teclado fica desativado
  // durante o VR para evitar conflito com a posição do headset.
  if (renderer.xr.isPresenting) return;

  if (
    !controls.isLocked &&
    !keys.forward &&
    !keys.backward &&
    !keys.left &&
    !keys.right
  ) {
    return;
  }

  // Direção horizontal para a qual a câmera está olhando
  camera.getWorldDirection(forward);

  forward.y = 0;

  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1);
  }

  forward.normalize();

  // Direção lateral correta:
  // olhando para -Z, direita corresponde a +X.
  right.crossVectors(forward, camera.up).normalize();

  // Monta o vetor de movimento
  move.set(0, 0, 0);

  if (keys.forward) {
    move.add(forward);
  }

  if (keys.backward) {
    move.sub(forward);
  }

  if (keys.right) {
    move.add(right);
  }

  if (keys.left) {
    move.sub(right);
  }

  // Normalização evita andar mais rápido na diagonal
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(
      PLAYER_SPEED * delta
    );

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x + move.x,
      -WORLD_LIMIT_X,
      WORLD_LIMIT_X
    );

    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z + move.z,
      -WORLD_LIMIT_Z,
      WORLD_LIMIT_Z
    );

    // Altura aproximada dos olhos do jogador
    camera.position.y = 1.68;
  }
}

// ---------------------------------------------------------
// LOOP PRINCIPAL DA EXPERIÊNCIA 3D
// ---------------------------------------------------------

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);

  updateMovement(delta);

  renderer.render(scene, camera);
});

// ---------------------------------------------------------
// AJUSTE AUTOMÁTICO AO REDIMENSIONAR A JANELA
// ---------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.7)
  );
});

// FIM DO ARQUIVO main.js
