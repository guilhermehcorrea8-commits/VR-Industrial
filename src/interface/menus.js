// Telas de jogo: menu principal, seleção de treinamento, briefing, avaliação,
// pausa e configurações. O módulo cuida só do DOM e do fluxo; iniciar de fato
// a simulação, pausar o loop e aplicar qualidade são callbacks do main.js.
//
// Recordes e ajustes ficam no localStorage — o aluno fecha o navegador e
// reencontra medalhas e preferências na próxima sessão.

const CHAVE_CONFIG = "oficinaVR.config.v1";
const CHAVE_MELHORES = "oficinaVR.melhores.v1";

const CONFIG_PADRAO = {
  volume: 0.7,
  sensibilidade: 1,
  sombras: true,
  qualidade: "alta",
  mudo: false
};

function lerJSON(chave, padrao) {
  try {
    const texto = localStorage.getItem(chave);
    if (!texto) return padrao;
    return { ...padrao, ...JSON.parse(texto) };
  } catch {
    return padrao;
  }
}

function salvarJSON(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Modo privado pode bloquear o armazenamento; o jogo segue sem recordes.
  }
}

function formatarTempo(segundos) {
  const total = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return minutos > 0 ? `${minutos}m ${String(resto).padStart(2, "0")}s` : `${resto}s`;
}

export function criarMenus({
  missoes,
  audio,
  aoIniciarModo,
  aoPausar,
  aoRetomar,
  aoReiniciar,
  aoProximaMissao,
  aoSair,
  aoAplicarConfig
} = {}) {
  const $ = (seletor) => document.querySelector(seletor);

  const el = {
    telas: [...document.querySelectorAll(".screen")],
    menuProgresso: $("#menu-progresso"),
    listaTreinos: $("#lista-treinos"),

    briefingEtapa: $("#briefing-etapa"),
    briefingTitulo: $("#briefing-titulo"),
    briefingObjetivo: $("#briefing-objetivo"),
    briefingTexto: $("#briefing-texto"),
    briefingPassos: $("#briefing-passos"),
    briefingDica: $("#briefing-dica"),
    btnBriefingIniciar: $("#btn-briefing-iniciar"),

    avalMedalha: $("#aval-medalha"),
    avalTitulo: $("#aval-titulo"),
    avalPontos: $("#aval-pontos"),
    avalAcertos: $("#aval-acertos"),
    avalErros: $("#aval-erros"),
    avalPrecisao: $("#aval-precisao"),
    avalTempo: $("#aval-tempo"),
    avalMelhor: $("#aval-melhor"),
    btnAvalProximo: $("#btn-aval-proximo"),

    confVolume: $("#conf-volume"),
    confVolumeValor: $("#conf-volume-valor"),
    confSensibilidade: $("#conf-sensibilidade"),
    confSensibilidadeValor: $("#conf-sensibilidade-valor"),
    confSombras: $("#conf-sombras"),
    confQualidade: $("#conf-qualidade"),
    confMudo: $("#conf-mudo"),

    pausaReiniciar: $("#btn-pausa-reiniciar"),
    pausaBtn: $("#btn-pausa")
  };

  let config = lerJSON(CHAVE_CONFIG, CONFIG_PADRAO);
  let tela = "nenhuma";
  let pausado = false;
  let emJogo = false;
  let configOrigem = "menu";
  let pendente = { indice: 0, modo: "treino" };
  let ultimaAvaliacao = null;

  function mostrar(nome) {
    for (const secao of el.telas) secao.classList.add("hidden");

    const alvo = nome ? $(`#screen-${nome}`) : null;
    if (alvo) alvo.classList.remove("hidden");

    tela = alvo ? nome : "nenhuma";
    document.body.classList.toggle("em-menu", Boolean(alvo));
    // O CSS usa este atributo para manter o botão de VR visível só no menu.
    document.body.dataset.tela = tela;
  }

  // ---------- RECORDES ----------

  function lerMelhores() {
    return lerJSON(CHAVE_MELHORES, {});
  }

  function salvarMelhor(chave, registro) {
    const melhores = lerMelhores();
    const atual = melhores[chave];

    const melhorou = !atual ||
      registro.pontos > atual.pontos ||
      (registro.pontos === atual.pontos && registro.precisao > atual.precisao);

    if (melhorou) {
      melhores[chave] = registro;
      salvarJSON(CHAVE_MELHORES, melhores);
    }

    return {
      novo: melhorou,
      recorde: melhorou ? registro : atual
    };
  }

  function atualizarMenuStats() {
    if (!el.menuProgresso || !missoes) return;

    const melhores = lerMelhores();
    const concluidos = missoes.lista.filter((missao) => melhores[missao.id]).length;
    el.menuProgresso.textContent =
      `${concluidos}/${missoes.lista.length} treinamentos concluídos` +
      (melhores.tour ? ` · tour completo: ${melhores.tour.pontos} pts` : "");
  }

  // ---------- SELETOR DE TREINAMENTO ----------

  function renderTreinos() {
    if (!el.listaTreinos || !missoes) return;

    const melhores = lerMelhores();
    el.listaTreinos.innerHTML = "";

    missoes.lista.forEach((missao, indice) => {
      const recorde = melhores[missao.id];

      const card = document.createElement("button");
      card.type = "button";
      card.className = "treino-card";
      card.dataset.indice = String(indice);

      const numero = document.createElement("span");
      numero.className = "treino-num";
      numero.textContent = String(indice + 1).padStart(2, "0");

      const corpo = document.createElement("span");
      corpo.className = "treino-corpo";

      const titulo = document.createElement("strong");
      titulo.textContent = missao.titulo;

      const resumo = document.createElement("small");
      resumo.textContent = missao.resumo;

      corpo.append(titulo, resumo);

      const meta = document.createElement("span");
      meta.className = "treino-meta";

      const passos = document.createElement("b");
      passos.textContent = `${missao.passos.length} passos`;

      const status = document.createElement("em");
      if (recorde) {
        status.className = `medal-${recorde.medalha}`;
        status.textContent = `${recorde.medalha.toUpperCase()} · ${recorde.pontos} pts`;
      } else {
        status.textContent = "não concluído";
      }

      meta.append(passos, status);
      card.append(numero, corpo, meta);

      card.addEventListener("click", () => {
        audio?.iniciar?.();
        audio?.clique?.();
        abrirBriefing(indice, "treino");
      });

      el.listaTreinos.appendChild(card);
    });
  }

  // ---------- BRIEFING ----------

  function abrirBriefing(indice, modo = "treino") {
    const missao = missoes?.lista?.[indice];
    if (!missao) return;

    pendente = { indice, modo };

    if (el.briefingEtapa) {
      el.briefingEtapa.textContent = modo === "campanha"
        ? `TOUR COMPLETO · ETAPA ${indice + 1} DE ${missoes.lista.length}`
        : `MÓDULO ${indice + 1} DE ${missoes.lista.length}`;
    }
    if (el.briefingTitulo) el.briefingTitulo.textContent = missao.titulo;
    if (el.briefingObjetivo) el.briefingObjetivo.textContent = missao.objetivo;
    if (el.briefingTexto) el.briefingTexto.textContent = missao.briefing;

    if (el.briefingPassos) {
      el.briefingPassos.innerHTML = "";
      missao.passos.forEach((passo, passoIndice) => {
        const item = document.createElement("li");

        const numero = document.createElement("b");
        numero.textContent = String(passoIndice + 1).padStart(2, "0");

        const texto = document.createElement("span");
        texto.textContent = passo.alvo;

        const dica = document.createElement("small");
        dica.textContent = passo.dica ?? "";

        item.append(numero, texto, dica);
        el.briefingPassos.appendChild(item);
      });
    }

    if (el.briefingDica) el.briefingDica.textContent = missao.passos[0]?.dica ?? "";

    if (el.btnBriefingIniciar) {
      el.btnBriefingIniciar.textContent = modo === "campanha"
        ? (indice === 0 ? "INICIAR TOUR COMPLETO" : "INICIAR ESTA ETAPA")
        : "INICIAR TREINAMENTO";
    }

    mostrar("briefing");
  }

  // ---------- AVALIAÇÃO ----------

  function abrirAvaliacao(estatisticas) {
    if (!estatisticas) return;
    ultimaAvaliacao = estatisticas;

    const geral = estatisticas.modo === "campanha" && estatisticas.ultima
      ? estatisticas.geral
      : null;
    const dados = geral ?? estatisticas;

    if (el.avalMedalha) {
      el.avalMedalha.className = `medal ${dados.medalha.id}`;
      el.avalMedalha.textContent = dados.medalha.nome.toUpperCase();
    }
    if (el.avalTitulo) {
      el.avalTitulo.textContent = geral ? "Tour completo concluído" : estatisticas.titulo;
    }
    if (el.avalPontos) el.avalPontos.textContent = String(dados.pontos);
    if (el.avalAcertos) el.avalAcertos.textContent = String(dados.acertos);
    if (el.avalErros) el.avalErros.textContent = String(dados.erros);
    if (el.avalPrecisao) el.avalPrecisao.textContent = `${dados.precisao}%`;
    if (el.avalTempo) el.avalTempo.textContent = formatarTempo(dados.duracao);

    const chave = geral ? "tour" : estatisticas.id;
    const resultado = salvarMelhor(chave, {
      pontos: dados.pontos,
      precisao: dados.precisao,
      medalha: dados.medalha.id,
      duracao: dados.duracao,
      data: Date.now()
    });

    // A última etapa do tour também é um treinamento: guardar o recorde dela
    // mantém a lista de treinos e a contagem do menu completas.
    if (geral) {
      salvarMelhor(estatisticas.id, {
        pontos: estatisticas.pontos,
        precisao: estatisticas.precisao,
        medalha: estatisticas.medalha.id,
        duracao: estatisticas.duracao,
        data: Date.now()
      });
    }

    if (el.avalMelhor) {
      const recorde = resultado.recorde;
      el.avalMelhor.textContent = resultado.novo
        ? "Novo recorde pessoal!"
        : recorde
          ? `Recorde: ${recorde.pontos} pts · ${recorde.medalha}`
          : "";
      el.avalMelhor.classList.toggle("recorde", resultado.novo);
    }

    if (el.btnAvalProximo) {
      if (estatisticas.modo === "campanha" && estatisticas.proxima) {
        el.btnAvalProximo.textContent = "PRÓXIMA ETAPA";
        el.btnAvalProximo.hidden = false;
      } else if (estatisticas.modo === "campanha") {
        el.btnAvalProximo.textContent = "VOLTAR AO MENU";
        el.btnAvalProximo.hidden = false;
      } else {
        el.btnAvalProximo.textContent = "ESCOLHER TREINO";
        el.btnAvalProximo.hidden = false;
      }
    }

    mostrar("avaliacao");
  }

  // ---------- FLUXO DE JOGO ----------

  function iniciarModo(modo, indice) {
    audio?.iniciar?.();
    audio?.clique?.();

    emJogo = true;
    pausado = false;
    mostrar(null);
    aoIniciarModo?.(modo, indice);
  }

  function iniciarPendente() {
    iniciarModo(pendente.modo, pendente.indice);
  }

  function abrirPausa() {
    if (!emJogo || tela !== "nenhuma") return;

    audio?.clique?.();
    pausado = true;
    aoPausar?.();

    if (el.pausaReiniciar) {
      el.pausaReiniciar.hidden = missoes?.modo === "livre";
    }

    mostrar("pausa");
  }

  function continuar() {
    if (tela !== "pausa") return;

    pausado = false;
    mostrar(null);
    aoRetomar?.();
  }

  function sairParaMenu() {
    pausado = false;
    emJogo = false;
    mostrar(null);
    aoSair?.();
    atualizarMenuStats();
    mostrar("menu");
  }

  function repetirAvaliacao() {
    if (!ultimaAvaliacao) return;
    iniciarModo(ultimaAvaliacao.modo, ultimaAvaliacao.indice);
  }

  function avancarAvaliacao() {
    if (!ultimaAvaliacao) return;

    const estatisticas = ultimaAvaliacao;

    if (estatisticas.modo === "campanha" && estatisticas.proxima) {
      pausado = false;
      emJogo = true;
      mostrar(null);

      if (!aoProximaMissao?.()) sairParaMenu();
      return;
    }

    aoSair?.();
    emJogo = false;
    pausado = false;

    if (estatisticas.modo === "campanha") {
      sairParaMenu();
      return;
    }

    renderTreinos();
    mostrar("treinos");
  }

  // ---------- CONFIGURAÇÕES ----------

  function preencherConfig() {
    if (el.confVolume) {
      el.confVolume.value = String(Math.round(config.volume * 100));
      if (el.confVolumeValor) el.confVolumeValor.textContent = `${Math.round(config.volume * 100)}%`;
    }
    if (el.confSensibilidade) {
      el.confSensibilidade.value = String(Math.round(config.sensibilidade * 100));
      if (el.confSensibilidadeValor) {
        el.confSensibilidadeValor.textContent = `${Math.round(config.sensibilidade * 100)}%`;
      }
    }
    if (el.confSombras) el.confSombras.checked = Boolean(config.sombras);
    if (el.confQualidade) el.confQualidade.value = config.qualidade;
    if (el.confMudo) el.confMudo.checked = Boolean(config.mudo);
  }

  function aplicarConfig() {
    salvarJSON(CHAVE_CONFIG, config);
    aoAplicarConfig?.(config);
  }

  function abrirConfig(origem) {
    configOrigem = origem;
    preencherConfig();
    mostrar("config");
  }

  function fecharConfig() {
    aplicarConfig();
    mostrar(configOrigem === "pausa" ? "pausa" : "menu");
    if (configOrigem === "menu") atualizarMenuStats();
  }

  // ---------- EVENTOS DE DOM ----------

  $("#btn-treinos")?.addEventListener("click", () => {
    audio?.iniciar?.();
    audio?.clique?.();
    renderTreinos();
    mostrar("treinos");
  });

  $("#btn-tour")?.addEventListener("click", () => {
    audio?.iniciar?.();
    audio?.clique?.();
    abrirBriefing(0, "campanha");
  });

  $("#btn-livre")?.addEventListener("click", () => {
    audio?.iniciar?.();
    iniciarModo("livre", 0);
  });

  $("#btn-config")?.addEventListener("click", () => {
    audio?.iniciar?.();
    audio?.clique?.();
    abrirConfig("menu");
  });

  $("#btn-treinos-voltar")?.addEventListener("click", () => {
    audio?.clique?.();
    atualizarMenuStats();
    mostrar("menu");
  });

  $("#btn-tour-select")?.addEventListener("click", () => {
    audio?.clique?.();
    abrirBriefing(0, "campanha");
  });

  el.btnBriefingIniciar?.addEventListener("click", iniciarPendente);

  $("#btn-briefing-voltar")?.addEventListener("click", () => {
    audio?.clique?.();
    renderTreinos();
    mostrar("treinos");
  });

  $("#btn-aval-repetir")?.addEventListener("click", repetirAvaliacao);
  el.btnAvalProximo?.addEventListener("click", avancarAvaliacao);
  $("#btn-aval-menu")?.addEventListener("click", () => {
    audio?.clique?.();
    sairParaMenu();
  });

  $("#btn-pausa-continuar")?.addEventListener("click", continuar);
  el.pausaReiniciar?.addEventListener("click", () => {
    pausado = false;
    emJogo = true;
    mostrar(null);
    aoReiniciar?.();
  });

  $("#btn-pausa-treinos")?.addEventListener("click", () => {
    aoSair?.();
    emJogo = false;
    pausado = false;
    renderTreinos();
    mostrar("treinos");
  });

  $("#btn-pausa-config")?.addEventListener("click", () => abrirConfig("pausa"));
  $("#btn-pausa-menu")?.addEventListener("click", sairParaMenu);
  el.pausaBtn?.addEventListener("click", abrirPausa);

  $("#btn-conf-fechar")?.addEventListener("click", fecharConfig);

  $("#btn-conf-tela")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });

  el.confVolume?.addEventListener("input", () => {
    config.volume = Number(el.confVolume.value) / 100;
    if (el.confVolumeValor) el.confVolumeValor.textContent = `${el.confVolume.value}%`;
    audio?.definirVolume?.(config.volume);
    salvarJSON(CHAVE_CONFIG, config);
  });

  el.confSensibilidade?.addEventListener("input", () => {
    config.sensibilidade = Number(el.confSensibilidade.value) / 100;
    if (el.confSensibilidadeValor) {
      el.confSensibilidadeValor.textContent = `${el.confSensibilidade.value}%`;
    }
    aoAplicarConfig?.(config);
  });

  el.confSombras?.addEventListener("change", () => {
    config.sombras = el.confSombras.checked;
    aplicarConfig();
  });

  el.confQualidade?.addEventListener("change", () => {
    config.qualidade = el.confQualidade.value;
    aplicarConfig();
  });

  el.confMudo?.addEventListener("change", () => {
    config.mudo = el.confMudo.checked;
    audio?.ligarMudo?.(config.mudo);
    aplicarConfig();
  });

  // ESC fecha pausa/config e abre pausa durante o jogo. P é o atalho alternativo.
  window.addEventListener("keydown", (evento) => {
    const tecla = evento.key.toLowerCase();

    if (tecla === "escape") {
      if (tela === "pausa") {
        evento.preventDefault();
        continuar();
      } else if (tela === "config") {
        evento.preventDefault();
        fecharConfig();
      } else if (tela === "nenhuma" && emJogo) {
        evento.preventDefault();
        abrirPausa();
      }
      return;
    }

    if (tecla === "p" && tela === "nenhuma" && emJogo) {
      evento.preventDefault();
      abrirPausa();
    }
  });

  // Estado inicial das telas: menu visível assim que o carregamento terminar.
  preencherConfig();
  atualizarMenuStats();
  mostrar("menu");

  return {
    abrirMenuPrincipal: sairParaMenu,
    abrirSelecao: () => {
      renderTreinos();
      mostrar("treinos");
    },
    abrirBriefing,
    abrirAvaliacao,
    abrirPausa,
    continuar,
    esconder: () => mostrar(null),
    marcarEmJogo: (valor) => { emJogo = Boolean(valor); },
    get pausado() { return pausado; },
    get emJogo() { return emJogo; },
    get tela() { return tela; },
    get config() { return { ...config }; }
  };
}
