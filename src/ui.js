// Contratos de DOM definidos pelo index.html. Se um ID sumir, o módulo avisa
// em vez de falhar silencioso — foi assim que o botão VR ficou invisível antes.
const IDS = {
  loading: "#loading",
  loadingMessage: "#loading-message",
  status: "#status",
  message: "#message",
  startBtn: "#start-btn",
  instructions: "#instructions",
  selected: "#selected-object",
  placar: "#score",
  missao: "#mission",
  vrContainer: "#vr-button-container"
};

export function criarUI() {
  const el = {};
  const faltando = [];

  for (const [chave, seletor] of Object.entries(IDS)) {
    el[chave] = document.querySelector(seletor);
    if (!el[chave] && chave !== "placar" && chave !== "missao") faltando.push(seletor);
  }

  if (faltando.length) {
    console.warn("[UI] Elementos ausentes no index.html:", faltando.join(", "));
  }

  let timerMensagem = null;

  const ui = {
    elementos: el,

    status(texto) {
      if (el.status) el.status.textContent = texto;
    },

    mensagem(texto, duracao = 3200) {
      console.log("[Oficina VR]", texto);
      if (!el.message) return;

      el.message.textContent = texto;
      el.message.classList.add("visible");
      clearTimeout(timerMensagem);
      timerMensagem = setTimeout(() => el.message.classList.remove("visible"), duracao);
    },

    selecionado(texto) {
      if (el.selected) el.selected.textContent = texto;
    },

    placar(pontos, total) {
      if (el.placar) el.placar.textContent = `${pontos} / ${total}`;
    },

    missao(texto) {
      if (el.missao) el.missao.textContent = texto;
    },

    carregando(texto) {
      if (el.loadingMessage) el.loadingMessage.textContent = texto;
    },

    ocultarCarregamento() {
      el.loading?.classList.add("hidden");
    },

    habilitarInicio(rotulo = "ENTRAR NA OFICINA") {
      if (!el.startBtn) return;
      el.startBtn.disabled = false;
      el.startBtn.textContent = rotulo;
    },

    esconderInstructions() {
      el.instructions?.classList.add("hidden");
    },

    aoIniciar(callback) {
      el.startBtn?.addEventListener("click", callback);
    },

    vrAtivo(ativo) {
      document.body.classList.toggle("vr-active", ativo);
    }
  };

  return ui;
}

// Em XR a DOM não aparece dentro do headset, então o retorno visual do modo VR
// precisa viver na cena: um plano com CanvasTexture que segue a câmera.
export function criarPainelVR(THREE, camera) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;

  const painel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.155),
    new THREE.MeshBasicMaterial({
      map: textura, transparent: true, depthTest: false, depthWrite: false
    })
  );

  // Renderizado por último para nunca ficar escondido atrás de uma máquina.
  painel.renderOrder = 999;
  painel.frustumCulled = false;

  // Preso à câmera: em XR a câmera é movida pelo sistema de rastreamento,
  // então o painel acompanha a cabeça sem interferir na posição do jogador.
  camera.add(painel);
  painel.position.set(0, -0.16, -0.55);

  let missao = "";
  let placar = "";
  let aviso = "";

  function redesenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(9,14,20,0.86)";
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 26);
    ctx.fill();

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 22);
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 34px Arial";
    ctx.textBaseline = "top";
    ctx.fillText(missao, 30, 26);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "28px Arial";
    const linhas = aviso.split("\n");
    linhas.slice(0, 2).forEach((linha, i) => ctx.fillText(linha, 30, 84 + i * 36));

    ctx.fillStyle = "#7ee2a8";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "right";
    ctx.fillText(placar, canvas.width - 30, 26);
    ctx.textAlign = "left";

    textura.needsUpdate = true;
  }

  return {
    mesh: painel,
    definirMissao(texto) { missao = texto; redesenhar(); },
    definirPlacar(texto) { placar = texto; redesenhar(); },
    exibir(texto) { aviso = texto; redesenhar(); },
    mostrar(mostrar) { painel.visible = mostrar; }
  };
}
