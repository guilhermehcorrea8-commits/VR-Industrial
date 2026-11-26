import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Galpão da metalurgia do SENAI Caxias do Sul.
// Geometria lida das cinco fotos: telha metálica clara de UMA água com terças
// verdes, treliças de alma paralela em zigue-zague, tijolo até ~3 m com
// reboco branco acima, mureta + vitrine de vidro separando do corredor,
// portão basculante, tubo azul de ar comprimido e luminárias lineares suspensas.

export const MEDIDAS = {
  largura: 20,          // eixo X
  profundidade: 25,     // eixo Z
  alturaParede: 9,      // topo do reboco
  alturaFundo: 9.9,     // beiral do fundo (telhado inclina para a frente)
  alturaFrente: 9,
  ateTijolo: 3.0,
  espessura: 0.3,
  vaoPortao: { largura: 5.04, altura: 4.2, centroZ: 4.0 }
};

function adicionarExtintor(grupo, selecionaveis, mats, posicao) {
  const extintor = new THREE.Group();
  extintor.name = "Extintor";
  extintor.position.set(...posicao);
  extintor.userData.interativo = true;
  extintor.userData.nomeEquipamento = "Extintor de incêndio";
  grupo.add(extintor);
  selecionaveis.push(extintor);

  function peca(nome, geometria, material, posicaoPeca = [0, 0, 0], rotacao = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometria, material);
    mesh.name = nome;
    mesh.position.set(...posicaoPeca);
    mesh.rotation.set(...rotacao);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    extintor.add(mesh);
    return mesh;
  }

  function tubo(nome, inicio, fim, raio, material) {
    const a = new THREE.Vector3(...inicio);
    const b = new THREE.Vector3(...fim);
    const direcao = b.clone().sub(a);
    const mesh = peca(
      nome,
      new THREE.CylinderGeometry(raio, raio, direcao.length(), 12),
      material
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
    return mesh;
  }

  const perfilCorpo = [
    [0, -0.26],
    [0.084, -0.26],
    [0.103, -0.25],
    [0.109, -0.22],
    [0.109, 0.08],
    [0.105, 0.13],
    [0.094, 0.17],
    [0.071, 0.205],
    [0.045, 0.22],
    [0, 0.22]
  ].map(([raio, altura]) => new THREE.Vector2(raio, altura));
  peca("Extintor_Corpo", new THREE.LatheGeometry(perfilCorpo, 40), mats.vermelhoExtintor);
  peca(
    "Extintor_Base",
    new THREE.CylinderGeometry(0.108, 0.114, 0.045, 32),
    mats.preto,
    [0, -0.24, 0]
  );
  peca(
    "Extintor_Colo",
    new THREE.CylinderGeometry(0.046, 0.056, 0.052, 24),
    mats.metal,
    [0, 0.22, 0]
  );
  peca(
    "Extintor_Valvula",
    new THREE.BoxGeometry(0.077, 0.06, 0.095),
    mats.metalEscuro,
    [0, 0.255, 0]
  );
  tubo("Extintor_EixoAlavanca", [-0.042, 0.277, 0], [0.042, 0.277, 0], 0.008, mats.metal);
  tubo("Extintor_Alavanca", [0.023, 0.296, -0.052], [0.023, 0.296, 0.052], 0.009, mats.vermelhoExtintor);

  tubo("Extintor_AlcaEsquerda", [0, 0.267, 0.067], [0, 0.345, 0.072], 0.012, mats.preto);
  tubo("Extintor_AlcaDireita", [0, 0.267, -0.067], [0, 0.345, -0.072], 0.012, mats.preto);
  tubo("Extintor_PegaAlca", [0, 0.345, -0.079], [0, 0.345, 0.079], 0.014, mats.preto);

  peca(
    "Extintor_Manometro",
    new THREE.CylinderGeometry(0.027, 0.027, 0.018, 24),
    mats.metalEscuro,
    [0.052, 0.254, 0.026],
    [0, 0, -Math.PI / 2]
  );
  const mostrador = peca(
    "Extintor_Mostrador",
    new THREE.CircleGeometry(0.023, 24),
    mats.branco,
    [0.063, 0.254, 0.026],
    [0, Math.PI / 2, 0]
  );
  mostrador.castShadow = false;
  peca(
    "Extintor_AroManometro",
    new THREE.TorusGeometry(0.024, 0.003, 6, 24),
    mats.metal,
    [0.064, 0.254, 0.026],
    [0, Math.PI / 2, 0]
  );
  peca(
    "Extintor_Ponteiro",
    new THREE.BoxGeometry(0.003, 0.02, 0.0035),
    mats.vermelhoExtintor,
    [0.066, 0.258, 0.026],
    [-0.55, 0, 0]
  );
  for (let i = -2; i <= 2; i += 1) {
    const angulo = i * 0.62;
    peca(
      `Extintor_MarcaManometro${i + 3}`,
      new THREE.BoxGeometry(0.002, 0.005, 0.0018),
      mats.preto,
      [
        0.066,
        0.254 + Math.sin(angulo) * 0.016,
        0.026 + Math.cos(angulo) * 0.016
      ],
      [-angulo, 0, 0]
    );
  }

  tubo("Extintor_Pino", [0.042, 0.292, -0.072], [0.042, 0.292, 0.078], 0.0035, mats.metal);
  peca(
    "Extintor_AnelLacre",
    new THREE.TorusGeometry(0.014, 0.003, 6, 20),
    mats.vermelhoExtintor,
    [0.042, 0.292, 0.09]
  );

  tubo("Extintor_ConectorMangueira", [0.024, 0.25, 0.055], [0.095, 0.285, 0.078], 0.012, mats.metal);
  const curvaMangueira = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.095, 0.285, 0.078),
    new THREE.Vector3(0.117, 0.35, 0.105),
    new THREE.Vector3(0.121, 0.414, 0.055),
    new THREE.Vector3(0.12, 0.421, -0.055),
    new THREE.Vector3(0.116, 0.35, -0.15),
    new THREE.Vector3(0.116, 0.245, -0.172),
    new THREE.Vector3(0.116, 0.145, -0.172)
  ]);
  peca("Extintor_Mangueira", new THREE.TubeGeometry(curvaMangueira, 48, 0.0085, 8, false), mats.preto);
  tubo("Extintor_Bocal", [0.116, 0.15, -0.172], [0.116, 0.095, -0.178], 0.012, mats.preto);
  tubo("Extintor_PontaBocal", [0.116, 0.102, -0.178], [0.116, 0.078, -0.18], 0.008, mats.metalEscuro);
  peca(
    "Extintor_GatilhoBocal",
    new THREE.BoxGeometry(0.035, 0.028, 0.012),
    mats.vermelhoExtintor,
    [0.13, 0.122, -0.178],
    [0, 0, -0.2]
  );

  const rotulo = peca(
    "Extintor_Rotulo",
    new THREE.CylinderGeometry(0.1098, 0.1098, 0.305, 40, 1, true, -Math.PI / 2, Math.PI),
    mats.rotuloExtintor,
    [0, -0.026, 0],
    [0, Math.PI / 2, 0]
  );
  rotulo.castShadow = false;

  peca(
    "Extintor_Suporte",
    new THREE.BoxGeometry(0.035, 0.39, 0.23),
    mats.metalEscuro,
    [-0.113, -0.025, 0]
  );
  peca(
    "Extintor_GanchoSuporte",
    new THREE.BoxGeometry(0.09, 0.032, 0.18),
    mats.metalEscuro,
    [-0.072, -0.231, 0]
  );
  for (const lado of [-1, 1]) {
    peca(
      `Extintor_ParafusoSuporte${lado}`,
      new THREE.CylinderGeometry(0.009, 0.009, 0.008, 12),
      mats.metal,
      [-0.135, 0.11, lado * 0.086],
      [0, 0, -Math.PI / 2]
    );
  }

  return extintor;
}

function adicionarArmario(grupo, selecionaveis, mats, posicao) {
  const armario = new THREE.Group();
  armario.name = "Armario_Emergencia";
  armario.position.set(...posicao);
  armario.userData.interativo = true;
  armario.userData.nomeEquipamento = "Armário de emergências";
  grupo.add(armario);
  selecionaveis.push(armario);

  function peca(nome, tamanho, posicaoPeca, material, raio = 0.008) {
    const geometria = new RoundedBoxGeometry(...tamanho, 2, Math.min(raio, Math.min(...tamanho) / 3));
    const mesh = new THREE.Mesh(geometria, material);
    mesh.name = nome;
    mesh.position.set(...posicaoPeca);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    armario.add(mesh);
    return mesh;
  }

  const pintura = mats.vermelhoExtintor;
  peca("Armario_Fundo", [0.035, 1.42, 0.82], [-0.145, 0, 0], pintura);
  peca("Armario_Interior", [0.018, 1.3, 0.74], [-0.118, 0, 0], mats.branco);
  for (const lado of [-1, 1]) {
    peca(`Armario_Lateral_${lado}`, [0.3, 1.5, 0.04], [0, 0, lado * 0.43], pintura);
    peca(`Armario_Tampa_${lado}`, [0.32, 0.05, 0.9], [0, lado * 0.725, 0], pintura);
    peca(`Armario_Dobradica_${lado}`, [0.07, 0.095, 0.055], [0.175, lado * 0.48, 0.435], mats.metalEscuro, 0.012);
    peca(`Armario_VedacaoLateral_${lado}`, [0.018, 1.34, 0.034], [0.198, 0, lado * 0.375], mats.preto, 0.004);
    peca(`Armario_VedacaoTampa_${lado}`, [0.018, 0.034, 0.75], [0.198, lado * 0.667, 0], mats.preto, 0.004);
    peca(`Armario_PerfilVertical_${lado}`, [0.045, 1.42, 0.055], [0.17, 0, lado * 0.42], pintura);
    peca(`Armario_PerfilHorizontal_${lado}`, [0.045, 0.055, 0.82], [0.17, lado * 0.715, 0], pintura);
  }

  peca("Armario_VidroPorta", [0.008, 1.29, 0.71], [0.207, 0, 0], mats.vidro, 0.002);
  peca("Armario_Cruz_Vertical", [0.016, 0.43, 0.085], [0.219, 0.07, 0], mats.branco, 0.006);
  peca("Armario_Cruz_Horizontal", [0.016, 0.085, 0.43], [0.219, 0.07, 0], mats.branco, 0.006);

  for (const y of [-0.055, 0.055]) {
    peca(`Armario_MacaApoio_${y}`, [0.035, 0.025, 0.035], [0.229, -0.08 + y, 0.315], mats.metalEscuro, 0.006);
  }
  peca("Armario_Maca", [0.038, 0.028, 0.17], [0.249, -0.08, 0.315], mats.metalEscuro, 0.01);

  peca("Armario_Prateleira", [0.23, 0.025, 0.72], [0.005, -0.27, 0], mats.metal, 0.004);
  for (const z of [-0.18, 0.02, 0.2]) {
    peca(`Armario_Kit_${z}`, [0.13, 0.17, 0.145], [0.035, -0.175, z], mats.branco, 0.012);
  }

  for (const y of [-0.61, 0.65]) {
    for (let i = 0; i < 3; i += 1) {
      peca(`Armario_Ventilacao_${y}_${i}`, [0.009, 0.012, 0.34], [0.221, y + i * 0.026, 0], mats.metalEscuro, 0.002);
    }
  }

  const tela = document.createElement("canvas");
  tela.width = 512;
  tela.height = 128;
  const ctx = tela.getContext("2d");
  ctx.fillStyle = "#f2f0e9";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#b51f1b";
  ctx.lineWidth = 8;
  ctx.strokeRect(7, 7, 498, 114);
  ctx.fillStyle = "#b51f1b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px Arial";
  ctx.fillText("EMERGÊNCIA", 256, 50);
  ctx.font = "bold 25px Arial";
  ctx.fillText("PRIMEIROS SOCORROS", 256, 94);
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  const placa = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.115),
    new THREE.MeshStandardMaterial({ map: textura, roughness: 0.58, metalness: 0.05 })
  );
  placa.name = "Armario_Placa";
  placa.rotation.y = Math.PI / 2;
  placa.position.set(0.223, 0.49, 0);
  armario.add(placa);

  for (const y of [-0.68, 0.68]) {
    for (const z of [-0.39, 0.39]) {
      const parafuso = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 12), mats.metal);
      parafuso.name = `Armario_Parafuso_${y}_${z}`;
      parafuso.rotation.z = -Math.PI / 2;
      parafuso.position.set(0.199, y, z);
      armario.add(parafuso);
    }
  }

  return armario;
}

function adicionarColunaI(grupo, nome, x, altura, mats) {
  const coluna = new THREE.Group();
  coluna.name = nome;
  coluna.position.set(x, 0, 0);
  grupo.add(coluna);

  const largura = 0.3;
  const profundidade = 0.34;
  const mesa = 0.045;
  const alma = 0.028;
  const perfil = new THREE.Shape();
  perfil.moveTo(-largura / 2, -profundidade / 2);
  perfil.lineTo(largura / 2, -profundidade / 2);
  perfil.lineTo(largura / 2, -profundidade / 2 + mesa);
  perfil.lineTo(alma / 2, -profundidade / 2 + mesa);
  perfil.lineTo(alma / 2, profundidade / 2 - mesa);
  perfil.lineTo(largura / 2, profundidade / 2 - mesa);
  perfil.lineTo(largura / 2, profundidade / 2);
  perfil.lineTo(-largura / 2, profundidade / 2);
  perfil.lineTo(-largura / 2, profundidade / 2 - mesa);
  perfil.lineTo(-alma / 2, profundidade / 2 - mesa);
  perfil.lineTo(-alma / 2, -profundidade / 2 + mesa);
  perfil.lineTo(-largura / 2, -profundidade / 2 + mesa);
  perfil.closePath();

  const geometria = new THREE.ExtrudeGeometry(perfil, {
    depth: altura - 0.04,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    steps: 1
  });
  geometria.rotateX(-Math.PI / 2);
  const viga = new THREE.Mesh(geometria, mats.verde);
  viga.name = `${nome}_VigaI`;
  viga.position.y = 0.02;
  viga.castShadow = true;
  viga.receiveShadow = true;
  coluna.add(viga);

  function chapa(nomeChapa, tamanho, posicao, material = mats.verde) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), material);
    mesh.name = nomeChapa;
    mesh.position.set(...posicao);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    coluna.add(mesh);
  }

  chapa(`${nome}_Base`, [0.46, 0.035, 0.46], [0, 0.0175, 0], mats.metalEscuro);
  chapa(`${nome}_Tampa`, [0.34, 0.025, 0.38], [0, altura - 0.0125, 0]);
  for (const dx of [-0.16, 0.16]) {
    for (const dz of [-0.16, 0.16]) {
      const parafuso = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.045, 6), mats.metal);
      parafuso.name = `${nome}_Ancoragem_${dx}_${dz}`;
      parafuso.position.set(dx, 0.052, dz);
      parafuso.castShadow = true;
      coluna.add(parafuso);
    }
  }

  return coluna;
}

export function criarGalpao(mats, config = MEDIDAS) {
  const grupo = new THREE.Group();
  grupo.name = "GalpaoSENAI";

  const colisores = [];
  const selecionaveis = [];

  const L = config.largura;
  const P = config.profundidade;
  const H = config.alturaParede;
  const yFundo = config.alturaFundo;
  const yFrente = config.alturaFrente;
  const E = config.espessura;
  const T = config.ateTijolo;
  const meioL = L / 2;
  const meioP = P / 2;

  function registrarColisor(mesh) {
    mesh.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(mesh);
    colisores.push(caixa);
  }

  function ajustarUV(geometria, tamanho, material) {
    const metroPorTile = material.map?.userData?.metroPorTile;
    if (!metroPorTile || !geometria.groups) return;

    const [largura, altura, profundidade] = tamanho;
    const escalas = [
      [profundidade, altura],
      [profundidade, altura],
      [largura, profundidade],
      [largura, profundidade],
      [largura, altura],
      [largura, altura]
    ];
    const uv = geometria.attributes.uv;
    const indice = geometria.index;

    for (const grupoFace of geometria.groups) {
      const [escalaU, escalaV] = escalas[grupoFace.materialIndex];
      for (let i = grupoFace.start; i < grupoFace.start + grupoFace.count; i += 1) {
        const vertice = indice.getX(i);
        uv.setXY(
          vertice,
          uv.getX(vertice) * escalaU / metroPorTile,
          uv.getY(vertice) * escalaV / metroPorTile
        );
      }
    }
    uv.needsUpdate = true;
  }

  function caixa(nome, tamanho, posicao, material, opcoes = {}) {
    const geometria = new THREE.BoxGeometry(...tamanho);
    ajustarUV(geometria, tamanho, material);
    const mesh = new THREE.Mesh(geometria, material);
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

  const alturaVidro = 1.8;
  const baseVidro = 4.5;
  const topoVidro = baseVidro + alturaVidro;
  const yVidro = baseVidro + alturaVidro / 2;
  const larguraVidro = L - 1.6;
  const ladoVidro = (L - larguraVidro) / 2;

  caixa("Fundo_Soleira", [L, 0.35, E], [0, T + 0.175, -meioP], mats.concreto, { colisor: true });
  caixa("Fundo_Reboco_AbaixoVidro", [L, baseVidro - (T + 0.35), E], [0, (T + 0.35 + baseVidro) / 2, -meioP], mats.reboco, { colisor: true });
  caixa("Fundo_Reboco_Superior", [L, H - topoVidro, E], [0, topoVidro + (H - topoVidro) / 2, -meioP], mats.reboco, { colisor: true });
  for (const lado of [-1, 1]) {
    caixa(
      `Fundo_Reboco_Lateral_${lado}`,
      [ladoVidro, alturaVidro, E],
      [lado * (larguraVidro / 2 + ladoVidro / 2), yVidro, -meioP],
      mats.reboco,
      { colisor: true }
    );
  }
  if (yFundo > H) {
    caixa("Fundo_ExtensaoTelhado", [L, yFundo - H, E], [0, (H + yFundo) / 2, -meioP], mats.reboco, { colisor: true });
  }

  caixa("Fundo_Vidro", [larguraVidro, alturaVidro, 0.045], [0, yVidro, -meioP + 0.02], mats.vidro, { sombra: false });
  caixa("Fundo_Vidro_MolduraSuperior", [larguraVidro + 0.1, 0.09, 0.12], [0, topoVidro, -meioP + 0.08], mats.metalEscuro);
  caixa("Fundo_Vidro_MolduraInferior", [larguraVidro + 0.1, 0.09, 0.12], [0, baseVidro, -meioP + 0.08], mats.metalEscuro);
  caixa("Fundo_Vidro_Travessa", [larguraVidro, 0.055, 0.09], [0, yVidro, -meioP + 0.08], mats.metalEscuro);
  for (let x = -meioL + 1.5; x < meioL - 1; x += 2.2) {
    caixa("Fundo_Vidro_Divisoria", [0.075, alturaVidro, 0.11], [x, yVidro, -meioP + 0.08], mats.metalEscuro);
  }

  // ---------- PAREDE DA FRENTE: porta de acesso ao corredor ----------
  const portaFrente = { largura: 1.6, altura: 2.6, x: -6.93 };
  const frenteEsq = portaFrente.x - portaFrente.largura / 2 + meioL;
  const frenteDir = meioL - (portaFrente.x + portaFrente.largura / 2);

  caixa("Frente_TijoloEsq", [frenteEsq, T, E], [-meioL + frenteEsq / 2, T / 2, meioP], mats.tijolo, { colisor: true });
  caixa("Frente_TijoloDir", [frenteDir, T, E], [meioL - frenteDir / 2, T / 2, meioP], mats.tijolo, { colisor: true });
  caixa("Frente_Reboco", [L, H - T, E], [0, T + (H - T) / 2, meioP], mats.reboco, { colisor: true });
  caixa("Frente_VaoAcimaPorta", [portaFrente.largura, T - portaFrente.altura, E], [portaFrente.x, portaFrente.altura + (T - portaFrente.altura) / 2, meioP], mats.reboco);

  const portaEsq = portaFrente.x - (portaFrente.largura - 0.2) / 2;
  const portaDir = portaFrente.x + (portaFrente.largura - 0.2) / 2;
  caixa("Frente_Porta_Inferior", [portaFrente.largura - 0.2, 1.35, 0.08], [portaFrente.x, 0.675, meioP - 0.05], mats.cinza);
  caixa("Frente_Porta_Superior", [portaFrente.largura - 0.2, 0.45, 0.08], [portaFrente.x, 2.375, meioP - 0.05], mats.cinza);
  caixa("Frente_Porta_LateralEsq", [0.425, 0.8, 0.08], [portaEsq + 0.2125, 1.75, meioP - 0.05], mats.cinza);
  caixa("Frente_Porta_LateralDir", [0.425, 0.8, 0.08], [portaDir - 0.2125, 1.75, meioP - 0.05], mats.cinza);
  caixa("Frente_Porta_Vidro", [0.55, 0.8, 0.03], [portaFrente.x, 1.75, meioP - 0.05], mats.vidro, { sombra: false });
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
  caixa("Esquerda_Vitrine", [0.05, vitrineAltura, P - 1.2], [-meioL, mureta + vitrineAltura / 2, 0], mats.vidro, { sombra: false });
  caixa("Esquerda_Vitrine_Superior", [E, 0.12, P - 1.1], [-meioL, mureta + vitrineAltura, 0], mats.metalEscuro);
  caixa("Esquerda_Vitrine_Inferior", [E + 0.04, 0.1, P - 1.1], [-meioL, mureta, 0], mats.metal);
  for (let z = -meioP + 1.5; z < meioP - 1; z += 2.4) {
    caixa("Esquerda_Vitrine_Montante", [0.1, vitrineAltura, 0.08], [-meioL, mureta + vitrineAltura / 2, z], mats.metalEscuro);
  }
  caixa("Esquerda_Reboco", [E, H - (mureta + vitrineAltura), P], [-meioL, (mureta + vitrineAltura + H) / 2, 0], mats.reboco, { colisor: true });

  if (yFundo > H) {
    for (const lado of [-1, 1]) {
      const x = lado * meioL;
      quadro(
        `FechamentoTelhado_Lado${lado}`,
        [[x, H, -meioP], [x, H, meioP], [x, yFrente, meioP], [x, yFundo, -meioP]],
        mats.reboco,
        0.6,
        { sombra: true }
      );
    }
  }

  // ---------- PAREDE DIREITA: portão basculante para o pátio ----------
  const portao = config.vaoPortao;
  const zVaoMin = portao.centroZ - portao.largura / 2;
  const zVaoMax = portao.centroZ + portao.largura / 2;
  const trechoFundo = zVaoMin + meioP;
  const trechoFrente = meioP - zVaoMax;
  const baseJanela = 4.5;
  const topoJanela = 6.3;
  const yJanela = (baseJanela + topoJanela) / 2;
  const alturaJanela = topoJanela - baseJanela;

  caixa("Direita_TijoloFundo", [E, T, trechoFundo], [meioL, T / 2, -meioP + trechoFundo / 2], mats.tijolo, { colisor: true });
  caixa("Direita_TijoloFrente", [E, T, trechoFrente], [meioL, T / 2, zVaoMax + trechoFrente / 2], mats.tijolo, { colisor: true });

  function paredeDireita(nome, z0, z1, y0, y1, material = mats.reboco) {
    caixa(nome, [E, y1 - y0, z1 - z0], [meioL, (y0 + y1) / 2, (z0 + z1) / 2], material, { colisor: true });
  }

  for (const [nome, z0, z1] of [["Fundo", -meioP, zVaoMin], ["Frente", zVaoMax, meioP]]) {
    paredeDireita(`Direita_Reboco_Inferior_${nome}`, z0, z1, T, baseJanela);
    paredeDireita(`Direita_Reboco_Superior_${nome}`, z0, z1, topoJanela, H);
  }
  paredeDireita("Direita_Reboco_SobrePortao", zVaoMin, zVaoMax, portao.altura, H);

  const centrosJanelas = [];
  for (let z = -meioP + 2; z <= meioP - 2; z += 3.0) {
    if (z + 1.2 > zVaoMin && z - 1.2 < zVaoMax) continue;
    centrosJanelas.push(z);
  }

  for (const [z0, z1] of [[-meioP, zVaoMin], [zVaoMax, meioP]]) {
    let cursor = z0;
    for (const z of centrosJanelas.filter((centro) => centro > z0 && centro < z1)) {
      if (z - 1.2 > cursor) paredeDireita(`Direita_Pilar_${cursor}`, cursor, z - 1.2, baseJanela, topoJanela);
      cursor = z + 1.2;
    }
    if (cursor < z1) paredeDireita(`Direita_Pilar_${cursor}`, cursor, z1, baseJanela, topoJanela);
  }

  for (const z of centrosJanelas) {
    caixa("Direita_Janela", [0.045, alturaJanela, 2.4], [meioL - 0.02, yJanela, z], mats.vidro, { sombra: false });
    for (const lado of [-1, 1]) {
      caixa("Direita_Janela_MolduraVertical", [0.12, alturaJanela + 0.08, 0.075], [meioL - 0.04, yJanela, z + lado * 1.24], mats.metalEscuro);
      caixa("Direita_Janela_MolduraHorizontal", [0.12, 0.075, 2.55], [meioL - 0.04, yJanela + lado * (alturaJanela / 2 + 0.04), z], mats.metalEscuro);
    }
    caixa("Direita_Janela_Travessa", [0.1, alturaJanela, 0.05], [meioL - 0.04, yJanela, z], mats.metalEscuro);
  }

  for (const lado of [-1, 1]) {
    caixa(
      `Direita_PilarConcreto_${lado}`,
      [0.45, H, 0.45],
      [meioL - 0.1, H / 2, portao.centroZ + lado * (portao.largura / 2 + 0.3)],
      mats.concreto,
      { colisor: true }
    );
  }

  const larguraFolha = portao.largura - 0.24;
  const anguloAberto = -Math.PI * 0.455;
  const folha = new THREE.Group();
  folha.name = "Portao_Basculante";
  folha.position.set(meioL - 0.14, portao.altura + 0.06, portao.centroZ);
  folha.rotation.z = anguloAberto;
  grupo.add(folha);

  const quantidadePaineis = 4;
  const alturaPainel = (portao.altura - 0.12) / quantidadePaineis;
  for (let i = 0; i < quantidadePaineis; i += 1) {
    const y = -(i + 0.5) * alturaPainel - 0.03;
    caixa(
      `Portao_Painel_${i}`,
      [0.075, alturaPainel - 0.018, larguraFolha],
      [0, y, 0],
      mats.portao,
      { pai: folha }
    );
    caixa(
      `Portao_Relevo_${i}`,
      [0.014, alturaPainel - 0.18, larguraFolha - 0.3],
      [-0.044, y, 0],
      mats.portao,
      { pai: folha, sombra: false }
    );
    for (const lado of [-1, 1]) {
      caixa(
        `Portao_PerfilVertical_${i}_${lado}`,
        [0.024, alturaPainel - 0.07, 0.035],
        [-0.054, y, lado * (larguraFolha / 2 - 0.11)],
        mats.aluminio,
        { pai: folha }
      );
      caixa(
        `Portao_PerfilHorizontal_${i}_${lado}`,
        [0.024, 0.035, larguraFolha - 0.22],
        [-0.054, y + lado * (alturaPainel / 2 - 0.06), 0],
        mats.aluminio,
        { pai: folha }
      );
    }

    if (i < 2) {
      for (const z of [-1.45, 0, 1.45]) {
        caixa(
          `Portao_JanelaFundo_${i}_${z}`,
          [0.012, 0.22, 0.7],
          [-0.058, y, z],
          mats.metalEscuro,
          { pai: folha, sombra: false }
        );
        caixa(
          `Portao_Janela_${i}_${z}`,
          [0.012, 0.16, 0.64],
          [-0.067, y, z],
          mats.vidro,
          { pai: folha, sombra: false }
        );
      }
    }
  }

  for (let i = 0; i <= quantidadePaineis; i += 1) {
    const y = -i * alturaPainel - 0.03;
    for (const lado of [-1, 1]) {
      caixa(
        `Portao_Dobradica_${i}_${lado}`,
        [0.03, 0.12, 0.065],
        [-0.063, y, lado * (larguraFolha / 2 - 0.18)],
        mats.metalEscuro,
        { pai: folha }
      );
      const rolo = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 16), mats.metalEscuro);
      rolo.name = `Portao_Rolo_${i}_${lado}`;
      rolo.rotation.x = Math.PI / 2;
      rolo.position.set(0.065, y, lado * (larguraFolha / 2 + 0.025));
      rolo.castShadow = true;
      folha.add(rolo);
    }
  }

  for (const lado of [-1, 1]) {
    const z = portao.centroZ + lado * (larguraFolha / 2 + 0.04);
    caixa("Portao_Trilho", [0.14, portao.altura, 0.12], [meioL - 0.16, portao.altura / 2, z], mats.metalEscuro);
    const xFim = meioL - 0.06;
    const xInicio = folha.position.x - portao.altura * Math.sin(Math.abs(anguloAberto)) - 0.2;
    caixa(
      `Portao_TrilhoSuperior_${lado}`,
      [xFim - xInicio, 0.12, 0.14],
      [(xFim + xInicio) / 2, portao.altura + 0.15, z],
      mats.metalEscuro
    );
    for (const x of [meioL - 1.2, meioL - 3.1]) {
      barraEntre(`Portao_Suspensao_${lado}_${x}`, [x, portao.altura + 0.15, z], [x, H - 0.45, z], 0.009, mats.metal);
    }
  }

  for (const lado of [-1, 1]) {
    caixa(
      `Portao_MacaApoio_${lado}`,
      [0.035, 0.045, 0.035],
      [-0.07, -portao.altura + 0.25, lado * 0.14],
      mats.metalEscuro,
      { pai: folha }
    );
  }
  caixa(
    "Portao_Maca",
    [0.045, 0.04, 0.32],
    [-0.092, -portao.altura + 0.25, 0],
    mats.metalEscuro,
    { pai: folha }
  );

  const eixo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, portao.largura + 0.35, 20),
    mats.metalEscuro
  );
  eixo.name = "Portao_EixoTorcao";
  eixo.rotation.x = Math.PI / 2;
  eixo.position.set(meioL - 0.22, portao.altura + 0.42, portao.centroZ);
  eixo.castShadow = true;
  grupo.add(eixo);

  for (const lado of [-1, 1]) {
    const zCentral = portao.centroZ + lado * 1.55;
    const pontos = [];
    for (let i = 0; i <= 96; i += 1) {
      const angulo = (i / 96) * Math.PI * 16;
      pontos.push(new THREE.Vector3(
        meioL - 0.22 + Math.cos(angulo) * 0.075,
        portao.altura + 0.42 + Math.sin(angulo) * 0.075,
        zCentral + (i / 96 - 0.5) * 0.48
      ));
    }
    const mola = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos), 96, 0.012, 6, false),
      mats.metalEscuro
    );
    mola.name = `Portao_MolaTorcao_${lado}`;
    mola.castShadow = true;
    grupo.add(mola);
    caixa(
      `Portao_Mancal_${lado}`,
      [0.18, 0.2, 0.12],
      [meioL - 0.22, portao.altura + 0.42, portao.centroZ + lado * (portao.largura / 2 - 0.08)],
      mats.metalEscuro
    );
  }

  // Letreiro SENAI sobre o portão (foto 2).
  caixa("Letreiro_SENAI", [0.06, 0.84, 3.84], [meioL - 0.2, portao.altura + 0.72, portao.centroZ], mats.letreiro);

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
  caixa("Rodape_Fundo", [L - 0.4, 0.14, 0.035], [0, 0.07, -meioP + 0.19], mats.metalEscuro, { sombra: false });
  caixa("Rodape_Esquerda", [0.035, 0.14, P - 0.4], [-meioL + 0.19, 0.07, 0], mats.metalEscuro, { sombra: false });
  caixa("Rodape_DireitaFundo", [0.035, 0.14, trechoFundo - 0.2], [meioL - 0.19, 0.07, -meioP + trechoFundo / 2], mats.metalEscuro, { sombra: false });
  caixa("Rodape_DireitaFrente", [0.035, 0.14, trechoFrente - 0.2], [meioL - 0.19, 0.07, zVaoMax + trechoFrente / 2], mats.metalEscuro, { sombra: false });
  caixa("Placa_EPI", [1.25, 0.62, 0.035], [2.8, 2.15, meioP - 0.18], mats.epi, { sombra: false });

  const quadroEletrico = caixa("Quadro_EletricoAzul", [0.22, 1.3, 1.0], [-meioL + 0.28, 1.9, -10.88], mats.azul, { interativo: true, rotulo: "Quadro elétrico" });
  caixa("Quadro_Eletrico_Fecho", [0.035, 0.16, 0.055], [0.13, 0, 0.34], mats.metalEscuro, { pai: quadroEletrico });
  caixa("Quadro_Eletrico_Vedacao", [0.012, 1.15, 0.012], [0.118, 0, -0.46], mats.preto, { pai: quadroEletrico, sombra: false });

  adicionarArmario(grupo, selecionaveis, mats, [-meioL + 0.3, 1.85, -6.2]);

  adicionarExtintor(grupo, selecionaveis, mats, [-meioL + 0.27, 1.08, -4.38]);

  const relogio = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 28), mats.relogio);
  relogio.rotation.z = Math.PI / 2;
  relogio.position.set(meioL - 0.22, 4.2, -11.13);
  relogio.name = "Relogio de parede";
  grupo.add(relogio);

  // Lixeira amarela (foto 4).
  const lixeira = caixa("Lixeira_Amarela", [0.62, 0.82, 0.62], [8.33, 0.46, 10.63], mats.amarelo, { interativo: true, rotulo: "Lixeira industrial" });
  caixa("Lixeira_Tampa", [0.68, 0.08, 0.68], [0, 0.45, 0], mats.amarelo, { pai: lixeira });
  caixa("Lixeira_Alca", [0.3, 0.045, 0.045], [0, 0.51, 0], mats.metalEscuro, { pai: lixeira });
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.22, 0.22]) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 12), mats.preto);
      roda.rotation.z = Math.PI / 2;
      roda.position.set(x, -0.44, z);
      lixeira.add(roda);
    }
  }

  for (const z of [zVaoMin - 0.4, zVaoMax + 0.4]) {
    const protetor = new THREE.Group();
    protetor.name = "ProtetorPortao";
    protetor.position.set(meioL - 0.7, 0, z);
    grupo.add(protetor);
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.92, 16), mats.amarelo);
    poste.position.y = 0.54;
    poste.castShadow = true;
    protetor.add(poste);
    const faixaPreta = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.16, 16), mats.preto);
    faixaPreta.position.y = 0.68;
    protetor.add(faixaPreta);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16), mats.metalEscuro);
    base.position.y = 0.035;
    protetor.add(base);
  }

  for (const [x, z] of [[meioL - 1.67, -6.63], [6.6, 10.88]]) {
    caixa("Ralo_Industrial", [0.62, 0.018, 0.85], [x, 0.012, z], mats.metalEscuro, { sombra: false });
    for (let i = 0; i < 7; i += 1) {
      caixa("Ralo_Grade", [0.52, 0.012, 0.035], [x, 0.025, z - 0.33 + i * 0.11], mats.preto, { sombra: false });
    }
  }

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
      if (lado === 1 && z > zVaoMin + 0.3 && z < zVaoMax - 0.3) continue;
      const x = lado * (meioL - 0.42);
      const coluna = adicionarColunaI(grupo, `Coluna_${lado}_${z}`, x, cordaInferior(z), mats);
      coluna.position.z = z;
      if (Math.abs(z) < meioP - 2) registrarColisor(coluna);
    }
  }

  // ---------- ILUMINAÇÃO ----------
  const luminarias = [];

  for (const x of [-meioL / 2, 0, meioL / 2]) {
    for (let z = -meioP + P / 6; z < meioP; z += P / 3) {
      // As calhas acompanham a queda do telhado.
      const y = cordaInferior(z) - 0.55;

      caixa(`Luminaria_Carcaça_${x}_${z}`, [0.28, 0.11, 2.52], [x, y + 0.08, z], mats.metalEscuro);
      caixa(`Luminaria_${x}_${z}`, [0.2, 0.045, 2.36], [x, y - 0.01, z], mats.luz, { sombra: false });
      for (const lado of [-1, 1]) {
        caixa(`Luminaria_Tampa_${x}_${z}_${lado}`, [0.29, 0.12, 0.07], [x, y + 0.08, z + lado * 1.23], mats.metalEscuro);
      }
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
  for (const x of [-5.6, 5.6]) {
    caixa(`FaixaCirculacao_${x}`, [0.09, 0.012, P - 4], [x, 0.012, 0], faixa, { sombra: false });
  }
  caixa("FaixaTransversal_Fundo", [L - 8, 0.012, 0.09], [0, 0.012, -meioP + 3], faixa, { sombra: false });

  // ---------- PÁTIO EXTERNO ----------
  quadro(
    "Patio_Asfalto",
    [[-60, -0.07, -60], [60, -0.07, -60], [60, -0.07, 60], [-60, -0.07, 60]],
    mats.asfalto,
    4,
    { sombra: false }
  );
  caixa("Patio_PlataformaCarga", [5.5, 0.72, 5.5], [meioL + 3.4, 0.31, portao.centroZ], mats.concreto);
  caixa("Patio_GuardaPlataforma", [0.16, 0.06, 5.5], [meioL + 0.72, 0.7, portao.centroZ], mats.zebra, { sombra: false });
  caixa("Patio_MuroFundo", [70, 2.6, 0.35], [0, 1.3, -35], mats.concreto);
  caixa("Patio_MuroDireita", [0.35, 2.6, 70], [35, 1.3, 0], mats.concreto);
  caixa("Patio_GalpaoVizinho", [17, 5.8, 22], [-23, 2.9, -25], mats.concreto);
  caixa("Patio_TelhadoVizinho", [18, 0.22, 23], [-23, 5.9, -25], mats.telha);
  caixa("Patio_EdificioFundo", [24, 8.5, 14], [20, 4.25, -29], mats.reboco);
  caixa("Patio_TelhadoFundo", [25, 0.25, 15], [20, 8.6, -29], mats.telha);

  for (let z = -18; z <= 22; z += 4) {
    caixa("Patio_PosteCerca", [0.09, 2.2, 0.09], [23, 1.1, z], mats.metalEscuro);
  }
  for (const y of [0.45, 1.25, 2.05]) {
    caixa("Patio_CercaHorizontal", [0.035, 0.035, 44], [23, y, 2], mats.metalEscuro, { sombra: false });
  }

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
