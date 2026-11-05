// Quais nós do scene.glb usam material translúcido (alphaMode BLEND/MASK).
// São exatamente as peças que não podem bloquear o raycast de seleção:
// vidro de janela, acrílico de proteção, visor da IHM.
import { readFileSync } from "node:fs";

const buf = readFileSync(new URL("../scene.glb", import.meta.url));
const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));

const ASSINATURAS = [
  ["furadeira", "QuillHousing"], ["cnc", "CNCScreen"], ["torno", "TailstockBody"],
  ["clp", "CLP_CPU"], ["esteira", "Belt_Top"], ["bancada_central_senai", "Morsa1_Corpo"],
  ["bancada_prensa", "Fuso_vertical_escuro"], ["bancada_extra_longa", "Morsa_4_corpo"],
  ["bancada_central", "Morsa_traseira_direita_corpo"], ["bancada_ajustagem", "MorsaAzul_Corpo"]
];

function contemNomes(no, alvo) {
  if (no.name === alvo) return true;
  for (const f of no.children || []) if (contemNomes(json.nodes[f], alvo)) return true;
  return false;
}

const translucidos = new Set();
json.materials.forEach((m, i) => {
  if (m.alphaMode === "BLEND" || m.alphaMode === "MASK") translucidos.add(i);
  else if (m.pbrMetallicRoughness?.baseColorFactor && m.pbrMetallicRoughness.baseColorFactor[3] < 0.999) translucidos.add(i);
});

console.log(`materiais translúcidos: ${[...translucidos].join(", ")}`);

for (const raizIdx of json.scenes[json.scene ?? 0].nodes) {
  const raiz = json.nodes[raizIdx];
  const maquina = ASSINATURAS.find(([, s]) => contemNomes(raiz, s));
  if (!maquina) continue;

  const linhas = [];
  (function anda(no, prof) {
    const meus = no.mesh === undefined ? [] : json.meshes[no.mesh].primitives.map((p) => p.material);
    for (const mi of meus) {
      if (!translucidos.has(mi)) continue;
      const m = json.materials[mi];
      const opaco = m.doubleSided ? " ds" : "";
      const cor = m.pbrMetallicRoughness?.baseColorFactor;
      linhas.push(`${no.name || "(sem nome)"} | mat ${mi} ${m.name || ""}${opaco} | cor ${cor ? cor.map((v) => +v.toFixed(2)).join(",") : "-"}`);
    }
    for (const f of no.children || []) anda(json.nodes[f], prof + 1);
  })(raiz, 0);

  console.log(`\n### ${maquina[0]}`);
  console.log(linhas.length ? linhas.join("\n") : "  (nenhuma peça translúcida)");
}
