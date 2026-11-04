import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

import {
  criarRenderizador,
  configurarRedimensionamento,
  aplicarQualidade,
  tipoDispositivo
} from "./src/render.js";
import { criarMateriais } from "./src/materials.js";
import { criarUI, criarPainelVR } from "./src/ui.js";
import { criarGalpao, MEDIDAS } from "./src/galpao.js";
import { dividirSceneGlb, escolherAcerto, CATALOGO } from "./src/maquinas.js";
import { criarFuradeira } from "./src/furadeira.js";
import { criarJogador, criarEntrada, atualizarJogador } from "./src/input.js";
import { criarControlesComputador } from "./src/controls/computerControls.js";
import { criarControlesMobile } from "./src/controls/mobileControls.js";
import { criarControlesVR } from "./src/controls/vrControls.js";
import { criarMissoes } from "./src/missoes.js";

const CONFIG = {
  modelo: "./scene.glb",
  velocidade: 3.4,
  sensibilidadeToque: 0.0045,
  limiteVerticalVisao: 1.35,
  alturaCamera: 1.66,
  posicaoInicial: [0, 0, 9]
};

const ui = criarUI();
const renderer = criarRenderizador();
renderer.domElement.id = "oficina-canvas";
document.querySelector("#game").prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9aa8b0);
scene.fog = new THREE.Fog(0x9aa8b0, 26, 78);

const camera = new THREE.PerspectiveCamera(
  70,
  Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
  0.08,
  140
);
camera.rotation.order = "YXZ";

// A câmera é sempre filha do rig. É isso que permite o mesmo código de
// locomoção funcionar no PC, no celular e dentro do headset.
const jogador = criarJogador(camera, CONFIG);
scene.add(jogador);

const painelVR = criarPainelVR(THREE, camera);
painelVR.mostrar(false);
ui.ligarPainel(painelVR);

const { mats } = criarMateriais(renderer);

// ---------- ILUMINAÇÃO ----------
scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x5c5148, 1.9));

const sol = new THREE.DirectionalLight(0xfff2dc, 2.4);
sol.position.set(-14, 18, 12);
scene.add(sol);

// Luz entrando pela fileira de janelas, como na foto 1.
const luzJanela = new THREE.DirectionalLight(0xe8f1ff, 1.1);
luzJanela.position.set(10, 9, -6);
scene.add(luzJanela);

const luzesComSombra = [sol, luzJanela];

// ---------- GALPÃO ----------
const galpao = criarGalpao(mats, MEDIDAS);
scene.add(galpao.grupo);

// Point lights em apenas parte das luminárias: cada uma custa por fragmento,
// e as ~24 calhas do teto não caberiam no orçamento de frames do Quest.
galpao.luminarias
  .filter((_, indice) => indice % 3 === 0)
  .slice(0, 6)
  .forEach(({ x, y, z }) => {
    const luz = new THREE.PointLight(0xfff3d6, 14, 11, 2);
    luz.position.set(x, y, z);
    scene.add(luz);
  });

// ---------- MÁQUINAS ----------
const maquinas = new THREE.Group();
maquinas.name = "Maquinas";
scene.add(maquinas);

// Mecanismo da furadeira: montado junto das máquinas, atualizado no loop.
let furadeira = null;

// O raycast considera também os corpos mesclados: é isso que impede a mira de
// atravessar uma máquina para alcançar a peça que está atrás dela. A exceção é
// o acrílico de visor, marcado como atravessável — aponta-se para o componente
// que se vê através dele.
const alvos = [...galpao.selecionaveis];
const colisores = [...galpao.colisores];

async function carregarMaquinas() {
  const loader = new GLTFLoader();

  ui.carregando("Abrindo o arquivo de máquinas...");
  const gltf = await loader.loadAsync(CONFIG.modelo);

  const resultado = dividirSceneGlb(gltf.scene, { pai: maquinas });

  let drawCalls = 0;
  let pecas = 0;
  for (const montada of resultado.maquinas) {
    drawCalls += montada.drawCalls;
    pecas += montada.interativas.length;
    colisores.push(montada.colisor);

    if (montada.id === "furadeira") furadeira = criarFuradeira(montada);

    montada.grupo.traverse((obj) => {
      if (obj.isMesh) alvos.push(obj);
    });
    console.log(
      `[${montada.id}] ${montada.meshesOriginais} meshes -> ${montada.drawCalls} draw calls · ` +
      `${montada.dimensoes.toArray().map((v) => v.toFixed(2)).join(" x ")} m`
    );
  }

  if (resultado.naoReconhecidas.length) {
    console.warn("[máquinas] nós não reconhecidos:", resultado.naoReconhecidas.join(", "));
  }

  console.log(
    `[máquinas] ${resultado.maquinas.length} máquinas, ${pecas} peças de missão, ${drawCalls} draw calls.`
  );
  return resultado.maquinas;
}

// ---------- SELEÇÃO ----------
const raycaster = new THREE.Raycaster();
const mira = new THREE.Vector2(0, 0);

// A interatividade pode estar em qualquer nível da hierarquia (o console da
// CNC, por exemplo, é neto do grupo). Subir até o primeiro dono é o que fazia
// a seleção falhar dentro de grupos aninhados.
function resolverAlvo(objeto) {
  let atual = objeto;
  while (atual) {
    if (atual.userData?.interativo) return atual;
    atual = atual.parent;
  }
  return null;
}

function ponteiro() {
  raycaster.setFromCamera(mira, camera);
  return escolherAcerto(raycaster.intersectObjects(alvos, true), missoes.alvoEsperado);
}

// O destaque não pode escalar a própria peça: depois da mescla, a geometria de
// cada peça vem cozida nas coordenadas da máquina, então escalar em torno da
// origem faria a peça saltar de lugar. Marcamos com uma caixa de arestas.
const caixaDestaque = new THREE.Box3();
const destaque = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, depthTest: false })
);
destaque.visible = false;
destaque.frustumCulled = false;
destaque.renderOrder = 998;
scene.add(destaque);

let destacado = null;

function realcar(objeto) {
  if (objeto === destacado) return;
  destacado = objeto;

  if (!objeto) {
    destaque.visible = false;
    return;
  }

  caixaDestaque.setFromObject(objeto);
  if (caixaDestaque.isEmpty()) {
    destaque.visible = false;
    return;
  }

  destaque.position.copy(caixaDestaque.getCenter(new THREE.Vector3()));
  destaque.scale.copy(caixaDestaque.getSize(new THREE.Vector3())).addScalar(0.02);
  destaque.visible = true;
}

// Nome da máquina dona de um mesh, para dizer ao usuário o que ele acabou de
// tocar quando o acerto é apenas o corpo mesclado.
function maquinaDe(objeto) {
  let atual = objeto;
  while (atual) {
    if (atual.userData?.idEquipamento && !atual.userData.interativo) return atual;
    atual = atual.parent;
  }
  return null;
}

function descreverAlvo(acerto) {
  const alvo = acerto ? resolverAlvo(acerto.object) : null;
  if (alvo) return { alvo, nome: alvo.userData.nomeEquipamento || alvo.name };

  const dono = acerto ? maquinaDe(acerto.object) : null;
  return {
    alvo: null,
    nome: dono ? `${dono.userData.nomeEquipamento} · corpo` : "Nada na mira"
  };
}

// Uma única resposta para o alvo escolhido — a mesma no clique do mouse, no
// toque da tela e no gatilho do controller.
function responderAlvo(alvo, nome) {
  if (!alvo) {
    ui.mensagem(`${nome} — aponte para uma peça de comando`, 2600);
    return;
  }

  const resultado = missoes.registrar(alvo);
  const mecanico = furadeira?.acionar(alvo);

  let texto;
  let duracao;
  if (resultado === "acerto") {
    texto = `Correto: ${nome}`;
    duracao = 2600;
  } else if (resultado === "erro") {
    texto = "Ainda não — o passo atual pede outra peça";
    duracao = 3000;
  } else {
    texto = `Selecionado: ${nome}`;
    duracao = 2200;
  }

  // O mecanismo responde junto: a caixa aceita as duas linhas, e o erro da
  // missão não some atrás do feedback da máquina.
  if (mecanico) {
    texto = `${texto}\n${mecanico}`;
    duracao = 4600;
  }

  ui.mensagem(texto, duracao);
}

function selecionar() {
  const acerto = ponteiro();
  const { alvo, nome } = descreverAlvo(acerto);

  ui.selecionado(nome);
  responderAlvo(alvo, nome);
}

// ---------- MISSÕES ----------
const missoes = criarMissoes({ ui, painelVR });

// ---------- CONTROLES ----------
const entrada = criarEntrada();

const controlesPC = criarControlesComputador({
  camera,
  renderer,
  entrada,
  aoSelecionar: selecionar,
  aoTravar: (estado) =>
    ui.status(
      estado === "lock"
        ? "Mouse capturado · ESC libera"
        : "Mouse livre · clique para capturar"
    )
});

const controlesMobile = criarControlesMobile({
  camera,
  renderer,
  entrada,
  config: CONFIG,
  aoSelecionar: selecionar
});

const controlesVR = criarControlesVR({
  renderer,
  scene,
  jogador,
  entrada,
  alvos,
  esperado: () => missoes.alvoEsperado,
  aoSelecionar: (acerto) => {
    const { alvo, nome } = descreverAlvo(acerto);
    ui.selecionado(nome);
    responderAlvo(alvo, nome);
  },
  aoMudarModo: () => ui.status("Modo VR ativo")
});

// ---------- XR ----------
function ajustarQualidade(modo) {
  aplicarQualidade(renderer, luzesComSombra, modo);
}

let iniciado = false;

const botaoVR = VRButton.createButton(renderer);
(document.querySelector("#vr-button-container") || document.body).appendChild(botaoVR);

renderer.xr.addEventListener("sessionstart", () => {
  ui.vrAtivo(true);
  painelVR.mostrar(true);
  painelVR.definirMissao(missoes.nomeMissao);
  ajustarQualidade("vr");
  iniciado = true;
  ui.esconderInstructions();
  ui.status("Sessão VR ativa");
});

renderer.xr.addEventListener("sessionend", () => {
  ui.vrAtivo(false);
  painelVR.mostrar(false);
  ajustarQualidade(tipoDispositivo());
  controlesMobile.pararTudo();
  controlesPC.liberar();
  entrada.frente = 0;
  entrada.lateral = 0;
  ui.status("Sessão VR encerrada");
});

// ---------- INÍCIO ----------
function iniciar() {
  iniciado = true;
  ui.esconderInstructions();
  painelVR.definirMissao(missoes.nomeMissao);

  if (tipoDispositivo() !== "mobile" && !renderer.xr.isPresenting) {
    controlesPC.controles.lock();
  }
}

ui.aoIniciar(iniciar);

configurarRedimensionamento(renderer, camera, luzesComSombra);
ajustarQualidade(tipoDispositivo());

carregarMaquinas()
  .then((montadas) => {
    ui.ocultarCarregamento();
    ui.habilitarInicio();
    ui.status(`${montadas.length} máquinas · oficina pronta`);
  })
  .catch((erro) => {
    console.error("[máquinas] scene.glb não carregou", erro);
    ui.ocultarCarregamento();
    ui.habilitarInicio("ENTRAR MESMO ASSIM");
    ui.status("Falha ao carregar as máquinas");
    ui.mensagem(
      "Não foi possível abrir o scene.glb. Serve o projeto por http://localhost e confira o arquivo ao lado do index.html.",
      9000
    );
  });

// ---------- LOOP ----------
const relogio = new THREE.Clock();
const contextoMovimento = {
  velocidade: CONFIG.velocidade,
  limites: galpao.limites,
  colisores,
  camera
};

function animar() {
  const delta = Math.min(relogio.getDelta(), 0.05);

  furadeira?.atualizar(delta);

  if (iniciado) {
    atualizarJogador(jogador, camera, entrada, delta, contextoMovimento);

    if (renderer.xr.isPresenting) {
      controlesVR.atualizar();
    } else if (controlesPC.bloqueado()) {
      // Destaque de mira só no PC, para não pagar raycast extra no celular.
      realcar(resolverAlvo(ponteiro()?.object));
    } else {
      realcar(null);
    }
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animar);

window.__oficina = {
  THREE, scene, camera, jogador, renderer, missoes, alvos, entrada, CATALOGO, painelVR,
  get furadeira() { return furadeira; }
};
console.log("[Oficina VR SENAI] módulos carregados.");
