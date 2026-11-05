// Ler o chunk JSON do scene.glb e listar nomes-base únicos por filho de topo.
import { readFileSync } from "node:fs";

const buf = readFileSync(new URL("../scene.glb", import.meta.url));
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));

const nodes = json.nodes;

function coletar(ind, acum) {
  const n = nodes[ind];
  if (n.mesh !== undefined) {
    const m = json.meshes[n.mesh];
    let verts = 0;
    let mats = new Set();
    for (const p of m.primitives || []) {
      const acc = json.accessors[p.attributes?.POSITION ?? p.attributes?.position];
      verts += acc?.count || 0;
      mats.add(p.material);
    }
    acum.push({ nome: n.name || "?", materiais: [...mats] });
  }
  for (const f of n.children || []) coletar(f, acum);
  return acum;
}

for (const r of json.scenes[json.scene ?? 0].nodes) {
  const lista = coletar(r, []);
  const nomeRaiz = nodes[r].name || `sem_nome_${r}`;
  const bases = new Map();
  for (const item of lista) {
    const base = item.nome.replace(/_+\d+$/, "");
    if (!bases.has(base)) bases.set(base, { n: 0, mats: new Set() });
    const b = bases.get(base);
    b.n += 1;
    for (const m of item.materiais) b.mats.add(m);
  }
  console.log(`\n##### ${nomeRaiz} :: ${lista.length} meshes`);
  for (const [base, info] of bases) {
    console.log(`  ${base} x${info.n} | mat ${[...info.mats].join(",")}`);
  }
}
