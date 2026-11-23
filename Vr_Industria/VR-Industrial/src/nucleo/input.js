import * as THREE from "three";

// Modelo único de locomoção.
//
// A câmera é sempre filha de um `jogador` (Group). Fora do XR movemos o
// jogador e a câmera fica na altura do olho; dentro do XR o sistema de
// rastreamento escreve a pose da câmera RELATIVA ao jogador, então mover o
// jogador continua sendo a única forma correta de deslocar o usuário.
// Um só código de movimento para PC, celular e headset.

export function criarJogador(camera, config) {
  const jogador = new THREE.Group();
  jogador.name = "Jogador";
  jogador.position.set(config.posicaoInicial[0], 0, config.posicaoInicial[2]);

  camera.position.set(0, config.alturaCamera, 0);
  jogador.add(camera);

  return jogador;
}

export function criarEntrada() {
  return {
    frente: 0,
    lateral: 0,
    corrida: false,
    teleporte: null,
    pedidoSelecao: false,
    origemSelecao: "tela"
  };
}

const frente = new THREE.Vector3();
const lateral = new THREE.Vector3();
const SUPO = new THREE.Vector3(0, 1, 0);

// Um obstáculo bloqueia o jogador se sobrepor o cilindro do corpo
// (raio `raio`, altura 1,75 m a partir do piso).
export function colide(x, z, colisores, raio) {
  for (const caixa of colisores) {
    if (caixa.max.y < 0.12 || caixa.min.y > 1.75) continue;

    if (
      x > caixa.min.x - raio &&
      x < caixa.max.x + raio &&
      z > caixa.min.z - raio &&
      z < caixa.max.z + raio
    ) {
      return true;
    }
  }
  return false;
}

function clampLimites(ponto, limites) {
  ponto.x = THREE.MathUtils.clamp(ponto.x, limites.x[0], limites.x[1]);
  ponto.z = THREE.MathUtils.clamp(ponto.z, limites.z[0], limites.z[1]);
}

export function atualizarJogador(jogador, camera, entrada, delta, contexto) {
  const { velocidade, limites, colisores, raio = 0.35 } = contexto;

  if (entrada.teleporte) {
    const alvo = new THREE.Vector3(entrada.teleporte.x, 0, entrada.teleporte.z);
    clampLimites(alvo, limites);

    if (!colide(alvo.x, alvo.z, colisores, raio)) {
      jogador.position.set(alvo.x, 0, alvo.z);
    }
    entrada.teleporte = null;
  }

  let fx = entrada.frente;
  let lx = entrada.lateral;

  const magnitude = Math.hypot(fx, lx);
  if (magnitude > 1) {
    fx /= magnitude;
    lx /= magnitude;
  }
  if (magnitude < 0.02) return;

  const passo = (entrada.corrida ? velocidade * 1.65 : velocidade) * delta;

  // Direção da cabeça do usuário projetada no plano do chão.
  camera.getWorldDirection(frente);
  frente.y = 0;
  if (frente.lengthSq() < 1e-6) return;
  frente.normalize();

  lateral.crossVectors(frente, SUPO).normalize(); // aponta para a direita

  const x0 = jogador.position.x;
  const z0 = jogador.position.z;

  const dx = frente.x * fx * passo + lateral.x * lx * passo;
  const dz = frente.z * fx * passo + lateral.z * lx * passo;

  let nx = THREE.MathUtils.clamp(x0 + dx, limites.x[0], limites.x[1]);
  let nz = THREE.MathUtils.clamp(z0 + dz, limites.z[0], limites.z[1]);

  // Eixos separados: encostar numa parede mantém o deslize ao longo dela.
  if (colide(nx, z0, colisores, raio)) nx = x0;
  if (colide(x0, nz, colisores, raio)) nz = z0;
  if (colide(nx, nz, colisores, raio)) { nx = x0; nz = z0; }

  jogador.position.set(nx, 0, nz);
}

export { frente, lateral };
