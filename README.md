# SENAI VR — Oficina de Usinagem (Three.js / WebXR)

Simulador de treinamento industrial para realidade virtual. Reproduz o galpão da
metalurgia do **SENAI Mecatrônica — Caxias do Sul** a partir de cinco fotos de
referência e carrega as máquinas reais do arquivo `scene.glb`, com missões
guiadas, pontuação e seleção por mira em três modos de uso: PC, celular e VR.

## Como executar

```bash
cd VR-Industrial
python -m http.server 8000
```

Abra <http://localhost:8000/index.html>.

> **Nunca use `file://`.** O projeto depende de módulos ES, `importmap` e do
> `fetch` do `scene.glb`; além disso o WebXR só é liberado em `localhost` ou
> HTTPS. Para usar o headset, o servidor precisa ser alcançável pela rede do
> óculos (ex.: `python -m http.server 8000 --bind 0.0.0.0` e acessar
> `http://<IP-do-PC>:8000` a partir do navegador do Quest).

Terceiras dependências vêm por CDN (Three.js **r180** via `importmap` em
`index.html`). É a única rede externa do projeto.

## Estrutura

```
index.html          — DOM (HUD, tela de carga, controles mobile), importmap
style.css           — todo o estilo
main.js             — montagem da cena, loop, seleção, ligação entre módulos
scene.glb           — as 10 máquinas (1,6 MB)
src/
  nucleo/
    render.js       — renderer, redimensionamento e orçamento por dispositivo
    input.js        — jogador, entrada compartilhada e colisão AABB
  cena/
    materials.js    — texturas procedurais (concreto, tijolo, reboco, tela...)
    galpao.js       — galpão: paredes, telhão, treliças, portão, corredor
    maquinas.js     — CATALOGO + divisão e montagem do GLB + regra de seleção
    furadeira.js    — mecanismo da alavanca de avanço (giro, curso do punção, eixo)
  interacao/
    interacoes.js   — motor de interação: seleção → comportamento → ação
    comportamentos.js — estados, intertravamentos e feedback das 10 máquinas
    rigs.data.js    — peças animáveis e movimento provisório de cada rig
    rigs.js         — grupos pivotados montados a partir do GLB
    mecanismos.js   — fallback de deslizar/girar quando não há clipe
    animacoes.js    — ponte entre ações semânticas e clipes (AnimationMixer)
    animacoes.manifest.js — catálogo dos clipes que serão produzidos
    indicador.js    — seta 3D, caixa fina e bússola do próximo passo
  missoes/
    missoes.js      — 6 missões / 31 passos, pontuação e progresso
  interface/
    ui.js           — contratos de DOM + painel 3D para VR
  controles/
    computerControls.js — WASD + PointerLock
    mobileControls.js   — botões de tela, arrastar-para-olhar, botão de seleção
    vrControls.js       — controllers WebXR, gamepad, mira e teleporte por grip
    gamepad.js          — leitura da Gamepad API (controle Bluetooth/HID)
legado/
  main.js.legado-20261104
  main.js.bak-20261104-090324
  maquinas.js.legado-20261104
tools/
  listar-nos.mjs     — imprime a hierarquia de nós do GLB
  medir-maquinas.mjs — dimensões e contagem de meshes por máquina
  bbox-peca.mjs      — bounding box de cada peça nomeada de uma máquina
  translucidos.mjs   — varre materiais com alpha (BLEND/MASK ou opacidade < 1)
```

Os scripts de `tools/` rodam em Node sem abrir o navegador (`node tools/bbox-peca.mjs clp`)
e foram o que permitiu acertar as caixas-colisoras e as peças das missões sem
olho no arquivo.

`legado/` guarda cópias de segurança da versão anterior. Nada no projeto as
importa; pode apagá-las quando a nova organização estiver validada.

## O galpão

Geometria lida das fotos (`src/cena/galpao.js`, constantes em `MEDIDAS`):

- salão de **18 × 28 m**, parede de 6,2 m, beiral do fundo a 7,0 m;
- telhado metálico de **uma água** (inclina para a frente) sobre terças;
- **treliças de alma paralela em zigue-zague**, pintadas de verde;
- **tijolo aparente até ~3 m** e reboco branco acima;
- janelas altas, **portão basculante** de 7 × 4,2 m, tubo azul de ar comprimido
  e luminárias lineares suspensas;
- **mureta + vitrine de vidro** separando a oficina do corredor.

Piso, paredes, telhado, vidros e equipamentos de segurança são sólidos: entram
na lista `colisores` (colisão AABB com deslizamento por eixo) e `selecionaveis`
(o `Extintor` e o `Armário de emergências` são alvos de missão).

## As máquinas (`scene.glb` → `CATALOGO`)

O arquivo contém 10 máquinas num só modelo, exportadas com **Z para cima**; a
rotação para Y-up está queimada nas matrizes dos nós raiz. `dividirSceneGlb()`
as separa pelo nome dos nós e `montarMaquina()` faz o resto:

| id | nome |
|----|------|
| `cnc` | Centro de usinagem CNC |
| `torno` | Torno mecânico |
| `esteira` | Esteira transportadora |
| `furadeira` | Furadeira de coluna |
| `clp` | Painel de automação CLP |
| `bancada_extra_longa` | Bancada de ajustagem com quatro morsas |
| `bancada_central_senai` | Bancada SENAI com armário |
| `bancada_ajustagem` | Bancada de ajustagem azul |
| `bancada_central` | Bancada central com quatro morsas |
| `bancada_prensa` | Bancada com prensa vertical |

Cada item do `CATALOGO` lista em `pecas` as **peças interativas** que a missão
usa (`[nó do modelo, idPeca, rótulo, descrição]`). Essas peças ficam como
meshes próprias, com `userData.interativo`, `idPeca`, `idEquipamento`,
`nomeEquipamento` e `descricao`. **Todas as outras meshes do corpo são
mescladas por material** (`mergeGeometries`, geometria assentada em
`applyMatrix4(matrixWorld)`), o que derruba o número de draw calls de mais de
mil para algumas centenas — essencial para o Quest. Resultado medido em
execução: **80 peças de missão, 235 draw calls, 15 rigs e 67 ações**.

Peças listadas em `CATALOGO[].mecanicas` também ficam fora da mescla, mas sem
`interativo`: são corpo de mecanismo (o cubo e os raios da alavanca, o punção e
a broca), marcadas com `userData.base` para o módulo do equipamento reconhecê-
las pelo nome mesmo com sufixo numérico.

As peças de `RIGS` (`src/interacao/rigs.data.js`) seguem a mesma ideia, mas ganham um
`Group` com nome fixo e pivô calculado da própria caixa — é o que permite
animá-las sem reexportar o GLB. `montarMaquina()` as mantém fora da mescla e
`criarRigs()` as reparenta preservando a transformação de mundo.

### Visores atravessáveis

Algumas peças precisam deixar a mira passar: sem isso, o acrílico da porta do
painel CLP (exportado **opaco**, com o `alphaMode` perdido na exportação)
selava CPU, disjuntores e relés, e o protetor da furadeira escondia o mandril.

- `CATALOGO[].visores` nomeia as meshes que recebem material translúcido
  (`materialVisor`: `transparent`, `opacity 0.26`, `depthWrite: false`,
  `DoubleSide`) e ficam fora de `interativas`;
- qualquer peça de missão que o modelo já exporta translúcida (o
  `GuardScreen`) marca `userData.atravessavel` automaticamente;
- `escolherAcerto(acertos, idEsperado)` pega o primeiro acerto não atravessável
  e, se ele for um visor, aceita um alvo do **mesmo equipamento** até 0,3 m
  atrás dele. É por isso que a mira chega ao mandril através do protetor.

## Seleção e missões

- **PC**: PointerLock; clique seleciona o que está na mira central.
- **Mobile**: arrastar a tela olha; tocar na tela dispara a mesma seleção pelo
  raycast da mira (não há botão de olhar separado).
- **VR**: gatilho do controller seleciona na ponta do raio; segurar **grip**
  mostra o alvo no chão e soltá-lo teleporta (sem teleporte acidental quando há
  máquina na mira). Com um **gamepad** conectado, o stick esquerdo anda, o
  direito gira e **A/RT** seleciona pela mira central.

`src/missoes/missoes.js` guarda as 6 missões — reconhecimento de segurança, furadeira,
CNC, torno, painel CLP e ajustagem — num total de **31 passos**. Acerto vale
**+100**, erro **-15** (o placar não cai abaixo de zero). O HUD, o painel 3D em
VR e a mensagem flutuante são atualizados pelo mesmo `publicar()`.
`missoes.alvoEsperado` expõe a peça do passo atual, e é ela que a tolerância de
atravessar visor usa.

### Controle no VR (gamepad)

`src/controles/gamepad.js` lê qualquer controle que a **Gamepad API** exponha no
aparelho que está rodando a experiência: um controle Bluetooth pareado com o
celular/Quest ou um celular que se apresente como joystick HID. O layout usado
é o `standard`:

| Entrada | Ação |
|---------|------|
| stick esquerdo / D-pad | andar (frente, trás, lados) |
| stick direito | girar o corpo (yaw), sem mexer na cabeça |
| A (botão 0) ou gatilho direito (7) | selecionar o que está na mira |
| LB (4) ou clique do stick esquerdo (10) | correr |

O leitor só é consultado dentro da sessão XR; fora dela, teclado e tela seguem
valendo. Os controllers do headset continuam funcionando ao mesmo tempo — as
entradas somam. A rotação é aplicada ao `jogador`, então câmera e controllers
giram juntos e a direção de caminhada acompanha.

Um celular usado como controle precisa aparecer em `navigator.getGamepads()`
como um gamepad padrão (pareamento HID por Bluetooth). Um celular que apenas
abre uma página web **não** vira gamepad do outro aparelho sem um servidor de
retransmissão; nesse caso, o caminho suportado é o controle Bluetooth/HID
pareado diretamente ao aparelho que transmite a experiência.

### Próximo passo e feedback

`src/interacao/indicador.js` acompanha o passo atual da missão: uma seta
flutuante fica sobre a peça-alvo e uma **caixa de linhas finas** envolve o ponto
de interação (ambas visíveis dentro do headset, desenhadas por cima do corpo da
máquina). Uma bússola no HUD aponta para a peça e mostra a distância, mesmo
quando ela está atrás da câmera. No celular o card de **CONTROLES** fica oculto
— os botões de movimento já estão na tela e o olhar é o arrasto sobre a cena.

Quando uma interação é recusada, o HUD usa duas frases fixas:

- **Não possui a peça necessária** quando falta a peça exigida pelo passo
  (ciclo da CNC sem peça fixada, torno sem peça no mandril);
- **Não é possível interagir agora** nos demais bloqueios.

O motivo detalhado de cada recusa continua no console
(`[interação bloqueada] ...`) para depuração.

## Sistema de interação das máquinas

O clique, o toque e o gatilho do controller não chamam mais um mecanismo
específico. `main.js` entrega o alvo a `interacoes.acionar(alvo)`; o motor
encontra a instância pelo `idEquipamento`, o comportamento pelo `idPeca`,
atualiza o estado e devolve a frase exibida no HUD. Missão e interação
continuam independentes: a primeira linha da mensagem é o resultado da missão,
a segunda é a resposta da máquina.

O sistema foi construído para funcionar **sem nenhum arquivo de animação** e
receber os clipes depois sem reescrever a lógica:

| módulo | papel |
|--------|-------|
| `src/interacao/comportamentos.js` | máquina de estados de cada equipamento: intertravamentos, textos e ações semânticas |
| `src/interacao/rigs.data.js` | peças que viram rig, nome do grupo e movimento provisório (deslizar/girar) |
| `src/interacao/rigs.js` | monta os grupos pivotados, preservando a transformação das peças |
| `src/interacao/mecanismos.js` | interpola o movimento provisório de cada rig |
| `src/interacao/animacoes.js` | resolve uma ação semântica para um clipe e mistura com `AnimationMixer` |
| `src/interacao/animacoes.manifest.js` | catálogo onde os clipes futuros são cadastrados |
| `src/interacao/indicador.js` | seta 3D, caixa fina e bússola do HUD para a peça do próximo passo |

**Fluxo de uma ação.** O comportamento valida o intertravamento, altera
`inst.estado` e chama, por exemplo,
`inst.animar("abrir_porta", ["porta_esquerda"], 1)`. Se o manifesto tiver um
clipe para `abrir_porta`, o mixer toca o clipe; se não tiver, o rig provisório
recebe o alvo `1` e `interacoes.atualizar(delta)` interpola o movimento. O
mesmo vale para loops (`animarLoop`), luzes de sinalização (`inst.luz`) e para a
furadeira, que tem rig próprio.

**Intertravamentos implementados.** Todos os estados são locais à máquina e
sobrevivem a `interacoes.reiniciar()`:

- **CNC** — o ciclo exige peça fixada e proteção fechada; abrir a proteção ou
  acionar a emergência interrompe o ciclo. A árvore gira apenas durante o ciclo.
- **Torno** — ligar exige peça apertada no mandril e protetor baixado; o carro,
  o contraponto e a ferramenta só se movem com o torno parado; a emergência
  derruba a rotação.
- **Esteira** — sensor obstruído impede a partida e para o motor; emergência
  corta o movimento; o sinalizador verde acompanha o motor.
- **Furadeira** — ligar exige tampa da correia fechada; o avanço manual funciona
  com o motor desligado, mas a broca só gira com o motor ligado; a mesa sobe e
  desce pelo comando; o rotor ganha e perde rotação com inércia, e o botão
  amarelo repõe a árvore no topo do curso.
- **CLP** — o disjuntor só é acessível com a porta aberta; a porta trava
  energizada; o relé de segurança e a emergência governam CPU e IHM.
- **Bancadas e prensa** — morsas, gavetas, armários e ferramentas são
  independentes; a prensa desce o embolo e retorna sozinha após 0,7 s, e
  conferir a base antes troca o aviso de operação.

**Como plugar as animações.** Exporte um GLB por máquina com clipes nomeados,
coloque-o em `animacoes/` e registre no `MANIFESTO`:

```js
export const MANIFESTO = {
  cnc: {
    arquivo: "./animacoes/cnc.glb",
    acoes: {
      abrir_porta: "CNC_Porta_Abrir",
      fechar_porta: { clipe: "CNC_Porta_Fechar", grupo: "porta" },
      ciclo_cnc: { clipe: "CNC_Usinando", loop: true }
    }
  }
};
```

O `arquivo` é carregado uma vez por máquina; cada ação aceita o nome do clipe
ou `{ clipe, grupo, loop }`. `grupo` é opcional e faz a ação anterior do mesmo
conjunto sair em fade antes da nova (abrir/fechar a mesma porta). Quando o
arquivo tem um único clipe, o nome pode ser omitido. Os tracks devem mirar os
nós de rig abaixo, que ficam dentro do grupo da máquina:

| máquina | nós de rig |
|---------|------------|
| CNC | `CNC_Porta_Esquerda`, `CNC_Porta_Direita`, `CNC_Arvore` |
| Torno | `Torno_Mandril`, `Torno_Protetor`, `Torno_Carro`, `Torno_Contraponto`, `Torno_Volante_Contraponto` |
| CLP | `CLP_Porta` |
| Bancada SENAI | `BancadaSENAI_Porta_Esquerda`, `BancadaSENAI_Porta_Direita` |
| Bancada central | `BancadaCentral_Porta_Esquerda`, `BancadaCentral_Porta_Direita` |
| Prensa | `Prensa_Ram`, `Prensa_Balancim` |
| Furadeira | `Alavanca de avanço`, `Árvore`, `Broca`, `Mesa da furadeira` |

As peças preservadas fora dos rigs (morsas, gavetas, ferramentas, botões)
também podem receber tracks pelo nome do nó do `scene.glb`. A lista completa de
ações emitidas por máquina está em `src/interacao/animacoes.manifest.js`; os nomes dos
nós, em `src/interacao/rigs.data.js`.

A furadeira mantém o estado (degrau, motor, altura da mesa) mesmo quando um
clipe assume o visual: `acionar`, `definirMotor`, `ajustarMesa` e `reporArvore`
aceitam `{ visual: false }`, então os clipes futuros não brigam com o rig
provisório.

## A furadeira em funcionamento

`src/cena/furadeira.js` é o mecanismo procedural próprio da furadeira, integrado ao
sistema de interação. Clicar em qualquer uma das três empunhaduras pretas do
manete — `FeedGrip_0` (atrás), `FeedGrip_1` (cima), `FeedGrip_2` (frente), todas
com `idPeca = alavanca_avanco` — gira o conjunto do cubo em torno do eixo dos
raios e desce a árvore **um degrau por clique**, três degraus até o fundo, cada
um 3% mais fundo que o anterior; no fim do curso o clique seguinte sobe um
degrau de cada vez. Só o `ChuckBody` gira, no próprio eixo, com inércia ao ligar
e ao desligar; o colarinho e o punção apenas descem. A mesa sobe/desce 12 cm
pelo comando `mesa_furadeira`, e as duas luzes do painel mostram o estado: verde
com o eixo ligado, amarela com a máquina desligada.

Nada no módulo usa coordenadas decoradas: o pivô é o centro da caixa do
`FeedHub`, o eixo é o produto vetorial de dois raios e o centro de giro do
mandril vem da caixa do `ChuckBody`.

O `scene.glb` exporta a árvore já no fim do curso — a broca nasce embaixo da
mesa. Por isso o descanso levanta a árvore 15,45 cm e a mesa desce 18 cm (altura
normal de bancada de furadeira): assim o corte acontece **na** superfície da
mesa em vez de dentro dela. Os dois grupos são montados no carregamento, antes
de qualquer clique.

## Caixas de mensagem

A mesma frase sai por três caminhos, e cada um se ajusta sozinho:

- **PC e celular** — `#message`, em `style.css`, mede-se pela janela
  (`clamp()` na fonte, `max-width: min(92vw, 620px)`, `white-space: pre-line`
  para as duas linhas do feedback de missão + mecanismo), com folga do entalhe
  via `env(safe-area-inset-*)` e uma faixa para celular deitado que encolhe a
  caixa antes de brigar com a máquina na mira.
- **VR** — `criarPainelVR` quebra o texto em até quatro linhas e reduz a fonte
  antes de cortar, porque dentro do headset não há rolagem. `ui.mensagem()`
  escreve nos dois destinos (`ui.ligarPainel()`); a DOM fica escondida em XR
  pelo `body.vr-active`.

## Qualidade por dispositivo

`src/nucleo/render.js` define `ORCAMENTOS` para `desktop`, `mobile` e `vr` (pixel
ratio máximo, sombras ligadas e tamanho do shadow map). O modo é reavaliado ao
entrar e ao sair do XR por `aplicarQualidade()` — que também descarta o shadow
map antigo e força `shadowMap.needsUpdate`, sem o que os shaders não são
recompilados ao desligar as sombras.

## Depuração

`window.__oficina` expõe `{ THREE, scene, camera, jogador, renderer, missoes,
alvos, entrada, CATALOGO, painelVR, interacoes, animacoes, indicadorPasso,
leitorGamepad, controlesVR, furadeira }` no console do navegador (a furadeira é
getter: só ganha valor depois do carregamento das máquinas).
`interacoes.estado(id)`, `interacoes.descrever(alvo)` e `interacoes.resumo()`
mostram o estado de cada máquina; `interacoes.reiniciar()` devolve todas ao
estado inicial. `leitorGamepad.id` mostra o controle detectado. O console também
imprime, por máquina, `meshes originais → draw calls`, dimensões em metros e o
resumo de rigs e ações; nós não reconhecidos pelo `CATALOGO` geram um
`console.warn`.

## Controles

| Ação | PC | Celular | VR |
|------|----|---------|-----|
| Andar | `W` `A` `S` `D` / setas | botões na tela | stick do controller ou stick esquerdo do gamepad |
| Correr | `Shift` | — | LB / clique do stick esquerdo |
| Olhar | mouse (PointerLock) | arrastar a tela | mover a cabeça |
| Girar o corpo | — | — | stick direito do gamepad |
| Selecionar | clique | toque na tela | gatilho do controller ou A/RT do gamepad |
| Teleporte | — | — | segurar **grip**, mirar o chão, soltar |
| Liberar mouse | `Esc` | — | — |
| Entrar em VR | botão **Enter VR** no canto inferior direito | (não suportado) | — |
