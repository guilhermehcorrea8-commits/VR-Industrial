import * as THREE from "three";

// Indicador do próximo passo da linha de produção.
//
// Dentro do headset a DOM não aparece, então o alvo recebe um farol 3D: uma
// seta flutuante e uma caixa de linhas finas em volta da peça. Fora dele, a
// bússola do HUD aponta para a peça mesmo quando ela está fora do campo de visão.
export function criarIndicadorProximoPasso({
  scene,
  camera,
  obterAlvos,
  elemento,
  seta,
  rotulo
}) {
  const grupo = new THREE.Group();
  grupo.name = "IndicadorProximoPasso";
  grupo.visible = false;
  scene.add(grupo);

  // Contorno fino do ponto de interação. Não gira nem flutua: é a referência
  // estável do que precisa ser acionado.
  const moldura = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
      depthWrite: false
    })
  );
  moldura.name = "CaixaAlvoProximoPasso";
  moldura.visible = false;
  moldura.frustumCulled = false;
  moldura.renderOrder = 996;
  scene.add(moldura);

  const material = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false
  });

  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 10), material);
  haste.position.y = 0.2;

  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 14), material);
  ponta.position.y = 0.02;
  ponta.rotation.x = Math.PI;

  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.011, 8, 28), material);
  anel.position.y = 0.34;
  anel.rotation.x = Math.PI / 2;

  for (const parte of [haste, ponta, anel]) {
    parte.renderOrder = 997;
    parte.frustumCulled = false;
    grupo.add(parte);
  }

  const caixa = new THREE.Box3();
  const centro = new THREE.Vector3();
  const tamanho = new THREE.Vector3();
  const ancora = new THREE.Vector3();
  const posicaoCamera = new THREE.Vector3();
  const frente = new THREE.Vector3();
  const direcao = new THREE.Vector3();

  let passo = null;
  let temAlvo = false;
  let visivel = false;
  let baseY = 0;
  let tempo = 0;
  let ultimoTexto = "";
  let ultimoGraus = null;

  function esconder() {
    if (!visivel && !grupo.visible && !moldura.visible) return;
    visivel = false;
    grupo.visible = false;
    moldura.visible = false;
    elemento?.classList.remove("visible");
  }

  function definirPasso(novoPasso) {
    passo = novoPasso ?? null;
    temAlvo = false;

    if (!passo) {
      esconder();
      return;
    }

    const alvos = obterAlvos?.(passo) ?? [];
    if (!alvos.length) {
      esconder();
      return;
    }

    // As peças recém-montadas podem ainda não ter a matriz de mundo atualizada;
    // sem isso a caixa nasce na origem.
    scene.updateMatrixWorld(true);

    caixa.makeEmpty();
    for (const alvo of alvos) caixa.expandByObject(alvo);
    caixa.getCenter(centro);
    caixa.getSize(tamanho);

    const folga = 0.035;
    moldura.position.copy(centro);
    moldura.scale.set(
      Math.max(tamanho.x + folga, 0.08),
      Math.max(tamanho.y + folga, 0.08),
      Math.max(tamanho.z + folga, 0.08)
    );

    ancora.set(centro.x, caixa.max.y, centro.z);
    baseY = ancora.y + 0.72;
    grupo.position.set(ancora.x, baseY, ancora.z);
    temAlvo = true;
    ultimoTexto = "";
    ultimoGraus = null;
    if (rotulo) rotulo.textContent = `Próximo: ${passo.alvo}`;
  }

  function atualizar(delta, ativo) {
    tempo += delta;

    const mostrar = Boolean(ativo && passo && temAlvo);
    if (!mostrar) {
      esconder();
      return;
    }

    if (!visivel) {
      visivel = true;
      grupo.visible = true;
      moldura.visible = true;
      elemento?.classList.add("visible");
    }

    grupo.position.y = baseY + Math.sin(tempo * 2.4) * 0.07;
    grupo.rotation.y += delta * 0.8;

    camera.getWorldPosition(posicaoCamera);
    camera.getWorldDirection(frente);
    frente.y = 0;
    if (frente.lengthSq() < 1e-6) frente.set(0, 0, -1);
    frente.normalize();

    direcao.set(ancora.x - posicaoCamera.x, 0, ancora.z - posicaoCamera.z);
    const distancia = Math.max(0.1, direcao.length());
    direcao.normalize();

    // Ângulo relativo à frente da câmera: 0 = alvo em frente, +90° = à direita.
    const cosseno = frente.dot(direcao);
    const seno = frente.x * direcao.z - frente.z * direcao.x;
    const graus = (Math.atan2(seno, cosseno) * 180) / Math.PI;

    if (seta && (ultimoGraus === null || Math.abs(graus - ultimoGraus) > 0.5)) {
      seta.style.transform = `rotate(${graus - 90}deg)`;
      ultimoGraus = graus;
    }

    const texto = `Próximo: ${passo.alvo} · ${Math.round(distancia)} m`;
    if (rotulo && texto !== ultimoTexto) {
      rotulo.textContent = texto;
      ultimoTexto = texto;
    }
  }

  return { definirPasso, atualizar, grupo, moldura };
}
