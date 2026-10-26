
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class CincoMaquinasSENAI {
  constructor(scene, onMessage = console.log) {
    this.scene = scene;
    this.onMessage = onMessage;
    this.loader = new GLTFLoader();

    this.maquinas = [];
    this.carregando = false;
    this.erros = [];

    this.config = [
      {
        id: "furadeira",
        nome: "Furadeira de bancada",
        arquivo: "furadeira_bancada_detalhada.glb",
        x: -10,
        z: -8,
        rotacaoY: 0,
        rotacaoX: 0
      },
      {
        id: "cnc",
        nome: "Máquina CNC",
        arquivo: "maquina_cnc_interativa_detalhada.glb",
        x: -4,
        z: -8,
        rotacaoY: 0,
        rotacaoX: 0
      },
      {
        id: "torno",
        nome: "Torno mecânico",
        arquivo: "torno_mecanico_interativo.glb",
        x: 3,
        z: -8,
        rotacaoY: 0,
        rotacaoX: 0
      },
      {
        id: "clp",
        nome: "Painel de automação com CLP",
        arquivo: "painel_automacao_clp_realista.glb",
        x: 9,
        z: -8,
        rotacaoY: 0,
        rotacaoX: 0
      },
      {
        id: "esteira",
        nome: "Esteira industrial",
        arquivo: "esteira_industrial_interativa.glb",
        x: 0,
        z: 3,
        rotacaoY: 0,
        rotacaoX: 0
      }
    ];
  }

  mensagem(texto) {
    console.log("[Máquinas SENAI]", texto);

    try {
      this.onMessage(texto);
    } catch (erro) {
      console.error(
        "[Máquinas SENAI] Erro ao atualizar a interface:",
        erro
      );
    }
  }

  async carregarModeloComTimeout(caminho, tempoLimite = 20000) {
    let temporizador;

    try {
      return await Promise.race([
        this.loader.loadAsync(caminho),
        new Promise((_, reject) => {
          temporizador = setTimeout(() => {
            reject(
              new Error(
                `Tempo limite de ${tempoLimite / 1000}s excedido.`
              )
            );
          }, tempoLimite);
        })
      ]);
    } finally {
      clearTimeout(temporizador);
    }
  }

  async carregarTodas() {
    if (this.carregando) {
      this.mensagem("O carregamento já está em andamento.");
      return this.maquinas;
    }

    this.carregando = true;
    this.erros = [];

    try {
      for (const config of this.config) {
        if (this.encontrar(config.id)) {
          continue;
        }

        this.mensagem(`Carregando ${config.nome}...`);

        try {
          const caminho = "./models/" + config.arquivo;
          const gltf = await this.carregarModeloComTimeout(caminho);

          if (!gltf || !gltf.scene) {
            throw new Error("O arquivo GLB não possui uma cena válida.");
          }

          const modelo = gltf.scene;
          modelo.name = config.id;

          modelo.rotation.set(
            config.rotacaoX,
            config.rotacaoY,
            0
          );

          modelo.updateMatrixWorld(true);

          // Calcula o tamanho e o ponto inferior do modelo.
          const caixa = new THREE.Box3().setFromObject(modelo);

          if (!caixa.isEmpty()) {
            const centro = new THREE.Vector3();
            caixa.getCenter(centro);

            modelo.position.set(
              -centro.x,
              -caixa.min.y,
              -centro.z
            );
          } else {
            modelo.position.set(0, 0, 0);
          }

          modelo.updateMatrixWorld(true);

          // Grupo que posiciona a máquina dentro do galpão.
          const suporte = new THREE.Group();
          suporte.name = `${config.id}_suporte`;
          suporte.position.set(config.x, 0, config.z);

          suporte.userData.id = config.id;
          suporte.userData.nome = config.nome;
          suporte.userData.tipo = "maquina";
          suporte.userData.ligada = false;
          suporte.userData.emergencia = false;

          modelo.userData.id = config.id;
          modelo.userData.nome = config.nome;
          modelo.userData.tipo = "maquina";
          modelo.userData.ligada = false;
          modelo.userData.emergencia = false;

          modelo.traverse((objeto) => {
            if (objeto.isMesh) {
              objeto.castShadow = true;
              objeto.receiveShadow = true;
              objeto.userData.idMaquina = config.id;
            }
          });

          suporte.add(modelo);
          this.scene.add(suporte);

          this.maquinas.push({
            id: config.id,
            nome: config.nome,
            arquivo: config.arquivo,
            modelo,
            suporte,
            ligada: false,
            emergencia: false,
            carregada: true
          });

          this.mensagem(`${config.nome} carregada com sucesso.`);
        } catch (erro) {
          console.error(
            `[Máquinas SENAI] Falha ao carregar ${config.nome}:`,
            erro
          );

          this.erros.push({
            id: config.id,
            nome: config.nome,
            arquivo: config.arquivo,
            erro: erro.message
          });

          this.mensagem(
            `Falha em ${config.nome}: ${erro.message}`
          );
        }
      }

      const total = this.maquinas.length;
      const falhas = this.erros.length;

      this.mensagem(
        `${total} de ${this.config.length} máquinas carregadas.` +
        (falhas > 0
          ? ` ${falhas} falha(s). Consulte o Console.`
          : "")
      );

      return this.maquinas;
    } finally {
      this.carregando = false;
    }
  }

  encontrar(id) {
    return this.maquinas.find((maquina) => maquina.id === id);
  }

  resolver(idOuNome) {
    return this.maquinas.find(
      (maquina) =>
        maquina.id === idOuNome ||
        maquina.nome === idOuNome
    );
  }

  sincronizarEstado(maquina) {
    if (!maquina) return;

    for (const objeto of [maquina.modelo, maquina.suporte]) {
      if (!objeto) continue;

      objeto.userData.ligada = maquina.ligada;
      objeto.userData.emergencia = maquina.emergencia;
    }
  }

  ligar(id) {
    const maquina = this.resolver(id);

    if (!maquina) {
      this.mensagem(`Máquina não encontrada: ${id}`);
      return false;
    }

    if (maquina.emergencia) {
      this.mensagem(
        `${maquina.nome}: rearme a emergência antes de ligar.`
      );
      return false;
    }

    maquina.ligada = true;
    this.sincronizarEstado(maquina);

    this.mensagem(`${maquina.nome} ligada (simulação).`);
    return true;
  }

  parar(id) {
    const maquina = this.resolver(id);

    if (!maquina) {
      this.mensagem(`Máquina não encontrada: ${id}`);
      return false;
    }

    maquina.ligada = false;
    this.sincronizarEstado(maquina);

    this.mensagem(`${maquina.nome} parada.`);
    return true;
  }

  emergencia(id) {
    const maquina = this.resolver(id);

    if (!maquina) {
      this.mensagem(`Máquina não encontrada: ${id}`);
      return false;
    }

    maquina.ligada = false;
    maquina.emergencia = true;
    this.sincronizarEstado(maquina);

    this.mensagem(
      `${maquina.nome}: parada de emergência simulada!`
    );

    return true;
  }

  rearmar(id) {
    const maquina = this.resolver(id);

    if (!maquina) {
      this.mensagem(`Máquina não encontrada: ${id}`);
      return false;
    }

    maquina.emergencia = false;
    maquina.ligada = false;
    this.sincronizarEstado(maquina);

    this.mensagem(
      `${maquina.nome}: emergência rearmada. Máquina parada.`
    );

    return true;
  }

  pararTodas() {
    for (const maquina of this.maquinas) {
      maquina.ligada = false;
      this.sincronizarEstado(maquina);
    }

    this.mensagem("Todas as máquinas foram paradas.");
  }

  obterEstado(id) {
    const maquina = this.resolver(id);

    if (!maquina) return null;

    return {
      id: maquina.id,
      nome: maquina.nome,
      carregada: maquina.carregada,
      ligada: maquina.ligada,
      emergencia: maquina.emergencia
    };
  }

  listar() {
    return this.maquinas.map((maquina) => ({
      id: maquina.id,
      nome: maquina.nome,
      ligada: maquina.ligada,
      emergencia: maquina.emergencia
    }));
  }

  atualizar(delta) {
    // Reservado para animações futuras.
  }
}
