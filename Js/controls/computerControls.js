import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

/**
 * Controles para computador:
 * - WASD / setas: movimentar
 * - Shift: correr
 * - Mouse: olhar ao redor via Pointer Lock
 */
export function criarControlesComputador({
  camera,
  renderer,
  config,
  iniciarJogo,
  jogoIniciado,
  temTouch,
  atualizarStatus,
}) {
  const pointerLock = new PointerLockControls(camera, renderer.domElement);
  const teclas = new Set();

  const podeUsarComputador = () => !temTouch && !renderer.xr.isPresenting;

  function aoPressionar(evento) {
    const tecla = evento.key.toLowerCase();

    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
      ].includes(tecla)
    ) {
      evento.preventDefault();
    }

    teclas.add(tecla);
  }

  function aoSoltar(evento) {
    teclas.delete(evento.key.toLowerCase());
  }

  function limparTeclas() {
    teclas.clear();
  }

  window.addEventListener("keydown", aoPressionar);
  window.addEventListener("keyup", aoSoltar);
  window.addEventListener("blur", limparTeclas);

  pointerLock.addEventListener("lock", () => {
    atualizarStatus?.("Mouse capturado · ESC para liberar");
  });

  pointerLock.addEventListener("unlock", () => {
    if (jogoIniciado() && !renderer.xr.isPresenting) {
      atualizarStatus?.("Mouse livre · clique para continuar");
    }
  });

  renderer.domElement.addEventListener("click", () => {
    if (!jogoIniciado() || !podeUsarComputador()) return;
    if (!pointerLock.isLocked) pointerLock.lock();
  });

  function mover(delta) {
    if (!jogoIniciado() || renderer.xr.isPresenting || temTouch) return;

    const frente = teclas.has("w") || teclas.has("arrowup");
    const tras = teclas.has("s") || teclas.has("arrowdown");
    const esquerda = teclas.has("d") || teclas.has("arrowleft");
    const direita = teclas.has("a") || teclas.has("arrowright");

    let eixoFrente = Number(frente) - Number(tras);
    let eixoLateral = Number(direita) - Number(esquerda);
    const magnitude = Math.hypot(eixoFrente, eixoLateral);

    if (magnitude === 0) return;

    eixoFrente /= magnitude;
    eixoLateral /= magnitude;

    const velocidade = teclas.has("shift")
      ? config.velocidadeCorrida
      : config.velocidade;

    const distancia = velocidade * delta;

    const direcaoFrente = new THREE.Vector3();
    camera.getWorldDirection(direcaoFrente);
    direcaoFrente.y = 0;
    direcaoFrente.normalize();

    const direcaoDireita = new THREE.Vector3()
      .crossVectors(direcaoFrente, camera.up)
      .normalize()
      .negate();

    camera.position.addScaledVector(direcaoFrente, eixoFrente * distancia);
    camera.position.addScaledVector(direcaoDireita, eixoLateral * distancia);

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

  return {
    pointerLock,
    mover,
    destruir() {
      window.removeEventListener("keydown", aoPressionar);
      window.removeEventListener("keyup", aoSoltar);
      window.removeEventListener("blur", limparTeclas);
      pointerLock.unlock();
    },
  };
}
