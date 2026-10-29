import { VRButton } from "three/addons/webxr/VRButton.js";

/**
 * Configura o botão e os eventos de entrada/saída do WebXR.
 * A movimentação e a orientação em VR ficam sob responsabilidade do headset.
 */
export function configurarControlesVR({
  renderer,
  iniciarJogo,
  definirJogoIniciado,
  atualizarStatus,
}) {
  let botaoVR;

  try {
    botaoVR = VRButton.createButton(renderer);
    const container = document.querySelector("#vr-button-container");

    if (container) {
      container.appendChild(botaoVR);
    } else {
      document.body.appendChild(botaoVR);
    }

    renderer.xr.addEventListener("sessionstart", () => {
      document.body.classList.add("vr-active");
      document.querySelector("#instructions")?.classList.add("hidden");
      definirJogoIniciado(true);
      atualizarStatus?.("Modo VR ativo");
    });

    renderer.xr.addEventListener("sessionend", () => {
      document.body.classList.remove("vr-active");
      atualizarStatus?.("Modo VR encerrado");
    });

    return botaoVR;
  } catch (erro) {
    console.warn("[VR] Não foi possível criar o botão:", erro);
    atualizarStatus?.("VR indisponível neste navegador/dispositivo");
    return null;
  }
}
