// Adaptador celular/tablet: arrastar na tela gira a câmera, os botões de
// movimento escrevem nos mesmos eixos da entrada compartilhada, e um toque
// sem arrasto seleciona o objeto da mira central.
export function criarControlesMobile({
  camera,
  renderer,
  entrada,
  config,
  aoSelecionar
}) {
  const botões = document.querySelectorAll("[data-move]");
  const pressionados = new Set();

  function recalcular() {
    entrada.frente =
      (pressionados.has("forward") ? 1 : 0) - (pressionados.has("backward") ? 1 : 0);
    entrada.lateral =
      (pressionados.has("right") ? 1 : 0) - (pressionados.has("left") ? 1 : 0);
  }

  botões.forEach((botao) => {
    const direcao = botao.dataset.move;

    const apertar = (evento) => {
      evento.preventDefault();
      pressionados.add(direcao);
      recalcular();

      try {
        botao.setPointerCapture?.(evento.pointerId);
      } catch {
        // Nem todo navegador permite captura durante o pointerdown.
      }
    };

    const soltar = (evento) => {
      evento.preventDefault();
      pressionados.delete(direcao);
      recalcular();
    };

    botao.addEventListener("pointerdown", apertar);
    botao.addEventListener("pointerup", soltar);
    botao.addEventListener("pointercancel", soltar);
    botao.addEventListener("lostpointercapture", soltar);
  });

  // --- olhar por arrasto ---
  let ativo = false;
  let idAtivo = null;
  let ultimoX = 0;
  let ultimoY = 0;
  let arrastou = false;

  const canvas = renderer.domElement;

  canvas.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType !== "touch" || renderer.xr.isPresenting) return;

    ativo = true;
    idAtivo = evento.pointerId;
    arrastou = false;
    ultimoX = evento.clientX;
    ultimoY = evento.clientY;
  });

  canvas.addEventListener("pointermove", (evento) => {
    if (!ativo || evento.pointerId !== idAtivo) return;
    if (evento.pointerType !== "touch") return;

    const dx = evento.clientX - ultimoX;
    const dy = evento.clientY - ultimoY;

    if (Math.abs(dx) + Math.abs(dy) > 4) arrastou = true;
    if (!arrastou) return;

    // Ordem YXZ: yaw primeiro, depois pitch. Sem isso a câmera "rola".
    camera.rotation.order = "YXZ";
    camera.rotation.y -= dx * config.sensibilidadeToque;
    camera.rotation.x = Math.max(
      -config.limiteVerticalVisao,
      Math.min(config.limiteVerticalVisao, camera.rotation.x - dy * config.sensibilidadeToque)
    );

    ultimoX = evento.clientX;
    ultimoY = evento.clientY;
  });

  const soltarOlhar = (evento) => {
    if (!ativo || (evento.pointerId !== undefined && evento.pointerId !== idAtivo)) return;

    if (!arrastou) {
      entrada.origemSelecao = "tela";
      entrada.pedidoSelecao = true;
      aoSelecionar?.();
    }

    ativo = false;
    idAtivo = null;
  };

  canvas.addEventListener("pointerup", soltarOlhar);
  canvas.addEventListener("pointercancel", soltarOlhar);

  window.addEventListener("blur", () => {
    pressionados.clear();
    recalcular();
  });

  return {
    pararTudo() {
      pressionados.clear();
      ativo = false;
      recalcular();
    }
  };
}
