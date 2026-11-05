// Caixa de definição (bbox) de cada máquina do scene.glb, em espaço do arquivo,
// mais o centróide de algumas peças usadas para descobrir para onde cada uma
// aponta. Feito em Node para não depender do navegador.
import { readFileSync } from "node:fs";

const buf = readFileSync(new URL("../scene.glb", import.meta.url));
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen + 8; // header do chunk BIN

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
  return { dados: out, n };
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
  m[0] = (1 - (yy + zz)) * s[0]; m[1] = (xy + wz) * s[0]; m[2] = (xz - wy) * s[0]; m[3] = 0;
  m[4] = (xy - wz) * s[1]; m[5] = (1 - (xx + zz)) * s[1]; m[6] = (yz + wx) * s[1]; m[7] = 0;
  m[8] = (xz + wy) * s[2]; m[9] = (yz - wx) * s[2]; m[10] = (1 - (xx + yy)) * s[2]; m[11] = 0;
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function ponto(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function caixaRaiz(ind) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const pecas = [];

  (function ir(i, pai) {
    const no = json.nodes[i];
    const m = mul(pai, matriz(no));
    if (no.mesh !== undefined) {
      for (const pr of json.meshes[no.mesh].primitives) {
        const acc = lerAcessor(pr.attributes.POSITION);
        for (const p of acc.dados) {
          const q = ponto(m, p);
          for (let k = 0; k < 3; k++) {
            if (q[k] < min[k]) min[k] = q[k];
            if (q[k] > max[k]) max[k] = q[k];
          }
        }
      }
      const c = ponto(m, [0, 0, 0]);
      let soma = [0, 0, 0], cnt = 0;
      for (const p of lerAcessor(json.meshes[no.mesh].primitives[0].attributes.POSITION).dados) {
        const q = ponto(m, p);
        soma = [soma[0] + q[0], soma[1] + q[1], soma[2] + q[2]];
        cnt++;
      }
      pecas.push({ nome: no.name, c: soma.map((s) => +(s / cnt).toFixed(3)) });
    }
    for (const f of no.children || []) ir(f, m);
  })(ind, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  return { min, max, pecas };
}

const ASSINATURAS = [
  ["furadeira", "QuillHousing"],
  ["cnc", "CNCScreen"],
  ["torno", "TailstockBody"],
  ["clp", "CLP_CPU"],
  ["esteira", "Belt_Top"],
  ["bancada_central_senai", "Morsa1_Corpo"],
  ["bancada_prensa", "Fuso_vertical_escuro"],
  ["bancada_extra_longa", "Morsa_4_corpo"],
  ["bancada_central", "Morsa_traseira_direita_corpo"],
  ["bancada_ajustagem", "MorsaAzul_Corpo"]
];

const SONDAS = {
  furadeira: ["ChuckBody", "MotorBody", "QuillHousing", "DrillBit", "WorkTableTop", "GuardScreen"],
  cnc: ["LeftSlidingDoor", "RightSlidingDoor", "BackWall", "CNCScreen", "ControlConsole", "TSlotTable", "TowerGreen"],
  torno: ["Headstock", "TailstockBody", "ChuckBody", "CarriageSaddle", "ControlPanel", "ChuckGuardTop"],
  clp: ["Panel_Door_Left", "Panel_Window_Glass", "Panel_Backplate", "HMI_Screen", "CLP_CPU", "TowerLight_green"],
  esteira: ["Belt_Top", "Motor_Body", "Control_Box", "Workpiece_Main", "Photoelectric_Sensor", "Side_Rail"],
  bancada_extra_longa: ["Tampo_de_madeira_comprido", "Morsa_1_corpo", "Morsa_4_corpo", "Caixa_ferramentas_fundo"],
  bancada_ajustagem: ["Armario_Azul_Corpo", "Tampo_Revestimento_Galvanizado", "Paquimetro_Haste"],
  bancada_prensa: ["Tampo_trapezoidal_aco_escuro", "Base_prensa_azul", "Cabecote_azul", "Balancim_barra_prateada"],
  bancada_central: ["Painel_azul_esquerdo", "Tampo_de_madeira", "Morsa_frontal_esquerda_corpo"],
  bancada_central_senai: ["Estrutura_azul_principal", "Tampo_aco_macico", "Morsa1_Corpo", "Gaveta"]
};

for (const [i, r] of json.scenes[json.scene ?? 0].nodes.entries()) {
  const { min, max, pecas } = caixaRaiz(r);
  const d = max.map((v, k) => +(v - min[k]).toFixed(2));
  const c = max.map((v, k) => +((v + min[k]) / 2).toFixed(2));
  const achado = ASSINATURAS.find(([, sonda]) => pecas.some((p) => p.nome === sonda));
  const rotulo = achado ? achado[0] : `desconhecido_${i}`;
  console.log(`\n[${i}] ${rotulo.padEnd(22)} dim X·Y·Z = ${d.join(" × ")}  centro=${c.join(",")}`);
  for (const alvo of SONDAS[rotulo] || []) {
    for (const p of pecas) if (p.nome === alvo) console.log(`    ${p.nome.padEnd(26)} ${p.c.join(",")}`);
  }
}
