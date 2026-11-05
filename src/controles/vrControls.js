import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { escolherAcerto } from "../cena/maquinas.js";

const VELOCIDADE_GIRO = 1.9; // rad/s no analógico direito do gamepad

// Adaptador VR. Todos os caminhos de entrada escrevem no mesmo objeto
// `entrada`, então a locomoção continua sendo resolvida por atualizarJogador():
//
// - controller do headset: gatilho seleciona, grip teleporta, analógico anda;
// - gamepad padrão (Bluetooth ou celular que se apresente como HID): stick
//   esquerdo anda, stick direito gira o usuário, A/RT seleciona pela mira;
// - teclado e tela continuam valendo fora do XR, em seus próprios módulos.
export function criarControlesVR({
  renderer,
  scene,
  camera,
  jogador,
  entrada,
  alvos,
  gamepad,
  esperado,
  aoSelecionar,
  aoMudarModo
}) {
  const raycaster = new THREE.Raycaster();
  const matrizTemporaria = new THREE.Matrix4();
  const origemMira = new THREE.Vector3();
  const direcaoMira = new THREE.Vector3();

  const fabrica = new XRControllerModelFactory();
  const pilha = [];

  // Marcador de teleporte.
  const marcador = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.26, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9 })
  );
  marcador.visible = false;
  scene.add(marcador);

  // Mira do gamepad: onde o botão A/RT vai agir. Fica pendurada na câmera para
  // acompanhar a cabeça sem precisar de raycast por quadro.
  const mira = new THREE.Mesh(
    new THREE.RingGeometry(0.008, 0.014, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    })
  );
  mira.position.set(0, 0, -1.6);
  mira.renderOrder = 999;
  mira.frustumCulled = false;
  mira.visible = false;
  camera?.add(mira);

  const pisoPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pontoPlano = new THREE.Vector3();

  function apontarRay(ray, alvo) {
    matrizTemporaria.identity().extractRotation(alvo.matrixWorld);
    ray.origin.setFromMatrixPosition(alvo.matrixWorld);
    ray.direction.set(0, 0, -1).applyMatrix4(matrizTemporaria).normalize();
  }

  function selecionar(acerto, origem) {
    if (!acerto) return;
    entrada.origemSelecao = origem;
    entrada.pedidoSelecao = true;
    aoSelecionar?.(acerto);
  }

  // A mira central é o equivalente do olhar no PC: o gamepad aponta com a
  // cabeça e confirma com um botão.
  function selecionarPelaMira() {
    camera.getWorldPosition(origemMira);
    camera.getWorldDirection(direcaoMira);
    raycaster.set(origemMira, direcaoMira);
    selecionar(
      escolherAcerto(raycaster.intersectObjects(alvos, true), esperado?.()),
      "gamepad"
    );
  }

  function criarPonteira(alvo) {
    const geometria = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const linha = new THREE.Line(
      geometria,
      new THREE.LineBasicMaterial({ color: 0xfbbf24 })
    );
    linha.scale.z = 6;
    linha.name = "ponteira";
    alvo.add(linha);
    return linha;
  }

  for (const indice of [0, 1]) {
    const controlador = renderer.xr.getController(indice);
    controlador.userData.indice = indice;
    controlador.userData.apertandoGrip = false;
    controlador.add(criarPonteira(controlador));

    const punho = renderer.xr.getControllerGrip(indice);
    punho.add(fabrica.createControllerModel(punho));

    // O rig é movido por nós; os controllers vivem na cena do XR.
    jogador.add(controlador);
    jogador.add(punho);

    controlador.addEventListener("connected", (evento) => {
      controlador.userData.gamepad = evento.data?.gamepad ?? null;
      controlador.visible = true;
      aoMudarModo?.("vr");
    });

    controlador.addEventListener("disconnected", () => {
      controlador.userData.gamepad = null;
      controlador.visible = false;
    });

    // Grip (squeeze) segurado: mostra o alvo de teleporte no chão.
    controlador.addEventListener("squeezestart", () => {
      controlador.userData.apertandoGrip = true;
    });

    controlador.addEventListener("squeezeend", () => {
      controlador.userData.apertandoGrip = false;
      if (marcador.visible) {
        entrada.teleporte = new THREE.Vector3().copy(marcador.position);
        marcador.visible = false;
      }
    });

    // Gatilho: seleciona; se não houver objeto, não faz nada (evita
    // teleporte acidental ao apontar para uma máquina).
    controlador.addEventListener("select", () => {
      if (controlador.userData.apertandoGrip) return;

      apontarRay(raycaster.ray, controlador);
      selecionar(
        escolherAcerto(raycaster.intersectObjects(alvos, true), esperado?.()),
        "controller"
      );
    });

    pilha.push({ controlador, punho });
  }

  function lerAnalogoXR() {
    let fx = 0;
    let lx = 0;

    for (const { controlador } of pilha) {
      const pad = controlador.userData.gamepad;
      if (!pad?.axes) continue;

      const [ax = 0, ay = 0, bx = 0, by = 0] = pad.axes;
      const MAG = 0.22;

      // Layout padrão XR: axes[2]/[3] são o analógico esquerdo em muitos
      // pares, mas em outros o esquerdo é axes[0]/[1]. Somamos ambos.
      if (Math.abs(bx) > MAG || Math.abs(by) > MAG) {
        lx += bx;
        fx += -by;
      }
      if (Math.abs(ax) > MAG || Math.abs(ay) > MAG) {
        lx += ax;
        fx += -ay;
      }
    }

    return { fx, lx };
  }

  function atualizar(delta = 0) {
    const leitura = gamepad?.atualizar?.() ?? null;

    const { fx, lx } = lerAnalogoXR();
    entrada.frente = THREE.MathUtils.clamp(fx + (leitura?.movimento.frente ?? 0), -1, 1);
    entrada.lateral = THREE.MathUtils.clamp(lx + (leitura?.movimento.lateral ?? 0), -1, 1);
    entrada.corrida = Boolean(leitura?.corrida);

    // Girar o rig gira câmera e controllers juntos; a direção de caminhada
    // acompanha porque atualizarJogador() usa a frente da câmera.
    if (leitura?.giro) {
      jogador.rotation.y -= leitura.giro * VELOCIDADE_GIRO * delta;
    }

    if (leitura?.selecionar) selecionarPelaMira();

    const usarMira = Boolean(leitura) && renderer.xr.isPresenting;
    if (mira.visible !== usarMira) mira.visible = usarMira;

    // Atualiza o marcador de teleporte enquanto o grip está pressionado.
    const ativo = pilha.find(({ controlador }) => controlador.userData.apertandoGrip);
    if (ativo) {
      apontarRay(raycaster.ray, ativo.controlador);
      if (raycaster.ray.intersectPlane(pisoPlano, pontoPlano)) {
        marcador.position.copy(pontoPlano).setY(0.02);
        marcador.visible = true;
      } else {
        marcador.visible = false;
      }
    } else if (marcador.visible) {
      marcador.visible = false;
    }

    // Encurtar a ponteira até o obstáculo mais próximo.
    for (const { controlador } of pilha) {
      const ponteira = controlador.getObjectByName("ponteira");
      if (!ponteira) continue;

      apontarRay(raycaster.ray, controlador);
      const acertos = raycaster.intersectObjects(alvos, true);
      ponteira.scale.z = acertos.length
        ? Math.min(acertos[0].distance, 6)
        : 6;
    }
  }

  return {
    atualizar,
    pilha,
    dispose() {
      marcador.geometry.dispose();
      marcador.material.dispose();
      mira.geometry.dispose();
      mira.material.dispose();
    }
  };
}
