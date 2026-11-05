import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { escolherAcerto } from "../maquinas.js";

// Adaptador VR. Gatilho = selecionar o objeto da ponteira. Apertar e soltar o
// grip = teleportar até o ponto do piso. Analógico esquerdo = locomoção suave.
export function criarControlesVR({
  renderer,
  scene,
  jogador,
  entrada,
  alvos,
  esperado,
  aoSelecionar,
  aoMudarModo
}) {
  const raycaster = new THREE.Raycaster();
  const matrizTemporaria = new THREE.Matrix4();

  const fabrica = new XRControllerModelFactory();
  const pilha = [];

  // Marcador de teleporte.
  const marcador = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.26, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9 })
  );
  marcador.visible = false;
  scene.add(marcador);

  const pisoPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pontoPlano = new THREE.Vector3();

  function apontarRay(ray, alvo) {
    matrizTemporaria.identity().extractRotation(alvo.matrixWorld);
    ray.origin.setFromMatrixPosition(alvo.matrixWorld);
    ray.direction.set(0, 0, -1).applyMatrix4(matrizTemporaria).normalize();
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
      const acerto = escolherAcerto(raycaster.intersectObjects(alvos, true), esperado?.());

      if (acerto) {
        controlador.userData.alvo = acerto.object;
        entrada.origemSelecao = "controller";
        entrada.pedidoSelecao = true;
        aoSelecionar?.(acerto);
      }
    });

    pilha.push({ controlador, punho });
  }

  function lerAnalogo() {
    let fx = 0;
    let lx = 0;

    for (const { controlador } of pilha) {
      const gamepad = controlador.userData.gamepad;
      if (!gamepad?.axes) continue;

      const [ax = 0, ay = 0, bx = 0, by = 0] = gamepad.axes;
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

    return { fx: THREE.MathUtils.clamp(fx, -1, 1), lx: THREE.MathUtils.clamp(lx, -1, 1) };
  }

  function atualizar() {
    const { fx, lx } = lerAnalogo();
    entrada.frente = fx;
    entrada.lateral = lx;
    entrada.corrida = false;

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
    }
  };
}
