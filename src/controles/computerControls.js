import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// Adaptador PC: PointerLock para olhar, WASD/setas para andar, clique para
// selecionar. Escreve apenas no objeto de entrada compartilhado.
export function criarControlesComputador({ camera, renderer, entrada, aoSelecionar, aoTravar }) {
  const controles = new PointerLockControls(camera, renderer.domElement);

  const teclas = new Set();

  const MAPA = {
    w: "frente",
    arrowup: "frente",
    s: "tras",
    arrowdown: "tras",
    a: "esquerda",
    arrowleft: "esquerda",
    d: "direita",
    arrowright: "direita"
  };

  function recalcular() {
    entrada.frente = (teclas.has("frente") ? 1 : 0) - (teclas.has("tras") ? 1 : 0);
    entrada.lateral = (teclas.has("direita") ? 1 : 0) - (teclas.has("esquerda") ? 1 : 0);
    entrada.corrida = teclas.has("shift");
  }

  window.addEventListener("keydown", (evento) => {
    const tecla = evento.key.toLowerCase();

    if (tecla === "shift") {
      teclas.add("shift");
      return;
    }

    const acao = MAPA[tecla];
    if (!acao) return;

    evento.preventDefault();
    teclas.add(acao);
    recalcular();
  });

  window.addEventListener("keyup", (evento) => {
    const tecla = evento.key.toLowerCase();
    teclas.delete(tecla === "shift" ? "shift" : MAPA[tecla]);
    recalcular();
  });

  // Perder o foco não pode deixar tecla "grudada".
  window.addEventListener("blur", () => {
    teclas.clear();
    recalcular();
  });

  renderer.domElement.addEventListener("pointerup", (evento) => {
    if (evento.pointerType === "touch") return;
    if (renderer.xr.isPresenting) return;

    if (!controles.isLocked) {
      controles.lock();
      return;
    }

    entrada.origemSelecao = "tela";
    entrada.pedidoSelecao = true;
    aoSelecionar?.();
  });

  controles.addEventListener("lock", () => aoTravar?.("lock"));
  controles.addEventListener("unlock", () => aoTravar?.("unlock"));

  return {
    controles,
    bloqueado: () => controles.isLocked,
    // Em XR o PointerLock briga com o rastreamento de cabeça.
    ativo: () => !renderer.xr.isPresenting,
    liberar: () => controles.isLocked && controles.unlock(),
    dispose: () => controles.dispose()
  };
}
