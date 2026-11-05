import { NOS_DE_ANIMACAO } from "./rigs.data.js";

// Comportamento de cada máquina.
//
// Cada handler recebe a instância criada por src/interacoes.js e devolve uma
// frase curta para o HUD (ou null). O handler também atualiza `inst.estado`,
// emite a ação semântica com `inst.animar`/`inst.animarLoop` e mantém as luzes
// de sinalização. Nada aqui conhece clipe, mixer ou arquivo de animação: a
// ponte decide entre o clipe futuro e o movimento provisório do rig.
//
// `NOS_DE_ANIMACAO` fica importado só como documentação executável do contrato:
// os grupos abaixo são os mesmos que o manifesto pode animar.

void NOS_DE_ANIMACAO;

function luz(inst, idPeca, ativo, cor = "verde") {
  inst.luz(idPeca, ativo ? cor : "apagado");
}

const AVISOS = {
  peca: "Não possui a peça necessária",
  indisponivel: "Não é possível interagir agora"
};

// O detalhe fica no console para depuração; no HUD, toda recusa usa uma das
// duas frases padronizadas.
function bloqueado(detalhe, tipo = "indisponivel") {
  console.debug(`[interação bloqueada] ${detalhe}`);
  return AVISOS[tipo];
}

function resumoMorsa(inst, chave) {
  return inst.estado.morsas[chave] ? "fixada" : "solta";
}

// --------------------------------------------------------------------------
// CENTRO DE USINAGEM CNC
// --------------------------------------------------------------------------

const cnc = {
  estadoInicial: () => ({
    porta: false,
    peca: false,
    ciclo: false,
    emergencia: false
  }),

  iniciar(inst) {
    inst.animar("fechar_porta", ["porta_esquerda", "porta_direita"], 0);
    inst.animarLoop("ciclo_cnc", ["arvore"], 0);
    inst.luz("torre_cnc", "verde");
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (e.emergencia) return "emergência acionada";
    if (idPeca === "porta_cnc") return e.porta ? "proteção aberta" : "proteção fechada";
    if (idPeca === "mesa_cnc") return e.peca ? "peça fixada" : "mesa livre";
    if (idPeca === "console_cnc") return e.ciclo ? "ciclo em andamento" : "ciclo parado";
    if (idPeca === "torre_cnc") return e.ciclo ? "ciclo em andamento" : "máquina pronta";
    return null;
  },

  pecas: {
    porta_cnc(inst) {
      if (inst.estado.ciclo) return bloqueado("Pare o ciclo antes de abrir a proteção");

      inst.estado.porta = !inst.estado.porta;
      inst.animar(
        inst.estado.porta ? "abrir_porta" : "fechar_porta",
        ["porta_esquerda", "porta_direita"],
        inst.estado.porta ? 1 : 0
      );

      return inst.estado.porta
        ? "Proteção aberta — mesa liberada"
        : "Proteção fechada — ciclo protegido";
    },

    mesa_cnc(inst) {
      inst.estado.peca = !inst.estado.peca;
      inst.animar(inst.estado.peca ? "peca_fixar" : "peca_soltar");
      return inst.estado.peca
        ? "Peça fixada na mesa da CNC"
        : "Peça solta — mesa livre";
    },

    console_cnc(inst) {
      const e = inst.estado;

      if (e.emergencia) return bloqueado("Emergência acionada — rearme antes de iniciar");
      if (e.porta) return bloqueado("Feche a porta deslizante para iniciar o ciclo");
      if (!e.peca) return bloqueado("Peça não fixada na mesa da CNC", "peca");

      e.ciclo = !e.ciclo;
      return e.ciclo
        ? "Ciclo iniciado — árvore em rotação"
        : "Ciclo interrompido — árvore parada";
    },

    ferramenta_cnc(inst) {
      if (!inst.estado.porta) return bloqueado("Abra a proteção para alcançar o cone");
      return "Ferramenta no cone: fresa de topo";
    },

    arvore_cnc(inst) {
      if (inst.estado.emergencia) return "Árvore parada por emergência";
      return inst.estado.ciclo
        ? "Árvore de usinagem em rotação"
        : "Árvore de usinagem parada";
    },

    emergencia_cnc(inst) {
      inst.estado.emergencia = !inst.estado.emergencia;

      if (inst.estado.emergencia) {
        inst.estado.ciclo = false;
        inst.animar("emergencia_acionar");
        return "Emergência acionada — ciclo interrompido";
      }

      inst.animar("emergencia_liberar");
      return "Emergência rearmada — máquina pronta";
    },

    torre_cnc(inst) {
      if (inst.estado.emergencia) return "Sinalizador apagado — emergência ativa";
      return inst.estado.ciclo
        ? "Sinalizador verde — ciclo em andamento"
        : "Sinalizador verde — máquina pronta";
    }
  },

  atualizar(inst) {
    const e = inst.estado;

    if (e.emergencia) {
      inst.luz("torre_cnc", "apagado");
    } else if (e.ciclo) {
      inst.luz("torre_cnc", Math.floor(inst.tempo * 2) % 2 === 0 ? "verde" : "apagado", 2);
    } else {
      inst.luz("torre_cnc", "verde");
    }

    inst.animarLoop("ciclo_cnc", ["arvore"], e.ciclo && !e.emergencia ? 9 : 0);
  }
};

// --------------------------------------------------------------------------
// TORNO MECÂNICO
// --------------------------------------------------------------------------

const torno = {
  estadoInicial: () => ({
    girando: false,
    mandril: false,
    protetorAbaixado: false,
    ferramenta: false,
    carro: 0,
    contraponto: 0,
    emergencia: false
  }),

  iniciar(inst) {
    inst.animarLoop("giro_torno", ["mandril"], 0);
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (e.emergencia) return "emergência acionada";
    if (idPeca === "castanho_torno") return e.girando ? "cabeçote em rotação" : "cabeçote parado";
    if (idPeca === "mandril_torno") return e.mandril ? "peça presa" : "mandril livre";
    if (idPeca === "protetor_torno") return e.protetorAbaixado ? "proteção baixada" : "proteção levantada";
    if (idPeca === "torre_ferramentas_torno") return e.ferramenta ? "ferramenta posicionada" : "ferramenta recolhida";
    if (idPeca === "volante_carro_torno") return `carro ${e.carro}/3`;
    if (idPeca === "volante_contraponto_torno") return `contraponto ${e.contraponto}/3`;
    return e.girando ? "torno em rotação" : "torno parado";
  },

  pecas: {
    liga_torno(inst) {
      const e = inst.estado;

      if (e.emergencia) return bloqueado("Emergência acionada — libere antes de ligar");
      if (!e.mandril) return bloqueado("Peça não presa no mandril", "peca");
      if (!e.protetorAbaixado) return bloqueado("Baixe o protetor do mandril antes de ligar");
      if (e.girando) return bloqueado("O torno já está girando");

      e.girando = true;
      return "Torno ligado — mandril em rotação";
    },

    desliga_torno(inst) {
      if (!inst.estado.girando) return bloqueado("O torno já está parado");
      inst.estado.girando = false;
      return "Torno parado";
    },

    painel_torno(inst) {
      if (inst.estado.emergencia) return "Comando bloqueado pela emergência";
      return inst.estado.girando ? "Comando em operação" : "Comando pronto";
    },

    castanho_torno(inst) {
      return inst.estado.girando
        ? "Cabeçote girando — não aproxime as mãos"
        : "Cabeçote fixo e parado";
    },

    mandril_torno(inst) {
      const e = inst.estado;
      if (e.girando) return bloqueado("Desligue o torno antes de abrir o mandril");

      e.mandril = !e.mandril;
      inst.animar(e.mandril ? "mandril_apertar" : "mandril_soltar");
      return e.mandril ? "Peça apertada no mandril" : "Mandril aberto — peça solta";
    },

    protetor_torno(inst) {
      const e = inst.estado;
      if (e.girando) return bloqueado("Desligue o torno antes de levantar a proteção");

      e.protetorAbaixado = !e.protetorAbaixado;
      inst.animar(
        e.protetorAbaixado ? "protetor_abaixar" : "protetor_levantar",
        "protetor",
        e.protetorAbaixado ? 0 : 1
      );

      return e.protetorAbaixado
        ? "Proteção do mandril baixada"
        : "Proteção do mandril levantada";
    },

    torre_ferramentas_torno(inst) {
      const e = inst.estado;
      if (e.girando) return bloqueado("Desligue o torno antes de posicionar a ferramenta");

      e.ferramenta = !e.ferramenta;
      inst.animar(e.ferramenta ? "ferramenta_posicionar" : "ferramenta_recolher");
      return e.ferramenta
        ? "Ferramenta de corte posicionada"
        : "Porta-ferramentas recolhido";
    },

    volante_carro_torno(inst) {
      const e = inst.estado;
      if (e.emergencia) return bloqueado("Emergência acionada — libere antes de avançar");
      if (e.girando) return bloqueado("Desligue o torno para avançar o carro");

      e.carro = (e.carro + 1) % 4;
      const fracao = e.carro / 3;
      inst.animar(e.carro === 0 ? "carro_recuar" : "carro_avancar", "carro", fracao);

      return e.carro === 0
        ? "Carro recuado ao início do curso"
        : `Carro avançado (${e.carro}/3)`;
    },

    volante_contraponto_torno(inst) {
      const e = inst.estado;
      if (e.emergencia) return bloqueado("Emergência acionada — libere antes de avançar");
      if (e.girando) return bloqueado("Desligue o torno para avançar o contraponto");

      e.contraponto = (e.contraponto + 1) % 4;
      const fracao = e.contraponto / 3;
      inst.animar(
        e.contraponto === 0 ? "contraponto_recuar" : "contraponto_avancar",
        ["contraponto", "volante_contraponto"],
        fracao
      );

      return e.contraponto === 0
        ? "Contraponto recuado ao início do curso"
        : `Contraponto avançado (${e.contraponto}/3)`;
    },

    emergencia_torno(inst) {
      inst.estado.emergencia = !inst.estado.emergencia;

      if (inst.estado.emergencia) {
        inst.estado.girando = false;
        inst.animar("emergencia_acionar");
        return "Emergência acionada — torno parado";
      }

      inst.animar("emergencia_liberar");
      return "Emergência rearmada — torno liberado";
    }
  },

  atualizar(inst) {
    inst.animarLoop("giro_torno", ["mandril"], inst.estado.girando ? 11 : 0);
  }
};

// --------------------------------------------------------------------------
// ESTEIRA TRANSPORTADORA
// --------------------------------------------------------------------------

const esteira = {
  estadoInicial: () => ({
    motor: false,
    sensor: false,
    emergencia: false
  }),

  iniciar(inst) {
    inst.luz("torre_esteira", "apagado");
    inst.animarLoop("esteira_rodando", [], 0);
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (e.emergencia) return "emergência acionada";
    if (idPeca === "motor_esteira") return e.motor ? "motor em operação" : "motor parado";
    if (idPeca === "correia_esteira") return e.motor ? "correia em movimento" : "correia parada";
    if (idPeca === "sensor_esteira") return e.sensor ? "feixe interrompido" : "feixe livre";
    if (idPeca === "torre_esteira") return e.motor ? "esteira liberada" : "esteira parada";
    return null;
  },

  pecas: {
    liga_esteira(inst) {
      const e = inst.estado;

      if (e.emergencia) return bloqueado("Emergência acionada — libere antes de partir");
      if (e.sensor) return bloqueado("Sensor obstruído — libere a passagem");
      if (e.motor) return bloqueado("O motor já está em operação");

      e.motor = true;
      inst.animar("motor_ligar");
      return "Esteira ligada — correia em movimento";
    },

    desliga_esteira(inst) {
      if (!inst.estado.motor) return bloqueado("A esteira já está parada");
      inst.estado.motor = false;
      inst.animar("motor_desligar");
      return "Esteira parada";
    },

    motor_esteira(inst) {
      const e = inst.estado;

      if (e.emergencia) return bloqueado("Emergência acionada — libere antes de partir");
      if (!e.motor && e.sensor) return bloqueado("Sensor obstruído — libere a passagem");

      e.motor = !e.motor;
      inst.animar(e.motor ? "motor_ligar" : "motor_desligar");
      return e.motor
        ? "Motor ligado — esteira em movimento"
        : "Motor desligado — esteira parada";
    },

    correia_esteira(inst) {
      return inst.estado.motor
        ? bloqueado("Pare o motor para inspecionar a correia")
        : "Correia tensionada e alinhada";
    },

    rolete_esteira(inst) {
      return inst.estado.motor
        ? "Rolete motriz em operação"
        : "Rolete motriz livre — inspeção ok";
    },

    redutor_esteira(inst) {
      return inst.estado.motor
        ? "Redutor em operação — sem ruído anormal"
        : "Nível de óleo do redutor conferido";
    },

    sensor_esteira(inst) {
      const e = inst.estado;
      e.sensor = !e.sensor;
      inst.animar(e.sensor ? "sensor_bloquear" : "sensor_liberar");

      if (e.sensor && e.motor) {
        e.motor = false;
        return "Sensor obstruído — a esteira parou por segurança";
      }

      return e.sensor
        ? "Sensor obstruído — feixe interrompido"
        : "Sensor livre — feixe restabelecido";
    },

    emergencia_esteira(inst) {
      const e = inst.estado;
      e.emergencia = !e.emergencia;

      if (e.emergencia) {
        e.motor = false;
        inst.animar("emergencia_acionar");
        return "Emergência acionada — esteira parada";
      }

      inst.animar("emergencia_liberar");
      return "Emergência rearmada — esteira liberada";
    },

    torre_esteira(inst) {
      if (inst.estado.emergencia) return "Sinalizador apagado — emergência ativa";
      return inst.estado.motor
        ? "Sinalizador verde — esteira em operação"
        : "Sinalizador apagado — esteira parada";
    }
  },

  atualizar(inst) {
    const e = inst.estado;

    if (e.emergencia) {
      inst.luz("torre_esteira", "apagado");
    } else {
      inst.luz("torre_esteira", e.motor ? "verde" : "apagado");
    }

    inst.animarLoop("esteira_rodando", [], e.motor && !e.emergencia ? 1 : 0);
  }
};

// --------------------------------------------------------------------------
// FURADEIRA DE COLUNA
// --------------------------------------------------------------------------

const furadeira = {
  estadoInicial: () => ({
    ligada: false,
    tampa: false,
    mesaAlta: false
  }),

  iniciar(inst) {
    inst.furadeira?.definirMotor(false);
    inst.luz("luz_furadeira", "apagado");
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (idPeca === "painel_furadeira") return e.ligada ? "comando ligado" : "comando desligado";
    if (idPeca === "tampa_correia") return e.tampa ? "tampa aberta" : "tampa fechada";
    if (idPeca === "mesa_furadeira") return e.mesaAlta ? "mesa alta" : "mesa baixa";
    if (idPeca === "luz_furadeira") return e.ligada ? "luz acesa" : "luz apagada";
    return e.ligada ? "motor ligado" : "motor parado";
  },

  pecas: {
    painel_furadeira(inst) {
      return furadeira.pecas.liga_furadeira(inst);
    },

    liga_furadeira(inst) {
      const e = inst.estado;

      if (e.ligada) return bloqueado("A furadeira já está ligada");
      if (e.tampa) return bloqueado("Feche a tampa da correia antes de ligar");

      e.ligada = true;
      const tocou = inst.animar("ligar_motor");
      inst.furadeira?.definirMotor(true, { visual: !tocou });
      inst.luz("luz_furadeira", "verde");
      return "Furadeira ligada — mandril em rotação";
    },

    desliga_furadeira(inst) {
      const e = inst.estado;
      if (!e.ligada) return bloqueado("A furadeira já está desligada");

      e.ligada = false;
      const tocou = inst.animar("desligar_motor");
      inst.furadeira?.definirMotor(false, { visual: !tocou });
      inst.luz("luz_furadeira", "apagado");
      return "Furadeira desligada";
    },

    reset_furadeira(inst) {
      inst.animar("reset_comando");
      return inst.estado.ligada
        ? "Comando restabelecido — motor segue ligado"
        : "Comando restabelecido — máquina pronta";
    },

    alavanca_avanco(inst, alvo) {
      const e = inst.estado;

      if (e.tampa) return bloqueado("Feche a tampa da correia antes de avançar");

      const tocou = inst.animar("avancar_alavanca");
      const resposta = inst.furadeira?.acionar(alvo, { visual: !tocou }) ?? "Mecanismo de avanço indisponível";
      return e.ligada ? resposta : `Motor desligado — ${resposta}`;
    },

    tampa_correia(inst) {
      const e = inst.estado;
      if (e.ligada) return bloqueado("Desligue o motor antes de abrir a tampa da correia");

      e.tampa = !e.tampa;
      inst.animar(e.tampa ? "tampa_abrir" : "tampa_fechar");
      return e.tampa
        ? "Tampa da correia aberta — escolha a rotação"
        : "Tampa da correia fechada";
    },

    mesa_furadeira(inst) {
      const e = inst.estado;
      e.mesaAlta = !e.mesaAlta;
      const tocou = inst.animar("mesa_ajustar");
      inst.furadeira?.ajustarMesa(e.mesaAlta, { visual: !tocou });
      return e.mesaAlta
        ? "Mesa elevada para peça baixa"
        : "Mesa baixa para peça alta";
    },

    mandril_furadeira(inst) {
      return inst.estado.ligada
        ? bloqueado("Desligue o motor para trocar a broca")
        : "Mandril livre — aperte a broca com a chave";
    },

    motor_furadeira(inst) {
      return inst.estado.ligada
        ? "Motor em rotação — plaqueta conferida"
        : "Motor parado — plaqueta conferida";
    },

    protetor_furadeira(inst) {
      return inst.estado.ligada
        ? "Protetor na posição de trabalho"
        : "Protetor acrílico na posição de trabalho";
    },

    luz_furadeira(inst) {
      return inst.estado.ligada
        ? "Luz indicadora acesa — comando energizado"
        : "Luz indicadora apagada — comando desligado";
    }
  }
};

// --------------------------------------------------------------------------
// PAINEL DE AUTOMAÇÃO CLP
// --------------------------------------------------------------------------

const clp = {
  estadoInicial: () => ({
    porta: false,
    energizado: false,
    rele: false,
    ihm: false,
    emergencia: false
  }),

  iniciar(inst) {
    inst.luz("torre_clp", "apagado");
    inst.animar("fechar_porta", "porta", 0);
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (e.emergencia) return "emergência acionada";
    if (idPeca === "porta_clp") return e.porta ? "porta aberta" : "porta fechada";
    if (idPeca === "disjuntor_clp") return e.energizado ? "energizado" : "desenergizado";
    if (idPeca === "rele_clp") return e.rele ? "rearmado" : "desarmado";
    if (idPeca === "cpu_clp") return e.energizado && e.rele ? "CPU em RUN" : "CPU sem RUN";
    if (idPeca === "ihm_clp") return e.ihm ? "IHM ligada" : "IHM apagada";
    if (idPeca === "torre_clp") return e.energizado && e.rele ? "célula liberada" : "célula parada";
    return null;
  },

  pecas: {
    porta_clp(inst) {
      const e = inst.estado;
      if (e.energizado) return bloqueado("Desligue o disjuntor geral antes de abrir o painel");

      e.porta = !e.porta;
      inst.animar(e.porta ? "abrir_porta" : "fechar_porta", "porta", e.porta ? 1 : 0);
      return e.porta ? "Porta do painel aberta" : "Porta do painel fechada";
    },

    disjuntor_clp(inst) {
      const e = inst.estado;
      if (!e.porta) return bloqueado("Abra a porta do painel para acessar o disjuntor");

      e.energizado = !e.energizado;
      inst.animar(e.energizado ? "disjuntor_ligar" : "disjuntor_desligar");

      if (!e.energizado) {
        e.rele = false;
        e.ihm = false;
        return "Painel desenergizado — relé e IHM sem alimentação";
      }

      return "Painel energizado — rearme o relé de segurança";
    },

    rele_clp(inst) {
      const e = inst.estado;

      if (!e.energizado) return bloqueado("Energize o painel pelo disjuntor geral");
      if (e.emergencia) return bloqueado("Libere a emergência antes de rearmar o relé");
      if (e.rele) return bloqueado("O relé de segurança já está rearmado");

      e.rele = true;
      inst.animar("rele_rearmar");
      return "Relé de segurança rearmado — CPU em RUN";
    },

    cpu_clp(inst) {
      const e = inst.estado;

      if (!e.energizado) return "CPU sem alimentação — energize o painel";
      if (e.emergencia) return "CPU em falha de segurança — emergência ativa";
      if (!e.rele) return "CPU bloqueada — rearme o relé de segurança";
      return "CPU em RUN — controlador operando";
    },

    ihm_clp(inst) {
      const e = inst.estado;

      if (!e.energizado) return bloqueado("IHM sem alimentação — energize o painel");
      if (e.emergencia) return bloqueado("Libere a emergência antes de ligar a IHM");
      if (!e.rele) return bloqueado("CPU sem RUN — rearme o relé de segurança");

      e.ihm = !e.ihm;
      inst.animar(e.ihm ? "ihm_ligar" : "ihm_desligar");
      return e.ihm ? "IHM ligada — interface operante" : "IHM desligada";
    },

    emergencia_clp(inst) {
      const e = inst.estado;
      e.emergencia = !e.emergencia;

      if (e.emergencia) {
        e.rele = false;
        e.ihm = false;
        inst.animar("emergencia_acionar");
        return "Emergência acionada — relé desarmado";
      }

      inst.animar("emergencia_liberar");
      return "Emergência liberada — rearme o relé de segurança";
    },

    torre_clp(inst) {
      if (inst.estado.emergencia) return "Sinalizador apagado — emergência ativa";
      return inst.estado.energizado && inst.estado.rele
        ? "Sinalizador verde — célula liberada"
        : "Sinalizador apagado — célula parada";
    }
  },

  atualizar(inst) {
    const e = inst.estado;
    luz(inst, "torre_clp", e.energizado && e.rele && !e.emergencia);
  }
};

// --------------------------------------------------------------------------
// BANCADAS
// --------------------------------------------------------------------------

function morsa(inst, chave, nome) {
  inst.estado.morsas[chave] = !inst.estado.morsas[chave];
  inst.animar(inst.estado.morsas[chave] ? "morsa_fixar" : "morsa_soltar");
  return inst.estado.morsas[chave]
    ? `${nome}: peça fixada`
    : `${nome}: solta`;
}

function ferramenta(inst, chave, nome) {
  inst.estado.ferramentas[chave] = !inst.estado.ferramentas[chave];
  inst.animar(inst.estado.ferramentas[chave] ? "ferramenta_recolher" : "ferramenta_pegar");
  return inst.estado.ferramentas[chave]
    ? `${nome}: no suporte`
    : `${nome}: em uso`;
}

const bancada_extra_longa = {
  estadoInicial: () => ({
    morsas: { 1: false, 2: false, 3: false, 4: false },
    ferramentas: {}
  }),

  descricao(inst, idPeca) {
    if (idPeca.startsWith("morsa_bancada_")) {
      return resumoMorsa(inst, idPeca.replace("morsa_bancada_", ""));
    }
    if (idPeca === "lima_bancada") return inst.estado.ferramentas.lima ? "recolhida" : "em uso";
    if (idPeca === "martelo_bancada") return inst.estado.ferramentas.martelo ? "recolhido" : "em uso";
    return null;
  },

  pecas: {
    morsa_bancada_1: (inst) => morsa(inst, "1", "Morsa 1"),
    morsa_bancada_2: (inst) => morsa(inst, "2", "Morsa 2"),
    morsa_bancada_3: (inst) => morsa(inst, "3", "Morsa 3"),
    morsa_bancada_4: (inst) => morsa(inst, "4", "Morsa 4"),
    lima_bancada: (inst) => ferramenta(inst, "lima", "Lima"),
    martelo_bancada: (inst) => ferramenta(inst, "martelo", "Martelo")
  }
};

const bancada_central_senai = {
  estadoInicial: () => ({
    morsa: false,
    gaveta: false,
    armario: false,
    tampo: false
  }),

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (idPeca === "morsa_bancada_senai") return e.morsa ? "fixada" : "solta";
    if (idPeca === "gaveta_bancada_senai") return e.gaveta ? "aberta" : "fechada";
    if (idPeca === "armario_bancada_senai") return e.armario ? "aberto" : "fechado";
    if (idPeca === "tampo_bancada_senai") return e.tampo ? "limpo e nivelado" : "a conferir";
    return null;
  },

  iniciar(inst) {
    inst.animar("armario_fechar", ["armario_esquerdo", "armario_direito"], 0);
  },

  pecas: {
    tampo_bancada_senai(inst) {
      inst.estado.tampo = true;
      return "Tampo de aço limpo e nivelado";
    },

    morsa_bancada_senai(inst) {
      inst.estado.morsa = !inst.estado.morsa;
      inst.animar(inst.estado.morsa ? "morsa_fixar" : "morsa_soltar");
      return inst.estado.morsa ? "Peça fixada na morsa" : "Morsa aberta";
    },

    gaveta_bancada_senai(inst) {
      inst.estado.gaveta = !inst.estado.gaveta;
      inst.animar(inst.estado.gaveta ? "gaveta_abrir" : "gaveta_fechar");
      return inst.estado.gaveta ? "Gaveta aberta" : "Gaveta fechada";
    },

    armario_bancada_senai(inst) {
      inst.estado.armario = !inst.estado.armario;
      inst.animar(
        inst.estado.armario ? "armario_abrir" : "armario_fechar",
        ["armario_esquerdo", "armario_direito"],
        inst.estado.armario ? 1 : 0
      );
      return inst.estado.armario ? "Armário da bancada aberto" : "Armário fechado";
    }
  }
};

const bancada_ajustagem = {
  estadoInicial: () => ({
    morsa: false,
    paquimetro: false,
    grampo: false
  }),

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (idPeca === "morsa_azul_ajustagem") return e.morsa ? "fixada" : "solta";
    if (idPeca === "paquimetro_ajustagem") return e.paquimetro ? "em uso" : "guardado";
    if (idPeca === "grampo_c_ajustagem") return e.grampo ? "apertado" : "solto";
    return null;
  },

  pecas: {
    morsa_azul_ajustagem(inst) {
      inst.estado.morsa = !inst.estado.morsa;
      inst.animar(inst.estado.morsa ? "morsa_fixar" : "morsa_soltar");
      return inst.estado.morsa ? "Peça fixada na morsa azul" : "Morsa azul aberta";
    },

    paquimetro_ajustagem(inst) {
      inst.estado.paquimetro = !inst.estado.paquimetro;
      inst.animar(inst.estado.paquimetro ? "ferramenta_pegar" : "ferramenta_recolher");
      return inst.estado.paquimetro
        ? "Paquímetro em uso — meça a peça"
        : "Paquímetro guardado no suporte";
    },

    tampo_ajustagem(inst) {
      return "Tampo galvanizado organizado";
    },

    grampo_c_ajustagem(inst) {
      inst.estado.grampo = !inst.estado.grampo;
      inst.animar(inst.estado.grampo ? "morsa_fixar" : "morsa_soltar");
      return inst.estado.grampo ? "Grampo em C apertado" : "Grampo em C solto";
    }
  }
};

const bancada_central = {
  estadoInicial: () => ({
    morsa: false,
    gaveta: false,
    lima: false,
    armario: false,
    tampo: false
  }),

  iniciar(inst) {
    inst.animar("armario_fechar", ["armario_esquerdo", "armario_direito"], 0);
  },

  descricao(inst, idPeca) {
    const e = inst.estado;
    if (idPeca === "morsa_frontal_esquerda") return e.morsa ? "fixada" : "solta";
    if (idPeca === "gaveta_bancada_central") return e.gaveta ? "aberta" : "fechada";
    if (idPeca === "lima_bancada_central") return e.lima ? "recolhida" : "em uso";
    if (idPeca === "armario_bancada_central") return e.armario ? "aberto" : "fechado";
    return e.tampo ? "tampo desobstruído" : "tampo a conferir";
  },

  pecas: {
    tampo_bancada_central(inst) {
      inst.estado.tampo = true;
      return "Tampo da bancada central desobstruído";
    },

    morsa_frontal_esquerda(inst) {
      inst.estado.morsa = !inst.estado.morsa;
      inst.animar(inst.estado.morsa ? "morsa_fixar" : "morsa_soltar");
      return inst.estado.morsa ? "Peça fixada na morsa frontal" : "Morsa frontal aberta";
    },

    gaveta_bancada_central(inst) {
      inst.estado.gaveta = !inst.estado.gaveta;
      inst.animar(inst.estado.gaveta ? "gaveta_abrir" : "gaveta_fechar");
      return inst.estado.gaveta ? "Gaveta da bancada aberta" : "Gaveta fechada";
    },

    lima_bancada_central(inst) {
      inst.estado.lima = !inst.estado.lima;
      inst.animar(inst.estado.lima ? "ferramenta_recolher" : "ferramenta_pegar");
      return inst.estado.lima ? "Lima chata recolhida" : "Lima chata em uso";
    },

    armario_bancada_central(inst) {
      inst.estado.armario = !inst.estado.armario;
      inst.animar(
        inst.estado.armario ? "armario_abrir" : "armario_fechar",
        ["armario_esquerdo", "armario_direito"],
        inst.estado.armario ? 1 : 0
      );
      return inst.estado.armario ? "Armário da bancada aberto" : "Armário fechado";
    }
  }
};

const bancada_prensa = {
  estadoInicial: () => ({
    tampo: false,
    base: false,
    prensando: false,
    retorno: 0
  }),

  descricao(inst, idPeca) {
    if (inst.estado.prensando) return "prensa em curso";
    if (idPeca === "base_prensa") return inst.estado.base ? "base conferida" : "base a conferir";
    if (idPeca === "alavanca_prensa") return "balancim disponível";
    return null;
  },

  pecas: {
    tampo_prensa(inst) {
      inst.estado.tampo = true;
      return "Tampo livre — posicione a peça sob o embolo";
    },

    base_prensa(inst) {
      inst.estado.base = true;
      return "Base da prensa conferida e fixada";
    },

    alavanca_prensa(inst) {
      const e = inst.estado;

      if (e.prensando) return bloqueado("Aguarde o retorno do balancim");

      e.prensando = true;
      e.retorno = 0.7;
      inst.animar("prensa_acionar", ["ram", "balancim"], 1);

      return e.base
        ? "Prensa acionada — embolo desceu"
        : "Prensa acionada — confira a fixação da base";
    },

    plaqueta_prensa(inst) {
      return "Plaqueta: prensa manual de 1 t";
    }
  },

  atualizar(inst, delta) {
    const e = inst.estado;
    if (!e.prensando) return;

    e.retorno -= delta;
    if (e.retorno > 0) return;

    e.prensando = false;
    e.retorno = 0;
    inst.animar("prensa_retornar", ["ram", "balancim"], 0);
  }
};

// --------------------------------------------------------------------------

export const COMPORTAMENTOS = {
  cnc,
  torno,
  esteira,
  furadeira,
  clp,
  bancada_extra_longa,
  bancada_central_senai,
  bancada_ajustagem,
  bancada_central,
  bancada_prensa
};

export const comportamentoNeutro = {
  estadoInicial: () => ({}),
  pecas: {}
};
