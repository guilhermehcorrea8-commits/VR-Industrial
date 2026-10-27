# SENAI VR — Oficina de Usinagem (Three.js)

Projeto didático de Realidade Virtual para treinamento industrial, construído com Three.js (geometrias procedurais + carregamento de 5 máquinas).

## Arquivos do projeto

```
index.html        — estrutura DOM (HUD, tela de carregamento, controles mobile)
style.css         — todo o estilo visual
main.js           — cena 3D, controles, seleção de máquinas
cinco-maquinas.js — classe CincoMaquinasSENAI (carrega os 5 modelos)
```

> **Atenção:** `cinco-maquinas.js` **não** foi incluído neste pacote de correções.  
> Ele deve exportar a classe `CincoMaquinasSENAI` com a interface usada em `main.js`:
>
> - `constructor(scene, mostrarMensagem)`
> - `async carregarTodas()`
> - `atualizar(delta)` — opcional
> - `encontrar(id)` → `{ nome, ... }` ou `undefined`
> - `maquinas` (array)

## Como executar localmente

1. Coloque os arquivos na mesma pasta:
   ```
   index.html
   style.css
   main.js
   cinco-maquinas.js
   ```
2. Abra o terminal na pasta do projeto.
3. Inicie um servidor local:
   ```bash
   python -m http.server 8000
   ```
4. Abra no navegador: <http://localhost:8000>

> Use sempre `localhost` (não `file://`) para que módulos ES e o botão VR funcionem corretamente.

## Controles

### Desktop

| Ação | Tecla |
|------|-------|
| Movimentar | `W` `A` `S` `D` ou setas |
| Correr | `Shift` |
| Olhar | Mouse (após clicar na cena) |
| Selecionar máquina | Clique com a mira no centro |
| Liberar mouse | `Esc` |

### Celular / Tablet

- Botões na tela (canto inferior esquerdo) para movimentar.
- Botão **OLHAR / TOCAR** seleciona a máquina na mira central.
- Arraste a tela para olhar ao redor.

### VR (WebXR)

- Botão **Enter VR** aparece na barra superior (quando suportado).
- Requer navegador compatível (Chrome/Edge no Quest, por exemplo) e HTTPS ou `localhost`.

## O que já está funcionando

- Cenário completo: piso de concreto, paredes de tijolo, telhado em duas águas, treliças verdes, janelas altas, portão lateral, luminárias.
- Iluminação com sombras (hemisférica + direcional + point lights).
- Tela de carregamento com botão **ENTRAR NA OFICINA**.
- Movimentação FPS com PointerLock no desktop.
- Controles por toque no mobile.
- Seleção de máquinas por raycast centralizado (desktop e mobile).
- Mensagens de feedback com auto-dismiss.
- Barra inferior e topo atualizados dinamicamente.
- Botão WebXR com container dedicado.

## Correções aplicadas nesta versão

1. **Contrato DOM unificado** entre `index.html` e `main.js` (todos os IDs batem).
2. **Tela de carregamento** desaparece corretamente via `.hidden` e libera o botão **ENTRAR**.
3. **Mensagens** ficam visíveis: `#message` recebe a classe `.visible` e auto-oculta em 3,5 s.
4. **Seleção de máquina** atualiza `#status` e `#selected-object`.
5. **Controles mobile** unificados: apenas o HTML é usado (o sistema duplicado foi removido).
6. **`#look-button`** agora dispara `selecionarObjeto()` no mobile.
7. **Código morto removido** (`painel-controle`, `controles-mobile`, referências a `start-btn`/`instructions` inexistentes).
8. **Try/catch** no loop de renderização evita travar a cena em erros pontuais.
9. **`window.__oficina`** exposto para depuração no console.
10. **CSS** ganhou estilos para `#start-btn`, `#vr-button-container` e `#topbar-right`.

## Próximos passos sugeridos

- Adicionar texturas de tijolo mais detalhadas e painéis de ferramentas na parede.
- Criar sistema de missões com validação (ex.: "aponte para o torno CNC").
- Adicionar áudio ambiente industrial.
- Otimizar o `raycaster` mantendo uma lista cacheada de meshes selecionáveis em vez de percorrer a cena inteira a cada clique.
- Sincronizar `#status` com o estado do WebXR (`sessionstart` / `sessionend`).