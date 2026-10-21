# SENAI VR - Oficina de Usinagem (Three.js)

Projeto didático de Realidade Virtual para treinamento industrial, construído com Three.js (Opção 1: Geometrias Procedurais).

## Como Executar Localmente

1. Baixe os arquivos (`index.html`, `style.css`, `main.js`).
2. Coloque-os na mesma pasta.
3. Abra o terminal (VS Code) na pasta do projeto.
4. Execute o servidor local:
   ```bash
   python -m http.server 8000

   
---

### O que já está funcionando neste código:
1.  **Cenário Base:** Piso, paredes (no formato da sala) e iluminação.
2.  **Máquinas Low-Poly:** Furadeiras de coluna e bancadas construídas usando cubos e cilindros (exatamente como na foto).
3.  **Controles Desktop:** Andar com WASD, olhar com o mouse (PointerLock).
4.  **Modo VR:** Botão "Enter VR" gerado automaticamente. O clique nos objetos já está preparado para funcionar tanto no Desktop quanto nos controles do VR.
5.  **Sistema de Missões:** O HUD atualiza a cada acerto, validando se você clicou no objeto correto.

**Dica para o teste:** Quando você iniciar, o ponteiro do mouse sumirá (isso é o PointerLock). Para clicar no armário vermelho ou nas máquinas, **aponte a mira para o centro da tela** e dê um **clique com o botão esquerdo**.

Você pode copiar esses códigos, salvar os arquivos e rodar o `python -m http.server 8000`. Teste no computador primeiro e me diga o que achou da movimentação e do clique!

Se tudo estiver funcionando bem, o próximo passo será adicionar as texturas de tijolo e a estrutura verde do teto, e talvez os painéis de ferramentas na parede. Como foi o teste?