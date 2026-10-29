import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { criarRenderizador, configurarRedimensionamento } from "./render.js";
import { criarControlesComputador } from "./controls/computerControls.js";
import { criarControlesMobile } from "./controls/mobileControls.js";
import { configurarControlesVR } from "./controls/vrControls.js";

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

  limiteVerticalVisao: 1.45,

  // Arquivos GLB individuais.

  pastaModelos: "./",

  bancada: "./scene.glb",

  // Maior dimensão desejada de cada objeto, em metros.

  tamanhosModelos: {
    furadeira: 35.5,

    cnc: 35.2,

    torno: 35.2,

    clp: 35.8,

    esteira: 35.0,

    bancada: 35.1,
  },
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

const renderer = criarRenderizador();
configurarRedimensionamento(renderer, camera);

// Disponibiliza referências para diagnóstico no DevTools.

window.__oficina = {
  scene,

  camera,

  renderer,

  modelo: null,

  maquinas: [],

  carregado: false,
};

// ======================================================

// 3. ESTADO DO JOGO E FUNÇÕES DE INTERFACE

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
  atualizarStatus("Exploração iniciada");
}

startButton?.addEventListener("click", iniciarJogo);

// 4. TEXTURAS PROCEDURAIS

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

const texturaTijolo = criarTexturaCanvas(
  (ctx) => {
    ctx.fillStyle = "#b8b0a7";

    ctx.fillRect(0, 0, 512, 512);

    const largura = 90;

    const altura = 32;

    const junta = 5;

    for (let y = 0; y < 512; y += altura + junta) {
      const deslocamento =
        Math.floor(y / (altura + junta)) % 2 ? largura / 2 : 0;

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
  },
  4,
  2
);

const texturaConcreto = criarTexturaCanvas(
  (ctx) => {
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
  },
  8,
  12
);

const texturaTelhado = criarTexturaCanvas(
  (ctx) => {
    ctx.fillStyle = "#899398";

    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 24) {
      ctx.fillStyle = "#657075";

      ctx.fillRect(x, 0, 4, 512);

      ctx.fillStyle = "#aeb7ba";

      ctx.fillRect(x + 5, 0, 1, 512);
    }
  },
  5,
  4
);

// ======================================================

// 6. MATERIAIS

// ======================================================

const mats = {
  concreto: new THREE.MeshStandardMaterial({
    map: texturaConcreto,

    roughness: 0.96,
  }),

  tijolo: new THREE.MeshStandardMaterial({
    map: texturaTijolo,

    roughness: 0.92,
  }),

  reboco: new THREE.MeshStandardMaterial({
    color: 0xc6c8c5,

    roughness: 0.9,
  }),

  telhado: new THREE.MeshStandardMaterial({
    map: texturaTelhado,

    roughness: 0.8,

    metalness: 0.35,

    side: THREE.DoubleSide,
  }),

  verde: new THREE.MeshStandardMaterial({
    color: 0x17653c,

    roughness: 0.55,

    metalness: 0.4,
  }),

  metal: new THREE.MeshStandardMaterial({
    color: 0x596267,

    roughness: 0.42,

    metalness: 0.75,
  }),

  metalEscuro: new THREE.MeshStandardMaterial({
    color: 0x30373b,

    roughness: 0.6,

    metalness: 0.65,
  }),

  azul: new THREE.MeshStandardMaterial({
    color: 0x174c79,

    roughness: 0.45,

    metalness: 0.25,
  }),

  amarelo: new THREE.MeshStandardMaterial({
    color: 0xf2c62d,

    roughness: 0.65,
  }),

  vidro: new THREE.MeshStandardMaterial({
    color: 0x82c6df,

    transparent: true,

    opacity: 0.5,

    roughness: 0.2,

    side: THREE.DoubleSide,
  }),

  branco: new THREE.MeshStandardMaterial({
    color: 0xe8e8e4,

    roughness: 0.65,
  }),

  luz: new THREE.MeshBasicMaterial({
    color: 0xfff2cb,
  }),
};

// ======================================================

// 7. ILUMINAÇÃO

// ======================================================

scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x62584b, 2));

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
  color: 0xf4c430,
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

// 9. CARREGAMENTO DAS CINCO MÁQUINAS E DA BANCADA

// ======================================================

const loader = new GLTFLoader();

const grupoModelo = new THREE.Group();

grupoModelo.name = "EquipamentosSENAI";

scene.add(grupoModelo);

const equipamentos = [
  {
    id: "furadeira",

    nome: "Furadeira de bancada",

    arquivo: "furadeira_bancada_detalhada.glb",

    x: 0,

    z: -12,

    tamanho: CONFIG.tamanhosModelos.furadeira,

    rotacaoY: 0,

    rotacaoX: 0,
  },

  {
    id: "cnc",

    nome: "Máquina CNC",

    arquivo: "maquina_cnc_interativa_detalhada.glb",

    x: -10,

    z: -12,

    tamanho: CONFIG.tamanhosModelos.cnc,

    rotacaoY: 0,

    rotacaoX: 0,
  },

  {
    id: "torno",

    nome: "Torno mecânico",

    arquivo: "torno_mecanico_interativo.glb",

    x: -5,

    z: -12,

    tamanho: CONFIG.tamanhosModelos.torno,

    rotacaoY: 0,

    rotacaoX: 0,
  },

  {
    id: "clp",

    nome: "Painel de automação com CLP",

    arquivo: "painel_automacao_clp_realista.glb",

    x: 5,

    z: -12,

    tamanho: CONFIG.tamanhosModelos.clp,

    rotacaoY: 0,

    rotacaoX: 0,
  },

  {
    id: "esteira",

    nome: "Esteira industrial",

    arquivo: "esteira_industrial_interativa.glb",

    x: 10,

    z: -12,

    tamanho: CONFIG.tamanhosModelos.esteira,

    rotacaoY: 0,

    rotacaoX: 0,
  },

  {
    id: "bancada",

    nome: "Bancada de ajustagem SENAI",

    caminho: CONFIG.bancada,

    x: 10,

    z: -3,

    tamanho: CONFIG.tamanhosModelos.bancada,

    rotacaoY: -Math.PI / 2,

    rotacaoX: 0,
  },
];

function carregarGLB(caminho) {
  return new Promise((resolve, reject) => {
    loader.load(
      caminho,

      (gltf) => resolve(gltf.scene),

      undefined,

      (erro) => reject(erro)
    );
  });
}

async function carregarEquipamento(config) {
  const caminho = config.caminho ?? `${CONFIG.pastaModelos}${config.arquivo}`;

  try {
    atualizarStatus(`Carregando ${config.nome}`);

    const modelo = await carregarGLB(caminho);

    modelo.name = config.nome;

    modelo.userData.idEquipamento = config.id;

    modelo.userData.nomeEquipamento = config.nome;

    // Aplica a rotação antes de calcular o tamanho.

    modelo.rotation.set(
      config.rotacaoX ?? 0,

      config.rotacaoY ?? 0,

      0
    );

    modelo.updateMatrixWorld(true);

    const caixaOriginal = new THREE.Box3().setFromObject(modelo);

    if (caixaOriginal.isEmpty()) {
      throw new Error("O arquivo não contém geometria visível.");
    }

    const dimensoesOriginais = caixaOriginal.getSize(new THREE.Vector3());

    const maiorDimensao = Math.max(
      dimensoesOriginais.x,

      dimensoesOriginais.y,

      dimensoesOriginais.z
    );

    if (!Number.isFinite(maiorDimensao) || maiorDimensao <= 0) {
      throw new Error("Dimensões inválidas no arquivo GLB.");
    }

    // Ajusta a maior dimensão ao tamanho desejado.

    // A escala é uniforme: não deforma o modelo.

    const fator = config.tamanho / maiorDimensao;

    modelo.scale.multiplyScalar(fator);

    modelo.updateMatrixWorld(true);

    // Recalcula a caixa depois da escala.

    const caixa = new THREE.Box3().setFromObject(modelo);

    const centro = caixa.getCenter(new THREE.Vector3());

    const dimensoesFinais = caixa.getSize(new THREE.Vector3());

    // Centraliza horizontalmente no ponto escolhido

    // e coloca a parte inferior sobre o piso (Y = 0).

    modelo.position.set(
      config.x - centro.x,

      -caixa.min.y,

      config.z - centro.z
    );

    modelo.traverse((objeto) => {
      if (!objeto.isMesh) return;

      objeto.castShadow = true;

      objeto.receiveShadow = true;

      objeto.userData.idEquipamento = config.id;

      objeto.userData.nomeEquipamento = config.nome;
    });

    grupoModelo.add(modelo);

    console.log(`[GLB] ${config.nome}`, {
      arquivo: caminho,

      escala: fator,

      dimensoesMetros: dimensoesFinais.toArray(),

      posicao: modelo.position.toArray(),
    });

    return {
      id: config.id,

      nome: config.nome,

      objeto: modelo,

      carregado: true,
    };
  } catch (erro) {
    console.error(
      `[GLB] Falha ao carregar ${config.nome}: ${caminho}`,

      erro
    );

    mostrarMensagem(
      `Não foi possível carregar: ${config.nome}. Confira o arquivo e o caminho.`,

      5000
    );

    return {
      id: config.id,

      nome: config.nome,

      objeto: null,

      carregado: false,

      erro,
    };
  }
}

async function carregarTodosEquipamentos() {
  atualizarStatus("Carregando equipamentos 3D");

  if (loadingMessage) {
    loadingMessage.textContent = "Carregando máquinas e bancada...";
  }

  // Cada carregamento é tratado individualmente:

  // um arquivo com erro não bloqueia os outros.

  const resultados = await Promise.all(equipamentos.map(carregarEquipamento));

  const carregados = resultados.filter((item) => item.carregado);

  const falhas = resultados.filter((item) => !item.carregado);

  // Mantém compatibilidade com a seção de seleção existente.

  window.__oficina.modelo = grupoModelo;

  window.__oficina.maquinas = carregados.map((item) => ({
    id: item.id,

    nome: item.nome,

    objeto: item.objeto,
  }));

  window.__oficina.carregado = carregados.length > 0;

  if (startButton) {
    startButton.disabled = false;

    startButton.textContent = "ENTRAR NA OFICINA";
  }

  ocultarCarregamento();

  if (falhas.length === 0) {
    atualizarStatus("Todos os equipamentos carregados");

    mostrarMensagem(
      `${carregados.length} equipamentos carregados com sucesso.`,

      4500
    );
  } else {
    atualizarStatus(
      `${carregados.length} carregados · ${falhas.length} com erro`
    );

    mostrarMensagem(
      `${carregados.length} equipamentos carregados. ${falhas.length} arquivo(s) precisam ser verificados no Console.`,

      7000
    );
  }

  console.table(
    resultados.map((item) => ({
      id: item.id,

      equipamento: item.nome,

      carregado: item.carregado,
    }))
  );
}

carregarTodosEquipamentos();

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
  // A seleção continua no main.js; Pointer Lock fica em computerControls.js.
  if (evento.pointerType === "touch") return;
  selecionarObjeto();
});

// ======================================================

// 11. CONTROLES SEPARADOS POR DISPOSITIVO

const controlesComputador = criarControlesComputador({
  camera,
  renderer,
  config: CONFIG,
  iniciarJogo,
  jogoIniciado: () => jogoIniciado,
  temTouch,
  atualizarStatus,
});

const controlesMobile = criarControlesMobile({
  camera,
  renderer,
  config: CONFIG,
  jogoIniciado: () => jogoIniciado,
  selecionarObjeto,
  mostrarMensagem,
});

configurarControlesVR({
  renderer,
  iniciarJogo,
  definirJogoIniciado: (valor) => {
    jogoIniciado = valor;
  },
  atualizarStatus,
});

// 12. LOOP PRINCIPAL

// ======================================================

const relogio = new THREE.Clock();

function animar() {
  const delta = Math.min(relogio.getDelta(), 0.05);

  if (temTouch) {
    controlesMobile.mover(delta);
  } else {
    controlesComputador.mover(delta);
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animar);

console.log("[Oficina VR SENAI] Aplicação inicializada.");
