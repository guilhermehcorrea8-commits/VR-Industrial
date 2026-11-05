import * as THREE from "three";

// Movimento provisório dos mecanismos. Cada grupo de peças recebe um pivô
// (montado em src/rigs.js) e aqui só interpolamos o alvo: deslizar ao longo de
// um eixo ou girar em torno dele.
//
// Isto NÃO é a animação final: é o fallback que faz a máquina responder antes
// dos clipes chegarem. Quando existir um clipe cadastrado para a ação, a ponte
// em src/animacoes.js assume e o fallback nem é acionado — ver
// `acionarMecanismo` em src/interacoes.js.

const SUAVIDADE = 7; // 1/s
const VELOCIDADE_GIRO_MAXIMA = 40; // rad/s, só para não explodir com delta grande

const giroAuxiliar = new THREE.Quaternion();

export function criarMecanismo(grupo, opcoes = {}) {
  const tipo = opcoes.tipo ?? "estatico";
  const eixo = new THREE.Vector3(...(opcoes.eixo ?? [1, 0, 0]));
  if (eixo.lengthSq() > 1e-9) eixo.normalize();

  const distancia = opcoes.distancia ?? 0;
  const angulo = opcoes.angulo ?? 0;
  const inicial = opcoes.inicial ?? 0;

  const posicaoBase = grupo.position.clone();
  const rotacaoBase = grupo.quaternion.clone();

  let alvo = inicial;
  let atual = inicial;
  let giro = 0;
  let velocidadeGiro = 0;

  function aplicar() {
    if (tipo === "deslizar") {
      grupo.position.copy(posicaoBase).addScaledVector(eixo, distancia * atual);
      return;
    }

    if (tipo === "girar") {
      giroAuxiliar.setFromAxisAngle(eixo, angulo * atual + giro);
      grupo.quaternion.copy(rotacaoBase).multiply(giroAuxiliar);
    }
  }

  aplicar();

  return {
    grupo,
    nome: grupo.name,
    tipo,
    eixo: eixo.clone(),

    definir(valor, { imediato = false } = {}) {
      alvo = THREE.MathUtils.clamp(valor, 0, 1);
      if (imediato) {
        atual = alvo;
        aplicar();
      }
    },

    // Velocidade em rad/s. Zero para o grupo; o alvo de fração continua valendo.
    girar(velocidade = 0) {
      velocidadeGiro = THREE.MathUtils.clamp(
        velocidade,
        -VELOCIDADE_GIRO_MAXIMA,
        VELOCIDADE_GIRO_MAXIMA
      );
    },

    atualizar(delta) {
      if (tipo === "girar" && velocidadeGiro !== 0) {
        giro = (giro + velocidadeGiro * delta) % (Math.PI * 2);
      }

      const k = 1 - Math.exp(-SUAVIDADE * delta);
      atual += (alvo - atual) * k;
      if (Math.abs(alvo - atual) < 1e-4) atual = alvo;
      aplicar();
    },

    reiniciar() {
      alvo = inicial;
      atual = inicial;
      giro = 0;
      velocidadeGiro = 0;
      aplicar();
    },

    get alvo() { return alvo; },
    get atual() { return atual; },
    get girando() { return velocidadeGiro !== 0; }
  };
}
