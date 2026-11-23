// Missões de treinamento. Cada passo aponta para o `idPeca` de uma peça real
// do scene.glb (ver CATALOGO em src/maquinas.js), então a missão quebra
// visualmente se a peça for renomeada ou deixar de ser preservada na mescla —
// que é exatamente o comportamento desejado.
//
// Três modos de uso:
//   "treino"   — uma missão só, com avaliação ao final;
//   "campanha" — as seis missões em sequência, avaliadas uma a uma;
//   "livre"    — sem pontuação, só exploração e resposta das máquinas.
//
// A pontuação premia precisão: acerto vale 100, mais um bônus de até 50 que
// cai conforme o tempo gasto no passo. Erro custa 15 e derruba a precisão.

const MISSOES = [
  {
    id: "seguranca",
    titulo: "Reconhecimento de segurança",
    resumo: "Localize extintor, armário de emergência, proteções e sinalizadores.",
    objetivo: "Identifique os dispositivos de segurança da oficina antes de operar qualquer máquina.",
    briefing:
      "Antes de tocar em uma máquina, o operador precisa conhecer a oficina. " +
      "Localize o extintor, o armário de emergências, o protetor da furadeira, " +
      "a parada de emergência da CNC e o sinalizador do painel CLP.",
    passos: [
      { alvo: "Extintor de incêndio", nome: "Extintor de incêndio", dica: "Confira o manômetro e o lacre do extintor." },
      { alvo: "Armário de emergências", nome: "Armário de emergências", dica: "O armário guarda chaves e EPIs de emergência." },
      { alvo: "Protetor acrílico da furadeira", idPeca: "protetor_furadeira", dica: "O acrílico fica entre você e a broca. Nunca opere sem ele." },
      { alvo: "Parada de emergência da CNC", idPeca: "emergencia_cnc", dica: "O cogumelo vermelho interrompe o ciclo imediatamente." },
      { alvo: "Sinalizador verde do painel CLP", idPeca: "torre_clp", dica: "Torre verde acesa = célula liberada." }
    ]
  },
  {
    id: "furadeira",
    titulo: "Preparar a furadeira de coluna",
    resumo: "Mesa, proteção, mandril, painel e a sequência de ligação.",
    objetivo: "Prepare a furadeira de coluna para furar uma peça com segurança.",
    briefing:
      "A furadeira de coluna concentra quase todos os erros de preparação da " +
      "oficina: mesa desalinhada, broca solta, proteção levantada. Ajuste a " +
      "máquina na ordem correta e só então ligue o eixo.",
    passos: [
      { alvo: "Mesa da furadeira", idPeca: "mesa_furadeira", dica: "Ajuste a altura da mesa antes de fixar a peça." },
      { alvo: "Protetor acrílico da furadeira", idPeca: "protetor_furadeira", dica: "O protetor deve cobrir o ponto de furação." },
      { alvo: "Mandril da furadeira", idPeca: "mandril_furadeira", dica: "Aperte a broca com a chave do mandril, com o motor parado." },
      { alvo: "Painel de comando da furadeira", idPeca: "painel_furadeira", dica: "Confira o painel antes de energizar a máquina." },
      { alvo: "Botão de reset, para a broca voltar ao topo", idPeca: "botao_reset_furadeira", dica: "O botão amarelo repõe a árvore no topo do curso." },
      { alvo: "Botão verde de ligação", idPeca: "botao_liga_furadeira", dica: "Só ligue com a tampa da correia fechada." },
      { alvo: "Alavanca de avanço", idPeca: "alavanca_avanco", dica: "O avanço é em degraus: cada clique desce um passo." }
    ]
  },
  {
    id: "cnc",
    titulo: "Montar a peça no centro de usinagem",
    resumo: "Abra a proteção, fixe a peça, confira a ferramenta e inicie o ciclo.",
    objetivo: "Monte a peça na CNC e deixe o ciclo pronto para iniciar.",
    briefing:
      "O centro de usinagem só aceita ciclo com a proteção fechada e a peça " +
      "fixada na mesa. Abra a porta, fixe a peça nas canaletas em T, confira a " +
      "ferramenta no cone e comande o ciclo pelo console.",
    passos: [
      { alvo: "Porta deslizante da CNC", idPeca: "porta_cnc", dica: "A proteção só abre com o ciclo parado." },
      { alvo: "Mesa de furos em T", idPeca: "mesa_cnc", dica: "Fixe a peça nas canaletas antes de fechar a proteção." },
      { alvo: "Ferramenta montada no cone", idPeca: "ferramenta_cnc", dica: "Confira o aperto da fresa no cone." },
      { alvo: "Console da CNC", idPeca: "console_cnc", dica: "Ciclo exige peça fixada e proteção fechada." }
    ]
  },
  {
    id: "torno",
    titulo: "Usinar no torno mecânico",
    resumo: "Mandril, protetor, ferramenta, carro e contraponto na ordem certa.",
    objetivo: "Prepare o torno e avance a ferramenta até a peça.",
    briefing:
      "No torno, a peça gira e a ferramenta avança. Aperte a peça no mandril, " +
      "baixe o protetor, posicione a ferramenta e avance o carro com o torno " +
      "parado — o giro só é liberado com a proteção baixa.",
    passos: [
      { alvo: "Cabeçote do torno", idPeca: "castanho_torno", dica: "O cabeçote transmite o giro ao mandril." },
      { alvo: "Mandril do torno", idPeca: "mandril_torno", dica: "Aperte a peça com o torno parado." },
      { alvo: "Porta-ferramentas", idPeca: "torre_ferramentas_torno", dica: "Trave a torre antes de ligar o giro." },
      { alvo: "Volante do carro", idPeca: "volante_carro_torno", dica: "Três voltas completam o curso do carro." },
      { alvo: "Volante do contraponto", idPeca: "volante_contraponto_torno", dica: "A pinça estabiliza peças longas." }
    ]
  },
  {
    id: "clp",
    titulo: "Energizar o painel de automação",
    resumo: "Disjuntor, relé de segurança, CPU e IHM na sequência correta.",
    objetivo: "Energize o painel CLP e deixe a célula liberada.",
    briefing:
      "O painel CLP alimenta a célula inteira. A porta só abre desenergizada, o " +
      "relé de segurança precisa ser rearmado e a IHM só liga com a CPU em RUN. " +
      "Siga a cadeia de energização na ordem.",
    passos: [
      { alvo: "Porta do painel CLP", idPeca: "porta_clp", dica: "Desenergize pelo disjuntor antes de abrir o painel." },
      { alvo: "Disjuntor geral", idPeca: "disjuntor_clp", dica: "O disjuntor alimenta todo o painel." },
      { alvo: "Relé de segurança", idPeca: "rele_clp", dica: "O relé precisa ser rearmado após uma emergência." },
      { alvo: "CPU do CLP", idPeca: "cpu_clp", dica: "CPU em RUN = controlador executando o programa." },
      { alvo: "Interface homem-máquina", idPeca: "ihm_clp", dica: "A IHM só liga com a CPU em RUN." }
    ]
  },
  {
    id: "ajustagem",
    titulo: "Ajustagem na bancada",
    resumo: "Morsas, lima, paquímetro e prensa para acabar a peça.",
    objetivo: "Fixe a peça, ajuste com lima e confira a medida com o paquímetro.",
    briefing:
      "Ajustagem é acabamento manual: a peça fica na morsa, a lima corrige a " +
      "aresta e o paquímetro confere a tolerância. Feche o serviço acionando a " +
      "prensa com a base conferida.",
    passos: [
      { alvo: "Morsa 1 da bancada corrida", idPeca: "morsa_bancada_1", dica: "Fixe a peça rente à morsa, sem esmagar." },
      { alvo: "Lima", idPeca: "lima_bancada", dica: "Lima se usa em curso único, sem arrastar de volta." },
      { alvo: "Morsa da bancada SENAI", idPeca: "morsa_bancada_senai", dica: "Trave a base giratória antes de lixar." },
      { alvo: "Paquímetro", idPeca: "paquimetro_ajustagem", dica: "Meça três pontos e compare com a tolerância." },
      { alvo: "Alavanca da prensa", idPeca: "alavanca_prensa", dica: "Acione o balancim devagar e confira a base." }
    ]
  }
];

const IDS_DA_LINHA = new Set();
const NOMES_DA_LINHA = new Set();

for (const missao of MISSOES) {
  for (const passo of missao.passos) {
    if (passo.idPeca) IDS_DA_LINHA.add(passo.idPeca);
    if (passo.nome) NOMES_DA_LINHA.add(passo.nome);
  }
}

// Peça que participa da linha de produção do item (em qualquer etapa). Serve
// para separar "falta a peça deste passo" de um objeto que simplesmente não
// aceita interação naquele momento.
export function pertenceALinha(objeto) {
  const id = objeto?.userData?.idPeca;
  const nome = objeto?.userData?.nomeEquipamento;
  return Boolean((id && IDS_DA_LINHA.has(id)) || (nome && NOMES_DA_LINHA.has(nome)));
}

export function medalhaDe(precisao, erros) {
  if (erros === 0 && precisao >= 99) return { id: "ouro", nome: "Ouro" };
  if (precisao >= 85) return { id: "prata", nome: "Prata" };
  return { id: "bronze", nome: "Bronze" };
}

const BASE_ACERTO = 100;
const PENALIDADE = 15;
const BONUS_MAX = 50;
const JANELA_BONUS = 20;

const TOTAL_PASSOS = MISSOES.reduce((soma, m) => soma + m.passos.length, 0);

export function criarMissoes({
  ui,
  painelVR,
  aoAtualizar,
  aoPontuar,
  aoConcluirMissao,
  aoIniciarMissao
} = {}) {
  let modo = "livre";
  let ativo = false;
  let concluido = false;

  let missaoAtual = 0;
  let passoAtual = 0;

  let pontos = 0;
  let acertos = 0;
  let erros = 0;

  let pontosMissao = 0;
  let acertosMissao = 0;
  let errosMissao = 0;

  let inicioExecucao = 0;
  let inicioMissao = 0;
  let inicioPasso = 0;
  let pausadoEm = 0;

  function agora() {
    return pausadoEm || performance.now();
  }

  function missaoCorrente() {
    return MISSOES[missaoAtual] ?? null;
  }

  function passoCorrente() {
    return missaoCorrente()?.passos[passoAtual] ?? null;
  }

  function titulo() {
    if (modo === "livre") return "Exploração livre";
    if (concluido) return `${missaoCorrente()?.titulo ?? ""} · concluído`;
    return missaoCorrente()?.titulo ?? "Todas as missões concluídas";
  }

  function textoPasso() {
    if (modo === "livre") return "Explore a oficina e experimente os comandos de cada máquina.";
    if (concluido) return "Treinamento concluído. Confira sua avaliação.";
    const passo = passoCorrente();
    return passo ? `Selecione: ${passo.alvo}` : "Treinamento concluído.";
  }

  function feitosGlobais() {
    let soma = 0;
    for (let i = 0; i < missaoAtual; i++) soma += MISSOES[i].passos.length;
    return soma + passoAtual;
  }

  function precisaoDe(a, e) {
    const total = a + e;
    return total === 0 ? 100 : Math.round((a / total) * 100);
  }

  function publicar() {
    const missao = missaoCorrente();
    // No modo livre e depois da conclusão não há passo a destacar: a HUD e o
    // indicador 3D mostram o estado de exploração, não a primeira missão.
    const passo = ativo && modo !== "livre" ? passoCorrente() : null;
    const totalMissao = missao?.passos.length ?? 0;

    if (ui) {
      ui.missao?.(`${titulo()} — ${textoPasso()}`);
      ui.placar?.(pontos, feitosGlobais(), TOTAL_PASSOS);
      ui.objetivo?.({
        modo,
        ativo,
        concluido,
        missao: titulo(),
        passo,
        feitos: passoAtual,
        total: totalMissao,
        feitosGlobais: feitosGlobais(),
        totalGlobal: TOTAL_PASSOS,
        pontos,
        acertos,
        erros,
        precisao: precisaoDe(acertos, erros)
      });
    }

    if (painelVR) {
      painelVR.definirMissao(titulo());
      painelVR.definirPlacar(`${pontos} pts · ${feitosGlobais()}/${TOTAL_PASSOS}`);
      painelVR.exibir(textoPasso());
    }

    aoAtualizar?.(passo);
  }

  function reiniciarContadoresMissao() {
    pontosMissao = 0;
    acertosMissao = 0;
    errosMissao = 0;
    inicioMissao = agora();
    inicioPasso = agora();
  }

  function estatisticasMissao() {
    const missao = missaoCorrente();
    const ultima = modo !== "campanha" || missaoAtual >= MISSOES.length - 1;
    return {
      modo,
      indice: missaoAtual,
      id: missao?.id ?? "",
      titulo: missao?.titulo ?? "",
      passos: missao?.passos.length ?? 0,
      pontos: Math.max(0, pontosMissao),
      pontosAcumulados: pontos,
      acertos: acertosMissao,
      erros: errosMissao,
      precisao: precisaoDe(acertosMissao, errosMissao),
      duracao: Math.max(0, (agora() - inicioMissao) / 1000),
      ultima,
      proxima: !ultima,
      medalha: medalhaDe(precisaoDe(acertosMissao, errosMissao), errosMissao)
    };
  }

  function estatisticasGerais() {
    return {
      modo,
      pontos,
      acertos,
      erros,
      precisao: precisaoDe(acertos, erros),
      duracao: Math.max(0, (agora() - inicioExecucao) / 1000),
      medalha: medalhaDe(precisaoDe(acertos, erros), erros)
    };
  }

  function concluirMissao() {
    concluido = true;
    ativo = false;
    publicar();
    const estatisticas = estatisticasMissao();
    estatisticas.geral = estatisticasGerais();
    aoConcluirMissao?.(estatisticas);
  }

  function avancar() {
    passoAtual += 1;

    if (passoAtual >= (missaoCorrente()?.passos.length ?? 0)) {
      concluirMissao();
      return;
    }

    inicioPasso = agora();
    publicar();
  }

  function registrar(objeto) {
    if (!ativo || concluido) return "ignorado";

    const missao = missaoCorrente();
    if (!missao) return "ignorado";

    const passo = missao.passos[passoAtual];
    const id = objeto?.userData?.idPeca;
    const nome = objeto?.userData?.nomeEquipamento;

    // Sem alvo declarado no passo, nada pode ser considerado acerto.
    const acertou = Boolean(passo.idPeca || passo.nome) &&
      (passo.idPeca ? id === passo.idPeca : nome === passo.nome);

    if (acertou) {
      const decorrido = Math.max(0, (agora() - inicioPasso) / 1000);
      const bonus = Math.round(BONUS_MAX * Math.max(0, 1 - decorrido / JANELA_BONUS));
      const ganho = BASE_ACERTO + bonus;

      pontos += ganho;
      pontosMissao += ganho;
      acertos += 1;
      acertosMissao += 1;

      aoPontuar?.({ tipo: "acerto", ganho, bonus, pontos, passo: passoAtual, total: missao.passos.length });
      avancar();
      return "acerto";
    }

    pontos = Math.max(0, pontos - PENALIDADE);
    pontosMissao -= PENALIDADE;
    erros += 1;
    errosMissao += 1;

    aoPontuar?.({ tipo: "erro", ganho: -PENALIDADE, bonus: 0, pontos, passo: passoAtual });
    publicar();
    return "erro";
  }

  function iniciar(novoModo = "treino", indice = 0) {
    modo = novoModo;

    if (modo === "livre") {
      ativo = false;
      concluido = false;
      missaoAtual = 0;
      passoAtual = 0;
      pontos = 0;
      acertos = 0;
      erros = 0;
      pontosMissao = 0;
      acertosMissao = 0;
      errosMissao = 0;
      pausadoEm = 0;
      publicar();
      return;
    }

    missaoAtual = Math.max(0, Math.min(MISSOES.length - 1, indice));
    passoAtual = 0;
    pontos = 0;
    acertos = 0;
    erros = 0;
    ativo = true;
    concluido = false;
    pausadoEm = 0;
    inicioExecucao = performance.now();
    reiniciarContadoresMissao();

    publicar();
    aoIniciarMissao?.(missaoCorrente());
  }

  function proximaMissao() {
    if (modo !== "campanha" || !concluido || missaoAtual >= MISSOES.length - 1) return false;

    missaoAtual += 1;
    passoAtual = 0;
    concluido = false;
    ativo = true;
    pausadoEm = 0;
    reiniciarContadoresMissao();

    publicar();
    aoIniciarMissao?.(missaoCorrente());
    return true;
  }

  function reiniciar() {
    iniciar(modo === "livre" ? "livre" : modo, modo === "treino" ? missaoAtual : 0);
  }

  function encerrar() {
    ativo = false;
    concluido = false;
    modo = "livre";
    pausadoEm = 0;
    publicar();
  }

  function pausar() {
    if (pausadoEm) return;
    pausadoEm = performance.now();
  }

  function retomar() {
    if (!pausadoEm) return;
    const delta = performance.now() - pausadoEm;
    inicioExecucao += delta;
    inicioMissao += delta;
    inicioPasso += delta;
    pausadoEm = 0;
  }

  publicar();

  return {
    registrar,
    iniciar,
    proximaMissao,
    reiniciar,
    reiniciarMissao: () => iniciar("treino", missaoAtual),
    encerrar,
    pausar,
    retomar,
    publicar,
    get pontos() { return pontos; },
    get acertos() { return acertos; },
    get erros() { return erros; },
    get precisao() { return precisaoDe(acertos, erros); },
    get alvoEsperado() {
      return ativo && modo !== "livre" ? passoCorrente()?.idPeca ?? null : null;
    },
    get passo() {
      return ativo && modo !== "livre" ? passoCorrente() : null;
    },
    get modo() { return modo; },
    get ativo() { return ativo; },
    get concluido() { return concluido; },
    get indiceAtual() { return missaoAtual; },
    get missaoAtual() { return missaoCorrente(); },
    get progresso() { return `${feitosGlobais()}/${TOTAL_PASSOS}`; },
    get progressoMissao() {
      return { feitos: passoAtual, total: missaoCorrente()?.passos.length ?? 0 };
    },
    get tempoSegundos() { return Math.max(0, (agora() - inicioExecucao) / 1000); },
    get nomeMissao() { return titulo(); },
    get estatisticas() { return estatisticasGerais(); },
    get totalPassos() { return TOTAL_PASSOS; },
    pertenceALinha,
    lista: MISSOES
  };
}
