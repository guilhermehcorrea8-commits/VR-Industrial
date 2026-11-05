import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RIGS } from "../interacao/rigs.data.js";

// As dez máquinas vêm do scene.glb, que as guarda lado a lado no mesmo arquivo.
// Cinco das raízes se chamam literalmente "world", então cada máquina é
// identificada por uma peça exclusiva (assinatura), não pelo nome do nó.
//
// Cada uma é remontada num Group próprio, centrado na origem e apoiado no piso
// (Y=0). As peças que as missões precisam alcançar ficam como meshes separados;
// o resto é mesclado por material — 1157 draw calls derrubariam o Quest.

export const CATALOGO = [
  {
    id: "cnc",
    nome: "Centro de usinagem CNC",
    assinatura: "CNCScreen",
    x: -4.5, z: -12.4, rotY: 0,
    pecas: [
      ["LeftSlidingDoor", "porta_cnc", "Porta deslizante da CNC", "Abrir a proteção antes de montar a peça"],
      ["RightSlidingDoor", "porta_cnc", "Porta deslizante da CNC", "Abrir a proteção antes de montar a peça"],
      ["TSlotTable", "mesa_cnc", "Mesa de furos em T", "Fixar a peça na mesa da CNC"],
      ["ControlConsole", "console_cnc", "Console da CNC", "Operar o console de comando"],
      ["TowerGreen", "torre_cnc", "Sinalizador verde da CNC", "Confirmar que a máquina está liberada"],
      ["EmergencyStop", "emergencia_cnc", "Parada de emergência da CNC", "Acionar a parada de emergência"],
      ["ToolHolder", "ferramenta_cnc", "Ferramenta no cone da CNC", "Conferir a ferramenta montada no cone"],
      ["SpindleHousing", "arvore_cnc", "Árvore de usinagem", "Reconhecer o cabeçote de usinagem"]
    ]
  },
  {
    id: "torno",
    nome: "Torno mecânico",
    assinatura: "TailstockBody",
    x: 0.5, z: -12.9, rotY: 0,
    pecas: [
      ["Headstock", "castanho_torno", "Cabeçote do torno", "Identificar o cabeçote fixo"],
      ["ChuckBody", "mandril_torno", "Mandril do torno", "Apertar a peça no mandril"],
      ["ToolPost", "torre_ferramentas_torno", "Porta-ferramentas", "Posicionar a ferramenta de corte"],
      ["CarriageHandwheel", "volante_carro_torno", "Volante do carro", "Avançar o carro longitudinal"],
      ["TailstockHandwheel", "volante_contraponto_torno", "Volante do contraponto", "Avançar a pinça do contraponto"],
      ["ChuckGuardTop", "protetor_torno", "Protetor do mandril", "Baixar a proteção antes de ligar"],
      ["ControlPanel", "painel_torno", "Painel de comando do torno", "Conferir o painel de comando"],
      ["BotaoLiga", "liga_torno", "Botão de partida do torno", "Ligar o torno com a proteção fechada"],
      ["BotaoDesliga", "desliga_torno", "Botão de parada do torno", "Parar o torno"],
      ["EmergencyStop", "emergencia_torno", "Parada de emergência do torno", "Acionar a parada de emergência"]
    ]
  },
  {
    id: "esteira",
    nome: "Esteira transportadora",
    assinatura: "Belt_Top",
    x: 4.9, z: -12.6, rotY: 0,
    pecas: [
      ["Belt_Top", "correia_esteira", "Correia da esteira", "Verificar sentido e tensão da correia"],
      ["End_Roller", "rolete_esteira", "Rolete de ponta", "Inspecionar o rolete motriz"],
      ["Motor_Body", "motor_esteira", "Motor da esteira", "Identificar o motor elétrico"],
      ["Gearbox", "redutor_esteira", "Redutor da esteira", "Localizar o redutor de velocidade"],
      ["Photoelectric_Sensor", "sensor_esteira", "Sensor fotoelétrico", "Confirmar o sensor de presença"],
      ["Start_Button", "liga_esteira", "Botão de partida da esteira", "Ligar o motor da esteira"],
      ["Stop_Button", "desliga_esteira", "Botão de parada da esteira", "Parar o motor da esteira"],
      ["Tower_green", "torre_esteira", "Sinalizador verde da esteira", "Confirmar que a esteira está liberada"],
      ["Emergency_Stop", "emergencia_esteira", "Emergência da esteira", "Acionar a emergência da esteira"]
    ]
  },
  {
    id: "furadeira",
    nome: "Furadeira de coluna",
    assinatura: "QuillHousing",
    x: 7.6, z: -8.5, rotY: -Math.PI / 2,
    pecas: [
      // O mandril que o aluno alcança é a luva das mordsas (ChuckJawSleeve):
      // ChuckBody e DrillBit são o eixo e a haste, e agora vivem no punção
      // móvel (mecanicas) em vez de desaparecer mesclados no cabeçote.
      ["ChuckJawSleeve", "mandril_furadeira", "Mandril da furadeira", "Fixar a peça no mandril"],
      ["WorkTableTop", "mesa_furadeira", "Mesa da furadeira", "Regular altura e centro da mesa"],
      // Os três nomes abaixo caem no mesmo idPeca: são as empunhaduras pretas
      // do mesmo manete (FeedGrip_0 de trás, _1 de cima, _2 da frente), e
      // qualquer uma delas aciona o avanço — ver src/furadeira.js.
      ["FeedGrip", "alavanca_avanco", "Alavanca de avanço", "Acionar o avanço manual da árvore"],
      ["BeltCoverLid", "tampa_correia", "Tampa da correia", "Abrir a proteção para escolher a rotação"],
      ["MotorBody", "motor_furadeira", "Motor da furadeira", "Identificar o motor e sua plaqueta"],
      ["ControlPanel", "painel_furadeira", "Painel de comando da furadeira", "Ligar a máquina pelo comando"],
      ["BotaoLiga", "liga_furadeira", "Botão de partida da furadeira", "Ligar o motor da furadeira"],
      ["BotaoDesliga", "desliga_furadeira", "Botão de parada da furadeira", "Parar o motor da furadeira"],
      ["BotaoReset", "reset_furadeira", "Botão de reset da furadeira", "Restabelecer o comando"],
      ["LuzIndicadora", "luz_furadeira", "Luz indicadora da furadeira", "Conferir o estado de energização"],
      ["GuardScreen", "protetor_furadeira", "Protetor acrílico da furadeira", "Conferir a proteção do ponto de furação"]
    ],
    // Corpo móvel do mecanismo, mantido em meshes próprias para poder girar e
    // descer. As empunhaduras já estão em `pecas`; o resto é engolido pela
    // mescla se não for listado aqui.
    mecanicas: [
      "FeedHub", "FeedSpoke",
      "QuillChrome", "SpindleCollar", "ChuckBody", "ChuckLowerRing", "DrillBit"
    ]
  },
  {
    id: "clp",
    nome: "Painel de automação CLP",
    assinatura: "CLP_CPU",
    x: 8.0, z: -5.0, rotY: -Math.PI / 2,
    pecas: [
      ["Panel_Door_Left", "porta_clp", "Porta do painel CLP", "Abrir o compartimento de comando"],
      ["Door_Handle", "porta_clp", "Porta do painel CLP", "Abrir o compartimento de comando"],
      ["HMI_Screen", "ihm_clp", "Interface homem-máquina", "Ligar a IHM do painel"],
      ["CLP_CPU", "cpu_clp", "CPU do CLP", "Verificar o estado do controlador"],
      ["Disjuntor", "disjuntor_clp", "Disjuntor geral", "Desligar a alimentação do painel"],
      ["Rele_Seguranca", "rele_clp", "Relé de segurança", "Rearmar a cadeia de segurança"],
      ["Emergency_Stop", "emergencia_clp", "Emergência do painel CLP", "Acionar o emergência da célula"],
      ["TowerLight_green", "torre_clp", "Sinalizador verde do CLP", "Confirmar que a célula está liberada"]
    ],
    // O arquivo exporta o acrílico da porta como material opaco (o glTF perdeu
    // o alphaMode na exportação). Sem devolvê-lo translúcido e deixe-a passar a
    // mira, nada dentro do armário — CPU, disjuntores, relés — é selecionável.
    visores: ["Panel_Window_Glass"]
  },
  {
    id: "bancada_extra_longa",
    nome: "Bancada de ajustagem com quatro morsas",
    assinatura: "Morsa_4_corpo",
    x: 0, z: 5.5, rotY: 0,
    pecas: [
      ["Morsa_1_corpo", "morsa_bancada_1", "Morsa 1 da bancada", "Fixar a peça na morsa 1"],
      ["Morsa_2_corpo", "morsa_bancada_2", "Morsa 2 da bancada", "Fixar a peça na morsa 2"],
      ["Morsa_3_corpo", "morsa_bancada_3", "Morsa 3 da bancada", "Fixar a peça na morsa 3"],
      ["Morsa_4_corpo", "morsa_bancada_4", "Morsa 4 da bancada", "Fixar a peça na morsa 4"],
      ["Lima_cabo", "lima_bancada", "Lima", "Recolher a lima de desbaste"],
      ["Martelo_cabo", "martelo_bancada", "Martelo", "Recolher o martelo de ferragem"]
    ]
  },
  {
    id: "bancada_central_senai",
    nome: "Bancada SENAI com armário",
    assinatura: "Morsa1_Corpo",
    x: -6.0, z: 3.0, rotY: Math.PI / 2,
    pecas: [
      ["Tampo_aco_macico", "tampo_bancada_senai", "Tampo da bancada SENAI", "Limpar e nivelar o tampo"],
      ["Morsa1_Corpo", "morsa_bancada_senai", "Morsa da bancada SENAI", "Fixar a peça na morsa"],
      ["Gaveta", "gaveta_bancada_senai", "Gaveta da bancada", "Abrir a gaveta de ferramentas"],
      ["Porta_armario_esquerda", "armario_bancada_senai", "Porta do armário", "Abrir o armário da bancada"],
      ["Porta_armario_direita", "armario_bancada_senai", "Porta do armário", "Abrir o armário da bancada"]
    ]
  },
  {
    id: "bancada_ajustagem",
    nome: "Bancada de ajustagem azul",
    assinatura: "MorsaAzul_Corpo",
    x: -7.3, z: -5.5, rotY: Math.PI / 2,
    pecas: [
      ["MorsaAzul_Corpo", "morsa_azul_ajustagem", "Morsa azul da bancada", "Fixar a peça na morsa azul"],
      ["Paquimetro_Haste", "paquimetro_ajustagem", "Paquímetro", "Medir a peça com o paquímetro"],
      ["Tampo_Revestimento_Galvanizado", "tampo_ajustagem", "Tampo galvanizado", "Organizar a área de ajustagem"],
      ["GrampoC_Vertical", "grampo_c_ajustagem", "Grampo em C", "Apertar o grampo de fixação"]
    ]
  },
  {
    id: "bancada_central",
    nome: "Bancada central com quatro morsas",
    assinatura: "Morsa_traseira_direita_corpo",
    // É a única peça do arquivo desenhada de costas: as morsas "frontais" ficam
    // em Z negativo, então o giro inverte em relação às outras bancadas.
    x: -7.3, z: -1.0, rotY: -Math.PI / 2,
    pecas: [
      ["Tampo_de_madeira", "tampo_bancada_central", "Tampo da bancada central", "Desobstruir o tampo"],
      ["Morsa_frontal_esquerda_corpo", "morsa_frontal_esquerda", "Morsa frontal esquerda", "Fixar a peça na morsa frontal"],
      ["Gaveta_1_frente", "gaveta_bancada_central", "Gaveta da bancada central", "Abrir a primeira gaveta"],
      ["Porta_esquerda", "armario_bancada_central", "Porta esquerda do armário", "Abrir o armário da bancada"],
      ["Porta_direita", "armario_bancada_central", "Porta direita do armário", "Abrir o armário da bancada"],
      ["Lima_chata", "lima_bancada_central", "Lima chata", "Recolher a lima chata"]
    ]
  },
  {
    id: "bancada_prensa",
    nome: "Bancada com prensa vertical",
    assinatura: "Fuso_vertical_escuro",
    x: 7.6, z: 8.0, rotY: -Math.PI / 2,
    pecas: [
      ["Tampo_trapezoidal_aco_escuro", "tampo_prensa", "Tampo da prensa", "Posicionar a peça sob a prensa"],
      ["Base_prensa_azul", "base_prensa", "Base da prensa", "Conferir a fixação da base"],
      ["Balancim_barra_prateada", "alavanca_prensa", "Alavanca da prensa", "Acionar a prensa pelo balancim"],
      ["Placa_identificacao", "plaqueta_prensa", "Placa de identificação", "Ler a plaqueta da prensa"]
    ]
  }
];

const SUFIXO_NUMERICO = /(?:_\d+)+$/;

// Regra de escolha do acerto do raycast, usada na mira do PC, no toque do
// celular e no ponteiro do controller.
//
// Um acrílico de visor é atravessável: quem aponta para um disjuntor visto
// através da porta de vidro quer selecionar o disjuntor. Mas o próprio visor
// pode ser peça de missão (o protetor da furadeira), então ele continua
// elegível — a precedência é dada a qualquer acerto que seja peça interativa ou
// que não seja atravessável, na ordem de distância.
//
// `idEsperado` é o alvo do passo corrente da missão. Quando a mira para num
// acrílico que é peça de missão, mas o passo pede um componente logo atrás
// dele, o aluno está apontando para o componente através da proteção.
function donoInterativo(objeto) {
  let atual = objeto;
  while (atual) {
    if (atual.userData?.interativo) return atual;
    atual = atual.parent;
  }
  return null;
}

export function escolherAcerto(acertos, idEsperado) {
  let escolhido = null;
  for (const acerto of acertos) {
    const d = acerto.object.userData;
    if (!d?.atravessavel || d.interativo) {
      escolhido = acerto;
      break;
    }
  }
  if (!escolhido) return acertos[0] ?? null;

  const dono = donoInterativo(escolhido.object);
  if (!escolhido.object.userData.atravessavel || !dono || dono.userData.idPeca === idEsperado) {
    return escolhido;
  }

  for (const acerto of acertos) {
    if (acerto === escolhido || acerto.object.userData.atravessavel) continue;
    if (acerto.distance - escolhido.distance > 0.3) break;
    const atras = donoInterativo(acerto.object);
    if (atras?.userData.idPeca === idEsperado) return acerto;
  }

  return escolhido;
}

function nomeBase(nome) {
  return (nome || "").replace(SUFIXO_NUMERICO, "");
}

// Reconhece a máquina pelo conjunto de nomes de mesh da subtree e devolve o
// mapa peça -> missão já resolvido para nomes exatos e com sufixo numérico.
function identificar(bruto) {
  const nomes = [];
  bruto.traverse((obj) => {
    if (obj.isMesh && obj.name) nomes.push(obj.name);
  });

  const item = CATALOGO.find((c) =>
    nomes.some((n) => n === c.assinatura || nomeBase(n) === c.assinatura)
  );
  if (!item) return null;

  const mapa = new Map();
  for (const [nome, idPeca, rotulo, descricao] of item.pecas) {
    mapa.set(nome, { idPeca, rotulo, descricao });
  }
  return {
    item,
    mapa,
    visores: new Set(item.visores || []),
    mecanicas: new Set(item.mecanicas || []),
    // Também ficam fora da mescla as peças que formam mecanismos animáveis:
    // o rig é montado depois, em src/rigs.js, com pivô tirado da própria caixa.
    animaveis: new Set((RIGS[item.id] || []).flatMap((def) => def.pecas))
  };
}

// As geometrias do arquivo usam POSITION, NORMAL e TEXCOORD_0 indexados. A
// mescla exige atributos idênticos em todas, então normalizamos e descartamos
// qualquer extra que apareça num futuro reexport.
function geometriaMescavel(geometria) {
  if (!geometria?.attributes?.position) return null;

  const g = geometria.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
    );
  }

  for (const nome of Object.keys(g.attributes)) {
    if (!["position", "normal", "uv"].includes(nome)) g.deleteAttribute(nome);
  }
  g.groups = [];
  return g;
}

// Acrílico de visor: fica fora da mescla, com material translúcido e marcado
// como atravessável, para que a mira chegue aos componentes atrás dele.
function materialVisor(materialOriginal) {
  const m = materialOriginal.clone();
  m.transparent = true;
  m.opacity = 0.26;
  m.depthWrite = false;
  m.side = THREE.DoubleSide;
  return m;
}

export function montarMaquina(bruto) {
  const reconhecimento = identificar(bruto);
  if (!reconhecimento) return null;

  const { item, mapa, visores, mecanicas, animaveis } = reconhecimento;

  bruto.updateMatrixWorld(true);

  // Nada de anular a matriz do nó raiz: em cinco dos modelos ela é justamente a
  // conversão Z-up -> Y-up feita na exportação. Desfazê-la deitava a máquina.
  // O deslocamento da fileira em que os modelos foram exportados é removido
  // mais adiante, ao recentrar pela caixa própria de cada máquina.
  const conteudo = new THREE.Group();
  conteudo.name = `${item.nome} (corpo)`;

  const porMaterial = new Map();
  const interativas = [];
  const moveis = [];
  const visoresMontados = [];
  let mescladas = 0;

  bruto.traverse((obj) => {
    if (!obj.isMesh) return;

    const g = geometriaMescavel(obj.geometry);
    if (!g) return;

    g.applyMatrix4(obj.matrixWorld);

    const base = nomeBase(obj.name);
    const spec = mapa.get(obj.name) || mapa.get(base);

    if (spec) {
      const peca = new THREE.Mesh(g, obj.material);
      peca.name = obj.name;
      peca.castShadow = true;
      peca.receiveShadow = true;
      peca.userData.interativo = true;
      peca.userData.base = base;
      peca.userData.idPeca = spec.idPeca;
      peca.userData.idEquipamento = item.id;
      peca.userData.nomeEquipamento = spec.rotulo;
      peca.userData.descricao = spec.descricao;
      // Peças de acrílico já translúcidas no arquivo (protetor da furadeira)
      // também deixam a mira passar: aponta-se para o que está atrás delas.
      if (obj.material.transparent) peca.userData.atravessavel = true;
      conteudo.add(peca);
      interativas.push(peca);
      return;
    }

    if (visores.has(obj.name) || visores.has(base)) {
      const visor = new THREE.Mesh(g, materialVisor(obj.material));
      visor.name = obj.name;
      visor.userData.base = base;
      visor.userData.idEquipamento = item.id;
      visor.userData.nomeEquipamento = item.nome;
      visor.userData.atravessavel = true;
      if (animaveis.has(obj.name) || animaveis.has(base)) visor.userData.animavel = true;
      conteudo.add(visor);
      visoresMontados.push(visor);
      return;
    }

    // Peça de mecanismo: fica fora da mescla porque precisa girar ou descer.
    // A geometria já está assentada no espaço do conteúdo, então o pivô do
    // movimento é montado depois, em src/furadeira.js, só pelo nome-base.
    if (mecanicas.has(obj.name) || mecanicas.has(base)) {
      const movel = new THREE.Mesh(g, obj.material);
      movel.name = obj.name;
      movel.castShadow = true;
      movel.receiveShadow = true;
      movel.userData.base = base;
      movel.userData.idEquipamento = item.id;
      movel.userData.nomeEquipamento = item.nome;
      conteudo.add(movel);
      moveis.push(movel);
      return;
    }

    // Peça de mecanismo animável (porta, mandril, carro, balancim...). Vale o
    // mesmo motivo da mescla acima, mas aqui o agrupamento é feito pelo rig,
    // que também calcula o pivô. O nome do grupo é o alvo das animações futuras.
    if (animaveis.has(obj.name) || animaveis.has(base)) {
      const movel = new THREE.Mesh(g, obj.material);
      movel.name = obj.name;
      movel.castShadow = true;
      movel.receiveShadow = true;
      movel.userData.base = base;
      movel.userData.animavel = true;
      movel.userData.idEquipamento = item.id;
      movel.userData.nomeEquipamento = item.nome;
      conteudo.add(movel);
      moveis.push(movel);
      return;
    }

    const chave = obj.material.uuid;
    let agrupadas = porMaterial.get(chave);
    if (!agrupadas) {
      agrupadas = { material: obj.material, geometrias: [] };
      porMaterial.set(chave, agrupadas);
    }
    agrupadas.geometrias.push(g);
    mescladas += 1;
  });

  let corpos = 0;
  for (const { material, geometrias } of porMaterial.values()) {
    const unica = geometrias.length === 1
      ? geometrias[0]
      : mergeGeometries(geometrias, false);
    if (!unica) continue;

    const mesh = new THREE.Mesh(unica, material);
    mesh.name = `Corpo_${item.id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.idEquipamento = item.id;
    mesh.userData.nomeEquipamento = item.nome;
    conteudo.add(mesh);
    corpos += 1;
  }

  conteudo.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(conteudo);
  const centro = caixa.getCenter(new THREE.Vector3());

  conteudo.position.set(-centro.x, -caixa.min.y, -centro.z);

  const encaixe = new THREE.Group();
  encaixe.name = item.nome;
  encaixe.position.set(item.x, 0, item.z);
  encaixe.rotation.y = item.rotY;
  encaixe.userData.idEquipamento = item.id;
  encaixe.userData.nomeEquipamento = item.nome;
  encaixe.add(conteudo);

  encaixe.updateMatrixWorld(true);

  return {
    id: item.id,
    nome: item.nome,
    grupo: encaixe,
    conteudo,
    dimensoes: caixa.getSize(new THREE.Vector3()),
    colisor: new THREE.Box3().setFromObject(encaixe),
    interativas,
    moveis,
    atravessaveis: visoresMontados,
    drawCalls: corpos + interativas.length + visoresMontados.length + moveis.length,
    meshesOriginais: mescladas + interativas.length + visoresMontados.length + moveis.length
  };
}

// Uma passada só: reconhece, monta e remove do arquivo original cada filho.
export function dividirSceneGlb(cena, { pai } = {}) {
  cena.updateMatrixWorld(true);

  const maquinas = [];
  const naoReconhecidas = [];

  for (const bruto of [...cena.children]) {
    const montada = montarMaquina(bruto);

    if (!montada) {
      naoReconhecidas.push(bruto.name || "(sem nome)");
      continue;
    }

    bruto.removeFromParent();
    pai?.add(montada.grupo);
    maquinas.push(montada);
  }

  return { maquinas, naoReconhecidas };
}
