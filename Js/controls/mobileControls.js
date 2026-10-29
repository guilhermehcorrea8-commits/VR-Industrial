import * as THREE from "three";

/**
 * Controles para celular/tablet:
 * - Botões com data-move="forward|backward|left|right": movimentação
 * - Arrastar o dedo sobre a cena: olhar ao redor
 * - Toque sem arrastar: selecionar objeto
 */
export function criarControlesMobile({
  camera,
  renderer,
  config,
  jogoIniciado,
  selecionarObjeto,
  mostrarMensagem,
}) {
  const movimento = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  let toqueAtivo = false;
  let toqueX = 0;
  let toqueY = 0;
  let toqueMoveu = false;

  const botoes = document.querySelectorAll("[data-move]");

  botoes.forEach((botao) => {
    const direcao = botao.dataset.move;
    if (!(direcao in movimento)) return;

    const iniciar = (evento) => {
      evento.preventDefault();
      movimento[direcao] = true;

      if (botao.setPointerCapture && evento.pointerId !== undefined) {
        try {
          botao.setPointerCapture(evento.pointerId);
        } catch {
          // O navegador pode não permitir capturar o ponteiro.
        }
      }
    };

    const parar = (evento) => {
      evento.preventDefault();
      movimento[direcao] = false;
    };

    botao.addEventListener("pointerdown", iniciar);
    botao.addEventListener("pointerup", parar);
    botao.addEventListener("pointercancel", parar);
    botao.addEventListener("lostpointercapture", () => {
      movimento[direcao] = false;
    });
  });

  renderer.domElement.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType !== "touch" || renderer.xr.isPresenting) return;

    toqueAtivo = true;
    toqueMoveu = false;
    toqueX = evento.clientX;
    toqueY = evento.clientY;
  });

  renderer.domElement.addEventListener("pointermove", (evento) => {
    if (!toqueAtivo || evento.pointerType !== "touch") return;

    const dx = evento.clientX - toqueX;
    const dy = evento.clientY - toqueY;

    if (Math.abs(dx) + Math.abs(dy) > 3) toqueMoveu = true;

    if (jogoIniciado() && toqueMoveu && !renderer.xr.isPresenting) {
      camera.rotation.order = "YXZ";
      camera.rotation.y -= dx * config.sensibilidadeToque;
      camera.rotation.x -= dy * config.sensibilidadeToque;
      camera.rotation.x = Math.max(
        -config.limiteVerticalVisao,
        Math.min(config.limiteVerticalVisao, camera.rotation.x)
      );
    }

    toqueX = evento.clientX;
    toqueY = evento.clientY;
  });

  function finalizarToque(evento) {
    if (evento.pointerType !== "touch") return;

    if (
      toqueAtivo &&
      !toqueMoveu &&
      jogoIniciado() &&
      !renderer.xr.isPresenting
    ) {
      selecionarObjeto?.();
    }

    toqueAtivo = false;
  }

  renderer.domElement.addEventListener("pointerup", finalizarToque);
  renderer.domElement.addEventListener("pointercancel", () => {
    toqueAtivo = false;
  });

  document.querySelector("#look-button")?.addEventListener("click", () => {
    if (!jogoIniciado()) {
      mostrarMensagem?.("Use o botão de entrada para iniciar a exploração.");
    } else {
      mostrarMensagem?.("Arraste o dedo sobre a cena para olhar ao redor.");
    }
  });

  function mover(delta) {
    if (!jogoIniciado() || renderer.xr.isPresenting) return;

    let frente = Number(movimento.forward) - Number(movimento.backward);
    let lateral = Number(movimento.right) - Number(movimento.left);
    const magnitude = Math.hypot(frente, lateral);
    if (magnitude === 0) return;

    frente /= magnitude;
    lateral /= magnitude;

    const distancia = config.velocidade * delta;
    const direcaoFrente = new THREE.Vector3();
    // THREE é recebido abaixo por import para manter o módulo independente.
    camera.getWorldDirection(direcaoFrente);
    direcaoFrente.y = 0;
    direcaoFrente.normalize();

    const direcaoDireita = new THREE.Vector3()
      .crossVectors(direcaoFrente, camera.up)
      .normalize()
      .negate();

    camera.position.addScaledVector(direcaoFrente, frente * distancia);
    camera.position.addScaledVector(direcaoDireita, lateral * distancia);

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -config.larguraGalpao / 2 + 1,
      config.larguraGalpao / 2 - 1
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -config.profundidadeGalpao / 2 + 1,
      config.profundidadeGalpao / 2 - 1
    );
    camera.position.y = config.alturaCamera;
  }

  function limpar() {
    Object.keys(movimento).forEach((direcao) => {
      movimento[direcao] = false;
    });
    toqueAtivo = false;
  }

  window.addEventListener("blur", limpar);

  return { movimento, mover, limpar };
}
