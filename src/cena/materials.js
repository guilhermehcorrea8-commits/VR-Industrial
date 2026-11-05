import * as THREE from "three";

// Texturas procedurais desenhadas a partir das cinco fotos do prédio:
// ladrilho cinza de 0,5 m, tijolo terracota de junta clara, telha metálica
// nervurada clara, faixa de risco zebrada, placa de saída, relógio vermelho.

function canvasTexture(renderer, largura, altura, desenhar) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext("2d"), largura, altura);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  return textura;
}

// Um tile da textura representa `metroPorTile` metros no mundo.
// Assim o ladrilho continua com 0,5 m independentemente do tamanho da parede.
function escalaPorMetro(textura, metroPorTile) {
  textura.userData.metroPorTile = metroPorTile;
  return textura;
}

function criarTexturas(renderer) {
  const piso = canvasTexture(renderer, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#4b4f52";
    ctx.fillRect(0, 0, w, h);

    const tile = 128;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const v = 118 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${v},${v + 2},${v - 3})`;
        ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(x + 3, y + 3, tile - 6, 10);
      }
    }

    ctx.strokeStyle = "#3a3d40";
    ctx.lineWidth = 6;
    for (let i = 0; i <= w; i += tile) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
  });
  escalaPorMetro(piso, 2.0);

  const tijolo = canvasTexture(renderer, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#c9c2b8";
    ctx.fillRect(0, 0, w, h);

    const largura = 64;
    const altura = 22;
    const junta = 5;
    const tons = ["#a54f39", "#b2573e", "#98462f", "#bb6045", "#a94d37"];

    for (let y = 0, linha = 0; y < h; y += altura + junta, linha++) {
      const deslocamento = (linha % 2) * (largura / 2);

      for (let x = -largura; x < w; x += largura + junta) {
        ctx.fillStyle = tons[Math.floor(Math.random() * tons.length)];
        ctx.fillRect(x + deslocamento, y, largura, altura);

        ctx.fillStyle = "rgba(0,0,0,0.10)";
        ctx.fillRect(x + deslocamento, y + altura - 4, largura, 4);

        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(x + deslocamento, y, largura, 3);
      }
    }
  });
  escalaPorMetro(tijolo, 1.4);

  const telha = canvasTexture(renderer, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#cfd4d2";
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "#b6bcbb");
      grad.addColorStop(0.35, "#e4e8e6");
      grad.addColorStop(1, "#a9b0af");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 15, h);
    }
  });
  escalaPorMetro(telha, 1.0);

  const zebra = canvasTexture(renderer, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#f0c419";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 26;
    for (let i = -h; i < w + h; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  });
  escalaPorMetro(zebra, 0.5);

  const placaSaida = canvasTexture(renderer, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#0a8a45";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(58, 40, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#ffffff";
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
    for (let i = 0; i < 12; i++) {
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

  const madeira = canvasTexture(renderer, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#8a5a34";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(${60 + Math.random() * 40},40,20,0.25)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w / 3, y + 8, 2 * w / 3, y - 8, w, y);
      ctx.stroke();
    }
  });
  escalaPorMetro(madeira, 1.2);

  const letreiro = canvasTexture(renderer, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = "#0d2b47";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SENAI", w / 2, h / 2 + 6);
  });

  return { piso, tijolo, telha, zebra, placaSaida, relogio, madeira, letreiro };
}

export function criarMateriais(renderer) {
  const tex = criarTexturas(renderer);

  const padrao = {
    roughness: 0.85,
    metalness: 0.0
  };

  const mats = {
    piso: new THREE.MeshStandardMaterial({ ...padrao, map: tex.piso, roughness: 0.55 }),
    tijolo: new THREE.MeshStandardMaterial({ ...padrao, map: tex.tijolo }),
    telha: new THREE.MeshStandardMaterial({
      ...padrao, map: tex.telha, roughness: 0.65, metalness: 0.35, side: THREE.DoubleSide
    }),
    zebra: new THREE.MeshStandardMaterial({ ...padrao, map: tex.zebra, roughness: 0.7 }),

    // Nas fotos a estrutura verde é tinta esmalte sobre aço: brilho médio,
    // metalness baixo. `metallic` não existe no Three.js e era ignorado.
    verde: new THREE.MeshStandardMaterial({ color: 0x0a6b3f, roughness: 0.45, metalness: 0.25 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b9399, roughness: 0.35, metalness: 0.75 }),
    metalEscuro: new THREE.MeshStandardMaterial({ color: 0x2f353a, roughness: 0.5, metalness: 0.6 }),
    aluminio: new THREE.MeshStandardMaterial({ color: 0xc6cccb, roughness: 0.4, metalness: 0.55 }),
    concreto: new THREE.MeshStandardMaterial({ color: 0x9a9c98, roughness: 0.95 }),
    reboco: new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: 0.92 }),
    azul: new THREE.MeshStandardMaterial({ color: 0x1c4f7c, roughness: 0.5, metalness: 0.2 }),
    azulClaro: new THREE.MeshStandardMaterial({ color: 0x2f7fc0, roughness: 0.5, metalness: 0.2 }),
    vermelho: new THREE.MeshStandardMaterial({ color: 0xc0271f, roughness: 0.55 }),
    amarelo: new THREE.MeshStandardMaterial({ color: 0xedc018, roughness: 0.6 }),
    branco: new THREE.MeshStandardMaterial({ color: 0xdedad4, roughness: 0.6 }),
    cinza: new THREE.MeshStandardMaterial({ color: 0x6f767c, roughness: 0.6, metalness: 0.3 }),
    preto: new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.7 }),
    madeira: new THREE.MeshStandardMaterial({ ...padrao, map: tex.madeira, roughness: 0.7 }),
    vidro: new THREE.MeshStandardMaterial({
      color: 0xa9d3e2, roughness: 0.08, metalness: 0.05,
      transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false
    }),
    luz: new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.4, roughness: 0.4
    }),
    placaSaida: new THREE.MeshBasicMaterial({ map: tex.placaSaida }),
    relogio: new THREE.MeshBasicMaterial({ map: tex.relogio }),
    letreiro: new THREE.MeshBasicMaterial({ map: tex.letreiro })
  };

  // Material com repetição própria: clona o mapa para não alterar a textura base.
  // `metroPorTile` mantém o ladrilho/tijolo com o tamanho físico correto.
  function comEscala(material, larguraMetros, alturaMetros) {
    const base = material.map;
    const metroPorTile = base?.userData?.metroPorTile;
    if (!base || !metroPorTile) return material;

    const novo = material.clone();
    novo.map = base.clone();
    novo.map.needsUpdate = true;
    novo.map.repeat.set(
      Math.max(0.5, larguraMetros / metroPorTile),
      Math.max(0.5, alturaMetros / metroPorTile)
    );
    return novo;
  }

  return { tex, mats, comEscala };
}
