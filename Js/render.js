import * as THREE from "three";

/**
 * Cria e configura o renderizador WebGL da aplicação.
 *
 * Espera que o HTML tenha um elemento com id="game".
 * O renderer é retornado para que main.js continue controlando a cena,
 * a câmera e o loop de animação.
 */
export function criarRenderizador() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.xr.enabled = true;

  renderer.domElement.id = "oficina-canvas";
  renderer.domElement.setAttribute("aria-label", "Visão 3D da oficina");

  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    zIndex: "0",
    outline: "none",
  });

  const game = document.querySelector("#game");

  if (!game) {
    throw new Error('Elemento "#game" não encontrado no HTML.');
  }

  game.prepend(renderer.domElement);

  return renderer;
}

/**
 * Mantém o tamanho do renderer sincronizado com a janela.
 * A câmera é atualizada aqui também para centralizar a lógica de resize.
 */
export function configurarRedimensionamento(renderer, camera) {
  function redimensionar() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  }

  window.addEventListener("resize", redimensionar);

  return () => {
    window.removeEventListener("resize", redimensionar);
  };
}
