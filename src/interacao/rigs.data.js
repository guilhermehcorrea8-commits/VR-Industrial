// Peças que viram mecanismos animáveis.
//
// Cada item lista nomes-base de meshes do scene.glb. `montarMaquina()` mantém
// essas peças fora da mescla e `criarRigs()` as agrupa sob um nó com pivô
// derivado da própria caixa da peça. O nome do grupo é o contrato com as
// animações futuras: um clipe pode animar `CNC_Porta_Esquerda.position`, por
// exemplo, sem que a lógica de interação em src/interacoes.js mude.
//
// `movimento` é o fallback provisório, usado só enquanto não há clipe para a
// ação. Use `null` para deixar o grupo apenas preparado para receber animação.

const deslizar = (eixo, distancia) => ({ tipo: "deslizar", eixo, distancia });
const girar = (eixo, angulo = 0) => ({ tipo: "girar", eixo, angulo });

export const RIGS = {
  cnc: [
    {
      id: "porta_esquerda",
      nome: "CNC_Porta_Esquerda",
      pecas: ["LeftSlidingDoor"],
      movimento: deslizar([1, 0, 0], -0.95)
    },
    {
      id: "porta_direita",
      nome: "CNC_Porta_Direita",
      pecas: ["RightSlidingDoor"],
      movimento: deslizar([1, 0, 0], 0.95)
    },
    {
      // Só o conjunto que gira: o cabeçote e a carcaça ficam no corpo estático.
      id: "arvore",
      nome: "CNC_Arvore",
      pecas: ["SpindleNose", "ToolHolder", "CNC_Tool"],
      pivo: "centro",
      movimento: girar([0, 1, 0])
    }
  ],

  torno: [
    {
      id: "mandril",
      nome: "Torno_Mandril",
      pecas: [
        "ChuckBackplate", "ChuckBody", "ChuckFace",
        "ChuckJaw", "WorkpieceBar"
      ],
      movimento: girar([1, 0, 0])
    },
    {
      id: "protetor",
      nome: "Torno_Protetor",
      pecas: ["ChuckGuardTop"],
      movimento: deslizar([0, 1, 0], 0.14),
      inicial: 1
    },
    {
      id: "carro",
      nome: "Torno_Carro",
      pecas: [
        "CarriageSaddle", "CrossSlide", "CompoundSlide",
        "ToolPostBase", "ToolPost", "ToolHolder", "CuttingTool",
        "CarriageHandwheelHub", "CarriageHandwheel", "CarriageSpoke"
      ],
      movimento: deslizar([1, 0, 0], -0.18)
    },
    {
      id: "contraponto",
      nome: "Torno_Contraponto",
      pecas: ["TailstockQuill", "TailstockCenter"],
      movimento: deslizar([1, 0, 0], -0.08)
    },
    {
      id: "volante_contraponto",
      nome: "Torno_Volante_Contraponto",
      pecas: [
        "TailstockHandwheelHub", "TailstockHandwheel",
        "TailstockSpoke", "TailstockGrip"
      ],
      movimento: girar([1, 0, 0], Math.PI * 0.75)
    }
  ],

  clp: [
    {
      // A porta é o quadro + a janela de acrílico + puxador. O visor continua
      // atravessável e não é peça de missão; o grupo inteiro gira no eixo
      // esquerdo do quadro, em 100°.
      id: "porta",
      nome: "CLP_Porta",
      pecas: [
        "Panel_Door_Left", "Panel_Door_Right",
        "Panel_Door_Top", "Panel_Door_Bottom",
        "Panel_Window_Glass",
        "Door_Handle_Base", "Door_Handle", "Door_Lock"
      ],
      pivo: { borda: "x", lado: -1 },
      movimento: girar([0, 1, 0], -1.75)
    }
  ],

  bancada_central_senai: [
    {
      id: "armario_esquerdo",
      nome: "BancadaSENAI_Porta_Esquerda",
      pecas: ["Porta_armario_esquerda"],
      pivo: { borda: "x", lado: -1 },
      movimento: girar([0, 1, 0], -1.2)
    },
    {
      id: "armario_direito",
      nome: "BancadaSENAI_Porta_Direita",
      pecas: ["Porta_armario_direita"],
      pivo: { borda: "x", lado: 1 },
      movimento: girar([0, 1, 0], 1.2)
    }
  ],

  bancada_central: [
    {
      // Esta bancada foi desenhada de costas: a frente local fica em -Z, por
      // isso os sinais de abertura são o espelho das outras bancadas.
      id: "armario_esquerdo",
      nome: "BancadaCentral_Porta_Esquerda",
      pecas: ["Porta_esquerda"],
      pivo: { borda: "x", lado: -1 },
      movimento: girar([0, 1, 0], 1.2)
    },
    {
      id: "armario_direito",
      nome: "BancadaCentral_Porta_Direita",
      pecas: ["Porta_direita"],
      pivo: { borda: "x", lado: 1 },
      movimento: girar([0, 1, 0], -1.2)
    }
  ],

  bancada_prensa: [
    {
      id: "ram",
      nome: "Prensa_Ram",
      pecas: ["Embolo_prensa", "Sapata_embolo"],
      movimento: deslizar([0, 1, 0], -0.045)
    },
    {
      id: "balancim",
      nome: "Prensa_Balancim",
      pecas: ["Balancim_barra_prateada"],
      movimento: girar([0, 0, 1], 0.55)
    }
  ]
};

// Nomes de nós que os clipes futuros podem animar sem tocar na interação.
// A furadeira tem rig próprio, montado em src/furadeira.js:
//   Alavanca de avanço · Árvore · Mandril · Mesa da furadeira
export const NOS_DE_ANIMACAO = Object.fromEntries(
  Object.entries(RIGS).map(([id, defs]) => [id, defs.map((def) => def.nome)])
);
