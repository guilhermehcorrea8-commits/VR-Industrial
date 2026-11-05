import * as THREE from "three";

// Furadeira de coluna em funcionamento.
//
// A alavanca de avanço é um cubo com três raios de aço e três empunhaduras
// pretas — FeedGrip_0 atrás, _1 em cima, _2 na frente. Clicar em qualquer uma
// gira o conjunto em torno do eixo do cubo e desce a árvore um degrau; no fim
// do curso o próximo clique inverte o sentido. O mandril gira enquanto corta.
//
// Nada aqui é número copiado do modelo: pivô, eixo de giro e centro do mandril
// saem das caixas das próprias peças, medidas no espaço do conteúdo (o mesmo
// da mescla), então um reexport que mova a alavanca continua funcionando.

const DEGRAUS = 3;
const GIRO_POR_DEGRAU = 0.35; // rad por clique (~20°)
const CURSO = 0.15; // m de descida da árvore
const VELOCIDADE_EIXO = 7.5; // rad/s do mandril enquanto corta
const VELOCIDADE_LIVRE = 2.2; // rad/s do mandril ligado, sem cortar
const SUAVIDADE = 6; // 1/s de aproximação do alvo
const ELEVACAO_MESA = 0.12; // m acima da posição baixa

// O arquivo exporta a árvore já no fundo do curso: a broca nasce embaixo da
// mesa. Descanso é a árvore levantada (CURSO acima do exportado) e a mesa
// desce 18 cm — altura normal de bancada de furadeira — para que o corte
// aconteça na superfície em vez de dentro dela.
const QUEDA_DA_MESA = 0.18;

const ALAVANCA = ["FeedHub", "FeedSpoke", "FeedGrip"];
const ARVORE = [
  "QuillChrome",
  "SpindleCollar",
  "ChuckBody",
  "ChuckLowerRing",
  "ChuckJawSleeve",
  "DrillBit"
];
const MANDRIL = ["ChuckBody", "ChuckLowerRing", "ChuckJawSleeve", "DrillBit"];
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
  const eixoArvore = arvorePecas.get("ChuckBody");

  if (!cubo.length || hastes.length < 2 || !eixoArvore.length) {
    console.warn(
      "[furadeira] o scene.glb não trouxe as peças do avanço — o manete ficará inerte."
    );
    return {
      pronto: false,
      acionar: () => null,
      atualizar: () => {},
      definirMotor: () => {},
      ajustarMesa: () => {},
      reiniciar: () => {}
    };
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

  // ---------- ÁRVORE / MANDRIL ----------
  const centroBroca = caixaDas(eixoArvore).getCenter(new THREE.Vector3());

  const grupoArvore = new THREE.Group();
  grupoArvore.name = "Árvore";
  grupoArvore.position.y = CURSO;
  conteudo.add(grupoArvore);

  const grupoMandril = new THREE.Group();
  grupoMandril.name = "Mandril";
  grupoMandril.position.set(centroBroca.x, 0, centroBroca.z);
  grupoArvore.add(grupoMandril);

  const giram = new Set(MANDRIL);
  const deslocamentoMandril = new THREE.Vector3(-centroBroca.x, 0, -centroBroca.z);

  for (const nome of ARVORE) {
    const malhas = arvorePecas.get(nome);
    if (giram.has(nome)) transladar(malhas, grupoMandril, deslocamentoMandril);
    else transladar(malhas, grupoArvore, new THREE.Vector3());
  }

  // ---------- MESA ----------
  let grupoMesa = null;
  if (mesaPecas.size) {
    grupoMesa = new THREE.Group();
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
  let giroEixo = 0;
  let motorLigado = false;
  let alturaMesa = -QUEDA_DA_MESA;
  let alvoMesa = alturaMesa;

  // Quando uma animação futura assume uma ação, o rig continua guardando o
  // estado (degrau, motor, altura) mas para de escrever a transformação, para
  // não brigar com os tracks do clipe.
  let visualAvanco = true;
  let visualMesa = true;

  function acionar(alvo, { visual = true } = {}) {
    if (alvo?.userData?.idPeca !== "alavanca_avanco") return null;

    visualAvanco = visual;

    if (!subindo && degrau >= DEGRAUS) subindo = true;
    else if (subindo && degrau <= 0) subindo = false;

    degrau += subindo ? -1 : 1;

    return subindo
      ? `Alavanca solta — árvore subindo (${degrau}/${DEGRAUS} do curso)`
      : `Avanço manual — broca descendo (${degrau}/${DEGRAUS} do curso)`;
  }

  function definirMotor(ligado, { visual = true } = {}) {
    motorLigado = Boolean(ligado);
    visualAvanco = visual;
  }

  function ajustarMesa(alta, { visual = true } = {}) {
    alvoMesa = -QUEDA_DA_MESA + (alta ? ELEVACAO_MESA : 0);
    visualMesa = visual;
  }

  function reiniciar() {
    degrau = 0;
    subindo = false;
    angulo = 0;
    altura = CURSO;
    giroEixo = 0;
    motorLigado = false;
    alturaMesa = -QUEDA_DA_MESA;
    alvoMesa = alturaMesa;
    visualAvanco = true;
    visualMesa = true;

    grupoAlavanca.quaternion.identity();
    grupoArvore.position.y = altura;
    grupoMandril.rotation.y = giroEixo;
    if (grupoMesa) grupoMesa.position.y = alturaMesa;
  }

  function atualizar(delta) {
    const anguloAlvo = degrau * GIRO_POR_DEGRAU;
    const alturaAlvo = CURSO - (degrau * CURSO) / DEGRAUS;

    // Gira só o trecho em que a broca está cortando; em vazio o motor mantém
    // uma rotação lenta, e desligado o mandril para de girar.
    const cortando = motorLigado && alturaAlvo < altura - 1e-4;
    const k = 1 - Math.exp(-SUAVIDADE * delta);

    angulo += (anguloAlvo - angulo) * k;
    altura += (alturaAlvo - altura) * k;
    alturaMesa += (alvoMesa - alturaMesa) * k;

    if (cortando) giroEixo += delta * VELOCIDADE_EIXO;
    else if (motorLigado) giroEixo += delta * VELOCIDADE_LIVRE;

    if (visualAvanco) {
      grupoAlavanca.quaternion.setFromAxisAngle(eixo, angulo);
      grupoArvore.position.y = altura;
      grupoMandril.rotation.y = giroEixo;
    }
    if (visualMesa && grupoMesa) grupoMesa.position.y = alturaMesa;
  }

  return {
    pronto: true,
    acionar,
    atualizar,
    definirMotor,
    ajustarMesa,
    reiniciar,
    get degrau() { return degrau; },
    get curso() { return `${DEGRAUS - degrau}/${DEGRAUS}`; },
    get motorLigado() { return motorLigado; },
    get mesaAlta() { return alvoMesa > -QUEDA_DA_MESA; }
  };
}
