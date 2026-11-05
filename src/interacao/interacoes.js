import { criarRigs } from "./rigs.js";
import { COMPORTAMENTOS, comportamentoNeutro } from "./comportamentos.js";

// Motor do sistema de interação das máquinas.
//
// A seleção (clique, toque ou gatilho) chega aqui como uma mesh com
// `idEquipamento` + `idPeca`; o comportamento da máquina decide o que fazer e
// devolve uma frase para o HUD. Toda mudança de estado também emite uma ação
// semântica para src/animacoes.js — se houver clipe, ele toca; se não houver, a
// interação move o rig provisório. As duas decisões ficam em
// src/comportamentos.js, nunca no alvo do raycast.

const CORES = {
  verde: 0x22c55e,
  amarelo: 0xf59e0b,
  vermelho: 0xef4444,
  branco: 0xf8fafc,
  apagado: 0x000000
};

function lista(valor) {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

export function criarSistemaInteracoes({ animacoes } = {}) {
  const instancias = new Map();
  let totalMecanismos = 0;

  function registrar(montada, extras = {}) {
    const def = COMPORTAMENTOS[montada.id] ?? comportamentoNeutro;
    const { mecanismos, grupos } = criarRigs(montada);
    totalMecanismos += mecanismos.size;

    const pecasPorId = new Map();
    for (const peca of montada.interativas) {
      const id = peca.userData.idPeca;
      if (!id) continue;
      if (!pecasPorId.has(id)) pecasPorId.set(id, []);
      pecasPorId.get(id).push(peca);
    }

    const inst = {
      id: montada.id,
      nome: montada.nome,
      montada,
      def,
      estado: {},
      mecanismos,
      grupos,
      pecasPorId,
      furadeira: extras.furadeira ?? null,
      tempo: 0,

      pecas(idPeca) {
        return pecasPorId.get(idPeca) ?? [];
      },

      rotulo(idPeca) {
        return pecasPorId.get(idPeca)?.[0]?.userData.nomeEquipamento ?? idPeca;
      },

      // Tenta o clipe primeiro. Só mexe no rig provisório quando a ação ainda
      // não tem animação cadastrada — é o que permite trocar uma pela outra
      // sem reescrever nenhum comportamento.
      animar(acao, alvos = [], fracao = 1) {
        const tocou = animacoes?.tocar(inst.id, acao) ?? false;
        if (tocou) return true;

        for (const alvo of lista(alvos)) {
          mecanismos.get(alvo)?.definir(fracao);
        }
        return false;
      },

      animarLoop(acao, alvos = [], velocidade = 0) {
        const tocou = animacoes?.tocarLoop(inst.id, acao, velocidade !== 0) ?? false;
        if (tocou) return true;

        for (const alvo of lista(alvos)) {
          mecanismos.get(alvo)?.girar(velocidade);
        }
        return false;
      },

      luz(idPeca, cor, brilho = 1.4) {
        const chave = typeof cor === "string" ? cor : null;
        const hex = chave ? (CORES[chave] ?? CORES.apagado) : cor;

        for (const malha of pecasPorId.get(idPeca) ?? []) {
          if (!malha.userData.luzMaterial) {
            malha.userData.luzMaterial = malha.material.clone();
            malha.material = malha.userData.luzMaterial;
          }

          const material = malha.userData.luzMaterial;
          if (material.emissive) {
            material.emissive.setHex(hex);
            material.emissiveIntensity = chave === "apagado" ? 0 : brilho;
          } else if (material.color) {
            material.color.setHex(chave === "apagado" ? 0x1f2937 : hex);
          }
        }
      }
    };

    inst.estado = def.estadoInicial?.() ?? {};
    def.iniciar?.(inst);

    instancias.set(montada.id, inst);
    return inst;
  }

  function acionar(alvo) {
    const dados = alvo?.userData;
    const id = dados?.idEquipamento;
    const idPeca = dados?.idPeca;
    if (!id || !idPeca) return null;

    const inst = instancias.get(id);
    if (!inst) return null;

    const handler = inst.def.pecas?.[idPeca];
    if (!handler) return null;

    return handler(inst, alvo) ?? null;
  }

  function descrever(alvo) {
    const dados = alvo?.userData;
    const rotulo = dados?.nomeEquipamento || alvo?.name;
    const inst = instancias.get(dados?.idEquipamento);
    if (!inst || !dados?.idPeca) return rotulo ?? null;

    const detalhe = inst.def.descricao?.(inst, dados.idPeca);
    return detalhe ? `${rotulo} · ${detalhe}` : rotulo;
  }

  function atualizar(delta) {
    for (const inst of instancias.values()) {
      inst.tempo += delta;
      inst.def.atualizar?.(inst, delta);

      for (const mecanismo of inst.mecanismos.values()) {
        mecanismo.atualizar(delta);
      }

      inst.furadeira?.atualizar(delta);
    }

    animacoes?.atualizar(delta);
  }

  function reiniciar() {
    animacoes?.pararTudo();

    for (const inst of instancias.values()) {
      inst.tempo = 0;
      inst.estado = inst.def.estadoInicial?.() ?? {};

      for (const mecanismo of inst.mecanismos.values()) mecanismo.reiniciar();
      inst.furadeira?.reiniciar();

      inst.def.iniciar?.(inst);
    }
  }

  function estado(id) {
    return instancias.get(id)?.estado ?? null;
  }

  function listar() {
    return [...instancias.keys()];
  }

  function resumo() {
    return {
      maquinas: instancias.size,
      mecanismos: totalMecanismos,
      acoes: [...instancias.values()].reduce(
        (soma, inst) => soma + Object.keys(inst.def.pecas ?? {}).length,
        0
      )
    };
  }

  return { registrar, acionar, descrever, atualizar, reiniciar, estado, listar, resumo };
}
