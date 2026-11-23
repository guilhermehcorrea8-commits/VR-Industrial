import * as THREE from "three";

// Galpão da metalurgia do SENAI Caxias do Sul.
// Geometria lida das cinco fotos: telha metálica clara de UMA água com terças
// verdes, treliças de alma paralela em zigue-zague, tijolo até ~3 m com
// reboco branco acima, mureta + vitrine de vidro separando do corredor,
// portão basculante, tubo azul de ar comprimido e luminárias lineares suspensas.

export const MEDIDAS = {
  largura: 18,          // eixo X
  profundidade: 28,     // eixo Z
  alturaParede: 6.2,    // topo do reboco
  alturaFundo: 7.0,     // beiral do fundo (telhado inclina para a frente)
  alturaFrente: 6.4,
  ateTijolo: 3.0,
  espessura: 0.3,
  vaoPortao: { largura: 7.0, altura: 4.2, centroZ: 3.0 }
};

export function criarGalpao(mats, config = MEDIDAS) {
  const grupo = new THREE.Group();
  grupo.name = "GalpaoSENAI";

  const colisores = [];
  const selecionaveis = [];

  const L = config.largura;
  const P = config.profundidade;
  const H = config.alturaParede;
  const E = config.espessura;
  const T = config.ateTijolo;
  const meioL = L / 2;
  const meioP = P / 2;

  function registrarColisor(mesh) {
    mesh.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(mesh);
    colisores.push(caixa);
  }

  function caixa(nome, tamanho, posicao, material, opcoes = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...tamanho),
      material
    );
    mesh.name = nome;
    mesh.position.set(...posicao);
    if (opcoes.rotY) mesh.rotation.y = opcoes.rotY;
    if (opcoes.rotZ) mesh.rotation.z = opcoes.rotZ;
    if (opcoes.rotX) mesh.rotation.x = opcoes.rotX;
    mesh.castShadow = opcoes.sombra !== false;
    mesh.receiveShadow = true;
    (opcoes.pai || grupo).add(mesh);

    if (opcoes.colisor) registrarColisor(mesh);
    if (opcoes.interativo) {
      mesh.userData.interativo = true;
      mesh.userData.nomeEquipamento = opcoes.rotulo || nome;
      selecionaveis.push(mesh);
    }
    return mesh;
  }

  // Quadros definidos por 4 cantos reais: elimina erro de conta em telhados
  // inclinados e mantém a textura com o passo físico correto.
  function quadro(nome, cantos, material, metroPorTile, opcoes = {}) {
    const [a, b, c, d] = cantos.map((p) => new THREE.Vector3(...p));
    const u = b.clone().sub(a).length() / metroPorTile;
    const v = d.clone().sub(a).length() / metroPorTile;

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [a.toArray(), b.toArray(), c.toArray(), d.toArray()].flat(),
        3
      )
    );
    geometria.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        [[0, 0], [u, 0], [u, v], [0, v]].flat(),
        2
      )
    );
    geometria.setIndex([0, 1, 2, 0, 2, 3]);
    geometria.computeVertexNormals();

    const mapa = material.map ? material.map.clone() : null;
    if (mapa) {
      mapa.needsUpdate = true;
      mapa.repeat.set(1, 1);
    }

    const mesh = new THREE.Mesh(geometria, material.clone());
    if (mesh.material.map) {
      mesh.material.map = mapa;
    }
    mesh.material.side = THREE.DoubleSide;
    mesh.name = nome;
    mesh.receiveShadow = true;
    if (opcoes.sombra) mesh.castShadow = true;
    grupo.add(mesh);
    return mesh;
  }

  // ---------- PISO ----------
  quadro(
    "PisoLadrilho",
    [[-meioL, 0, -meioP], [meioL, 0, -meioP], [meioL, 0, meioP], [-meioL, 0, meioP]],
    mats.piso,
    0.5,
    { sombra: false }
  );

  // Parede do corredor (lado de fora do portão) em concreto liso.
  quadro(
    "PisoCorredor",
    [
      [-meioL - 5, -0.02, meioP - 8], [meioL + 5, -0.02, meioP - 8],
      [meioL + 5, -0.02, meioP + 6], [-meioL - 5, -0.02, meioP + 6]
    ],
    mats.concreto,
    0.6,
    { sombra: false }
  );

  // ---------- PAREDE DO FUNDO: tijolo + faixa de janelões ----------
  caixa(
    "Fundo_Tijolo",
    [L, T, E],
    [0, T / 2, -meioP],
    mats.tijolo,
    { colisor: true }
  );
  caixa(
    "Fundo_Reboco",
    [L, H - T, E],
    [0, T + (H - T) / 2, -meioP],
    mats.reboco,
    { colisor: true }
  );

  // Janelões altos contínuos, como na foto 1 e 2.
  const alturaVidro = 1.5;
  const yVidro = T + 0.35 + alturaVidro / 2;
  caixa("Fundo_Vidro", [L - 1.6, alturaVidro, 0.06], [0, yVidro, -meioP + 0.12], mats.vidro);
  caixa("Fundo_Vidro_MolduraSuperior", [L - 1.5, 0.1, 0.12], [0, yVidro + alturaVidro / 2, -meioP + 0.12], mats.metalEscuro);
  caixa("Fundo_Vidro_MolduraInferior", [L - 1.5, 0.1, 0.12], [0, yVidro - alturaVidro / 2, -meioP + 0.12], mats.metalEscuro);
  for (let x = -meioL + 1.5; x < meioL - 1; x += 2.2) {
    caixa("Fundo_Vidro_Divisoria", [0.08, alturaVidro, 0.12], [x, yVidro, -meioP + 0.12], mats.metalEscuro);
  }
  caixa("Fundo_Soleira", [L, 0.35, E + 0.06], [0, T + 0.175, -meioP], mats.concreto);

  // ---------- PAREDE DA FRENTE: porta de acesso ao corredor ----------
  const portaFrente = { largura: 1.6, altura: 2.6, x: -5.2 };
  const frenteEsq = portaFrente.x - portaFrente.largura / 2 + meioL;
  const frenteDir = meioL - (portaFrente.x + portaFrente.largura / 2);

  caixa("Frente_TijoloEsq", [frenteEsq, T, E], [-meioL + frenteEsq / 2, T / 2, meioP], mats.tijolo, { colisor: true });
  caixa("Frente_TijoloDir", [frenteDir, T, E], [meioL - frenteDir / 2, T / 2, meioP], mats.tijolo, { colisor: true });
  caixa("Frente_Reboco", [L, H - T, E], [0, T + (H - T) / 2, meioP], mats.reboco, { colisor: true });
  caixa("Frente_VaoAcimaPorta", [portaFrente.largura, T - portaFrente.altura, E], [portaFrente.x, portaFrente.altura + (T - portaFrente.altura) / 2, meioP], mats.reboco);

  caixa("Frente_Porta", [portaFrente.largura - 0.2, portaFrente.altura - 0.1, 0.08], [portaFrente.x, portaFrente.altura / 2, meioP - 0.05], mats.cinza);
  caixa("Frente_Porta_Vidro", [0.55, 0.8, 0.03], [portaFrente.x, 1.75, meioP - 0.11], mats.vidro);
  caixa("Frente_Porta_Maca", [0.24, 0.05, 0.05], [portaFrente.x + 0.5, 1.05, meioP - 0.12], mats.metal);
  caixa("Frente_Moldura_Esq", [0.12, portaFrente.altura, E + 0.08], [portaFrente.x - portaFrente.largura / 2 - 0.06, portaFrente.altura / 2, meioP], mats.metalEscuro);
  caixa("Frente_Moldura_Dir", [0.12, portaFrente.altura, E + 0.08], [portaFrente.x + portaFrente.largura / 2 + 0.06, portaFrente.altura / 2, meioP], mats.metalEscuro);
  caixa("Frente_Moldura_Top", [portaFrente.largura + 0.36, 0.14, E + 0.08], [portaFrente.x, portaFrente.altura + 0.07, meioP], mats.metalEscuro);

  // Placa de saída verde sobre a porta (foto 3).
  caixa("Frente_PlacaSaida", [0.9, 0.3, 0.04], [portaFrente.x, portaFrente.altura + 0.35, meioP - 0.18], mats.placaSaida);

  // ---------- PAREDE ESQUERDA: mureta de tijolo + vitrine do corredor ----------
  const mureta = 1.15;
  const vitrineAltura = 1.65;
  caixa("Esquerda_Mureta", [E, mureta, P], [-meioL, mureta / 2, 0], mats.tijolo, { colisor: true });
  caixa("Esquerda_Vitrine", [0.05, vitrineAltura, P - 1.2], [-meioL, mureta + vitrineAltura / 2, 0], mats.vidro);
  caixa("Esquerda_Vitrine_Superior", [E, 0.12, P - 1.1], [-meioL, mureta + vitrineAltura, 0], mats.metalEscuro);
  caixa("Esquerda_Vitrine_Inferior", [E + 0.04, 0.1, P - 1.1], [-meioL, mureta, 0], mats.metal);
  for (let z = -meioP + 1.5; z < meioP - 1; z += 2.4) {
    caixa("Esquerda_Vitrine_Montante", [0.1, vitrineAltura, 0.08], [-meioL, mureta + vitrineAltura / 2, z], mats.metalEscuro);
  }
  caixa("Esquerda_Reboco", [E, H - (mureta + vitrineAltura), P], [-meioL, (mureta + vitrineAltura + H) / 2, 0], mats.reboco, { colisor: true });

  // ---------- PAREDE DIREITA: portão basculante para o pátio ----------
  const portao = config.vaoPortao;
  const zVaoMin = portao.centroZ - portao.largura / 2;
  const zVaoMax = portao.centroZ + portao.largura / 2;
  const trechoFundo = zVaoMin + meioP;
  const trechoFrente = meioP - zVaoMax;

  caixa("Direita_TijoloFundo", [E, T, trechoFundo], [meioL, T / 2, -meioP + trechoFundo / 2], mats.tijolo, { colisor: true });
  caixa("Direita_TijoloFrente", [E, T, trechoFrente], [meioL, T / 2, zVaoMax + trechoFrente / 2], mats.tijolo, { colisor: true });
  caixa("Direita_Reboco", [E, H - T, P], [meioL, T + (H - T) / 2, 0], mats.reboco, { colisor: true });

  // Faixa de janelas altas na parede direita (foto 1).
  for (let z = -meioP + 2; z < meioP - 2; z += 3.0) {
    if (z > zVaoMin - 1 && z < zVaoMax + 1) continue;
    caixa("Direita_Janela", [0.06, 1.1, 2.4], [meioL - 0.1, 5.0, z], mats.vidro);
    caixa("Direita_Janela_Moldura", [0.1, 1.25, 2.55], [meioL - 0.06, 5.0, z], mats.metalEscuro);
  }

  // Pilar de concreto no vão do portão (foto 2).
  caixa("Direita_PilarConcreto", [0.45, H, 0.45], [meioL - 0.1, H / 2, zVaoMax + 0.3], mats.concreto, { colisor: true });

  // Portão basculante aberto, inclinado para dentro.
  const folha = caixa(
    "Portao_Basculante",
    [0.08, portao.altura, portao.largura - 0.25],
    [meioL - 1.35, portao.altura * 0.78, portao.centroZ],
    mats.aluminio,
    { rotZ: Math.PI / 2.6 }
  );

  // Nervuras da folha, filhas do portão para herdarem a inclinação.
  for (let i = 0; i < 6; i++) {
    caixa(
      `Portao_Nervura_${i}`,
      [0.05, 0.06, portao.largura - 0.4],
      [0.06, -portao.altura / 2 + (i + 0.5) * (portao.altura / 6), 0],
      mats.metal,
      { pai: folha }
    );
  }

  // Letreiro SENAI sobre o portão (foto 2).
  caixa("Letreiro_SENAI", [0.06, 1.0, 3.6], [meioL - 0.2, portao.altura + 0.9, portao.centroZ], mats.letreiro);

  // ---------- TUBO AZUL DE AR COMPRIMIDO + ELETROCALHA ----------
  // Correm no alto das paredes, como nas fotos 1 e 4.
  const alturaTubo = 3.35;
  for (const lado of [-1, 1]) {
    caixa(`TuboAr_Lado${lado}`, [0.11, 0.11, P - 1.2], [lado * (meioL - 0.32), alturaTubo, 0], mats.azulClaro);
    for (let z = -meioP + 1; z < meioP - 1; z += 3.2) {
      caixa(`TuboAr_Brachadeira${lado}_${z}`, [0.05, 0.3, 0.05], [lado * (meioL - 0.32), alturaTubo + 0.18, z], mats.metal);
    }
  }
  caixa("TuboAr_Travessia", [L - 1, 0.11, 0.11], [0, alturaTubo, -meioP + 0.4], mats.azulClaro);

  caixa("Eletrocalha_Fundo", [L - 1.4, 0.12, 0.22], [0, H - 0.55, -meioP + 0.55], mats.metal);
  caixa("Eletrocalha_Direita", [0.22, 0.12, P - 1.4], [meioL - 0.55, H - 0.55, 0], mats.metal);

  // ---------- ACESSÓRIOS DE PAREDE ----------
  caixa("Quadro_EletricoAzul", [0.22, 1.3, 1.0], [-meioL + 0.28, 1.9, -8.5], mats.azul, { interativo: true, rotulo: "Quadro elétrico" });
  caixa("Armario_Emergencia", [0.28, 1.5, 0.9], [-meioL + 0.3, 1.85, -6.0], mats.vermelho, { interativo: true, rotulo: "Armário de emergências" });
  caixa("Extintor", [0.16, 0.55, 0.16], [-meioL + 0.32, 1.1, -4.4], mats.vermelho, { interativo: true, rotulo: "Extintor de incêndio" });

  const relogio = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 28), mats.relogio);
  relogio.rotation.z = Math.PI / 2;
  relogio.position.set(meioL - 0.22, 4.2, -6.5);
  relogio.name = "Relogio de parede";
  grupo.add(relogio);

  // Lixeira amarela (foto 4).
  caixa("Lixeira_Amarela", [0.62, 0.95, 0.62], [meioL - 0.7, 0.48, -10.5], mats.amarelo, { interativo: true, rotulo: "Lixeira industrial" });
  caixa("Lixeira_Tampa", [0.68, 0.08, 0.68], [meioL - 0.7, 0.99, -10.5], mats.amarelo);

  // ---------- TRELIÇAS VERDES ----------
  // Alma paralela com montantes e diagonais em zigue-zague, vão total.
  const passoTrelica = 4.0;
  const alturaTrelica = 0.62;
  const cordaInferior = (z) =>
    THREE.MathUtils.lerp(config.alturaFrente, config.alturaFundo, (z + meioP) / P) - alturaTrelica - 0.15;

  function barraEntre(nome, a, b, secção, material) {
    const inicio = new THREE.Vector3(...a);
    const fim = new THREE.Vector3(...b);
    const delta = fim.clone().sub(inicio);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(secção, delta.length(), secção),
      material
    );
    mesh.position.copy(inicio).add(fim).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    mesh.name = nome;
    mesh.castShadow = true;
    grupo.add(mesh);
    return mesh;
  }

  for (let z = -meioP + 1.2; z <= meioP - 1.0; z += passoTrelica) {
    const yBaixa = cordaInferior(z);
    const yAlta = yBaixa + alturaTrelica;

    caixa(`Trelica_CordaBaixa_${z}`, [L - 0.3, 0.13, 0.13], [0, yBaixa, z], mats.verde);
    caixa(`Trelica_CordaAlta_${z}`, [L - 0.3, 0.13, 0.13], [0, yAlta, z], mats.verde);

    const montantes = 9;
    for (let i = 0; i <= montantes; i++) {
      const x = -meioL + 0.4 + (i * (L - 0.8)) / montantes;
      caixa(`Trelica_Montante_${z}_${i}`, [0.09, alturaTrelica, 0.09], [x, yBaixa + alturaTrelica / 2, z], mats.verde);

      if (i < montantes) {
        const x2 = -meioL + 0.4 + ((i + 1) * (L - 0.8)) / montantes;
        const deBaixo = i % 2 === 0;
        barraEntre(
          `Trelica_Diagonal_${z}_${i}`,
          deBaixo ? [x, yBaixa, z] : [x, yAlta, z],
          deBaixo ? [x2, yAlta, z] : [x2, yBaixa, z],
          0.075,
          mats.verde
        );
      }
    }
  }

  // ---------- TERÇAS E CONTRAVENTAMENTOS ----------
  const tercaAltura = (z) =>
    THREE.MathUtils.lerp(config.alturaFrente, config.alturaFundo, (z + meioP) / P) - 0.08;

  for (let x = -meioL + 1.0; x <= meioL - 1.0; x += 1.6) {
    barraEntre(
      `Terca_${x}`,
      [x, tercaAltura(-meioP + 1.2), -meioP + 1.2],
      [x, tercaAltura(meioP - 1.0), meioP - 1.0],
      0.1,
      mats.verde
    );
  }

  // Tirantes finos entre treliças, visíveis na foto do teto.
  for (let z = -meioP + 3.2; z <= meioP - 3.0; z += passoTrelica) {
    for (const x of [-meioL + 2.2, meioL - 2.2]) {
      barraEntre(`Tirante_${x}_${z}`, [x, cordaInferior(z) + 0.3, z - passoTrelica / 2], [-x, cordaInferior(z + passoTrelica) + 0.3, z + passoTrelica / 2], 0.035, mats.metal);
    }
  }

  // ---------- TELHADO DE UMA ÁGUA ----------
  const yFundo = config.alturaFundo;
  const yFrente = config.alturaFrente;
  quadro(
    "Telhado",
    [
      [-meioL - 0.5, yFundo, -meioP - 0.5],
      [meioL + 0.5, yFundo, -meioP - 0.5],
      [meioL + 0.5, yFrente, meioP + 0.5],
      [-meioL - 0.5, yFrente, meioP + 0.5]
    ],
    mats.telha,
    1.0
  );

  // Cumeeira / rufo nas bordas.
  caixa("Telhado_RufoFundo", [L + 1.2, 0.16, 0.3], [0, yFundo + 0.06, -meioP - 0.5], mats.metal);
  caixa("Telhado_RufoFrente", [L + 1.2, 0.16, 0.3], [0, yFrente - 0.02, meioP + 0.5], mats.metal);

  // ---------- COLUNAS ----------
  for (let z = -meioP + 1.2; z <= meioP - 1.0; z += passoTrelica) {
    for (const lado of [-1, 1]) {
      const x = lado * (meioL - 0.42);
      caixa(`Coluna_${lado}_${z}`, [0.22, cordaInferior(z), 0.22], [x, cordaInferior(z) / 2, z], mats.verde, {
        colisor: Math.abs(z) < meioP - 2
      });
    }
  }

  // ---------- ILUMINAÇÃO ----------
  const luminarias = [];

  for (const x of [-meioL / 2, 0, meioL / 2]) {
    for (let z = -meioP + 3; z <= meioP - 3; z += 3.6) {
      // As calhas acompanham a queda do telhado.
      const y = cordaInferior(z) - 0.55;

      caixa(`Luminaria_${x}_${z}`, [0.16, 0.09, 2.4], [x, y, z], mats.luz, { sombra: false });
      barraEntre(
        `Luminaria_Tirante_${x}_${z}`,
        [x, y + 0.1, z - 0.9],
        [x, cordaInferior(z) - 0.05, z - 0.9],
        0.03,
        mats.metal
      );

      luminarias.push({ x, y: y - 0.35, z });
    }
  }

  // ---------- FAIXAS DE CIRCULAÇÃO ----------
  const faixa = new THREE.MeshBasicMaterial({ color: 0xe9c22c });
  for (const x of [-4.2, 4.2]) {
    caixa(`FaixaCirculacao_${x}`, [0.09, 0.012, P - 5], [x, 0.012, 0], faixa, { sombra: false });
  }
  caixa("FaixaTransversal_Fundo", [L - 8, 0.012, 0.09], [0, 0.012, -meioP + 4], faixa, { sombra: false });

  return {
    grupo,
    colisores,
    selecionaveis,
    luminarias,
    medidas: config,
    limites: {
      x: [-meioL + 0.6, meioL - 0.6],
      z: [-meioP + 0.6, meioP - 0.6]
    }
  };
}
