// Catálogo de animações por máquina.
//
// Enquanto as animações não chegam, este objeto fica vazio: o sistema de
// interação usa o movimento provisório dos rigs (src/rigs.data.js). Basta
// cadastrar o arquivo e dar um nome de clipe para cada ação — nenhuma linha de
// src/interacoes.js ou src/comportamentos.js precisa mudar.
//
// Formato:
//
//   cnc: {
//     arquivo: "./animacoes/cnc.glb",
//     acoes: {
//       abrir_porta: "CNC_Porta_Abrir",        // clipe curto, toca uma vez
//       fechar_porta: { clipe: "CNC_Porta_Fechar", grupo: "porta" },
//       ciclo_cnc: { clipe: "CNC_Usinando", loop: true }
//     }
//   }
//
// O clipe é resolvido dentro do grupo da máquina, então os tracks devem mirar
// os nós de rig (rigs.data.js) ou nós preservados do scene.glb. O campo
// `grupo` (opcional) para automaticamente a ação anterior do mesmo conjunto
// antes de tocar a nova — útil para abrir/fechar a mesma porta.
//
// Ações emitidas hoje pelo sistema:
//
//   cnc      abrir_porta · fechar_porta · peca_fixar · peca_soltar
//            ciclo_cnc (loop) · emergencia_acionar · emergencia_liberar
//   torno    protetor_abaixar · protetor_levantar
//            mandril_apertar · mandril_soltar
//            ferramenta_posicionar · ferramenta_recolher
//            carro_avancar · carro_recuar
//            contraponto_avancar · contraponto_recuar
//            giro_torno (loop) · emergencia_acionar · emergencia_liberar
//   clp      abrir_porta · fechar_porta · disjuntor_ligar · disjuntor_desligar
//            rele_rearmar · ihm_ligar · ihm_desligar
//            emergencia_acionar · emergencia_liberar
//   esteira  motor_ligar · motor_desligar · sensor_bloquear · sensor_liberar
//            emergencia_acionar · emergencia_liberar · esteira_rodando (loop)
//   furadeira ligar_motor · desligar_motor · reset_comando · avancar_alavanca
//            tampa_abrir · tampa_fechar · mesa_ajustar
//            (o rig da furadeira é montado em src/furadeira.js; o motor e a
//            mesa continuam guardando estado quando um clipe assume o visual)
//   bancadas morsa_fixar · morsa_soltar · ferramenta_pegar · ferramenta_recolher
//            gaveta_abrir · gaveta_fechar · armario_abrir · armario_fechar
//            prensa_acionar · prensa_retornar
//
// Peças preservadas fora dos rigs (morsas, gavetas, ferramentas, botões) também
// podem ser alvo de tracks: os clipes são resolvidos dentro do grupo da máquina
// e usam os mesmos nomes de nó do scene.glb.
//
// Nós de rig disponíveis para os tracks (ver src/rigs.data.js):
//   CNC_Porta_Esquerda · CNC_Porta_Direita · CNC_Arvore
//   Torno_Mandril · Torno_Protetor · Torno_Carro · Torno_Contraponto
//   Torno_Volante_Contraponto
//   CLP_Porta
//   BancadaSENAI_Porta_Esquerda · BancadaSENAI_Porta_Direita
//   BancadaCentral_Porta_Esquerda · BancadaCentral_Porta_Direita
//   Prensa_Ram · Prensa_Balancim
//   (furadeira) Alavanca de avanço · Árvore · Broca · Mesa da furadeira

export const MANIFESTO = {};
