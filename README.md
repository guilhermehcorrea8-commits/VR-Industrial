# SENAI VR — Oficina de Usinagem (Three.js / WebXR)

Simulador de treinamento industrial para realidade virtual. Reproduz o galpão da
metalurgia do **SENAI Mecatrônica — Caxias do Sul** a partir de cinco fotos de
referência e carrega as máquinas reais do arquivo `scene.glb`, com missões
guiadas, pontuação e seleção por mira em três modos de uso: PC, celular e VR.

## Como executar

```bash
cd senai_vr_industrial
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
  render.js         — renderer, redimensionamento e orçamento por dispositivo
  materials.js      — texturas procedurais (concreto, tijolo, reboco, tela...)
  galpao.js         — galpão: paredes, telhão, treliças, portão, corredor
  maquinas.js       — CATALOGO + divisão e montagem do GLB + regra de seleção
  missoes.js        — 6 missões / 29 passos, pontuação e progresso
  ui.js             — contratos de DOM + painel 3D para VR
  input.js          — jogador, entrada (teclado/toque/XR) e colisão AABB
  controls/
    computerControls.js — WASD + PointerLock
    mobileControls.js   — botões de tela, arrastar-para-olhar, botão de seleção
    vrControls.js       — controllers WebXR, ray de seleção e teleporte por grip
tools/
  listar-nos.mjs     — imprime a hierarquia de nós do GLB
  medir-maquinas.mjs — dimensões e contagem de meshes por máquina
  bbox-peca.mjs      — bounding box de cada peça nomeada de uma máquina
  translucidos.mjs   — varre materiais com alpha (BLEND/MASK ou opacidade < 1)
```

Os scripts de `tools/` rodam em Node sem abrir o navegador (`node tools/bbox-peca.mjs clp`)
e foram o que permitiu acertar as caixas-colisoras e as peças das missões sem
olho no arquivo.

`main.js.legado-*`, `src/maquinas.js.legado-*` e `main.js.bak-*` são cópias de
segurança da versão anterior. Nada no projeto as importa.

## O galpão

Geometria lida das fotos (`src/galpao.js`, constantes em `MEDIDAS`):

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
execução: **64 peças de missão, 186 alvos de raycast, 10 máquinas**.

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
- **Mobile**: botão **OLHAR / TOCAR** dispara a mesma seleção pelo raycast da mira.
- **VR**: gatilho do controller seleciona na ponta do raio; segurar **grip**
  mostra o alvo no chão e soltá-lo teleporta (sem teleporte acidental quando há
  máquina na mira).

`src/missoes.js` guarda as 6 missões — reconhecimento de segurança, furadeira,
CNC, torno, painel CLP e ajustagem — num total de **29 passos**. Acerto vale
**+100**, erro **-15** (o placar não cai abaixo de zero). O HUD, o painel 3D em
VR e a mensagem flutuante são atualizados pelo mesmo `publicar()`.
`missoes.alvoEsperado` expõe a peça do passo atual, e é ela que a tolerância de
atravessar visor usa.

## Qualidade por dispositivo

`src/render.js` define `ORCAMENTOS` para `desktop`, `mobile` e `vr` (pixel
ratio máximo, sombras ligadas e tamanho do shadow map). O modo é reavaliado ao
entrar e ao sair do XR por `aplicarQualidade()` — que também descarta o shadow
map antigo e força `shadowMap.needsUpdate`, sem o que os shaders não são
recompilados ao desligar as sombras.

## Depuração

`window.__oficina` expõe `{ THREE, scene, camera, jogador, renderer, missoes,
alvos, entrada, CATALOGO }` no console do navegador. O console também imprime,
por máquina, `meshes originais → draw calls`, dimensões em metros e o resumo do
carregamento; nós não reconhecidos pelo `CATALOGO` geram um `console.warn`.

## Controles

| Ação | PC | Celular | VR |
|------|----|---------|-----|
| Andar | `W` `A` `S` `D` / setas | botões na tela | stick do controller |
| Correr | `Shift` | — | — |
| Olhar | mouse (PointerLock) | arrastar a tela | mover a cabeça |
| Selecionar | clique | **OLHAR / TOCAR** | gatilho |
| Teleporte | — | — | segurar **grip**, mirar o chão, soltar |
| Liberar mouse | `Esc` | — | — |
| Entrar em VR | botão **Enter VR** na barra superior | (não suportado) | — |
