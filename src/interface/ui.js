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
  let painel = null;

  const ui = {
    elementos: el,

    status(texto) {
      if (el.status) el.status.textContent = texto;
    },

    // A mesma frase vai para a caixa da HUD e para o painel 3D: dentro do
    // headset a DOM não aparece, e fora dele o painel está invisível.
    mensagem(texto, duracao = 3200) {
      console.log("[Oficina VR]", texto);

      if (el.message) {
        el.message.textContent = texto;
        el.message.classList.add("visible");
        clearTimeout(timerMensagem);
        timerMensagem = setTimeout(() => el.message.classList.remove("visible"), duracao);
      }

      painel?.avisar(texto, duracao);
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
    },

    ligarPainel(novoPainel) {
      painel = novoPainel;
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

  const MARGEM = 30;
  const LARGURA_TITULO = canvas.width - MARGEM * 2 - 210; // sobra para o placar
  const TOPO_CORPO = 74;
  const MAX_LINHAS = 4;
  const TAMANHOS = [26, 23, 20];

  let missao = "";
  let placar = "";
  let passo = "";
  let destaque = "";
  let timerDestaque = null;

  function quebrar(texto, largura, fonte) {
    ctx.font = fonte;
    ctx.textAlign = "left";
    const linhas = [];

    for (const paragrafo of String(texto ?? "").split("\n")) {
      let atual = "";
      for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        const teste = atual ? `${atual} ${palavra}` : palavra;
        if (atual && ctx.measureText(teste).width > largura) {
          linhas.push(atual);
          atual = palavra;
        } else {
          atual = teste;
        }
      }
      linhas.push(atual);
    }
    return linhas;
  }

  // No headset não há rolagem: reduz a fonte antes de cortar o texto, e só
  // reticências no último recurso.
  function ajustar(texto) {
    const largura = canvas.width - MARGEM * 2;

    for (const tamanho of TAMANHOS) {
      const linhas = quebrar(texto, largura, `${tamanho}px Arial`);
      if (linhas.length <= MAX_LINHAS) return { linhas, tamanho };
    }

    const tamanho = TAMANHOS[TAMANHOS.length - 1];
    const linhas = quebrar(texto, largura, `${tamanho}px Arial`).slice(0, MAX_LINHAS);
    linhas[MAX_LINHAS - 1] = `${linhas[MAX_LINHAS - 1].slice(0, -1)}…`;
    return { linhas, tamanho };
  }

  function redesenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(9,14,20,0.86)";
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 26);
    ctx.fill();

    ctx.strokeStyle = destaque ? "#fbbf24" : "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 22);
    ctx.stroke();

    ctx.textBaseline = "top";

    let fonteTitulo = 30;
    ctx.font = `bold ${fonteTitulo}px Arial`;
    while (fonteTitulo > 18 && ctx.measureText(missao).width > LARGURA_TITULO) {
      fonteTitulo -= 2;
      ctx.font = `bold ${fonteTitulo}px Arial`;
    }
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(missao, MARGEM, 22);

    ctx.fillStyle = "#7ee2a8";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "right";
    ctx.fillText(placar, canvas.width - MARGEM, 22);
    ctx.textAlign = "left";

    const corpo = ajustar(destaque || passo);
    const entrelinha = corpo.tamanho + 8;
    ctx.fillStyle = destaque ? "#fff7ed" : "#e2e8f0";
    ctx.font = `${corpo.tamanho}px Arial`;
    corpo.linhas.forEach((linha, indice) => {
      ctx.fillText(linha, MARGEM, TOPO_CORPO + indice * entrelinha);
    });

    textura.needsUpdate = true;
  }

  return {
    mesh: painel,
    definirMissao(texto) { missao = texto; redesenhar(); },
    definirPlacar(texto) { placar = texto; redesenhar(); },
    exibir(texto) { passo = texto; redesenhar(); },

    // Mensagem temporária sobreposta ao passo: some sozinha e devolve o
    // painel ao texto da missão, como faz a caixa da HUD.
    avisar(texto, duracao = 3200) {
      destaque = texto;
      clearTimeout(timerDestaque);
      timerDestaque = setTimeout(() => { destaque = ""; redesenhar(); }, duracao);
      redesenhar();
    },

    mostrar(visivel) { painel.visible = visivel; }
  };
}
