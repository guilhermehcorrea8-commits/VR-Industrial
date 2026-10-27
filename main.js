
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ======================================================
// 1. CONFIGURAÇÕES
// ======================================================

const CONFIG = {
  modelo: "./scene.glb",

  larguraGalpao: 30,
  profundidadeGalpao: 44,
  alturaGalpao: 8,

  // Ajuste para 1 para preservar o tamanho original.
  // O código reduz modelos que ultrapassem o limite.
  tamanhoMaximoModelo: 16,

  velocidade: 5,
  velocidadeCorrida: 8,
  sensibilidadeToque: 0.004,

  alturaCamera: 1.68,
  limiteVerticalVisao: 1.45
};

const $ = (seletor) => document.querySelector(seletor);

const loading = $("#loading");
const loadingMessage = $("#loading-message");
const statusEl = $("#status");
const messageEl = $("#message");
const startButton = $("#start-btn");
const instructions = $("#instructions");
const selectedObjectEl = $("#selected-object");

// ======================================================
// 2. CENA, CÂMERA E RENDERIZADOR
// ======================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x9daeb8);
scene.fog = new THREE.Fog(0x9daeb8, 35, 100);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  180
);

camera.position.set(0, CONFIG.alturaCamera, 15);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 1.7)
);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.xr.enabled = true;

renderer.domElement.id = "oficina-canvas";
renderer.domElement.setAttribute("aria-label", "Visão 3D da oficina");

Object.assign(renderer.domElement.style, {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  display: "block",
  zIndex: "0",
  outline: "none"
});

$("#game").prepend(renderer.domElement);

// Disponibiliza referências para diagnóstico no DevTools.
window.__oficina = {
  scene,
  camera,
  renderer,
  modelo: null,
  maquinas: [],
  carregado: false
};

// ======================================================
// 3. CONTROLES
// ======================================================

const controls = new PointerLockControls(
  camera,
  renderer.domElement
);

const teclas = new Set();
const movimentoTouch = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

let jogoIniciado = false;
let mensagemTimer = null;

const temTouch =
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

function atualizarStatus(texto) {
  if (statusEl) statusEl.textContent = texto;
}

function mostrarMensagem(texto, duracao = 3000) {
  console.log("[Oficina VR SENAI]", texto);

  if (!messageEl) return;

  messageEl.textContent = texto;
  messageEl.classList.add("visible");

  clearTimeout(mensagemTimer);

  mensagemTimer = setTimeout(() => {
    messageEl.classList.remove("visible");
  }, duracao);
}

function ocultarCarregamento() {
  if (loading) loading.classList.add("hidden");
}

function iniciarJogo() {
  jogoIniciado = true;

  instructions?.classList.add("hidden");

  if (!temTouch && !renderer.xr.isPresenting) {
    if (!controls.isLocked) {
      controls.lock();
    }
  }

  atualizarStatus("Exploração iniciada");
}

startButton?.addEventListener("click", iniciarJogo);

controls.addEventListener("lock", () => {
  atualizarStatus("Mouse capturado · ESC para liberar");
});

controls.addEventListener("unlock", () => {
  if (jogoIniciado && !renderer.xr.isPresenting) {
    atualizarStatus("Mouse livre · clique para continuar");
  }
});

renderer.domElement.addEventListener("click", () => {
  if (!jogoIniciado || temTouch || renderer.xr.isPresenting) {
    return;
  }

  if (!controls.isLocked) {
    controls.lock();
  }
});

// ======================================================
// 4. WEBXR / VR
// ======================================================

try {
  const botaoVR = VRButton.createButton(renderer);
  const containerVR = $("#vr-button-container");

  if (containerVR) {
    containerVR.appendChild(botaoVR);
  } else {
    document.body.appendChild(botaoVR);
  }

  renderer.xr.addEventListener("sessionstart", () => {
    document.body.classList.add("vr-active");
    instructions?.classList.add("hidden");
    jogoIniciado = true;
    atualizarStatus("Modo VR ativo");
  });

  renderer.xr.addEventListener("sessionend", () => {
    document.body.classList.remove("vr-active");
    atualizarStatus("Modo VR encerrado");
  });
} catch (erro) {
  console.warn("[VR] Não foi possível criar o botão:", erro);
}

// ======================================================
// 5. TEXTURAS PROCEDURAIS
// ======================================================

function criarTexturaCanvas(desenhar, repetirX = 1, repetirY = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  desenhar(ctx);

  const textura = new THREE.CanvasTexture(canvas);

  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(repetirX, repetirY);
  textura.anisotropy = Math.min(
    renderer.capabilities.getMaxAnisotropy(),
    8
  );

  return textura;
}

const texturaTijolo = criarTexturaCanvas((ctx) => {
  ctx.fillStyle = "#b8b0a7";
  ctx.fillRect(0, 0, 512, 512);

  const largura = 90;
  const altura = 32;
  const junta = 5;

  for (let y = 0; y < 512; y += altura + junta) {
    const deslocamento =
      Math.floor(y / (altura + junta)) % 2
        ? largura / 2
        : 0;

    for (let x = -largura; x < 512; x += largura + junta) {
      const variacao = Math.floor(Math.random() * 25);

      ctx.fillStyle = `rgb(
        ${125 + variacao},
        ${48 + Math.floor(variacao / 3)},
        ${37 + Math.floor(variacao / 4)}
      )`;

      ctx.fillRect(x + deslocamento, y, largura, altura);
    }
  }
}, 4, 2);

const texturaConcreto = criarTexturaCanvas((ctx) => {
  ctx.fillStyle = "#777b7d";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const tamanho = Math.random() * 2 + 0.5;
    const tom = Math.floor(70 + Math.random() * 100);

    ctx.fillStyle = `rgba(${tom},${tom},${tom},0.28)`;
    ctx.fillRect(x, y, tamanho, tamanho);
  }

  ctx.strokeStyle = "#5d6163";
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
}, 8, 12);

const texturaTelhado = criarTexturaCanvas((ctx) => {
  ctx.fillStyle = "#899398";
  ctx.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 24) {
    ctx.fillStyle = "#657075";
    ctx.fillRect(x, 0, 4, 512);

    ctx.fillStyle = "#aeb7ba";
    ctx.fillRect(x + 5, 0, 1, 512);
  }
}, 5, 4);

// ======================================================
// 6. MATERIAIS
// ======================================================

const mats = {
  concreto: new THREE.MeshStandardMaterial({
    map: texturaConcreto,
    roughness: 0.96
  }),

  tijolo: new THREE.MeshStandardMaterial({
    map: texturaTijolo,
    roughness: 0.92
  }),

  reboco: new THREE.MeshStandardMaterial({
    color: 0xc6c8c5,
    roughness: 0.9
  }),

  telhado: new THREE.MeshStandardMaterial({
    map: texturaTelhado,
    roughness: 0.8,
    metalness: 0.35,
    side: THREE.DoubleSide
  }),

  verde: new THREE.MeshStandardMaterial({
    color: 0x17653c,
    roughness: 0.55,
    metalness: 0.4
  }),

  metal: new THREE.MeshStandardMaterial({
    color: 0x596267,
    roughness: 0.42,
    metalness: 0.75
  }),

  metalEscuro: new THREE.MeshStandardMaterial({
    color: 0x30373b,
    roughness: 0.6,
    metalness: 0.65
  }),

  azul: new THREE.MeshStandardMaterial({
    color: 0x174c79,
    roughness: 0.45,
    metalness: 0.25
  }),

  amarelo: new THREE.MeshStandardMaterial({
    color: 0xf2c62d,
    roughness: 0.65
  }),

  vidro: new THREE.MeshStandardMaterial({
    color: 0x82c6df,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    side: THREE.DoubleSide
  }),

  branco: new THREE.MeshStandardMaterial({
    color: 0xe8e8e4,
    roughness: 0.65
  }),

  luz: new THREE.MeshBasicMaterial({
    color: 0xfff2cb
  })
};

// ======================================================
// 7. ILUMINAÇÃO
// ======================================================

scene.add(
  new THREE.HemisphereLight(0xe8f3ff, 0x62584b, 2)
);

const luzPrincipal = new THREE.DirectionalLight(0xfff0d8, 2.5);

luzPrincipal.position.set(-12, 20, 10);
luzPrincipal.castShadow = true;
luzPrincipal.shadow.mapSize.set(1536, 1536);
luzPrincipal.shadow.camera.left = -24;
luzPrincipal.shadow.camera.right = 24;
luzPrincipal.shadow.camera.top = 24;
luzPrincipal.shadow.camera.bottom = -24;
luzPrincipal.shadow.normalBias = 0.04;

scene.add(luzPrincipal);

// ======================================================
// 8. CONSTRUÇÃO DO GALPÃO
// ======================================================

const galpao = new THREE.Group();
galpao.name = "GalpaoIndustrial";
scene.add(galpao);

function criarCaixa(
  nome,
  tamanho,
  posicao,
  material,
  pai = galpao
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...tamanho),
    material
  );

  mesh.name = nome;
  mesh.position.set(...posicao);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  pai.add(mesh);
  return mesh;
}

const L = CONFIG.larguraGalpao;
const P = CONFIG.profundidadeGalpao;
const H = CONFIG.alturaGalpao;
const parede = 0.35;

// Piso.
criarCaixa(
  "PisoConcreto",
  [L, 0.3, P],
  [0, -0.15, 0],
  mats.concreto
);

// Paredes laterais.
criarCaixa(
  "ParedeEsquerda",
  [parede, H, P],
  [-L / 2, H / 2, 0],
  mats.tijolo
);

criarCaixa(
  "ParedeDireita",
  [parede, H, P],
  [L / 2, H / 2, 0],
  mats.tijolo
);

// Parede do fundo.
criarCaixa(
  "ParedeFundo",
  [L, H, parede],
  [0, H / 2, -P / 2],
  mats.tijolo
);

// Parede da entrada com abertura para portão.
const larguraPortao = 8;
const alturaPortao = 4.5;
const larguraLateral = (L - larguraPortao) / 2;

criarCaixa(
  "EntradaEsquerda",
  [larguraLateral, H, parede],
  [-(larguraPortao / 2 + larguraLateral / 2), H / 2, P / 2],
  mats.tijolo
);

criarCaixa(
  "EntradaDireita",
  [larguraLateral, H, parede],
  [larguraPortao / 2 + larguraLateral / 2, H / 2, P / 2],
  mats.tijolo
);

criarCaixa(
  "ParedeAcimaPortao",
  [larguraPortao, H - alturaPortao, parede],
  [0, alturaPortao + (H - alturaPortao) / 2, P / 2],
  mats.tijolo
);

// Portão metálico representativo.
const portao = criarCaixa(
  "PortaoGaragem",
  [larguraPortao - 0.2, alturaPortao - 0.1, 0.12],
  [0, alturaPortao / 2, P / 2 - 0.2],
  mats.metalEscuro
);

portao.material = mats.metalEscuro;

// Ripas horizontais do portão.
for (let y = 0.5; y < alturaPortao - 0.1; y += 0.45) {
  criarCaixa(
    `RipaPortao_${y}`,
    [larguraPortao - 0.35, 0.045, 0.04],
    [0, y, P / 2 - 0.12],
    mats.metal
  );
}

// Telhado.
criarCaixa(
  "TelhadoMetalico",
  [L + 1, 0.25, P + 1],
  [0, H + 0.15, 0],
  mats.telhado
);

// Vigas estruturais laterais.
for (let z = -P / 2 + 1; z <= P / 2; z += 5.5) {
  criarCaixa(
    `PilarEsquerdo_${z}`,
    [0.32, H, 0.32],
    [-L / 2 + 0.35, H / 2, z],
    mats.verde
  );

  criarCaixa(
    `PilarDireito_${z}`,
    [0.32, H, 0.32],
    [L / 2 - 0.35, H / 2, z],
    mats.verde
  );

  criarCaixa(
    `VigaTransversal_${z}`,
    [L - 0.5, 0.3, 0.3],
    [0, H - 0.2, z],
    mats.verde
  );
}

// Janelas altas nas paredes laterais.
// São posicionadas na face interna das paredes.
for (const lado of [-1, 1]) {
  for (const z of [-13, -5, 3, 11]) {
    criarCaixa(
      `Janela_${lado}_${z}`,
      [0.07, 1.2, 3.2],
      [lado * (L / 2 - 0.19), 5.4, z],
      mats.vidro
    );

    criarCaixa(
      `MolduraJanela_${lado}_${z}`,
      [0.12, 1.35, 3.35],
      [lado * (L / 2 - 0.24), 5.4, z],
      mats.metal
    );
  }
}

// Luminárias.
for (const z of [-15, -5, 5, 15]) {
  criarCaixa(
    `Luminaria_${z}`,
    [4, 0.08, 0.35],
    [0, H - 0.4, z],
    mats.luz
  );
}

// Faixas de segurança no piso.
const faixaMaterial = new THREE.MeshBasicMaterial({
  color: 0xf4c430
});

for (const x of [-11, -6, 0, 6, 11]) {
  criarCaixa(
    `FaixaSeguranca_${x}`,
    [0.07, 0.012, P - 4],
    [x, 0.012, 0],
    faixaMaterial
  );
}

// ======================================================
// 9. CARREGAMENTO DO SCENE.GLB
// ======================================================

const loader = new GLTFLoader();
const grupoModelo = new THREE.Group();

grupoModelo.name = "ModeloSceneGLB";
scene.add(grupoModelo);

function listarObjetosDoModelo(raiz) {
  const encontrados = [];

  raiz.traverse((objeto) => {
    if (!objeto.isMesh) return;

    objeto.castShadow = true;
    objeto.receiveShadow = true;

    encontrados.push(objeto);
  });

  return encontrados;
}

function posicionarModelo(raiz) {
  const caixaInicial = new THREE.Box3().setFromObject(raiz);

  if (caixaInicial.isEmpty()) {
    throw new Error("O arquivo GLB não contém geometria visível.");
  }

  const tamanhoInicial = caixaInicial.getSize(new THREE.Vector3());
  const centroInicial = caixaInicial.getCenter(new THREE.Vector3());

  const maiorDimensao = Math.max(
    tamanhoInicial.x,
    tamanhoInicial.y,
    tamanhoInicial.z
  );

  if (!Number.isFinite(maiorDimensao) || maiorDimensao <= 0) {
    throw new Error("Não foi possível calcular as dimensões do modelo.");
  }

  // Não aumenta automaticamente modelos pequenos.
  const fator = Math.min(
    1,
    CONFIG.tamanhoMaximoModelo / maiorDimensao
  );

  raiz.scale.multiplyScalar(fator);

  // Recalcula as dimensões depois da escala.
  raiz.updateMatrixWorld(true);

  const caixaFinal = new THREE.Box3().setFromObject(raiz);
  const centroFinal = caixaFinal.getCenter(new THREE.Vector3());

  // Centraliza horizontalmente e apoia o modelo no piso.
  raiz.position.x -= centroFinal.x;
  raiz.position.z -= centroFinal.z;
  raiz.position.y -= caixaFinal.min.y;

  // Coloca o conjunto de máquinas dentro da oficina.
  raiz.position.z -= 3;

  raiz.updateMatrixWorld(true);

  const caixaPosicionada = new THREE.Box3().setFromObject(raiz);
  const dimensoesFinais = caixaPosicionada.getSize(new THREE.Vector3());

  console.log("[Oficina VR SENAI] Dimensões originais:", tamanhoInicial.toArray());
  console.log("[Oficina VR SENAI] Fator de escala aplicado:", fator);
  console.log("[Oficina VR SENAI] Dimensões finais:", dimensoesFinais.toArray());
}

function registrarMaquinasDoGlb(raiz) {
  // Registra meshes para diagnóstico e seleção.
  // Não pressupõe nomes específicos no arquivo exportado.
  const meshes = listarObjetosDoModelo(raiz);

  window.__oficina.maquinas = meshes.map((objeto, indice) => ({
    id: indice,
    nome: objeto.name || `Objeto ${indice + 1}`,
    objeto
  }));

  console.log(
    `[Oficina VR SENAI] Modelo carregado com ${meshes.length} meshes.`
  );

  console.log(
    "[Oficina VR SENAI] Nomes dos primeiros objetos:",
    meshes.slice(0, 30).map((m) => m.name || "(sem nome)")
  );
}

function carregarScene() {
  atualizarStatus("Carregando modelo 3D");

  if (loadingMessage) {
    loadingMessage.textContent = "Carregando scene.glb...";
  }

  loader.load(
    CONFIG.modelo,

    (gltf) => {
      try {
        const modelo = gltf.scene;

        modelo.name = "SceneMaquinasSENAI";

        posicionarModelo(modelo);
        grupoModelo.add(modelo);
        registrarMaquinasDoGlb(modelo);

        window.__oficina.modelo = modelo;
        window.__oficina.carregado = true;

        atualizarStatus("Modelo 3D carregado");

        if (startButton) {
          startButton.disabled = false;
          startButton.textContent = "ENTRAR NA OFICINA";
        }

        ocultarCarregamento();

        mostrarMensagem(
          "Modelo carregado. Entre na oficina para começar.",
          4500
        );

        console.log("[Oficina VR SENAI] scene.glb carregado com sucesso.");
      } catch (erro) {
        console.error("[Oficina VR SENAI] Erro ao preparar o modelo:", erro);

        atualizarStatus("Erro ao preparar modelo");

        if (startButton) {
          startButton.disabled = false;
          startButton.textContent = "ENTRAR NA OFICINA";
        }

        ocultarCarregamento();

        mostrarMensagem(
          "O arquivo abriu, mas não foi possível preparar sua geometria.",
          6000
        );
      }
    },

    (progresso) => {
      if (progresso.total > 0 && loadingMessage) {
        const percentual = Math.round(
          (progresso.loaded / progresso.total) * 100
        );

        loadingMessage.textContent =
          `Carregando modelo industrial: ${percentual}%`;
      }
    },

    (erro) => {
      console.error(
        "[Oficina VR SENAI] Falha no GLTFLoader:",
        erro
      );

      atualizarStatus("Modelo não encontrado");

      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = "ENTRAR SEM O MODELO";
      }

      ocultarCarregamento();

      mostrarMensagem(
        "Não foi possível abrir scene.glb. Confira o caminho e o Console.",
        8000
      );
    }
  );
}

carregarScene();

// ======================================================
// 10. IDENTIFICAÇÃO E SELEÇÃO DE OBJETOS
// ======================================================

const raycaster = new THREE.Raycaster();
const centroTela = new THREE.Vector2(0, 0);

function selecionarObjeto() {
  const modelo = window.__oficina.modelo;

  if (!modelo) {
    mostrarMensagem("O modelo de máquinas ainda não foi carregado.");
    return;
  }

  raycaster.setFromCamera(centroTela, camera);

  const intersecoes = raycaster.intersectObject(modelo, true);

  if (!intersecoes.length) {
    if (selectedObjectEl) {
      selectedObjectEl.textContent = "Nenhum objeto selecionado";
    }
    return;
  }

  let objeto = intersecoes[0].object;

  // Sobe a hierarquia para tentar encontrar um nome informativo.
  let nome = objeto.name || "";

  while (objeto && (!nome || /^Object_\d+$/i.test(nome))) {
    if (objeto.name) nome = objeto.name;

    if (objeto.parent === modelo || !objeto.parent) break;
    objeto = objeto.parent;

    if (objeto.name && objeto.name !== "SceneMaquinasSENAI") {
      nome = objeto.name;
    }
  }

  nome = nome || "Objeto industrial";

  if (selectedObjectEl) {
    selectedObjectEl.textContent = nome;
  }

  mostrarMensagem(`Selecionado: ${nome}`);
}

// Clique seleciona o objeto observado no centro da tela.
// O clique também pode solicitar o Pointer Lock no computador.
renderer.domElement.addEventListener("pointerup", (evento) => {
  if (evento.pointerType === "touch") return;

  if (jogoIniciado && !controls.isLocked && !temTouch) {
    controls.lock();
  }

  selecionarObjeto();
});

// ======================================================
// 11. MOVIMENTAÇÃO POR TECLADO
// ======================================================

window.addEventListener("keydown", (evento) => {
  const tecla = evento.key.toLowerCase();

  if (
    ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "]
      .includes(tecla)
  ) {
    evento.preventDefault();
  }

  teclas.add(tecla);
});

window.addEventListener("keyup", (evento) => {
  teclas.delete(evento.key.toLowerCase());
});

window.addEventListener("blur", () => {
  teclas.clear();

  for (const chave of Object.keys(movimentoTouch)) {
    movimentoTouch[chave] = false;
  }
});

function moverJogador(delta) {
  if (!jogoIniciado) return;

  const frente =
    teclas.has("w") ||
    teclas.has("arrowup") ||
    movimentoTouch.forward;

  const tras =
    teclas.has("s") ||
    teclas.has("arrowdown") ||
    movimentoTouch.backward;

  const esquerda =
    teclas.has("d") ||
    teclas.has("arrowleft") ||
    movimentoTouch.left;

  const direita =
    teclas.has("a") ||
    teclas.has("arrowright") ||
    movimentoTouch.right;

  let eixoFrente = Number(frente) - Number(tras);
  let eixoLateral = Number(direita) - Number(esquerda);

  const magnitude = Math.hypot(eixoFrente, eixoLateral);

  if (magnitude === 0) return;

  eixoFrente /= magnitude;
  eixoLateral /= magnitude;

  const correndo = teclas.has("shift");
  const velocidade = correndo
    ? CONFIG.velocidadeCorrida
    : CONFIG.velocidade;

  const distancia = velocidade * delta;

  if (renderer.xr.isPresenting) {
    // Em VR, a posição é controlada pelo sistema XR.
    return;
  }

  const direcaoFrente = new THREE.Vector3();
  camera.getWorldDirection(direcaoFrente);
  direcaoFrente.y = 0;
  direcaoFrente.normalize();

  const direcaoDireita = new THREE.Vector3()
    .crossVectors(direcaoFrente, camera.up)
    .normalize()
    .negate();

  // WASD segue a direção da câmera no plano horizontal.
  camera.position.addScaledVector(
    direcaoFrente,
    eixoFrente * distancia
  );

  camera.position.addScaledVector(
    direcaoDireita,
    eixoLateral * distancia
  );

  // Limites de segurança dentro do galpão.
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    -L / 2 + 1,
    L / 2 - 1
  );

  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    -P / 2 + 1,
    P / 2 - 1
  );

  camera.position.y = CONFIG.alturaCamera;
}

// ======================================================
// 12. CONTROLES DE MOVIMENTO PARA CELULAR
// ======================================================

document.querySelectorAll("[data-move]").forEach((botao) => {
  const direcao = botao.dataset.move;

  const iniciarMovimento = (evento) => {
    evento.preventDefault();
    movimentoTouch[direcao] = true;

    if (botao.setPointerCapture && evento.pointerId !== undefined) {
      try {
        botao.setPointerCapture(evento.pointerId);
      } catch {
        // Alguns navegadores não permitem capturar nesse momento.
      }
    }
  };

  const pararMovimento = (evento) => {
    evento.preventDefault();
    movimentoTouch[direcao] = false;
  };

  botao.addEventListener("pointerdown", iniciarMovimento);
  botao.addEventListener("pointerup", pararMovimento);
  botao.addEventListener("pointercancel", pararMovimento);
  botao.addEventListener("lostpointercapture", () => {
    movimentoTouch[direcao] = false;
  });
});

// ======================================================
// 13. OLHAR AO REDOR COM TOQUE
// ======================================================

let toqueAtivo = false;
let toqueX = 0;
let toqueY = 0;
let toqueMoveu = false;

renderer.domElement.addEventListener("pointerdown", (evento) => {
  if (evento.pointerType !== "touch" || renderer.xr.isPresenting) {
    return;
  }

  toqueAtivo = true;
  toqueMoveu = false;
  toqueX = evento.clientX;
  toqueY = evento.clientY;
});

renderer.domElement.addEventListener("pointermove", (evento) => {
  if (!toqueAtivo || evento.pointerType !== "touch") return;

  const dx = evento.clientX - toqueX;
  const dy = evento.clientY - toqueY;

  if (Math.abs(dx) + Math.abs(dy) > 3) {
    toqueMoveu = true;
  }

  if (jogoIniciado && toqueMoveu) {
    camera.rotation.order = "YXZ";

    camera.rotation.y -= dx * CONFIG.sensibilidadeToque;
    camera.rotation.x -= dy * CONFIG.sensibilidadeToque;

    camera.rotation.x = THREE.MathUtils.clamp(
      camera.rotation.x,
      -CONFIG.limiteVerticalVisao,
      CONFIG.limiteVerticalVisao
    );
  }

  toqueX = evento.clientX;
  toqueY = evento.clientY;
});

function finalizarToque(evento) {
  if (evento.pointerType !== "touch") return;

  if (toqueAtivo && !toqueMoveu && jogoIniciado) {
    selecionarObjeto();
  }

  toqueAtivo = false;
}

renderer.domElement.addEventListener("pointerup", finalizarToque);
renderer.domElement.addEventListener("pointercancel", () => {
  toqueAtivo = false;
});

$("#look-button")?.addEventListener("click", () => {
  if (!jogoIniciado) {
    iniciarJogo();
  } else {
    mostrarMensagem(
      "Arraste o dedo sobre a cena para olhar ao redor."
    );
  }
});

// ======================================================
// 14. REDIMENSIONAMENTO
// ======================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.7)
  );
});

// ======================================================
// 15. LOOP PRINCIPAL
// ======================================================

const relogio = new THREE.Clock();

function animar() {
  const delta = Math.min(relogio.getDelta(), 0.05);

  moverJogador(delta);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animar);

console.log("[Oficina VR SENAI] Aplicação inicializada.");
