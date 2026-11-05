// Leitor de controles padrão conectados ao aparelho que roda a experiência.
//
// Um controle Bluetooth (ou um celular pareado que se apresente como gamepad)
// entra pela Gamepad API do próprio celular transmissor. O leitor não conhece
// nada da cena: só devolve eixos e botões para o adaptador de VR decidir o que
// fazer com eles.

const ZONA_MORTA = 0.24;

function eixo(valor) {
  return Math.abs(valor) < ZONA_MORTA ? 0 : valor;
}

function primeiroGamepad() {
  const pads = navigator.getGamepads?.() ?? [];

  for (const pad of pads) {
    if (!pad?.connected) continue;
    // Controles XR têm o próprio caminho (gatilho/grip) em vrControls.js.
    if (pad.mapping === "xr-standard") continue;
    return pad;
  }

  return null;
}

export function criarLeitorGamepad({ aoMudar } = {}) {
  let indice = null;
  let botoesAnteriores = [];
  let ultimoId = null;

  function aoConectar(evento) {
    const pad = evento.gamepad;
    if (pad?.mapping === "xr-standard") return;
    if (indice === null) indice = pad.index;
    aoMudar?.({ conectado: true, id: pad.id });
  }

  function aoDesconectar(evento) {
    if (evento.gamepad?.index === indice) {
      indice = null;
      botoesAnteriores = [];
      ultimoId = null;
      aoMudar?.({ conectado: false, id: null });
    }
  }

  window.addEventListener("gamepadconnected", aoConectar);
  window.addEventListener("gamepaddisconnected", aoDesconectar);

  function padAtivo() {
    const pads = navigator.getGamepads?.() ?? [];
    const salvo = indice === null ? null : pads[indice];

    if (salvo?.connected && salvo.mapping !== "xr-standard") return salvo;

    const encontrado = primeiroGamepad();
    indice = encontrado?.index ?? null;
    return encontrado;
  }

  function atualizar() {
    const pad = padAtivo();
    if (!pad) {
      botoesAnteriores = [];
      ultimoId = null;
      return null;
    }

    ultimoId = pad.id;

    const botoes = Array.from(pad.buttons, (botao) => Boolean(botao?.pressed));
    const apertou = (indiceBotao) =>
      Boolean(botoes[indiceBotao]) && !botoesAnteriores[indiceBotao];

    // Stick e D-pad somam: eixo Y para cima é -1, então o sinal é invertido.
    const frente = -eixo(pad.axes[1] ?? 0) + (botoes[12] ? 1 : 0) - (botoes[13] ? 1 : 0);
    const lateral = eixo(pad.axes[0] ?? 0) + (botoes[15] ? 1 : 0) - (botoes[14] ? 1 : 0);

    const resultado = {
      id: pad.id,
      movimento: {
        frente: Math.max(-1, Math.min(1, frente)),
        lateral: Math.max(-1, Math.min(1, lateral))
      },
      giro: eixo(pad.axes[2] ?? 0),
      corrida: botoes[10] || botoes[4],
      selecionar: apertou(0) || apertou(7)
    };

    botoesAnteriores = botoes;
    return resultado;
  }

  return {
    atualizar,
    // Fotografa o estado atual dos botões para que um botão segurado ao entrar
    // no XR não dispare uma seleção que o usuário não pediu.
    reset() {
      const pad = padAtivo();
      botoesAnteriores = pad
        ? Array.from(pad.buttons, (botao) => Boolean(botao?.pressed))
        : [];
      ultimoId = pad?.id ?? null;
    },
    get conectado() {
      return Boolean(padAtivo());
    },
    get id() {
      return ultimoId;
    },
    dispose() {
      window.removeEventListener("gamepadconnected", aoConectar);
      window.removeEventListener("gamepaddisconnected", aoDesconectar);
    }
  };
}
