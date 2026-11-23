// Áudio procedural da oficina — nenhum arquivo externo.
//
// O contexto só nasce no primeiro gesto do usuário (política de autoplay dos
// navegadores). O ambiente é ruído marrom filtrado, as máquinas ganham um
// motor próprio (oscilador + filtro) e os efeitos de interface são tons curtos
// desenhados por envelope exponencial. Tudo passa por um compressor e por um
// gain master, que é o volume configurável da tela de ajustes.

const PERFIS = {
  cnc:       { freq: 86,  tipo: "sawtooth", ganho: 0.020, agudo: 0 },
  torno:     { freq: 61,  tipo: "sawtooth", ganho: 0.019, agudo: 0 },
  esteira:   { freq: 46,  tipo: "square",   ganho: 0.016, agudo: 0 },
  furadeira: { freq: 98,  tipo: "sawtooth", ganho: 0.014, agudo: 620, ganhoAgudo: 0.006 },
  clp:       { freq: 118, tipo: "sine",     ganho: 0.007, agudo: 0 },
  padrao:    { freq: 70,  tipo: "sawtooth", ganho: 0.012, agudo: 0 }
};

function limitar(valor, min = 0, max = 1) {
  return Math.min(max, Math.max(min, valor));
}

export function criarAudio(opcoes = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  let ctx = null;
  let master = null;
  let compressor = null;
  let ambienteGain = null;
  let pronto = false;

  let volume = limitar(opcoes.volume ?? 0.7);
  let mudo = Boolean(opcoes.mudo);
  let pausado = false;
  let ambienteDesejado = false;

  const motores = new Map();
  let bufferRuido = null;
  let ultimoPasso = 0;
  let ultimoClique = 0;

  function iniciar() {
    if (pronto) {
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
      return Promise.resolve();
    }
    if (!AudioCtx) return Promise.resolve();

    try {
      ctx = new AudioCtx();

      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.25;

      master = ctx.createGain();
      master.gain.value = mudo ? 0 : volume;
      master.connect(compressor);
      compressor.connect(ctx.destination);

      bufferRuido = criarBufferRuido(2.6, "branco");
      criarAmbiente();

      pronto = true;
      return ctx.resume().catch(() => {});
    } catch (erro) {
      console.warn("[áudio] indisponível:", erro);
      return Promise.resolve();
    }
  }

  function criarBufferRuido(segundos, tipo) {
    const taxa = ctx.sampleRate;
    const amostras = Math.floor(taxa * segundos);
    const buffer = ctx.createBuffer(1, amostras, taxa);
    const dados = buffer.getChannelData(0);
    let ultimo = 0;

    for (let i = 0; i < amostras; i++) {
      const branco = Math.random() * 2 - 1;
      if (tipo === "marrom") {
        ultimo = (ultimo + 0.02 * branco) / 1.02;
        dados[i] = ultimo * 3.2;
      } else {
        dados[i] = branco;
      }
    }

    return buffer;
  }

  function criarAmbiente() {
    const fonte = ctx.createBufferSource();
    fonte.buffer = criarBufferRuido(4, "marrom");
    fonte.loop = true;

    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 430;
    filtro.Q.value = 0.4;

    ambienteGain = ctx.createGain();
    ambienteGain.gain.value = 0;

    fonte.connect(filtro);
    filtro.connect(ambienteGain);
    ambienteGain.connect(master);
    fonte.start();

    // Zumbido elétrico das luminárias, bem abaixo do ruído de fundo.
    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 52;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.08;
    hum.connect(humGain);
    humGain.connect(ambienteGain);
    hum.start();
  }

  function tempo() {
    return ctx?.currentTime ?? 0;
  }

  function motorDe(id) {
    let motor = motores.get(id);
    if (motor) return motor;

    const perfil = PERFIS[id] || PERFIS.padrao;

    const osc = ctx.createOscillator();
    osc.type = perfil.tipo;
    osc.frequency.value = perfil.freq;

    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = Math.max(200, perfil.freq * 5);
    filtro.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(filtro);
    filtro.connect(gain);
    gain.connect(master);
    osc.start();

    let agudo = null;
    let gainAgudo = null;
    if (perfil.agudo) {
      agudo = ctx.createOscillator();
      agudo.type = "triangle";
      agudo.frequency.value = perfil.agudo;
      gainAgudo = ctx.createGain();
      gainAgudo.gain.value = 0;
      agudo.connect(gainAgudo);
      gainAgudo.connect(master);
      agudo.start();
    }

    motor = { id, perfil, osc, filtro, gain, agudo, gainAgudo, ativo: false };
    motores.set(id, motor);
    return motor;
  }

  function definirMotor(id, ativo) {
    if (!pronto) return;

    const motor = motorDe(id);
    const t = tempo();
    const ligado = ativo && !pausado;
    const alvo = ligado ? motor.perfil.ganho : 0;

    // Rotação com inércia: a frequência sobe do repouso em ~0,8 s e cai mais
    // devagar ao desligar, como um motor real.
    motor.osc.frequency.cancelScheduledValues(t);
    if (ligado && !motor.ativo) {
      motor.osc.frequency.setValueAtTime(motor.perfil.freq * 0.55, t);
      motor.osc.frequency.linearRampToValueAtTime(motor.perfil.freq, t + 0.85);
    } else if (!ligado && motor.ativo) {
      motor.osc.frequency.setTargetAtTime(motor.perfil.freq * 0.8, t, 0.25);
    }

    motor.gain.gain.setTargetAtTime(alvo, t, 0.1);

    if (motor.gainAgudo) {
      motor.gainAgudo.gain.setTargetAtTime(
        ligado ? (motor.perfil.ganhoAgudo ?? 0.005) : 0,
        t,
        0.12
      );
    }

    motor.ativo = ligado;
  }

  function sincronizar(lista = []) {
    if (!pronto) return;
    for (const item of lista) definirMotor(item.id, Boolean(item.ativo));
  }

  function pararMaquinas() {
    if (!pronto) return;
    for (const [id] of motores) definirMotor(id, false);
  }

  function ruidoCurto({ duracao = 0.06, freq = 2400, ganho = 0.16, q = 1.1 } = {}) {
    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferRuido;
    fonte.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filtro = ctx.createBiquadFilter();
    filtro.type = "bandpass";
    filtro.frequency.value = freq;
    filtro.Q.value = q;

    const gain = ctx.createGain();
    const t = tempo();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ganho, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duracao);

    fonte.connect(filtro);
    filtro.connect(gain);
    gain.connect(master);
    fonte.start(t);
    fonte.stop(t + duracao + 0.02);
  }

  function tom({ freq, freqFinal = freq, tipo = "sine", duracao = 0.2, ganho = 0.1, atraso = 0 } = {}) {
    const osc = ctx.createOscillator();
    osc.type = tipo;
    const gain = ctx.createGain();
    const t = tempo() + atraso;

    osc.frequency.setValueAtTime(freq, t);
    if (freqFinal !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqFinal), t + duracao);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ganho, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duracao);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + duracao + 0.03);
  }

  function clique() {
    if (!pronto) return;
    const agora = performance.now();
    if (agora - ultimoClique < 60) return;
    ultimoClique = agora;

    ruidoCurto({ duracao: 0.045, freq: 2600, ganho: 0.12, q: 1.4 });
    tom({ freq: 1200, freqFinal: 940, tipo: "square", duracao: 0.05, ganho: 0.035 });
  }

  function acerto() {
    if (!pronto) return;
    tom({ freq: 880, freqFinal: 1320, tipo: "triangle", duracao: 0.16, ganho: 0.075 });
    tom({ freq: 1318.5, tipo: "sine", duracao: 0.28, ganho: 0.05, atraso: 0.07 });
  }

  function erro() {
    if (!pronto) return;
    tom({ freq: 220, freqFinal: 150, tipo: "square", duracao: 0.16, ganho: 0.06 });
    tom({ freq: 190, freqFinal: 120, tipo: "square", duracao: 0.2, ganho: 0.05, atraso: 0.14 });
  }

  function alerta() {
    if (!pronto) return;
    for (let i = 0; i < 3; i++) {
      tom({ freq: 880, tipo: "square", duracao: 0.09, ganho: 0.055, atraso: i * 0.15 });
      tom({ freq: 1320, tipo: "sine", duracao: 0.08, ganho: 0.03, atraso: i * 0.15 });
    }
  }

  function conclusao() {
    if (!pronto) return;
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((freq, indice) => {
      tom({ freq, tipo: "triangle", duracao: 0.34, ganho: 0.07, atraso: indice * 0.11 });
    });
    tom({ freq: 1567.98, tipo: "sine", duracao: 0.5, ganho: 0.04, atraso: 0.46 });
  }

  function passo() {
    if (!pronto || pausado) return;
    const agora = performance.now();
    if (agora - ultimoPasso < 220) return;
    ultimoPasso = agora;

    ruidoCurto({ duracao: 0.075, freq: 340, ganho: 0.05, q: 0.8 });
    tom({ freq: 92, freqFinal: 58, tipo: "sine", duracao: 0.08, ganho: 0.035 });
  }

  function ambiente(ligado) {
    ambienteDesejado = Boolean(ligado);
    if (!pronto) return;
    ambienteGain.gain.setTargetAtTime(
      ambienteDesejado && !pausado ? 0.085 : 0,
      tempo(),
      0.4
    );
  }

  function pausar() {
    if (!pronto) return;
    pausado = true;
    ambienteGain.gain.setTargetAtTime(0, tempo(), 0.2);
    pararMaquinas();
  }

  function retomar() {
    if (!pronto) return;
    pausado = false;
    ambienteGain.gain.setTargetAtTime(ambienteDesejado ? 0.085 : 0, tempo(), 0.3);
  }

  function aplicarMaster() {
    if (!pronto) return;
    master.gain.setTargetAtTime(mudo ? 0 : volume, tempo(), 0.05);
  }

  function definirVolume(valor) {
    volume = limitar(valor);
    aplicarMaster();
    return volume;
  }

  function ligarMudo(estado) {
    mudo = Boolean(estado);
    aplicarMaster();
    return mudo;
  }

  return {
    iniciar,
    sincronizar,
    pararMaquinas,
    ambiente,
    pausar,
    retomar,
    clique,
    acerto,
    erro,
    alerta,
    conclusao,
    passo,
    definirVolume,
    ligarMudo,
    get volume() { return volume; },
    get mudo() { return mudo; },
    get pronto() { return pronto; }
  };
}
