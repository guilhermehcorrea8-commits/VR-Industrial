import * as THREE from "three";

function geradorAleatorio(semente) {
  return () => {
    semente = (Math.imul(1664525, semente) + 1013904223) >>> 0;
    return semente / 4294967296;
  };
}

function canvasTexture(renderer, largura, altura, desenhar, cor = true) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext("2d"), largura, altura);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return textura;
}

function escalaPorMetro(textura, metroPorTile) {
  textura.userData.metroPorTile = metroPorTile;
  return textura;
}

function superficie(renderer, largura, altura, desenharCor, desenharRelevo, metroPorTile) {
  const mapa = escalaPorMetro(canvasTexture(renderer, largura, altura, desenharCor), metroPorTile);
  const relevo = escalaPorMetro(canvasTexture(renderer, largura, altura, desenharRelevo, false), metroPorTile);
  return { mapa, relevo };
}

function ruido(ctx, w, h, quantidade, aleatorio, opacidade = 0.08) {
  for (let i = 0; i < quantidade; i += 1) {
    const tom = aleatorio() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${tom},${tom},${tom},${opacidade * aleatorio()})`;
    const tamanho = aleatorio() > 0.92 ? 2 : 1;
    ctx.fillRect(aleatorio() * w, aleatorio() * h, tamanho, tamanho);
  }
}

function criarTexturas(renderer) {
  const piso = superficie(renderer, 512, 512, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(41);
    ctx.fillStyle = "#34393b";
    ctx.fillRect(0, 0, w, h);

    const tile = 128;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const tom = 79 + Math.floor(aleatorio() * 14);
        const gradiente = ctx.createLinearGradient(x, y, x + tile, y + tile);
        gradiente.addColorStop(0, `rgb(${tom + 13},${tom + 15},${tom + 15})`);
        gradiente.addColorStop(1, `rgb(${tom - 7},${tom - 4},${tom - 3})`);
        ctx.fillStyle = gradiente;
        ctx.fillRect(x + 4, y + 4, tile - 8, tile - 8);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(x + 5, y + 5, tile - 10, 2);
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fillRect(x + 5, y + tile - 7, tile - 10, 2);
      }
    }

    for (let i = 0; i < 13; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      const raio = 18 + aleatorio() * 58;
      const mancha = ctx.createRadialGradient(x, y, 0, x, y, raio);
      mancha.addColorStop(0, "rgba(20,17,13,0.20)");
      mancha.addColorStop(0.55, "rgba(30,25,20,0.09)");
      mancha.addColorStop(1, "rgba(30,25,20,0)");
      ctx.fillStyle = mancha;
      ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }

    ctx.lineCap = "round";
    for (let i = 0; i < 85; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      ctx.strokeStyle = `rgba(220,225,222,${0.025 + aleatorio() * 0.07})`;
      ctx.lineWidth = 0.5 + aleatorio();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + aleatorio() * 42, y + (aleatorio() - 0.5) * 9);
      ctx.stroke();
    }
    ruido(ctx, w, h, 11000, aleatorio, 0.1);
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(41);
    ctx.fillStyle = "#282828";
    ctx.fillRect(0, 0, w, h);
    const tile = 128;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const tom = 166 + Math.floor(aleatorio() * 25);
        ctx.fillStyle = `rgb(${tom},${tom},${tom})`;
        ctx.fillRect(x + 4, y + 4, tile - 8, tile - 8);
        ctx.fillStyle = "#d8d8d8";
        ctx.fillRect(x + 5, y + 5, tile - 10, 2);
      }
    }
    ruido(ctx, w, h, 15000, aleatorio, 0.22);
  }, 2.0);

  const tijolo = superficie(renderer, 512, 512, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(72);
    ctx.fillStyle = "#bdb5a7";
    ctx.fillRect(0, 0, w, h);
    const largura = 64;
    const altura = 26;
    const junta = 5;
    const tons = ["#9f503b", "#ad5940", "#934630", "#b86146", "#a44e38", "#b05a41"];

    for (let y = 0, linha = 0; y < h; y += altura + junta, linha += 1) {
      const deslocamento = (linha % 2) * (largura / 2);
      for (let x = -largura; x < w; x += largura + junta) {
        const px = x + deslocamento;
        const py = y;
        const tom = tons[Math.floor(aleatorio() * tons.length)];
        const gradiente = ctx.createLinearGradient(px, py, px, py + altura);
        gradiente.addColorStop(0, tom);
        gradiente.addColorStop(1, "#87402f");
        ctx.fillStyle = gradiente;
        ctx.fillRect(px, py, largura, altura);
        ctx.fillStyle = "rgba(255,225,200,0.13)";
        ctx.fillRect(px, py, largura, 2);
        ctx.fillStyle = "rgba(45,20,14,0.20)";
        ctx.fillRect(px, py + altura - 3, largura, 3);
        for (let i = 0; i < 24; i += 1) {
          ctx.fillStyle = `rgba(45,25,18,${aleatorio() * 0.13})`;
          ctx.fillRect(px + aleatorio() * largura, py + aleatorio() * altura, 1 + aleatorio() * 2, 1);
        }
      }
    }
    ruido(ctx, w, h, 9000, aleatorio, 0.08);
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(72);
    ctx.fillStyle = "#3c3c3c";
    ctx.fillRect(0, 0, w, h);
    const largura = 64;
    const altura = 26;
    const junta = 5;
    for (let y = 0, linha = 0; y < h; y += altura + junta, linha += 1) {
      const deslocamento = (linha % 2) * (largura / 2);
      for (let x = -largura; x < w; x += largura + junta) {
        const tom = 174 + Math.floor(aleatorio() * 35);
        ctx.fillStyle = `rgb(${tom},${tom},${tom})`;
        ctx.fillRect(x + deslocamento, y, largura, altura);
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(x + deslocamento, y, largura, 2);
      }
    }
    ruido(ctx, w, h, 12000, aleatorio, 0.2);
  }, 1.4);

  const telha = superficie(renderer, 256, 256, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(93);
    ctx.fillStyle = "#aeb6b5";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "#a7afae");
      grad.addColorStop(0.28, "#e0e5e2");
      grad.addColorStop(0.55, "#cbd2d0");
      grad.addColorStop(1, "#9da6a5");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 15, h);
    }
    ctx.fillStyle = "rgba(70,80,78,0.16)";
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, 128, w, 2);
    for (let i = 0; i < 28; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      const comprimento = 12 + aleatorio() * 70;
      const ferrugem = ctx.createLinearGradient(x, y, x, y + comprimento);
      ferrugem.addColorStop(0, "rgba(120,65,35,0.13)");
      ferrugem.addColorStop(1, "rgba(120,65,35,0)");
      ctx.fillStyle = ferrugem;
      ctx.fillRect(x, y, 1 + aleatorio() * 2, comprimento);
    }
    ruido(ctx, w, h, 4500, aleatorio, 0.06);
  }, (ctx, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "#444444");
      grad.addColorStop(0.3, "#eeeeee");
      grad.addColorStop(0.62, "#bbbbbb");
      grad.addColorStop(1, "#333333");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 16, h);
    }
    ctx.fillStyle = "#222222";
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, 128, w, 3);
  }, 1.0);

  const concreto = superficie(renderer, 512, 512, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(118);
    ctx.fillStyle = "#969b98";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 13000; i += 1) {
      const tom = aleatorio() > 0.5 ? 225 : 45;
      ctx.fillStyle = `rgba(${tom},${tom},${tom},${0.015 + aleatorio() * 0.07})`;
      const tamanho = 0.5 + aleatorio() * 2.2;
      ctx.fillRect(aleatorio() * w, aleatorio() * h, tamanho, tamanho);
    }
    for (let i = 0; i < 7; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      const raio = 25 + aleatorio() * 90;
      const mancha = ctx.createRadialGradient(x, y, 0, x, y, raio);
      mancha.addColorStop(0, "rgba(45,55,50,0.10)");
      mancha.addColorStop(1, "rgba(45,55,50,0)");
      ctx.fillStyle = mancha;
      ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(118);
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 17000, aleatorio, 0.24);
  }, 2.5);

  const reboco = superficie(renderer, 512, 512, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(141);
    ctx.fillStyle = "#d8d8d1";
    ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 16000, aleatorio, 0.055);
    for (let i = 0; i < 9; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      const raio = 30 + aleatorio() * 100;
      const mancha = ctx.createRadialGradient(x, y, 0, x, y, raio);
      mancha.addColorStop(0, "rgba(95,100,91,0.035)");
      mancha.addColorStop(1, "rgba(95,100,91,0)");
      ctx.fillStyle = mancha;
      ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(141);
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 19000, aleatorio, 0.16);
  }, 2.5);

  const asfalto = superficie(renderer, 512, 512, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(162);
    ctx.fillStyle = "#505657";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 21000; i += 1) {
      const tom = 30 + Math.floor(aleatorio() * 85);
      ctx.fillStyle = `rgba(${tom},${tom + 2},${tom + 1},${0.15 + aleatorio() * 0.35})`;
      const tamanho = 0.5 + aleatorio() * 2;
      ctx.fillRect(aleatorio() * w, aleatorio() * h, tamanho, tamanho);
    }
    ctx.strokeStyle = "rgba(25,29,29,0.38)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      let x = aleatorio() * w;
      let y = aleatorio() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 7; j += 1) {
        x += (aleatorio() - 0.5) * 35;
        y += 12 + aleatorio() * 24;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(162);
    ctx.fillStyle = "#777777";
    ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 21000, aleatorio, 0.28);
  }, 4.0);

  const zebra = canvasTexture(renderer, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#e4b918";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#171918";
    ctx.lineWidth = 26;
    for (let i = -h; i < w + h; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
    ruido(ctx, w, h, 1600, geradorAleatorio(21), 0.09);
  });
  escalaPorMetro(zebra, 0.5);

  const placaSaida = canvasTexture(renderer, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#078343";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(58, 40, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(58, 52); ctx.lineTo(52, 86);
    ctx.moveTo(58, 60); ctx.lineTo(80, 68);
    ctx.moveTo(56, 86); ctx.lineTo(40, 110);
    ctx.moveTo(60, 86); ctx.lineTo(74, 108);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(120, 64); ctx.lineTo(190, 64);
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(186, 40); ctx.lineTo(230, 64); ctx.lineTo(186, 88);
    ctx.closePath();
    ctx.fill();
  });

  const relogio = canvasTexture(renderer, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#c8202a";
    ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(64, 64, 48, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(64 + Math.sin(a) * 40, 64 - Math.cos(a) * 40);
      ctx.lineTo(64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64, 30); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(90, 74); ctx.stroke();
  });

  const madeira = superficie(renderer, 256, 256, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(181);
    ctx.fillStyle = "#8a5a34";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i += 1) {
      ctx.strokeStyle = `rgba(${50 + aleatorio() * 45},30,15,${0.08 + aleatorio() * 0.2})`;
      ctx.lineWidth = 0.5 + aleatorio() * 2;
      const y = aleatorio() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w / 3, y + 9, 2 * w / 3, y - 9, w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i += 1) {
      const x = aleatorio() * w;
      const y = aleatorio() * h;
      ctx.strokeStyle = "rgba(45,25,12,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 12 + aleatorio() * 16, 3 + aleatorio() * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, (ctx, w, h) => {
    const aleatorio = geradorAleatorio(181);
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i += 1) {
      const tom = 95 + Math.floor(aleatorio() * 70);
      ctx.strokeStyle = `rgb(${tom},${tom},${tom})`;
      ctx.lineWidth = 0.5 + aleatorio() * 2;
      const y = aleatorio() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w / 3, y + 9, 2 * w / 3, y - 9, w, y);
      ctx.stroke();
    }
  }, 1.2);

  const letreiro = canvasTexture(renderer, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = "#0d2b47";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SENAI", w / 2, h / 2 + 6);
  });

  const sombra = canvasTexture(renderer, 128, 128, (ctx, w, h) => {
    const gradiente = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gradiente.addColorStop(0, "rgba(255,255,255,0.82)");
    gradiente.addColorStop(0.45, "rgba(255,255,255,0.46)");
    gradiente.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, w, h);
  });
  sombra.wrapS = THREE.ClampToEdgeWrapping;
  sombra.wrapT = THREE.ClampToEdgeWrapping;

  const epi = canvasTexture(renderer, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#eee9dc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#153b63";
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SEGURANÇA EM PRIMEIRO LUGAR", w / 2, 28);
    ctx.fillStyle = "#202a32";
    ctx.font = "bold 42px Arial";
    ctx.fillText("USO OBRIGATÓRIO", w / 2, 105);
    ctx.font = "bold 58px Arial";
    ctx.fillStyle = "#b78b12";
    ctx.fillText("DE EPI", w / 2, 174);
    ctx.strokeStyle = "#153b63";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });

  const rotuloExtintor = canvasTexture(renderer, 512, 1024, (ctx, w, h) => {
    const gradiente = ctx.createLinearGradient(0, 0, w, 0);
    gradiente.addColorStop(0, "#deddd6");
    gradiente.addColorStop(0.15, "#faf9f4");
    gradiente.addColorStop(0.5, "#ffffff");
    gradiente.addColorStop(0.85, "#faf9f4");
    gradiente.addColorStop(1, "#deddd6");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#d12a27";
    ctx.lineWidth = 16;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#d12a27";
    ctx.fillRect(18, 18, w - 36, 154);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 65px Arial";
    ctx.fillText("MOCELIN", w / 2, 82);
    ctx.font = "bold 27px Arial";
    ctx.fillText("SEGURANÇA CONTRA INCÊNDIO", w / 2, 135);

    ctx.fillStyle = "#242424";
    ctx.font = "bold 42px Arial";
    ctx.fillText("EXTINTOR DE INCÊNDIO", w / 2, 220);
    ctx.font = "bold 35px Arial";
    ctx.fillStyle = "#c72325";
    ctx.fillText("PÓ QUÍMICO  •  4 KG", w / 2, 270);

    function chama(cx, cy, escala) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(escala, escala);
      ctx.beginPath();
      ctx.moveTo(0, 76);
      ctx.bezierCurveTo(-50, 50, -58, 8, -26, -18);
      ctx.bezierCurveTo(-30, 14, -4, 5, -2, -28);
      ctx.bezierCurveTo(9, -66, 58, -28, 52, 10);
      ctx.bezierCurveTo(48, 45, 23, 68, 0, 76);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function raio(cx, cy) {
      ctx.beginPath();
      ctx.moveTo(cx - 42, cy + 52);
      ctx.lineTo(cx + 15, cy - 38);
      ctx.lineTo(cx - 3, cy - 4);
      ctx.lineTo(cx + 42, cy - 2);
      ctx.lineTo(cx - 18, cy + 54);
      ctx.closePath();
      ctx.fill();
    }

    const centroY = 485;
    ctx.fillStyle = "#d12a27";
    chama(w / 2, centroY, 1.15);
    ctx.fillStyle = "#ffffff";
    chama(w / 2, centroY + 20, 0.48);
    ctx.fillStyle = "#1f1f1f";
    ctx.beginPath();
    ctx.moveTo(w / 2 - 28, centroY - 62);
    ctx.lineTo(w / 2 + 19, centroY - 94);
    ctx.lineTo(w / 2 + 36, centroY - 69);
    ctx.lineTo(w / 2 - 8, centroY - 39);
    ctx.closePath();
    ctx.fill();

    const quadrados = [
      { x: 56, letra: "A", sub: "MADEIRA" },
      { x: 190, letra: "B", sub: "LÍQUIDOS" },
      { x: 324, letra: "C", sub: "ENERGIA" }
    ];
    for (const item of quadrados) {
      ctx.strokeStyle = "#c72325";
      ctx.lineWidth = 7;
      ctx.strokeRect(item.x, 670, 132, 148);
      ctx.fillStyle = "#c72325";
      ctx.font = "bold 84px Arial";
      ctx.fillText(item.letra, item.x + 66, 728);
      ctx.fillStyle = "#242424";
      ctx.font = "bold 21px Arial";
      ctx.fillText(item.sub, item.x + 66, 796);
    }

    ctx.fillStyle = "#d12a27";
    ctx.fillRect(56, 866, 400, 64);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.fillText("USO EM INCÊNDIOS A, B E C", w / 2, 899);
    ctx.fillStyle = "#4a4a4a";
    ctx.font = "20px Arial";
    ctx.fillText("REPOSICIONE A MANGUEIRA APÓ O USO", w / 2, 963);
  });

  return {
    piso: piso.mapa,
    relevoPiso: piso.relevo,
    tijolo: tijolo.mapa,
    relevoTijolo: tijolo.relevo,
    telha: telha.mapa,
    relevoTelha: telha.relevo,
    concreto: concreto.mapa,
    relevoConcreto: concreto.relevo,
    reboco: reboco.mapa,
    relevoReboco: reboco.relevo,
    asfalto: asfalto.mapa,
    relevoAsfalto: asfalto.relevo,
    zebra,
    placaSaida,
    relogio,
    madeira: madeira.mapa,
    relevoMadeira: madeira.relevo,
    sombra,
    letreiro,
    epi,
    rotuloExtintor
  };
}

export function criarMateriais(renderer) {
  const tex = criarTexturas(renderer);

  const mats = {
    piso: new THREE.MeshStandardMaterial({
      map: tex.piso, bumpMap: tex.relevoPiso, bumpScale: 0.028,
      roughness: 0.72, metalness: 0.04
    }),
    tijolo: new THREE.MeshStandardMaterial({
      map: tex.tijolo, bumpMap: tex.relevoTijolo, bumpScale: 0.045,
      roughness: 0.91, metalness: 0
    }),
    telha: new THREE.MeshStandardMaterial({
      map: tex.telha, bumpMap: tex.relevoTelha, bumpScale: 0.018,
      roughness: 0.5, metalness: 0.52, side: THREE.DoubleSide
    }),
    concreto: new THREE.MeshStandardMaterial({
      map: tex.concreto, bumpMap: tex.relevoConcreto, bumpScale: 0.018,
      roughness: 0.93, metalness: 0
    }),
    reboco: new THREE.MeshStandardMaterial({
      map: tex.reboco, bumpMap: tex.relevoReboco, bumpScale: 0.01,
      roughness: 0.94, metalness: 0
    }),
    asfalto: new THREE.MeshStandardMaterial({
      map: tex.asfalto, bumpMap: tex.relevoAsfalto, bumpScale: 0.025,
      roughness: 0.96, metalness: 0
    }),
    zebra: new THREE.MeshStandardMaterial({ map: tex.zebra, roughness: 0.76, metalness: 0.02 }),
    verde: new THREE.MeshStandardMaterial({ color: 0x0a6b3f, roughness: 0.4, metalness: 0.32 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b9399, roughness: 0.32, metalness: 0.78 }),
    metalEscuro: new THREE.MeshStandardMaterial({ color: 0x2f353a, roughness: 0.46, metalness: 0.65 }),
    aluminio: new THREE.MeshStandardMaterial({ color: 0xc6cccb, roughness: 0.38, metalness: 0.62 }),
    portao: new THREE.MeshStandardMaterial({ color: 0xd8dad7, roughness: 0.54, metalness: 0.34 }),
    azul: new THREE.MeshStandardMaterial({ color: 0x1c4f7c, roughness: 0.48, metalness: 0.22 }),
    azulClaro: new THREE.MeshStandardMaterial({ color: 0x2f7fc0, roughness: 0.42, metalness: 0.28 }),
    vermelho: new THREE.MeshStandardMaterial({ color: 0xc0271f, roughness: 0.5, metalness: 0.12 }),
    vermelhoExtintor: new THREE.MeshPhysicalMaterial({
      color: 0xc81d1b, roughness: 0.31, metalness: 0.22,
      clearcoat: 0.65, clearcoatRoughness: 0.24
    }),
    rotuloExtintor: new THREE.MeshStandardMaterial({
      map: tex.rotuloExtintor, roughness: 0.57, metalness: 0.02
    }),
    amarelo: new THREE.MeshStandardMaterial({ color: 0xedc018, roughness: 0.57, metalness: 0.08 }),
    branco: new THREE.MeshStandardMaterial({ color: 0xdedad4, roughness: 0.62, metalness: 0.02 }),
    cinza: new THREE.MeshStandardMaterial({ color: 0x6f767c, roughness: 0.58, metalness: 0.28 }),
    preto: new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.68, metalness: 0.12 }),
    madeira: new THREE.MeshStandardMaterial({
      map: tex.madeira, bumpMap: tex.relevoMadeira, bumpScale: 0.018,
      roughness: 0.74, metalness: 0
    }),
    vidro: new THREE.MeshPhysicalMaterial({
      color: 0xb7d4df, roughness: 0.1, metalness: 0,
      transparent: true, opacity: 0.26, side: THREE.DoubleSide,
      depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.12,
      envMapIntensity: 1.15
    }),
    luz: new THREE.MeshStandardMaterial({
      color: 0xfffdf4, emissive: 0xfff1d2, emissiveIntensity: 3.2, roughness: 0.35
    }),
    sombraContato: new THREE.MeshBasicMaterial({
      map: tex.sombra, color: 0x000000, transparent: true, opacity: 0.22,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    }),
    placaSaida: new THREE.MeshBasicMaterial({ map: tex.placaSaida, toneMapped: false }),
    relogio: new THREE.MeshBasicMaterial({ map: tex.relogio }),
    letreiro: new THREE.MeshBasicMaterial({ map: tex.letreiro }),
    epi: new THREE.MeshBasicMaterial({ map: tex.epi })
  };

  function comEscala(material, larguraMetros, alturaMetros) {
    const base = material.map;
    const metroPorTile = base?.userData?.metroPorTile;
    if (!base || !metroPorTile) return material;

    const novo = material.clone();
    for (const chave of ["map", "bumpMap"]) {
      if (!material[chave]) continue;
      novo[chave] = material[chave].clone();
      novo[chave].needsUpdate = true;
      novo[chave].repeat.set(
        Math.max(0.5, larguraMetros / metroPorTile),
        Math.max(0.5, alturaMetros / metroPorTile)
      );
    }
    return novo;
  }

  return { tex, mats, comEscala };
}
