// Missões de treinamento. Cada passo aponta para o `idPeca` de uma peça real
// do scene.glb (ver CATALOGO em src/maquinas.js), então a missão quebra
// visualmente se a peça for renomeada ou deixar de ser preservada na mescla —
// que é exatamente o comportamento desejado.

const MISSOES = [
  {
    id: "seguranca",
    titulo: "1 · Reconhecimento de segurança",
    passos: [
      { alvo: "Extintor de incêndio", nome: "Extintor de incêndio" },
      { alvo: "Armário de emergências", nome: "Armário de emergências" },
      { alvo: "Protetor acrílico da furadeira", idPeca: "protetor_furadeira" },
      { alvo: "Parada de emergência da CNC", idPeca: "emergencia_cnc" },
      { alvo: "Sinalizador verde do painel CLP", idPeca: "torre_clp" }
    ]
  },
  {
    id: "furadeira",
    titulo: "2 · Preparar a furadeira de coluna",
    passos: [
      { alvo: "Mesa da furadeira", idPeca: "mesa_furadeira" },
      { alvo: "Protetor acrílico da furadeira", idPeca: "protetor_furadeira" },
      { alvo: "Mandril da furadeira", idPeca: "mandril_furadeira" },
      { alvo: "Painel de comando da furadeira", idPeca: "painel_furadeira" },
      { alvo: "Botão de reset, para a broca voltar ao topo", idPeca: "botao_reset_furadeira" },
      { alvo: "Botão verde de ligação", idPeca: "botao_liga_furadeira" },
      { alvo: "Alavanca de avanço", idPeca: "alavanca_avanco" }
    ]
  },
  {
    id: "cnc",
    titulo: "3 · Montar a peça no centro de usinagem",
    passos: [
      { alvo: "Porta deslizante da CNC", idPeca: "porta_cnc" },
      { alvo: "Mesa de furos em T", idPeca: "mesa_cnc" },
      { alvo: "Ferramenta montada no cone", idPeca: "ferramenta_cnc" },
      { alvo: "Console da CNC", idPeca: "console_cnc" }
    ]
  },
  {
    id: "torno",
    titulo: "4 · Usinar no torno mecânico",
    passos: [
      { alvo: "Cabeçote do torno", idPeca: "castanho_torno" },
      { alvo: "Mandril do torno", idPeca: "mandril_torno" },
      { alvo: "Porta-ferramentas", idPeca: "torre_ferramentas_torno" },
      { alvo: "Volante do carro", idPeca: "volante_carro_torno" },
      { alvo: "Volante do contraponto", idPeca: "volante_contraponto_torno" }
    ]
  },
  {
    id: "clp",
    titulo: "5 · Energizar o painel de automação",
    passos: [
      { alvo: "Porta do painel CLP", idPeca: "porta_clp" },
      { alvo: "Disjuntor geral", idPeca: "disjuntor_clp" },
      { alvo: "Relé de segurança", idPeca: "rele_clp" },
      { alvo: "CPU do CLP", idPeca: "cpu_clp" },
      { alvo: "Interface homem-máquina", idPeca: "ihm_clp" }
    ]
  },
  {
    id: "ajustagem",
    titulo: "6 · Ajustagem na bancada",
    passos: [
      { alvo: "Morsa 1 da bancada corrida", idPeca: "morsa_bancada_1" },
      { alvo: "Lima", idPeca: "lima_bancada" },
      { alvo: "Morsa da bancada SENAI", idPeca: "morsa_bancada_senai" },
      { alvo: "Paquímetro", idPeca: "paquimetro_ajustagem" },
      { alvo: "Alavanca da prensa", idPeca: "alavanca_prensa" }
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

export function criarMissoes({ ui, painelVR, aoAtualizar }) {
  let missaoAtual = 0;
  let passoAtual = 0;
  let pontos = 0;

  const totalPassos = MISSOES.reduce((soma, m) => soma + m.passos.length, 0);
  let feitos = 0;

  function passoCorrente() {
    return MISSOES[missaoAtual]?.passos[passoAtual] ?? null;
  }

  function titulo() {
    return MISSOES[missaoAtual]?.titulo ?? "Todas as missões concluídas";
  }

  function textoPasso() {
    const passo = passoCorrente();
    return passo ? `Selecione: ${passo.alvo}` : "Simulação concluída.";
  }

  function publicar() {
    ui.missao?.(`${titulo()} — ${textoPasso()}`);
    ui.placar?.(pontos, feitos, totalPassos);
    painelVR?.definirMissao(`${titulo()}`);
    painelVR?.definirPlacar(`${pontos} pts · ${feitos}/${totalPassos}`);
    painelVR?.exibir(textoPasso());
    aoAtualizar?.(passoCorrente());
  }

  function avancar() {
    passoAtual += 1;
    if (passoAtual >= MISSOES[missaoAtual].passos.length) {
      passoAtual = 0;
      missaoAtual += 1;
      ui.mensagem(`Missão concluída: ${MISSOES[missaoAtual - 1].titulo}`, 4200);
    }
  }

  // Retorna 'acerto' | 'erro' | 'ignorado' para o chamador dar o feedback.
  function registrar(objeto) {
    const missao = MISSOES[missaoAtual];
    if (!missao) return "ignorado";

    const passo = missao.passos[passoAtual];
    const id = objeto?.userData?.idPeca;
    const nome = objeto?.userData?.nomeEquipamento;

    // Sem alvo declarado no passo, nada pode ser considerado acerto.
    const acertou = Boolean(passo.idPeca || passo.nome) &&
      (passo.idPeca ? id === passo.idPeca : nome === passo.nome);

    if (acertou) {
      pontos += 100;
      feitos += 1;
      avancar();
      publicar();
      return "acerto";
    }

    pontos = Math.max(0, pontos - 15);
    publicar();
    return "erro";
  }

  function reiniciar() {
    missaoAtual = 0;
    passoAtual = 0;
    pontos = 0;
    feitos = 0;
    publicar();
  }

  publicar();

  return {
    registrar,
    reiniciar,
    publicar,
    get pontos() { return pontos; },
    get alvoEsperado() { return passoCorrente()?.idPeca ?? null; },
    get passo() { return passoCorrente(); },
    get progresso() { return `${feitos}/${totalPassos}`; },
    get nomeMissao() { return titulo(); },
    pertenceALinha,
    lista: MISSOES
  };
}
