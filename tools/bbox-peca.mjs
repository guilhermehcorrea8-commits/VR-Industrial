// Caixa (min/max) de peças nomeadas, em espaço de arquivo (Y para cima), para
// decidir se uma peça está atrás de um visor de acrílico ou dentro de um
// compartimento fechado. Uso: node tools/bbox-peca.mjs clp
import { readFileSync } from "node:fs";

const alvo = process.argv[2];
const buf = readFileSync(new URL("../scene.glb", import.meta.url));
const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));
const binStart = 20 + buf.readUInt32LE(12) + 8;

const COMPONENTES = { 5126: 4, 5123: 2, 5121: 1, 5125: 4, 5122: 2, 5120: 1 };
const ELEMENTOS = { SCALAR: 1, VEC2: 2, VEC3: 3, MAT4: 16 };

function lerAcessor(i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const tam = COMPONENTES[a.componentType];
  const n = ELEMENTOS[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const passo = bv.byteStride || tam * n;
  const out = [];
  for (let k = 0; k < a.count; k++) {
    const v = [];
    for (let c = 0; c < n; c++) {
      const p = binStart + off + k * passo + c * tam;
      v.push(a.componentType === 5126 ? buf.readFloatLE(p) : buf.readUint32LE(p));
    }
    out.push(v);
  }
  return out;
}

function matriz(no) {
  if (no.matrix) return no.matrix;
  const t = no.translation || [0, 0, 0];
  const r = no.rotation || [0, 0, 0, 1];
  const s = no.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const m = new Array(16).fill(0);
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  m[0] = (1 - (yy + zz)) * s[0]; m[1] = (xy + wz) * s[0]; m[2] = (xz - wy) * s[0];
  m[4] = (xy - wz) * s[1]; m[5] = (1 - (xx + zz)) * s[1]; m[6] = (yz + wx) * s[1];
  m[8] = (xz + wy) * s[2]; m[9] = (yz - wx) * s[2]; m[10] = (1 - (xx + yy)) * s[2];
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

function ponto(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

const I = (v) => +v.toFixed(3);
const DIC = (min, max) => `${min.map(I).join(",")} -> ${max.map(I).join(",")}  [${max.map((v, k) => I(v - min[k])).join(" × ")}]`;

for (const r of json.scenes[json.scene ?? 0].nodes) {
  const achado = [];
  (function ir(i, pai) {
    const no = json.nodes[i];
    const m = mul(pai, matriz(no));
    if (no.mesh !== undefined) {
      for (const pr of json.meshes[no.mesh].primitives) {
        const mi = json.materials[pr.material];
        achado.push({
          nome: no.name || "(sem nome)",
          mat: `${pr.material} ${mi.name || ""}`,
          alpha: mi.alphaMode || "OPAQUE",
          ca: pr.attributes.POSITION,
          m,
        });
        break;
      }
    }
    for (const f of no.children || []) ir(f, m);
  })(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  if (!achado.length) continue;
  // só imprime a máquina cujo marcador bate com o alvo pedido
  const marcadores = {
    clp: "CLP_CPU", cnc: "CNCScreen", furadeira: "QuillHousing",
    torno: "TailstockBody", esteira: "Belt_Top", bancada_prensa: "Fuso_vertical_escuro",
    bancada_ajustagem: "MorsaAzul_Corpo", bancada_central_senai: "Morsa1_Corpo",
    bancada_extra_longa: "Morsa_4_corpo", bancada_central: "Morsa_traseira_direita_corpo"
  };
  if (!achado.some((a) => a.nome === marcadores[alvo])) continue;

  for (const a of achado) {
    const pts = lerAcessor(a.ca).map((p) => ponto(a.m, p));
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const q of pts) for (let k = 0; k < 3; k++) {
      if (q[k] < min[k]) min[k] = q[k];
      if (q[k] > max[k]) max[k] = q[k];
    }
    console.log(`${a.nome.padEnd(26)} ${a.mat.padEnd(34)} ${a.alpha.padEnd(7)} ${DIC(min, max)}`);
  }
  break;
}
