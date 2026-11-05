import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MANIFESTO } from "./animacoes.manifest.js";

// Ponte entre a lógica de interação e as animações que ainda serão produzidas.
//
// A interação só conhece nomes de ação ("abrir_porta", "ciclo_cnc"). Se o
// manifesto tiver um clipe para a ação, o mixer da máquina toca o clipe; se não
// tiver — que é o caso hoje — a interação cai no movimento provisório do rig.
// Por isso o sistema continua funcionando sem nenhum arquivo de animação e
// passa a usar os clipes no dia em que forem cadastrados em
// src/animacoes.manifest.js.

const SUAVIZACAO = 0.15; // s de fade entre ações

export function criarAnimacoes() {
  const maquinas = new Map();

  function estado(id) {
    let dados = maquinas.get(id);
    if (!dados) {
      dados = {
        raiz: null,
        mixer: null,
        clipes: new Map(),
        acoes: new Map(),
        carregando: false,
        carregado: false,
        falhou: false
      };
      maquinas.set(id, dados);
    }
    return dados;
  }

  function registrar(maquina) {
    const dados = estado(maquina.id);
    dados.raiz = maquina.grupo;

    const entrada = MANIFESTO[maquina.id];
    if (!entrada?.arquivo || dados.carregando || dados.carregado) return;

    dados.carregando = true;

    new GLTFLoader()
      .loadAsync(entrada.arquivo)
      .then((gltf) => {
        dados.clipes.clear();
        for (const clipe of gltf.animations) dados.clipes.set(clipe.name, clipe);
        dados.mixer = new THREE.AnimationMixer(maquina.grupo);
        dados.carregado = true;
        console.info(`[animações] ${maquina.id}: ${dados.clipes.size} clipe(s) carregado(s).`);
      })
      .catch((erro) => {
        dados.falhou = true;
        console.warn(
          `[animações] ${entrada.arquivo} não carregou; o movimento provisório continua.`,
          erro?.message ?? erro
        );
      })
      .finally(() => {
        dados.carregando = false;
      });
  }

  function resolver(id, acao) {
    const entrada = MANIFESTO[id];
    const def = entrada?.acoes?.[acao];
    if (!def) return null;

    const config = typeof def === "string" ? { clipe: def } : def;
    if (!config?.clipe) return null;

    const dados = maquinas.get(id);
    if (!dados?.clipes.size) return null;

    // Um único clipe no arquivo dispensa repetir o nome no manifesto.
    const clipe = dados.clipes.get(config.clipe)
      ?? (dados.clipes.size === 1 ? dados.clipes.values().next().value : null);

    return clipe ? { clipe, config } : null;
  }

  function garantirMixer(id) {
    const dados = estado(id);
    if (!dados.mixer && dados.raiz) dados.mixer = new THREE.AnimationMixer(dados.raiz);
    return dados.mixer;
  }

  function tocar(id, acao, { repetir = false, reiniciar = false } = {}) {
    const alvo = resolver(id, acao);
    if (!alvo) return false;

    const dados = estado(id);
    const chave = `${id}:${acao}`;
    const ativa = dados.acoes.get(chave);
    if (ativa?.action?.isRunning() && !reiniciar) return true;

    const mixer = garantirMixer(id);
    if (!mixer) return false;

    // Ações do mesmo conjunto são exclusivas (abrir/fechar a mesma porta).
    if (alvo.config.grupo) {
      for (const [outraChave, outra] of dados.acoes) {
        if (outraChave !== chave && outra.config.grupo === alvo.config.grupo) {
          outra.action.fadeOut(SUAVIZACAO);
          dados.acoes.delete(outraChave);
        }
      }
    }

    const emLoop = repetir || alvo.config.loop === true;
    const action = mixer.clipAction(alvo.clipe);
    action.reset();
    action.setLoop(emLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !emLoop;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.fadeIn(SUAVIZACAO).play();

    dados.acoes.set(chave, { action, config: alvo.config });
    return true;
  }

  function parar(id, acao) {
    const dados = maquinas.get(id);
    const chave = `${id}:${acao}`;
    const ativa = dados?.acoes.get(chave);
    if (!ativa) return false;

    ativa.action.fadeOut(SUAVIZACAO);
    dados.acoes.delete(chave);
    return true;
  }

  // Devolve true quando existe clipe para a ação — mesmo ao parar — para que a
  // interação não acione o fallback junto com o clipe.
  function tocarLoop(id, acao, ativo) {
    if (ativo) return tocar(id, acao, { repetir: true });

    const existia = maquinas.get(id)?.acoes.has(`${id}:${acao}`) ?? false;
    parar(id, acao);
    return existia || Boolean(resolver(id, acao));
  }

  function atualizar(delta) {
    for (const dados of maquinas.values()) dados.mixer?.update(delta);
  }

  function pararTudo() {
    for (const dados of maquinas.values()) {
      for (const { action } of dados.acoes.values()) action.stop();
      dados.acoes.clear();
      dados.mixer?.stopAllAction();
    }
  }

  if (Object.keys(MANIFESTO).length === 0) {
    console.info(
      "[animações] nenhum clipe cadastrado — usando o movimento provisório dos rigs."
    );
  }

  return { registrar, tocar, parar, tocarLoop, atualizar, pararTudo };
}
