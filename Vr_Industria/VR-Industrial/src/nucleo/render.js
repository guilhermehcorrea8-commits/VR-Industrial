import * as THREE from "three";

// Orçamento de renderização por dispositivo. O Quest não segura as mesmas
// configurações de um desktop, então o modo é reavaliado ao entrar e ao sair do XR.
const ORCAMENTOS = {
  desktop: { pixelRatioMax: 1.7, sombras: true, mapaSombra: 2048 },
  mobile: { pixelRatioMax: 1.25, sombras: true, mapaSombra: 1024 },
  vr: { pixelRatioMax: 1.0, sombras: false, mapaSombra: 512 }
};

export function criarRenderizador() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.xr.enabled = true;

  return renderer;
}

export function tipoDispositivo() {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  return coarse || navigator.maxTouchPoints > 0 ? "mobile" : "desktop";
}

export function modoAtual(renderer) {
  return renderer.xr.isPresenting ? "vr" : tipoDispositivo();
}

// Reaplica o orçamento do modo corrente. `luzes` são as DirectionalLight que
// possuem shadow.mapSize; PointLights do teto não projetam sombra.
export function aplicarQualidade(renderer, luzes = [], modo = modoAtual(renderer)) {
  const orcamento = ORCAMENTOS[modo] || ORCAMENTOS.desktop;

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, orcamento.pixelRatioMax)
  );

  renderer.shadowMap.enabled = orcamento.sombras;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  for (const luz of luzes) {
    luz.castShadow = orcamento.sombras;
    luz.shadow.mapSize.set(orcamento.mapaSombra, orcamento.mapaSombra);
    luz.shadow.map?.dispose();
    luz.shadow.map = null;
  }

  // Sem isso os shaders não são recompilados quando as sombras são desligadas.
  renderer.shadowMap.needsUpdate = true;

  return orcamento;
}

export function configurarRedimensionamento(renderer, camera, luzes = []) {
  const ajustar = () => {
    if (renderer.xr.isPresenting) return;

    // Webviews embutidos e abas ocultas reportam viewport 0x0. Aspect 0/0
    // envenena a matriz de projeção e todo raycast passa a devolver NaN.
    const largura = window.innerWidth || 1;
    const altura = window.innerHeight || 1;

    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();

    renderer.setSize(largura, altura);
    aplicarQualidade(renderer, luzes);
  };

  window.addEventListener("resize", ajustar);
  window.addEventListener("orientationchange", ajustar);

  // Sem esta primeira chamada o canvas fica no tamanho padrão de 300x150: o
  // evento resize não dispara na carga da página, e a oficina inteira apareceria
  // num retângulo pequeno no canto.
  ajustar();

  return ajustar;
}

export { ORCAMENTOS };
