import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

import {
  criarRenderizador,
  configurarRedimensionamento,
  aplicarQualidade,
  tipoDispositivo,
  modoAtual
} from "./src/nucleo/render.js";
import { criarMateriais } from "./src/cena/materials.js";
import { criarUI, criarPainelVR } from "./src/interface/ui.js";
import { criarGalpao, MEDIDAS } from "./src/cena/galpao.js";
import { dividirSceneGlb, escolherAcerto, CATALOGO } from "./src/cena/maquinas.js";
import { criarFuradeira } from "./src/cena/furadeira.js";
import { criarJogador, criarEntrada, atualizarJogador } from "./src/nucleo/input.js";
import { criarControlesComputador } from "./src/controles/computerControls.js";
import { criarControlesMobile } from "./src/controles/mobileControls.js";
import { criarControlesVR } from "./src/controles/vrControls.js";
import { criarLeitorGamepad } from "./src/controles/gamepad.js";
import { criarMissoes, pertenceALinha } from "./src/missoes/missoes.js";
import { criarAnimacoes } from "./src/interacao/animacoes.js";
import { criarSistemaInteracoes } from "./src/interacao/interacoes.js";
import { criarIndicadorProximoPasso } from "./src/interacao/indicador.js";
import { criarAtmosfera, criarPosProcessamento } from "./src/cena/atmosfera.js";
import { criarAudio } from "./src/audio/sons.js";
import { criarMenus } from "./src/interface/menus.js";

const CONFIG = {
  modelo: "./scene.glb",
  velocidade: 3.4,
  sensibilidadeToque: 0.0045,
  limiteVerticalVisao: 1.35,
  alturaCamera: 1.66,
  posicaoInicial: [0, 0, 5.75]
};

// ---------- NÚCLEO ----------
const ui = criarUI();
const audio = criarAudio();

const renderer = criarRenderizador();
renderer.domElement.id = "oficina-canvas";
document.querySelector("#game").prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaebcc5);
scene.fog = new THREE.Fog(0xaebcc5, 32, 88);

const camera = new THREE.PerspectiveCamera(
  70,
  Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
  0.08,
  140
);
camera.rotation.order = "YXZ";

const jogador = criarJogador(camera, CONFIG);
scene.add(jogador);

const painelVR = criarPainelVR(THREE, camera);
painelVR.mostrar(false);
ui.ligarPainel(painelVR);

const { mats } = criarMateriais(renderer);

// ---------- ILUMINAÇÃO ----------
scene.add(new THREE.HemisphereLight(0xc9dded, 0x65574a, 1.25));

const sol = new THREE.DirectionalLight(0xffe6bd, 3.0);
sol.position.set(24, 7.2, -8);
sol.target.position.set(0, 0, 2);
sol.castShadow = true;
scene.add(sol, sol.target);

// Luz fria de preenchimento entrando pelos janelões do fundo.
const luzJanela = new THREE.DirectionalLight(0xdcecff, 1.35);
luzJanela.position.set(3, 4.5, -24);
luzJanela.target.position.set(0, 0, 4);
luzJanela.castShadow = true;
scene.add(luzJanela, luzJanela.target);

const luzesComSombra = [sol, luzJanela];

// ---------- GALPÃO ----------
const galpao = criarGalpao(mats, MEDIDAS);
scene.add(galpao.grupo);

galpao.luminarias
  .filter(({ z }) => Math.abs(z) < 1)
  .forEach(({ x, y, z }) => {
    const luz = new THREE.PointLight(0xfff0d2, 90, 22, 2);
    luz.position.set(x, y, z);
    scene.add(luz);
  });

// ---------- AMBIENTAÇÃO ----------
const atmosfera = criarAtmosfera({
  scene,
  renderer,
  medidas: {
    largura: MEDIDAS.largura,
    profundidade: MEDIDAS.profundidade,
    alturaFrente: MEDIDAS.alturaFrente,
    alturaFundo: MEDIDAS.alturaFundo
  }
});

let posProcessamento = null;
let menus = null;

// ---------- ESTADO DE SESSÃO ----------
let jogando = false;
let pausado = false;
let preferencias = {
  volume: 0.7,
  sensibilidade: 1,
  sombras: true,
  qualidade: "equilibrada",
  mudo: false
};

let feedbackMissao = null;
let ferramentaRecente = { id: null, em: 0 };

// ---------- MÁQUINAS ----------
const maquinas = new THREE.Group();
maquinas.name = "Maquinas";
scene.add(maquinas);

const sombrasContato = new THREE.Group();
sombrasContato.name = "SombrasContato";
const geometriaSombraContato = new THREE.PlaneGeometry(1, 1);
scene.add(sombrasContato);

let furadeira = null;

const animacoes = criarAnimacoes();
const interacoes = criarSistemaInteracoes({
  animacoes,
  aoInteragir({ idPeca, resposta }) {
    const recusa = typeof resposta === "string" && resposta.startsWith("Não");

    if (recusa) {
      if (!jogando || missoes?.modo === "livre") audio.alerta();
      return;
    }

    const ferramenta = FERRAMENTA_POR_PECA[idPeca];
    if (ferramenta) ferramentaRecente = { id: ferramenta, em: performance.now() };

    if (feedbackMissao !== "acerto" && feedbackMissao !== "erro") audio.clique();
    ui.inventario(calcularInventario(missoes?.passo ?? null));
  }
});

const alvos = [...galpao.selecionaveis];
const colisores = [...galpao.colisores];

// ---------- INVENTÁRIO / FERRAMENTAS ----------
const FERRAMENTAS = [
  { id: "peca", sigla: "PC", nome: "Peça" },
  { id: "chave", sigla: "CH", nome: "Chave" },
  { id: "lima", sigla: "LM", nome: "Lima" },
  { id: "martelo", sigla: "MT", nome: "Martelo" },
  { id: "paquimetro", sigla: "PQ", nome: "Paquímetro" },
  { id: "grampo", sigla: "GR", nome: "Grampo C" }
];

const FERRAMENTA_POR_PECA = {
  lima_bancada: "lima",
  lima_bancada_central: "lima",
  martelo_bancada: "martelo",
  paquimetro_ajustagem: "paquimetro",
  grampo_c_ajustagem: "grampo",
  mandril_furadeira: "chave",
  mandril_torno: "chave",
  morsa_bancada_1: "peca",
  morsa_bancada_senai: "peca",
  morsa_azul_ajustagem: "peca",
  morsa_frontal_esquerda: "peca",
  mesa_cnc: "peca",
  mesa_furadeira: "peca"
};

function calcularInventario(passo) {
  const cnc = interacoes.estado("cnc") ?? {};
  const torno = interacoes.estado("torno") ?? {};
  const bancada = interacoes.estado("bancada_extra_longa") ?? {};
  const senai = interacoes.estado("bancada_central_senai") ?? {};
  const ajustagem = interacoes.estado("bancada_ajustagem") ?? {};

  const agora = performance.now();
  const recente = agora - ferramentaRecente.em < 12000 ? ferramentaRecente.id : null;
  const dica = FERRAMENTA_POR_PECA[passo?.idPeca] ?? null;

  const morsas = Object.values(bancada.morsas ?? {});

  const ativos = {
    peca: Boolean(
      cnc.peca || torno.mandril || senai.morsa || ajustagem.morsa ||
      morsas.some(Boolean)
    ),
    chave: recente === "chave" || dica === "chave",
    lima: recente === "lima" || dica === "lima",
    martelo: recente === "martelo" || dica === "martelo",
    paquimetro: Boolean(ajustagem.paquimetro) || recente === "paquimetro" || dica === "paquimetro",
    grampo: Boolean(ajustagem.grampo) || recente === "grampo" || dica === "grampo"
  };

  return FERRAMENTAS.map((ferramenta) => ({
    ...ferramenta,
    ativo: Boolean(ativos[ferramenta.id])
  }));
}

// ---------- SELEÇÃO ----------
const raycaster = new THREE.Raycaster();
const mira = new THREE.Vector2(0, 0);

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
  return escolherAcerto(raycaster.intersectObjects(alvos, true), missoes?.alvoEsperado);
}

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

function responderAlvo(alvo, nome) {
  if (!alvo) {
    audio.clique();
    ui.mensagem(`${nome} — aponte para uma peça de comando`, 2600);
    return;
  }

  const resultado = missoes.registrar(alvo);
  feedbackMissao = resultado;
  const resposta = interacoes.acionar(alvo);
  feedbackMissao = null;

  let texto;
  let duracao;
  if (resultado === "acerto") {
    texto = `Correto: ${nome}`;
    duracao = 2600;
  } else if (resultado === "erro") {
    texto = pertenceALinha(alvo)
      ? "Não possui a peça necessária"
      : "Não é possível interagir agora";
    duracao = 3000;
  } else {
    texto = `Selecionado: ${nome}`;
    duracao = 2200;
  }

  if (resposta && resposta !== texto) {
    texto = `${texto}\n${resposta}`;
    duracao = 4600;
  }

  ui.mensagem(texto, duracao);
}

function selecionar() {
  const acerto = ponteiro();
  const { alvo, nome } = descreverAlvo(acerto);

  responderAlvo(alvo, nome);
  ui.selecionado(interacoes.descrever(alvo) || nome);
}

// ---------- INDICADOR DE PASSO ----------
const indicadorPasso = criarIndicadorProximoPasso({
  scene,
  camera,
  elemento: document.querySelector("#next-step"),
  seta: document.querySelector("#next-step-arrow"),
  rotulo: document.querySelector("#next-step-label"),
  obterAlvos: (passo) => {
    if (passo.idPeca) {
      return alvos.filter((obj) => obj.userData?.idPeca === passo.idPeca);
    }
    if (passo.nome) {
      return alvos.filter(
        (obj) => obj.userData?.interativo && obj.userData.nomeEquipamento === passo.nome
      );
    }
    return [];
  }
});

// ---------- MISSÕES ----------
const missoes = criarMissoes({
  ui,
  painelVR,

  aoAtualizar(passo) {
    indicadorPasso.definirPasso(passo);
    ui.inventario(calcularInventario(passo));
  },

  aoPontuar(evento) {
    if (evento.tipo === "acerto") {
      audio.acerto();
      ui.flashPontos(`+${evento.ganho}`, true);
      if (evento.bonus >= 30) {
        ui.toast(`Execução rápida · bônus de precisão +${evento.bonus}`, "acerto", 1700);
      }
    } else if (evento.tipo === "erro") {
      audio.erro();
      ui.flashPontos(`-${Math.abs(evento.ganho)}`, false);
    }
  },

  aoConcluirMissao(estatisticas) {
    audio.conclusao();
    audio.pararMaquinas();
    audio.ambiente(false);

    jogando = false;
    pausado = true;

    entrada.frente = 0;
    entrada.lateral = 0;
    entrada.corrida = false;
    controlesPC.liberar();
    controlesMobile.pararTudo();
    realcar(null);

    ui.toast(
      `Missão concluída · ${estatisticas.precisao}% de precisão`,
      "acerto",
      3200
    );

    setTimeout(() => menus?.abrirAvaliacao(estatisticas), 850);
  },

  aoIniciarMissao(missao) {
    ui.toast(`Missão: ${missao.titulo}`, "info", 3400);
    ui.inventario(calcularInventario(missao.passos[0]));
    ui.modo(rotuloModo());
  }
});

function rotuloModo() {
  if (!jogando) return "MENU";
  if (missoes.modo === "campanha") return "TOUR COMPLETO";
  if (missoes.modo === "treino") return "TREINO";
  return "MODO LIVRE";
}

// ---------- CONTROLES ----------
const entrada = criarEntrada();

const controlesPC = criarControlesComputador({
  camera,
  renderer,
  entrada,
  aoSelecionar: selecionar,
  aoTravar: (estado) => {
    if (pausado) return;
    ui.status(
      estado === "lock"
        ? "Mouse capturado · ESC pausa"
        : "Mouse livre · clique para capturar"
    );
  }
});

const controlesMobile = criarControlesMobile({
  camera,
  renderer,
  entrada,
  config: CONFIG,
  aoSelecionar: selecionar
});

const leitorGamepad = criarLeitorGamepad({
  aoMudar: ({ conectado, id }) => {
    const texto = conectado ? `Conectado: ${id || "controle Bluetooth"}` : "Aguardando controle Bluetooth…";
    ui.status(conectado ? "Controle Bluetooth conectado" : "Controle desconectado");
    const indicador = document.querySelector("#gamepad-status");
    if (indicador) indicador.textContent = texto;
  }
});

const controlesVR = criarControlesVR({
  renderer,
  scene,
  camera,
  jogador,
  entrada,
  alvos,
  gamepad: leitorGamepad,
  esperado: () => missoes?.alvoEsperado,
  aoSelecionar: (acerto) => {
    const { alvo, nome } = descreverAlvo(acerto);
    responderAlvo(alvo, nome);
    ui.selecionado(interacoes.descrever(alvo) || nome);
  },
  aoMudarModo: () => ui.status("Controle VR conectado")
});

// ---------- MENUS ----------
function qualidadeGrafica() {
  if (renderer.xr.isPresenting) return "baixa";

  const escolhida = preferencias.qualidade ?? "equilibrada";
  if (tipoDispositivo() === "mobile") {
    return "baixa";
  }
  return escolhida;
}

function ajustarQualidade(modo = modoAtual(renderer)) {
  aplicarQualidade(renderer, luzesComSombra, modo);

  if (!preferencias.sombras || modo === "vr") {
    renderer.shadowMap.enabled = false;
    for (const luz of luzesComSombra) luz.castShadow = false;
    renderer.shadowMap.needsUpdate = true;
  }

  mats.sombraContato.opacity = renderer.shadowMap.enabled ? 0.1 : 0.24;

  posProcessamento?.setSize(window.innerWidth, window.innerHeight);
  posProcessamento?.setQualidade(qualidadeGrafica());
}

function aplicarPreferencias(config) {
  preferencias = { ...preferencias, ...config };

  audio.definirVolume(preferencias.volume);
  audio.ligarMudo(Boolean(preferencias.mudo));

  controlesPC.controles.pointerSpeed = preferencias.sensibilidade;
  CONFIG.sensibilidadeToque = 0.0045 * preferencias.sensibilidade;

  ajustarQualidade(modoAtual(renderer));
}

function travarMouse() {
  if (renderer.xr.isPresenting) return;
  if (tipoDispositivo() === "mobile") return;
  try {
    controlesPC.controles.lock();
  } catch {
    // Sem gesto do usuário o navegador recusa; o clique no canvas recaptura.
  }
}

const posJogadorAnterior = jogador.position.clone();
let bobFase = 0;
let distanciaPassos = 0;
let estavaAndando = false;

function resetarJogador() {
  if (renderer.xr.isPresenting) return;

  jogador.position.set(CONFIG.posicaoInicial[0], 0, CONFIG.posicaoInicial[2]);
  camera.rotation.set(0, 0, 0);
  camera.position.y = CONFIG.alturaCamera;

  posJogadorAnterior.copy(jogador.position);
  bobFase = 0;
  distanciaPassos = 0;
  estavaAndando = false;
}

function iniciarSessao(modo, indice = 0) {
  audio.iniciar();
  audio.ambiente(true);
  audio.retomar();

  interacoes.reiniciar();
  resetarJogador();

  jogando = true;
  pausado = false;
  ferramentaRecente = { id: null, em: 0 };

  missoes.iniciar(modo, indice);

  ui.inventario(calcularInventario(missoes.passo));
  ui.modo(rotuloModo());
  ui.selecionado("Nenhuma máquina selecionada");

  sincronizarAudioMaquinas();
  travarMouse();
}

function pausarJogo() {
  pausado = true;
  missoes.pausar();
  audio.pausar();

  entrada.frente = 0;
  entrada.lateral = 0;
  entrada.corrida = false;
  controlesMobile.pararTudo();
  controlesPC.liberar();

  ui.status("Treinamento pausado");
}

function retomarJogo() {
  pausado = false;
  missoes.retomar();
  audio.ambiente(true);
  audio.retomar();

  ui.status("Mouse capturado · ESC pausa");
  travarMouse();
}

function reiniciarJogo() {
  interacoes.reiniciar();
  missoes.reiniciar();
  resetarJogador();

  jogando = true;
  pausado = false;
  ferramentaRecente = { id: null, em: 0 };

  audio.ambiente(true);
  audio.retomar();
  ui.toast("Treinamento reiniciado", "info", 1800);
  travarMouse();
}

function proximaEtapa() {
  if (!missoes.proximaMissao()) return false;

  interacoes.reiniciar();
  jogando = true;
  pausado = false;

  audio.ambiente(true);
  audio.retomar();
  travarMouse();
  return true;
}

function sairDoJogo() {
  jogando = false;
  pausado = false;

  missoes.encerrar();
  interacoes.reiniciar();
  audio.pararMaquinas();
  audio.ambiente(false);

  entrada.frente = 0;
  entrada.lateral = 0;
  entrada.corrida = false;
  controlesPC.liberar();
  controlesMobile.pararTudo();

  ui.selecionado("Nenhuma máquina selecionada");
  ui.modo("MENU");
  ui.status("Menu principal");
  realcar(null);
}

menus = criarMenus({
  missoes,
  audio,
  aoIniciarModo: iniciarSessao,
  aoPausar: pausarJogo,
  aoRetomar: retomarJogo,
  aoReiniciar: reiniciarJogo,
  aoProximaMissao: proximaEtapa,
  aoSair: sairDoJogo,
  aoAplicarConfig: aplicarPreferencias
});

aplicarPreferencias(menus.config);

posProcessamento = criarPosProcessamento({
  renderer,
  scene,
  camera,
  qualidade: qualidadeGrafica()
});

// ---------- CARREGAMENTO DAS MÁQUINAS ----------
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

    const limitesMaquina = new THREE.Box3().setFromObject(montada.grupo);
    if (!limitesMaquina.isEmpty()) {
      const tamanhoMaquina = limitesMaquina.getSize(new THREE.Vector3());
      const centroMaquina = limitesMaquina.getCenter(new THREE.Vector3());
      const sombra = new THREE.Mesh(geometriaSombraContato, mats.sombraContato);
      sombra.rotation.x = -Math.PI / 2;
      sombra.position.set(centroMaquina.x, 0.009, centroMaquina.z);
      sombra.scale.set(tamanhoMaquina.x + 0.7, tamanhoMaquina.z + 0.7, 1);
      sombra.renderOrder = 1;
      sombrasContato.add(sombra);
    }

    if (montada.id === "furadeira") furadeira = criarFuradeira(montada);

    animacoes.registrar(montada);
    interacoes.registrar(montada, {
      furadeira: montada.id === "furadeira" ? furadeira : null
    });

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

  atmosfera.ajustarMateriais(maquinas);

  const resumo = interacoes.resumo();
  console.log(
    `[máquinas] ${resultado.maquinas.length} máquinas, ${pecas} peças de missão, ${drawCalls} draw calls.`
  );
  console.log(
    `[interações] ${resumo.maquinas} máquinas, ${resumo.mecanismos} rigs, ${resumo.acoes} ações.`
  );

  ui.ocultarCarregamento();
  ui.status(`${resultado.maquinas.length} máquinas · oficina pronta`);
  ui.modo("MENU");
  ui.inventario(calcularInventario(null));
  indicadorPasso.definirPasso(null);

  return resultado.maquinas;
}

// ---------- XR ----------
let iniciado = true;

const botaoVR = VRButton.createButton(renderer);
(document.querySelector("#vr-button-container") || document.body).appendChild(botaoVR);

renderer.xr.addEventListener("sessionstart", () => {
  ui.vrAtivo(true);
  painelVR.mostrar(true);
  painelVR.definirMissao(missoes.nomeMissao);

  audio.iniciar();
  atmosfera.definirPoeira(false);
  ajustarQualidade("vr");
  leitorGamepad.reset();

  if (!jogando) {
    menus?.marcarEmJogo(true);
    menus?.esconder();
    iniciarSessao("livre", 0);
  }

  iniciado = true;
  ui.status("Sessão VR ativa");
});

renderer.xr.addEventListener("sessionend", () => {
  ui.vrAtivo(false);
  painelVR.mostrar(false);
  atmosfera.definirPoeira(true);
  ajustarQualidade(tipoDispositivo());

  controlesMobile.pararTudo();
  controlesPC.liberar();
  entrada.frente = 0;
  entrada.lateral = 0;
  entrada.corrida = false;
  camera.position.y = CONFIG.alturaCamera;
  posJogadorAnterior.copy(jogador.position);

  ui.status("Sessão VR encerrada");

  if (jogando) menus?.abrirPausa?.();
});

// ---------- ÁUDIO DAS MÁQUINAS ----------
function sincronizarAudioMaquinas() {
  const cnc = interacoes.estado("cnc") ?? {};
  const torno = interacoes.estado("torno") ?? {};
  const esteira = interacoes.estado("esteira") ?? {};
  const fur = interacoes.estado("furadeira") ?? {};
  const clp = interacoes.estado("clp") ?? {};

  audio.sincronizar([
    { id: "cnc", ativo: Boolean(cnc.ciclo && !cnc.emergencia) },
    { id: "torno", ativo: Boolean(torno.girando && !torno.emergencia) },
    { id: "esteira", ativo: Boolean(esteira.motor && !esteira.emergencia) },
    { id: "furadeira", ativo: Boolean(fur.ligada) },
    { id: "clp", ativo: Boolean(clp.energizado && clp.rele && !clp.emergencia) }
  ]);
}

// ---------- REDIMENSIONAMENTO ----------
configurarRedimensionamento(renderer, camera, luzesComSombra);
ajustarQualidade(tipoDispositivo());

window.addEventListener("resize", () => {
  posProcessamento?.setSize(window.innerWidth, window.innerHeight);
  posProcessamento?.setQualidade(qualidadeGrafica());

  if (!preferencias.sombras) {
    renderer.shadowMap.enabled = false;
    for (const luz of luzesComSombra) luz.castShadow = false;
  }
});

// Um único gesto destrava o AudioContext; o menu já faz isso, esta é a rede.
window.addEventListener("pointerdown", () => audio.iniciar(), { once: true });

// ---------- INÍCIO ----------
carregarMaquinas().catch((erro) => {
  console.error("[máquinas] scene.glb não carregou", erro);
  ui.ocultarCarregamento();
  ui.status("Falha ao carregar as máquinas");
  ui.mensagem(
    "Não foi possível abrir o scene.glb. Sirva o projeto por http://localhost e confira o arquivo ao lado do index.html.",
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

let acumuladorAudio = 0;
let acumuladorInventario = 0;

function animar() {
  const delta = Math.min(relogio.getDelta(), 0.05);

  atmosfera.atualizar(delta);

  const ativoJogo = iniciado && jogando && !pausado;

  if (ativoJogo) {
    interacoes.atualizar(delta);
    atualizarJogador(jogador, camera, entrada, delta, contextoMovimento);

    if (renderer.xr.isPresenting) {
      controlesVR.atualizar(delta);
    } else if (controlesPC.bloqueado()) {
      realcar(resolverAlvo(ponteiro()?.object));
    } else {
      realcar(null);
    }

    const andou = Math.hypot(
      jogador.position.x - posJogadorAnterior.x,
      jogador.position.z - posJogadorAnterior.z
    );
    const andando = andou > 0.0004;

    if (andando) {
      if (!estavaAndando) distanciaPassos = 1;
      distanciaPassos += andou;
      bobFase += delta * (entrada.corrida ? 12 : 7.5);

      const limite = entrada.corrida ? 0.72 : 1;
      if (distanciaPassos >= limite) {
        distanciaPassos = 0;
        audio.passo(entrada.corrida);
      }
    } else {
      distanciaPassos = 0;
    }
    estavaAndando = andando;

    if (!renderer.xr.isPresenting) {
      const alvoY = CONFIG.alturaCamera + (andando ? Math.sin(bobFase) * 0.028 : 0);
      camera.position.y += (alvoY - camera.position.y) * Math.min(1, delta * 10);
    }

    acumuladorAudio += delta;
    if (acumuladorAudio >= 0.25) {
      acumuladorAudio = 0;
      sincronizarAudioMaquinas();
    }

    acumuladorInventario += delta;
    if (acumuladorInventario >= 0.45) {
      acumuladorInventario = 0;
      ui.inventario(calcularInventario(missoes.passo));
    }
  } else {
    realcar(null);

    if (!renderer.xr.isPresenting) {
      camera.position.y += (CONFIG.alturaCamera - camera.position.y) * Math.min(1, delta * 8);
    }
  }

  if (!ativoJogo) {
    distanciaPassos = 0;
    estavaAndando = false;
  }

  posJogadorAnterior.copy(jogador.position);

  indicadorPasso.atualizar(delta, ativoJogo && Boolean(missoes.passo));

  posProcessamento.render();
}

renderer.setAnimationLoop(animar);

// ---------- DEPURAÇÃO ----------
function simularAlvo(chave) {
  const alvo = alvos.find(
    (objeto) =>
      objeto.userData?.interativo &&
      (objeto.userData.idPeca === chave || objeto.userData.nomeEquipamento === chave)
  );
  if (!alvo) return false;

  const dono = resolverAlvo(alvo);
  responderAlvo(dono, dono?.userData?.nomeEquipamento || alvo.name);
  return true;
}

window.__oficina = {
  THREE,
  scene,
  camera,
  jogador,
  renderer,
  missoes,
  alvos,
  entrada,
  CATALOGO,
  painelVR,
  interacoes,
  animacoes,
  indicadorPasso,
  leitorGamepad,
  controlesVR,
  audio,
  atmosfera,
  menus,
  simularAlvo,
  iniciarSessao,
  get furadeira() { return furadeira; },
  get posProcessamento() { return posProcessamento; },
  get jogando() { return jogando; },
  get pausado() { return pausado; }
};

console.log("[Oficina VR SENAI] módulos carregados.");
