
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { CincoMaquinasSENAI } from "./cinco-maquinas.js";

// =====================================================
// 1. CENA, CÂMERA E RENDERIZADOR
// =====================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9daeb8);
scene.fog = new THREE.Fog(0x9daeb8, 45, 110);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  180
);

camera.position.set(0, 1.68, 23);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.xr.enabled = true;

renderer.domElement.id = "oficina-canvas";

Object.assign(renderer.domElement.style, {
  position: "fixed",
  inset: "0",
  width: "100%",
  height: "100%",
  display: "block",
  zIndex: "0",
  outline: "none"
});

document.body.appendChild(renderer.domElement);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

// =====================================================
// 2. CONTROLES DE PRIMEIRA PESSOA
// =====================================================

const controls = new PointerLockControls(camera, renderer.domElement);

const botaoInicio = document.getElementById("start-btn");
const instrucoes = document.getElementById("instructions");

function iniciarJogo() {
  if (instrucoes) {
    instrucoes.style.display = "none";
  }

  // No PC, o mouse controla a visão após clicar.
  const dispositivoTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  if (!dispositivoTouch && !renderer.xr.isPresenting) {
    controls.lock();
  }
}

if (botaoInicio) {
  botaoInicio.addEventListener("click", iniciarJogo);
}

renderer.domElement.addEventListener("click", () => {
  if (renderer.xr.isPresenting) return;

  const dispositivoTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  if (!dispositivoTouch && !controls.isLocked) {
    controls.lock();
  }
});

// =====================================================
// 3. BOTÃO WEBXR / VR
// =====================================================

const vrContainer = document.getElementById("vr-button-container");

try {
  const botaoVR = VRButton.createButton(renderer);

  if (vrContainer) {
    vrContainer.appendChild(botaoVR);
  } else {
    document.body.appendChild(botaoVR);
  }

  Object.assign(botaoVR.style, {
    zIndex: "2000"
  });
} catch (erro) {
  console.warn("[VR] Não foi possível criar o botão VR:", erro);
}

// =====================================================
// 4. MENSAGENS E TELA DE CARREGAMENTO
// =====================================================

const mensagemInteracao = document.getElementById("mensagem-maquinas");

function mostrarMensagem(texto) {
  console.log("[Oficina SENAI]", texto);

  if (mensagemInteracao) {
    mensagemInteracao.textContent = texto;
  }
}

function finalizarCarregamento() {
  // IDs comuns usados na tela de carregamento.
  const seletores = [
    "#loading-screen",
    "#loading",
    "#loader",
    "#loading-overlay",
    "#tela-carregamento",
    ".loading-screen",
    ".loading-overlay",
    ".loader-screen"
  ];

  for (const seletor of seletores) {
    document.querySelectorAll(seletor).forEach((elemento) => {
      elemento.style.opacity = "0";
      elemento.style.pointerEvents = "none";

      // Oculta o painel, sem esconder a cena 3D.
      elemento.style.display = "none";
      elemento.setAttribute("aria-hidden", "true");
    });
  }

  document.body.classList.add("jogo-pronto");

  console.log("[Oficina SENAI] Tela de carregamento finalizada.");
}

// =====================================================
// 5. MATERIAIS E TEXTURAS
// =====================================================

function criarTexturaTijolos() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b6b0a8";
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

      ctx.fillStyle = `rgb(${125 + variacao},${48 + Math.floor(variacao / 3)},${37 + Math.floor(variacao / 4)})`;
      ctx.fillRect(x + deslocamento, y, largura, altura);
    }
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = Math.min(
    renderer.capabilities.getMaxAnisotropy(),
    8
  );

  return textura;
}

function criarTexturaConcreto() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#777b7d";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const tamanho = Math.random() * 3 + 1;
    const tom = Math.floor(75 + Math.random() * 90);

    ctx.fillStyle = `rgba(${tom},${tom},${tom},0.3)`;
    ctx.fillRect(x, y, tamanho, tamanho);
  }

  ctx.strokeStyle = "#55595b";
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
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8c969a";
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = "#657075";
  ctx.lineWidth = 5;

  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  ctx.strokeStyle = "#b0b8bb";
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

// =====================================================
// 6. ILUMINAÇÃO
// =====================================================

scene.add(
  new THREE.HemisphereLight(0xe8f3ff, 0x62584b, 2)
);

const luzPrincipal = new THREE.DirectionalLight(0xfff0d8, 2.5);
luzPrincipal.position.set(-15, 24, 12);
luzPrincipal.castShadow = true;
luzPrincipal.shadow.mapSize.set(2048, 2048);
luzPrincipal.shadow.camera.left = -35;
luzPrincipal.shadow.camera.right = 35;
luzPrincipal.shadow.camera.top = 35;
luzPrincipal.shadow.camera.bottom = -35;

scene.add(luzPrincipal);

// =====================================================
// 7. CONSTRUÇÃO DO GALPÃO
// =====================================================

const galpao = new THREE.Group();
galpao.name = "GalpaoIndustrial";
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
    direcao.clone().normalize()
  );

  viga.castShadow = true;
  viga.receiveShadow = true;
  galpao.add(viga);

  return viga;
}

function criarPlaca(texto, largura = 3, altura = 0.7) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#153e32";
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 256, 64, 480);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(largura, altura),
    new THREE.MeshBasicMaterial({
      map: textura,
      side: THREE.DoubleSide
    })
  );
}

// Piso
criarCaixa(
  "Piso de concreto",
  [60, 0.3, 64],
  [0, -0.15, 0],
  mats.concreto
);

const gradePiso = new THREE.GridHelper(
  60,
  30,
  0x555b5e,
  0x656b6d
);

gradePiso.position.y = 0.006;
galpao.add(gradePiso);

// Paredes traseiras
criarCaixa(
  "Parede traseira tijolos esquerda",
  [21, 3.2, 0.5],
  [-19.5, 1.6, -31.8],
  mats.tijolo
);

criarCaixa(
  "Parede traseira tijolos direita",
  [21, 3.2, 0.5],
  [19.5, 1.6, -31.8],
  mats.tijolo
);

criarCaixa(
  "Parede traseira superior",
  [60, 4.5, 0.5],
  [0, 5.45, -31.8],
  mats.reboco
);

// Paredes laterais
for (const x of [-29.8, 29.8]) {
  criarCaixa(
    "Parede lateral inferior de tijolos",
    [0.5, 3.2, 64],
    [x, 1.6, 0],
    mats.tijolo
  );

  criarCaixa(
    "Parede lateral superior",
    [0.5, 4.5, 64],
    [x, 5.45, 0],
    mats.reboco
  );

  criarCaixa(
    "Viga longitudinal verde",
    [0.35, 0.35, 64],
    [x * 0.985, 7.8, 0],
    mats.verde
  );
}

// Frente do galpão
criarCaixa(
  "Parede frontal esquerda",
  [20, 3.2, 0.5],
  [-20, 1.6, 31.8],
  mats.tijolo
);

criarCaixa(
  "Parede frontal direita",
  [20, 3.2, 0.5],
  [20, 1.6, 31.8],
  mats.tijolo
);

criarCaixa(
  "Parede frontal superior",
  [60, 4.5, 0.5],
  [0, 5.45, 31.8],
  mats.reboco
);

// Telhado
// Duas águas inclinadas, formando um telhado de galpão.
const coberturaEsquerda = new THREE.Mesh(
  new THREE.PlaneGeometry(30.5, 65),
  mats.telhado
);

coberturaEsquerda.rotation.x = -Math.PI / 2;
coberturaEsquerda.rotation.z = -0.08;
coberturaEsquerda.position.set(-14.9, 8.25, 0);
galpao.add(coberturaEsquerda);

const coberturaDireita = new THREE.Mesh(
  new THREE.PlaneGeometry(30.5, 65),
  mats.telhado
);

coberturaDireita.rotation.x = -Math.PI / 2;
coberturaDireita.rotation.z = 0.08;
coberturaDireita.position.set(14.9, 8.25, 0);
galpao.add(coberturaDireita);

// Treliças e luminárias
for (let z = -28; z <= 28; z += 7) {
  criarVigaEntre(
    [-29, 5.9, z],
    [0, 8.0, z],
    0.28,
    mats.verde
  );

  criarVigaEntre(
    [0, 8.0, z],
    [29, 5.9, z],
    0.28,
    mats.verde
  );

  criarVigaEntre(
    [-29, 5.9, z],
    [29, 5.9, z],
    0.2,
    mats.verde
  );

  const luminaria = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.12, 0.35),
    mats.luz
  );

  luminaria.position.set(0, 7.2, z);
  galpao.add(luminaria);

  // Luzes pontuais moderadas para não sobrecarregar celulares.
  const luz = new THREE.PointLight(0xfff0d6, 35, 22);
  luz.position.set(0, 6.9, z);
  galpao.add(luz);
}

criarCaixa(
  "Viga longitudinal central",
  [0.3, 0.3, 60],
  [0, 8.05, 0],
  mats.verde
);

// Janelas altas no fundo
for (let x = -24; x <= 24; x += 6) {
  criarCaixa(
    "Moldura metálica da janela",
    [4.5, 1.8, 0.18],
    [x, 6.5, -31.45],
    mats.metal
  );

  criarCaixa(
    "Vidro da janela",
    [4.2, 1.55, 0.1],
    [x, 6.5, -31.32],
    mats.vidro
  );

  criarCaixa(
    "Divisória vertical da janela",
    [0.08, 1.7, 0.12],
    [x, 6.5, -31.2],
    mats.metal
  );
}

// Portão lateral
for (let i = 0; i < 10; i++) {
  criarCaixa(
    "Régua do portão industrial",
    [0.12, 0.22, 8],
    [29.45, 0.25 + i * 0.25, -20],
    i % 2 === 0 ? mats.branco : mats.metal
  );
}

criarCaixa(
  "Coluna esquerda do portão",
  [0.45, 4.2, 0.45],
  [29.2, 2.1, -24.3],
  mats.metal
);

criarCaixa(
  "Coluna direita do portão",
  [0.45, 4.2, 0.45],
  [29.2, 2.1, -15.7],
  mats.metal
);

// Porta de vidro e sinalização no fundo
criarCaixa(
  "Moldura porta dupla",
  [3.2, 3.2, 0.25],
  [-20, 1.6, -31.3],
  mats.metal
);

criarCaixa(
  "Vidro porta dupla",
  [2.9, 2.9, 0.12],
  [-20, 1.6, -31.12],
  mats.vidro
);

const placaFundo = criarPlaca("SAÍDA", 1.5, 0.45);
placaFundo.position.set(-20, 3.6, -31.0);
galpao.add(placaFundo);

// Porta lateral de saída
criarCaixa(
  "Moldura porta lateral",
  [0.25, 2.5, 1.5],
  [-29.4, 1.25, 10],
  mats.metal
);

criarCaixa(
  "Folha porta lateral",
  [0.12, 2.3, 1.25],
  [-29.22, 1.25, 10],
  mats.verde
);

const placaLateral = criarPlaca("SAÍDA", 1.4, 0.45);
placaLateral.rotation.y = Math.PI / 2;
placaLateral.position.set(-29.0, 2.8, 10);
galpao.add(placaLateral);

const placaOficina = criarPlaca(
  "ÁREA DE MECATRÔNICA",
  5,
  0.8
);

placaOficina.position.set(0, 4.3, 31.45);
galpao.add(placaOficina);

// Faixas de segurança
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

// =====================================================
// 8. CONTROLES DE TECLADO E CELULAR
// =====================================================

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

function atualizarTecla(evento, pressionada) {
  switch (evento.code) {
    case "KeyW":
    case "ArrowUp":
      teclas.frente = pressionada;
      break;

    case "KeyS":
    case "ArrowDown":
      teclas.tras = pressionada;
      break;

    case "KeyA":
    case "ArrowLeft":
      teclas.esquerda = pressionada;
      break;

    case "KeyD":
    case "ArrowRight":
      teclas.direita = pressionada;
      break;

    case "ShiftLeft":
    case "ShiftRight":
      teclas.correr = pressionada;
      break;
  }
}

document.addEventListener("keydown", (evento) => {
  atualizarTecla(evento, true);
});

document.addEventListener("keyup", (evento) => {
  atualizarTecla(evento, false);
});

window.addEventListener("blur", () => {
  for (const chave of Object.keys(teclas)) {
    teclas[chave] = false;
  }
});

const controlesMobile = document.createElement("div");
controlesMobile.id = "controles-mobile";

Object.assign(controlesMobile.style, {
  position: "fixed",
  left: "16px",
  bottom: "20px",
  zIndex: "1000",
  display: "none",
  gridTemplateColumns: "repeat(3, 58px)",
  gridTemplateRows: "repeat(2, 58px)",
  gap: "6px",
  touchAction: "none"
});

function criarBotaoMobile(texto, propriedade, coluna, linha) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = texto;

  Object.assign(botao.style, {
    gridColumn: String(coluna),
    gridRow: String(linha),
    fontSize: "22px",
    color: "#ffffff",
    background: "rgba(20,55,75,0.88)",
    border: "1px solid #ffffff",
    borderRadius: "12px",
    touchAction: "none",
    userSelect: "none"
  });

  const ativar = (evento) => {
    evento.preventDefault();
    teclas[propriedade] = true;
  };

  const desativar = (evento) => {
    evento.preventDefault();
    teclas[propriedade] = false;
  };

  botao.addEventListener("pointerdown", ativar);
  botao.addEventListener("pointerup", desativar);
  botao.addEventListener("pointercancel", desativar);
  botao.addEventListener("lostpointercapture", () => {
    teclas[propriedade] = false;
  });

  controlesMobile.appendChild(botao);
}

criarBotaoMobile("↑", "frente", 2, 1);
criarBotaoMobile("←", "esquerda", 1, 2);
criarBotaoMobile("↓", "tras", 2, 2);
criarBotaoMobile("→", "direita", 3, 2);

document.body.appendChild(controlesMobile);

function atualizarInterfaceMobile() {
  const dispositivoTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  controlesMobile.style.display = dispositivoTouch ? "grid" : "none";
}

atualizarInterfaceMobile();
window.addEventListener("resize", atualizarInterfaceMobile);

// =====================================================
// 9. CARREGAMENTO DAS CINCO MÁQUINAS
// =====================================================

const maquinas = new CincoMaquinasSENAI(scene, mostrarMensagem);

// Inicia o carregamento sem bloquear a criação da cena e o renderizador.
// A tela de carregamento é encerrada mesmo se houver falhas nos modelos.
const promessaCarregamento = (async () => {
  try {
    await maquinas.carregarTodas();
    console.log(
      `[Oficina SENAI] ${maquinas.maquinas.length} de 5 máquinas carregadas.`
    );
  } catch (erro) {
    console.error("[Oficina SENAI] Erro geral nas máquinas:", erro);
    mostrarMensagem("O cenário iniciou, mas houve um erro nas máquinas.");
  } finally {
    finalizarCarregamento();
  }
})();

// =====================================================
// 10. SELEÇÃO DE MÁQUINAS
// =====================================================

const raycaster = new THREE.Raycaster();
const centroTela = new THREE.Vector2(0, 0);

function selecionarObjeto() {
  raycaster.setFromCamera(centroTela, camera);

  const objetos = [];

  scene.traverse((objeto) => {
    if (objeto.isMesh && objeto.visible) {
      objetos.push(objeto);
    }
  });

  const intersecoes = raycaster.intersectObjects(objetos, false);

  if (intersecoes.length === 0) {
    mostrarMensagem("Nenhum objeto selecionado.");
    return;
  }

  let atual = intersecoes[0].object;

  while (atual && atual !== scene) {
    if (atual.userData?.id) {
      const maquina = maquinas.encontrar(atual.userData.id);

      if (maquina) {
        mostrarMensagem(`Máquina selecionada: ${maquina.nome}`);
        return;
      }
    }

    if (atual.userData?.idMaquina) {
      const maquina = maquinas.encontrar(atual.userData.idMaquina);

      if (maquina) {
        mostrarMensagem(`Máquina selecionada: ${maquina.nome}`);
        return;
      }
    }

    atual = atual.parent;
  }

  mostrarMensagem(
    `Objeto selecionado: ${intersecoes[0].object.name || "objeto industrial"}`
  );
}

document.addEventListener("mousedown", (evento) => {
  if (
    evento.button === 0 &&
    controls.isLocked &&
    !renderer.xr.isPresenting
  ) {
    selecionarObjeto();
  }
});

// Controladores VR disponíveis para futuras interações por apontamento.
const controladorEsquerdo = renderer.xr.getController(0);
const controladorDireito = renderer.xr.getController(1);

scene.add(controladorEsquerdo);
scene.add(controladorDireito);

// =====================================================
// 11. MOVIMENTAÇÃO E LIMITES DO GALPÃO
// =====================================================

const direcao = new THREE.Vector3();
const movimento = new THREE.Vector3();

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

function moverJogador(delta) {
  if (renderer.xr.isPresenting) {
    // A posição do headset é gerenciada pelo WebXR.
    return;
  }

  const dispositivoTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  if (!controls.isLocked && !dispositivoTouch) {
    return;
  }

  direcao.set(
    Number(teclas.direita) - Number(teclas.esquerda),
    0,
    Number(teclas.tras) - Number(teclas.frente)
  );

  if (direcao.lengthSq() === 0) {
    return;
  }

  direcao.normalize();

  const velocidadeAtual = teclas.correr
    ? velocidadeCorrida
    : velocidade;

  movimento.copy(direcao).multiplyScalar(velocidadeAtual * delta);

  if (controls.isLocked) {
    // No PC, movimenta em relação à direção da câmera.
    controls.moveRight(movimento.x);
    controls.moveForward(-movimento.z);
  } else {
    // No celular, calcula a direção relativa à visão atual.
    const frente = new THREE.Vector3();
    camera.getWorldDirection(frente);
    frente.y = 0;
    frente.normalize();

    const direita = new THREE.Vector3()
      .crossVectors(frente, camera.up)
      .normalize();

    camera.position.addScaledVector(direita, movimento.x);
    camera.position.addScaledVector(frente, -movimento.z);
  }

  limitarJogador();
}

// =====================================================
// 12. LOOP DE RENDERIZAÇÃO
// =====================================================

renderer.setAnimationLoop(() => {
  const delta = Math.min(relogio.getDelta(), 0.05);

  try {
    moverJogador(delta);

    if (typeof maquinas.atualizar === "function") {
      maquinas.atualizar(delta);
    }

    renderer.render(scene, camera);
  } catch (erro) {
    console.error("[Oficina SENAI] Erro durante a renderização:", erro);
  }
});

// =====================================================
// 13. REDIMENSIONAMENTO
// =====================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
});

console.log("[Oficina SENAI] Cena iniciada.");
console.log("[Oficina SENAI] Carregamento das máquinas em andamento.");

const painel = document.getElementById('painel-controle');

if (painel) {
  const botao = document.createElement('button');

  botao.id = 'alternar-painel';
  botao.textContent = '⌄ Ocultar painel';
  painel.appendChild(botao);

  botao.addEventListener('click', () => {
    const recolhido = painel.classList.toggle('recolhido');

    botao.textContent = recolhido
      ? '⌃ Mostrar painel'
      : '⌄ Ocultar painel';
  });

  // Começa recolhido para deixar a oficina visível.
  painel.classList.add('recolhido');
  botao.textContent = '⌃ Mostrar painel';
}
