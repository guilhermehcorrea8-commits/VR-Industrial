import * as THREE from "three";

// Furadeira de coluna em funcionamento.
//
// A alavanca de avanço é um cubo com três raios de aço e três empunhaduras
// pretas — FeedGrip_0 atrás, _1 em cima, _2 na frente. Clicar em qualquer uma
// gira o conjunto em torno do eixo do cubo e desce a árvore um degrau, e cada
// degrau entra 3% mais fundo que o anterior; no fim do curso o próximo clique
// inverte o sentido.
//
// A rotação vem do comando: o eixo só gira com o botão verde ligado, o vermelho
// o desliga e o amarelo (reset) devolve a árvore à posição inicial. O rotor
// entra em regime com inércia, como toda polia pesada, e perde rotação aos
// poucos até parar. A alavanca desce a árvore ligada ou não — num banco desses
// o avanço é mecânico e manual; o que muda é que, sem rotação, a broca empurra
// o material em vez de cortá-lo.
//
// O painel responde com as duas luzes: ligada, a verde (LuzIndicadora_0) acende
// e a amarela se apaga; desligada, é a amarela (LuzIndicadora_1) que fica acesa.
//
// Só o corpo da broca gira, e gira no PRÓPRIO eixo: o centro de giro vem da
// caixa dele. O modelo trazia DrillBit (a haste) e ChuckBody (o espinel, Ø4 cm);
// no export atual só ChuckBody existe, concêntrico ao punção, e é ele que gira.
// O colarinho e o punção apenas descem, e ficam absolutamente estáveis.
//
// Nada aqui é número copiado do modelo: pivô, eixo de giro e centro da broca
// saem das caixas das próprias peças, medidas no espaço do conteúdo (o mesmo
// da mescla), então um reexport que mova a alavanca continua funcionando.

const DEGRAUS = 3;
// O gesto do manete: um puxão de ~36° por clique, mais de um quarto de volta no
// curso inteiro, para a alavanca se mover visivelmente junto das empunhaduras
// pretas que o raycast alcança.
const GIRO_POR_DEGRAU = 0.63; // rad por clique (~36°)
// A descida não é mais igual entre cliques: cada puxão avança 3% mais que o
// anterior, e o fundo do curso é a soma dos três — 15,46 cm, um pouco além dos
// 15 cm de antes.
const PRIMEIRO_PASSO = 0.05; // m no primeiro clique
const CRESCIMENTO = 1.03; // 3% a mais a cada clique
const DESCIDA_ACUMULADA = [];
for (let i = 0, acc = 0; i < DEGRAUS; i++) {
  acc += PRIMEIRO_PASSO * CRESCIMENTO ** i;
  DESCIDA_ACUMULADA.push(acc);
}
const CURSO = DESCIDA_ACUMULADA[DEGRAUS - 1]; // fim do curso, no último degrau
const VELOCIDADE_EIXO = 63; // rad/s de regime (~600 rpm)
const PARADA_DO_EIXO = 0.6; // rad/s (~6 rpm) abaixo da qual o eixo está parado
const INERCIA_PARTIDA = 2.6; // 1/s até o regime
const INERCIA_PARADA = 1.4; // 1/s derrubando a rotação
const SUAVIDADE = 6; // 1/s de aproximação do alvo
const INTENSIDADE_LUZ = 1.6; // brilho da luz do painel acesa
const COR_APAGADA = 0.28; // fração da cor que resta quando ela se apaga

// O arquivo exporta a árvore já no fundo do curso: a broca nasce embaixo da
// mesa. Descanso é a árvore levantada (CURSO acima do exportado) e a mesa
// desce 18 cm — altura normal de bancada de furadeira — para que o corte
// aconteça na superfície em vez de dentro dela.
const QUEDA_DA_MESA = 0.18;

const ALAVANCA = ["FeedHub", "FeedSpoke", "FeedGrip"];
const ARVORE = ["QuillChrome", "SpindleCollar", "ChuckBody", "DrillBit"];
// As luzes do painel e quando cada uma acende: a verde com o eixo em regime, a
// amarela com a máquina desligada.
const INDICADORAS = [
  ["LuzIndicadora_0", true],
  ["LuzIndicadora_1", false]
];
// Os três botões do painel de comando, pela ordem do ciclo real.
const LIGA = "botao_liga_furadeira";
const DESLIGA = "botao_desliga_furadeira";
const RESET = "botao_reset_furadeira";
const MESA = [
  "WorkTableCasting",
  "WorkTableTop",
  "TableClampCollar",
  "TableArm",
  "TableLockHandle",
  "TableLockKnob",
  "TSlot",
  "TableBolt"
];

const caixaTemporaria = new THREE.Box3();
const vetorA = new THREE.Vector3();
const vetorB = new THREE.Vector3();
const preto = new THREE.Color(0, 0, 0);

// Agrupa as meshes preservadas por nome-base (FeedSpoke_0 e FeedSpoke_2
// chegam como "FeedSpoke"), incluindo as que já são peças de missão.
function porBase(conteudo, nomes) {
  const grupos = new Map(nomes.map((nome) => [nome, []]));

  conteudo.traverse((obj) => {
    if (!obj.isMesh) return;
    const grupo = grupos.get(obj.userData.base);
    if (grupo) grupo.push(obj);
  });
  return grupos;
}

// Caixa no espaço do conteúdo: a geometria já está assentada ali e a mesh está
// na identidade, então a bounding box do atributo é a caixa da peça.
function caixaDas(malhas) {
  caixaTemporaria.makeEmpty();
  for (const malha of malhas) {
    malha.geometry.computeBoundingBox();
    if (malha.geometry.boundingBox) caixaTemporaria.union(malha.geometry.boundingBox);
  }
  return caixaTemporaria.clone();
}

function transladar(malhas, grupo, deslocamento) {
  for (const malha of malhas) {
    malha.removeFromParent();
    malha.position.copy(deslocamento);
    grupo.add(malha);
  }
}

export function criarFuradeira(montada) {
  const conteudo = montada.conteudo;
  const alavancaPecas = porBase(conteudo, ALAVANCA);
  const arvorePecas = porBase(conteudo, ARVORE);
  const mesaPecas = porBase(conteudo, MESA);

  const cubo = alavancaPecas.get("FeedHub");
  const hastes = [...alavancaPecas.get("FeedSpoke"), ...alavancaPecas.get("FeedGrip")];
  const broca = arvorePecas.get("DrillBit");
  const espinel = arvorePecas.get("ChuckBody");

  if (!cubo.length || hastes.length < 2 || !(broca.length || espinel.length)) {
    console.warn(
      "[furadeira] o scene.glb não trouxe as peças do avanço — o manete ficará inerte."
    );
    return { pronto: false, acionar: () => null, atualizar: () => {} };
  }

  // ---------- ALAVANCA ----------
  const pivô = caixaDas(cubo).getCenter(new THREE.Vector3());

  // O eixo do cubo é perpendicular a dois raios quaisquer.
  const centroRaioA = caixaDas([hastes[0]]).getCenter(vetorA);
  const centroRaioB = caixaDas([hastes[1]]).getCenter(vetorB);
  const eixo = new THREE.Vector3()
    .copy(centroRaioA.sub(pivô))
    .cross(centroRaioB.sub(pivô));

  if (eixo.lengthSq() < 1e-8) {
    // Raios alinhados: o eixo é a maior dimensão do próprio cubo.
    const dimensao = caixaDas(cubo).getSize(new THREE.Vector3());
    if (dimensao.y > dimensao.x && dimensao.y >= dimensao.z) eixo.set(0, 1, 0);
    else if (dimensao.z > dimensao.x && dimensao.z > dimensao.y) eixo.set(0, 0, 1);
    else eixo.set(1, 0, 0);
  }
  eixo.normalize();

  // O sinal decide o sentido do puxão. Fixando o componente dominante em
  // positivo, o giro leva o manete de cima para a frente — o gesto de quem
  // avança a broca na direção de quem está de pé na máquina.
  const dominante = ["x", "y", "z"].reduce(
    (melhor, chave) => (Math.abs(eixo[chave]) > Math.abs(eixo[melhor]) ? chave : melhor),
    "x"
  );
  if (eixo[dominante] < 0) eixo.negate();

  const grupoAlavanca = new THREE.Group();
  grupoAlavanca.name = "Alavanca de avanço";
  grupoAlavanca.position.copy(pivô);
  conteudo.add(grupoAlavanca);
  transladar([...cubo, ...hastes], grupoAlavanca, pivô.clone().negate());

  // ---------- ÁRVORE / BROCA ----------
  // Vertical pelo centro do próprio corpo que gira. A broca é a primeira
  // opção; sem ela no modelo, o corpo que pende do colarinho é ChuckBody, e é
  // ele que o giro tem de acompanhar — girar por outro centro faria a haste
  // descrever um círculo em vez de rodar em torno de si.
  const gira = broca.length ? "DrillBit" : "ChuckBody";
  const centroBroca = caixaDas(broca.length ? broca : espinel).getCenter(new THREE.Vector3());

  const grupoArvore = new THREE.Group();
  grupoArvore.name = "Árvore";
  grupoArvore.position.y = CURSO;
  conteudo.add(grupoArvore);

  const grupoBroca = new THREE.Group();
  grupoBroca.name = "Broca";
  grupoBroca.position.set(centroBroca.x, 0, centroBroca.z);
  grupoArvore.add(grupoBroca);

  const giram = new Set([gira]);
  const deslocamentoBroca = new THREE.Vector3(-centroBroca.x, 0, -centroBroca.z);

  for (const nome of ARVORE) {
    const malhas = arvorePecas.get(nome);
    if (giram.has(nome)) transladar(malhas, grupoBroca, deslocamentoBroca);
    else transladar(malhas, grupoArvore, new THREE.Vector3());
  }

  // ---------- MESA ----------
  if (mesaPecas.size) {
    const grupoMesa = new THREE.Group();
    grupoMesa.name = "Mesa da furadeira";
    grupoMesa.position.y = -QUEDA_DA_MESA;
    conteudo.add(grupoMesa);
    for (const malhas of mesaPecas.values()) {
      transladar(malhas, grupoMesa, new THREE.Vector3());
    }
  }

  // ---------- ESTADO ----------
  let degrau = 0;
  let subindo = false;
  let angulo = 0;
  let altura = CURSO;
  let ligada = false;
  let rotação = 0;
  let giroBroca = 0;

  // ---------- LUZES DO PAINEL ----------
  // Cada uma das duas luzes compartilha material com outras peças do cabeçote
  // (o verde é o do botão de ligação, o amarelo o do aviso da carenagem), então
  // cada malha recebe material próprio antes de poder acender sozinha. A verde
  // diz que o eixo está em regime; a amarela, que a máquina está desligada.
  const luzes = [];
  for (const [nome, comEixo] of INDICADORAS) {
    const malha = conteudo.getObjectByName(nome);
    if (!malha?.isMesh) continue;
    const material = malha.material.clone();
    malha.material = material;
    luzes.push({ material, acendeComEixo: comEixo, cor: material.color.clone() });
  }

  function iluminar() {
    for (const luz of luzes) {
      const acesa = luz.acendeComEixo === ligada;
      luz.material.color.copy(luz.cor).multiplyScalar(acesa ? 1 : COR_APAGADA);
      if (luz.material.emissive) {
        luz.material.emissive.copy(acesa ? luz.cor : preto);
        luz.material.emissiveIntensity = acesa ? INTENSIDADE_LUZ : 0;
      }
    }
  }
  iluminar();

  function acionar(alvo) {
    const idPeca = alvo?.userData?.idPeca;

    if (idPeca === LIGA || idPeca === DESLIGA) {
      const queria = idPeca === LIGA;
      if (queria === ligada) {
        return queria
          ? "Botão verde — o eixo já está girando"
          : "Botão vermelho — o eixo já está parado";
      }
      ligada = queria;
      iluminar();
      return ligada
        ? "Botão verde — furadeira ligada, o eixo entra em regime"
        : "Botão vermelho — eixo desligado, a broca perde rotação e para";
    }

    if (idPeca === RESET) {
      if (degrau === 0 && !subindo) return "Botão amarelo — a árvore já está na posição inicial";
      degrau = 0;
      subindo = false;
      return "Botão amarelo — reset: a mola devolve a árvore e a broca volta ao topo do curso";
    }

    if (idPeca !== "alavanca_avanco") return null;

    if (!subindo && degrau >= DEGRAUS) subindo = true;
    else if (subindo && degrau <= 0) subindo = false;

    degrau += subindo ? -1 : 1;

    const curso = `${degrau}/${DEGRAUS}`;
    if (subindo) return `Alavanca solta — árvore subindo (${curso})`;
    return ligada
      ? `Avanço manual — broca girando e descendo (${curso})`
      : `Avanço manual com a máquina desligada — a broca desce sem girar, não corta (${curso})`;
  }

  function atualizar(delta) {
    const anguloAlvo = degrau * GIRO_POR_DEGRAU;
    const alturaAlvo = CURSO - (degrau > 0 ? DESCIDA_ACUMULADA[degrau - 1] : 0);

    const k = 1 - Math.exp(-SUAVIDADE * delta);
    angulo += (anguloAlvo - angulo) * k;
    altura += (alturaAlvo - altura) * k;

    // O rotor tem peso: leva um instante para entrar em regime e outro para
    // parar depois do botão, e é isso que faz a broca ser uma broca de verdade.
    const regime = ligada ? VELOCIDADE_EIXO : 0;
    const inercia = ligada ? INERCIA_PARTIDA : INERCIA_PARADA;
    rotação += (regime - rotação) * (1 - Math.exp(-inercia * delta));
    if (rotação < PARADA_DO_EIXO) rotação = 0;

    grupoAlavanca.quaternion.setFromAxisAngle(eixo, angulo);
    grupoArvore.position.y = altura;

    if (rotação) {
      giroBroca += rotação * delta;
      grupoBroca.rotation.y = giroBroca;
    }
  }

  return {
    pronto: true,
    acionar,
    atualizar,
    get degrau() { return degrau; },
    get curso() { return `${DEGRAUS - degrau}/${DEGRAUS}`; },
    get ligada() { return ligada; }
  };
}
