import * as THREE from "three";
import { RIGS } from "./rigs.data.js";
import { criarMecanismo } from "./mecanismos.js";

// Monta os grupos pivotados que representam cada mecanismo da máquina.
//
// As peças preservadas pela mescla continuam com a geometria assentada no
// espaço do conteúdo e a mesh na identidade. Para agrupar, colocamos o grupo no
// pivô e compensamos cada filho com o inverso — o mundo não muda, mas agora o
// grupo pode girar/deslizar inteiro. Como o grupo tem nome fixo, um clipe
// futuro pode animá-lo diretamente (ver src/animacoes.manifest.js).

const caixaAuxiliar = new THREE.Box3();
const matrizAuxiliar = new THREE.Matrix4();

function caixaDasMalhas(malhas) {
  const caixa = new THREE.Box3();

  for (const malha of malhas) {
    malha.updateMatrix();
    malha.geometry.computeBoundingBox();
    if (!malha.geometry.boundingBox) continue;

    caixaAuxiliar.copy(malha.geometry.boundingBox).applyMatrix4(malha.matrix);
    caixa.union(caixaAuxiliar);
  }

  return caixa;
}

function definirPivo(caixa, pivo) {
  const centro = caixa.getCenter(new THREE.Vector3());

  if (pivo && typeof pivo === "object" && pivo.borda) {
    const eixo = pivo.borda;
    const lado = pivo.lado ?? -1;
    if (eixo === "x") centro.x = lado < 0 ? caixa.min.x : caixa.max.x;
    if (eixo === "y") centro.y = lado < 0 ? caixa.min.y : caixa.max.y;
    if (eixo === "z") centro.z = lado < 0 ? caixa.min.z : caixa.max.z;
  }

  return centro;
}

function coletarPorBase(conteudo) {
  const porBase = new Map();

  conteudo.traverse((obj) => {
    if (!obj.isMesh) return;
    const base = obj.userData.base;
    if (!base) return;

    if (!porBase.has(base)) porBase.set(base, []);
    porBase.get(base).push(obj);
  });

  return porBase;
}

export function criarRigs(montada) {
  const defs = RIGS[montada.id] ?? [];
  const mecanismos = new Map();
  const grupos = new Map();

  if (!defs.length) return { mecanismos, grupos };

  const porBase = coletarPorBase(montada.conteudo);
  const usadas = new Set();

  for (const def of defs) {
    const malhas = [];
    const faltando = [];

    for (const nome of def.pecas) {
      const encontradas = porBase.get(nome);
      if (!encontradas?.length) {
        faltando.push(nome);
        continue;
      }
      for (const malha of encontradas) {
        if (usadas.has(malha)) {
          console.warn(`[rigs] ${montada.id}: peça ${nome} já pertence a outro mecanismo.`);
          continue;
        }
        usadas.add(malha);
        malhas.push(malha);
      }
    }

    if (faltando.length) {
      console.warn(`[rigs] ${montada.id}/${def.id}: peças ausentes: ${faltando.join(", ")}`);
    }
    if (!malhas.length) continue;

    const caixa = caixaDasMalhas(malhas);
    if (caixa.isEmpty()) continue;

    const pivo = definirPivo(caixa, def.pivo);
    const grupo = new THREE.Group();
    grupo.name = def.nome;
    grupo.position.copy(pivo);
    grupo.userData.rig = true;
    grupo.userData.rigId = def.id;
    grupo.userData.idEquipamento = montada.id;
    grupo.userData.nomeEquipamento = montada.nome;

    montada.conteudo.add(grupo);

    for (const malha of malhas) {
      const deslocamento = matrizAuxiliar
        .makeTranslation(-pivo.x, -pivo.y, -pivo.z)
        .multiply(malha.matrix);

      malha.removeFromParent();
      deslocamento.decompose(malha.position, malha.quaternion, malha.scale);
      grupo.add(malha);
    }

    grupos.set(def.id, grupo);

    if (def.movimento) {
      mecanismos.set(
        def.id,
        criarMecanismo(grupo, { ...def.movimento, inicial: def.inicial ?? 0 })
      );
    }
  }

  return { mecanismos, grupos };
}
