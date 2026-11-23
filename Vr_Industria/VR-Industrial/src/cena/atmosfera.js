import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Ambientação: reflexos PBR de ambiente, poeira em suspensão e o pós-
// processamento (oclusão de ambiente + bloom). O composer fica desligado
// dentro do XR e no modo de qualidade baixa — o Quest não tem orçamento para
// dois passes de tela cheia em 72 Hz.

export function criarAtmosfera({ scene, renderer, medidas = {} }) {
  const largura = medidas.largura ?? 18;
  const profundidade = medidas.profundidade ?? 28;
  const altura = medidas.alturaFrente ?? 6.4;

  // ---------- AMBIENTE PBR ----------
  let alvoAmbiente = null;
  let texturaAmbiente = null;

  function construirAmbiente() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sala = new RoomEnvironment();

    alvoAmbiente = pmrem.fromScene(sala, 0.04);
    texturaAmbiente = alvoAmbiente.texture;

    scene.environment = texturaAmbiente;
    scene.environmentIntensity = 0.55;

    sala.dispose?.();
    pmrem.dispose();
  }

  // Chama depois que as máquinas carregarem: os materiais do GLB nascem com
  // envMapIntensity 1, que estoura o metal com o ambiente ligado.
  function ajustarMateriais(raiz = scene) {
    const materiais = new Set();

    raiz.traverse((objeto) => {
      if (!objeto.isMesh) return;
      if (Array.isArray(objeto.material)) {
        for (const material of objeto.material) materiais.add(material);
      } else if (objeto.material) {
        materiais.add(objeto.material);
      }
    });

    for (const material of materiais) {
      if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
        material.envMapIntensity = 0.7;
        material.needsUpdate = true;
      }
    }
  }

  // ---------- POEIRA ----------
  const QUANTIDADE = 380;
  const meiaL = largura / 2 - 0.4;
  const meiaP = profundidade / 2 - 0.4;
  const teto = Math.min(altura - 0.6, 5.6);
  const piso = 0.3;

  const posicoes = new Float32Array(QUANTIDADE * 3);
  const velocidades = new Float32Array(QUANTIDADE * 3);
  const fases = new Float32Array(QUANTIDADE);

  for (let i = 0; i < QUANTIDADE; i += 1) {
    const i3 = i * 3;
    posicoes[i3] = (Math.random() * 2 - 1) * meiaL;
    posicoes[i3 + 1] = piso + Math.random() * (teto - piso);
    posicoes[i3 + 2] = (Math.random() * 2 - 1) * meiaP;

    velocidades[i3] = (Math.random() - 0.5) * 0.06;
    velocidades[i3 + 1] = 0.008 + Math.random() * 0.03;
    velocidades[i3 + 2] = (Math.random() - 0.5) * 0.06;

    fases[i] = Math.random() * Math.PI * 2;
  }

  function texturaPoeira() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext("2d");
    const gradiente = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradiente.addColorStop(0, "rgba(255,255,255,0.95)");
    gradiente.addColorStop(0.35, "rgba(255,255,255,0.38)");
    gradiente.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, 64, 64);

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
  }

  const geometriaPoeira = new THREE.BufferGeometry();
  geometriaPoeira.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));

  const materialPoeira = new THREE.PointsMaterial({
    map: texturaPoeira(),
    color: 0xfff4dc,
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const poeira = new THREE.Points(geometriaPoeira, materialPoeira);
  poeira.name = "PoeiraSuspensa";
  poeira.renderOrder = 2;
  poeira.frustumCulled = false;
  scene.add(poeira);

  let tempo = 0;

  function atualizarPoeira(delta) {
    tempo += delta;

    const atributo = geometriaPoeira.attributes.position;
    const array = atributo.array;
    const balanco = Math.sin(tempo * 0.35);

    for (let i = 0; i < QUANTIDADE; i += 1) {
      const i3 = i * 3;

      array[i3] += (velocidades[i3] + balanco * 0.004) * delta;
      array[i3 + 1] += velocidades[i3 + 1] * delta;
      array[i3 + 2] += (velocidades[i3 + 2] + Math.cos(tempo * 0.3 + fases[i]) * 0.005) * delta;

      if (array[i3] > meiaL) array[i3] = -meiaL;
      else if (array[i3] < -meiaL) array[i3] = meiaL;

      if (array[i3 + 1] > teto) array[i3 + 1] = piso;
      if (array[i3 + 2] > meiaP) array[i3 + 2] = -meiaP;
      else if (array[i3 + 2] < -meiaP) array[i3 + 2] = meiaP;
    }

    atributo.needsUpdate = true;
  }

  function definirPoeira(ativa) {
    poeira.visible = Boolean(ativa);
  }

  construirAmbiente();

  return {
    poeira,
    ajustarMateriais,
    atualizar: atualizarPoeira,
    definirPoeira,
    get ambiente() { return texturaAmbiente; }
  };
}

// ---------- PÓS-PROCESSAMENTO ----------

export function criarPosProcessamento({ renderer, scene, camera, qualidade = "alta" }) {
  let composer = null;
  let passes = [];
  let qualidadeAtual = "baixa";
  let largura = Math.max(1, window.innerWidth);
  let altura = Math.max(1, window.innerHeight);

  function destruir() {
    for (const passe of passes) passe.dispose?.();
    passes = [];
    composer?.dispose?.();
    composer = null;
  }

  function construir(novaQualidade) {
    destruir();
    qualidadeAtual = novaQualidade;

    if (novaQualidade === "baixa") return;

    composer = new EffectComposer(renderer);

    // Um pixel ratio menor que o do renderer compensa o custo dos passes; a
    // diferença some no bloom e na oclusão, que são suaves por natureza.
    const proporcao = Math.min(renderer.getPixelRatio(), 1.5);
    composer.setPixelRatio(proporcao);
    composer.setSize(largura, altura);

    const renderPass = new RenderPass(scene, camera);
    passes.push(renderPass);
    composer.addPass(renderPass);

    if (novaQualidade === "alta") {
      const gtao = new GTAOPass(scene, camera, largura, altura);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({
        radius: 0.45,
        distanceExponent: 1.4,
        thickness: 0.7,
        scale: 1.0,
        samples: 12,
        distanceFallOff: 1.0,
        screenSpaceRadius: false
      });
      gtao.updatePdMaterial({
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 4,
        radiusExponent: 1,
        rings: 2,
        samples: 16
      });
      passes.push(gtao);
      composer.addPass(gtao);
    }

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(largura, altura),
      novaQualidade === "alta" ? 0.3 : 0.22,
      0.55,
      0.86
    );
    passes.push(bloom);
    composer.addPass(bloom);

    const output = new OutputPass();
    passes.push(output);
    composer.addPass(output);
  }

  // No XR o composer é contornado: o runtime compõe as duas vistas e os
  // passes de tela cheia só gastariam o frame.
  function render() {
    if (!composer || renderer.xr.isPresenting) {
      renderer.render(scene, camera);
      return;
    }
    composer.render();
  }

  function setSize(novaLargura, novaAltura) {
    largura = Math.max(1, novaLargura);
    altura = Math.max(1, novaAltura);
    if (!composer) return;
    composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.5));
    composer.setSize(largura, altura);
  }

  function setQualidade(nova) {
    if (!nova || nova === qualidadeAtual) return;
    construir(nova);
  }

  function dispose() {
    destruir();
  }

  construir(qualidade);

  return {
    render,
    setSize,
    setQualidade,
    dispose,
    get qualidade() { return qualidadeAtual; },
    get ativo() { return Boolean(composer); }
  };
}
