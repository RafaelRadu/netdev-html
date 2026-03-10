/* ════════════════════════════════════════
   TRON LIGHT BIKES — Vanilla JS
════════════════════════════════════════ */
(function () {
  const CELL = 8;
  const COLORS = {
    p1: "#e8186d",
    p2: "#8860ff",
    p1glow: "rgba(232,24,109,0.5)",
    p2glow: "rgba(136,96,255,0.5)",
    grid: "rgba(232,24,109,0.06)",
  };

  /* ─── Knob Component ─── */
  class Knob {
    constructor(container, opts) {
      this.value = opts.value;
      this.min = opts.min;
      this.max = opts.max;
      this.color = opts.color || "#e8186d";
      this.label = opts.label;
      this.onChange = opts.onChange;
      this.isDragging = false;

      this.wrap = document.createElement("div");
      this.wrap.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:.5rem;";

      this.knobEl = document.createElement("div");
      this.inner = document.createElement("div");
      this.inner.style.cssText =
        "width:44px;height:44px;border-radius:50%;background:#0a0812;display:flex;align-items:center;justify-content:center;position:relative;";

      this.needle = document.createElement("div");
      this.needle.style.cssText = `position:absolute;width:4px;height:16px;background:${this.color};border-radius:2px;top:4px;transform-origin:center 18px;box-shadow:0 0 8px ${this.color};`;
      this.inner.appendChild(this.needle);

      this.labelEl = document.createElement("div");
      this.labelEl.style.cssText =
        "font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:#7a6fa0;letter-spacing:.08em;text-transform:uppercase;";
      this.labelEl.textContent = this.label;

      this.valueEl = document.createElement("div");
      this.valueEl.style.cssText = `font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;color:${this.color};`;

      this.knobEl.style.cssText = `width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid #2d2060;position:relative;box-shadow:0 0 15px ${this.color}40;`;

      this.knobEl.appendChild(this.inner);
      this.wrap.appendChild(this.knobEl);
      this.wrap.appendChild(this.labelEl);
      this.wrap.appendChild(this.valueEl);
      container.appendChild(this.wrap);

      this.render();

      this.knobEl.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.updateFromEvent(e);
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (this.isDragging) this.updateFromEvent(e);
      });
      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });

      // Touch support
      this.knobEl.addEventListener(
        "touchstart",
        (e) => {
          this.isDragging = true;
          this.updateFromEvent(e.touches[0]);
          e.preventDefault();
        },
        { passive: false },
      );
      window.addEventListener("touchmove", (e) => {
        if (this.isDragging) this.updateFromEvent(e.touches[0]);
      });
      window.addEventListener("touchend", () => {
        this.isDragging = false;
      });
    }

    updateFromEvent(e) {
      const rect = this.knobEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < -135) angle += 360;
      angle = Math.max(-135, Math.min(135, angle));
      const pct = (angle + 135) / 270;
      const newVal = Math.round(this.min + pct * (this.max - this.min));
      this.setValue(Math.max(this.min, Math.min(this.max, newVal)));
    }

    setValue(v) {
      this.value = v;
      this.render();
      this.onChange(v);
    }

    render() {
      const pct = ((this.value - this.min) / (this.max - this.min)) * 100;
      const deg = pct * 2.7;
      this.knobEl.style.background = `conic-gradient(from -135deg, ${this.color} ${deg}deg, #1a1030 ${deg}deg 270deg, transparent 270deg)`;
      const angle = (pct / 100) * 270 - 135;
      this.needle.style.transform = `rotate(${angle}deg)`;
      this.valueEl.textContent = this.value;
    }
  }

  /* ─── Game State ─── */
  let gameState = "MENU";
  let score = { p1: 0, p2: 0 };
  let winner = null;
  let speed = 5;
  let difficulty = 5;
  let gameRef = null;
  let rafId = null;
  let keysPressed = {};
  let aiLives = 0;
  let revengeTimer = null;

  /* ─── DOM Elements (created once) ─── */
  let overlay, canvas, ctx, closeBtn, scoreUI, scoreP1, scoreP2;
  let menuPanel, gameOverPanel, revengeOverlay;
  let speedKnob, diffKnob, speedKnob2, diffKnob2;

  function initBikes(cols, rows) {
    return {
      p1: {
        x: Math.floor(cols / 3),
        y: Math.floor(rows / 2),
        dx: 1,
        dy: 0,
        trail: [],
        alive: true,
        color: COLORS.p1,
        glow: COLORS.p1glow,
        immuneUntil: 0,
      },
      p2: {
        x: Math.floor((cols * 2) / 3),
        y: Math.floor(rows / 2),
        dx: -1,
        dy: 0,
        trail: [],
        alive: true,
        color: COLORS.p2,
        glow: COLORS.p2glow,
        immuneUntil: 0,
      },
    };
  }

  const IMMUNE_DURATION = 8000; // 8 segundos de imunidade (máximo)

  function spawnApple(cols, rows, occupied) {
    const margin = 3;
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = margin + Math.floor(Math.random() * (cols - margin * 2));
      const y = margin + Math.floor(Math.random() * (rows - margin * 2));
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
    return null;
  }

  function aiMove(bike, occupied, cols, rows, diff, gameRef, playerBike) {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const valid = dirs.filter((d) => !(d.dx === -bike.dx && d.dy === -bike.dy));

    function isSafe(d, depth = 1) {
      let x = bike.x,
        y = bike.y;
      for (let i = 0; i < depth; i++) {
        x += d.dx;
        y += d.dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
        if (occupied.has(`${x},${y}`)) return false;
      }
      return true;
    }

    function isSafePos(x, y) {
      return (
        x >= 0 && x < cols && y >= 0 && y < rows && !occupied.has(`${x},${y}`)
      );
    }

    const lookAhead = Math.floor(40 + diff * 25);

    function floodFill(sx, sy, exclude) {
      const visited = new Set();
      const queue = [{ x: sx, y: sy }];
      visited.add(`${sx},${sy}`);
      let count = 0;
      while (queue.length > 0 && count < lookAhead) {
        const { x, y } = queue.shift();
        count++;
        for (const d of dirs) {
          const nx = x + d.dx,
            ny = y + d.dy;
          const key = `${nx},${ny}`;
          if (
            nx >= 0 &&
            nx < cols &&
            ny >= 0 &&
            ny < rows &&
            !visited.has(key) &&
            !occupied.has(key) &&
            key !== exclude
          ) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      return count;
    }

    // Calcular distância Manhattan
    function distance(x1, y1, x2, y2) {
      return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    // Encontrar direção que aproxima do alvo
    function directionTo(fromX, fromY, toX, toY) {
      const dx = toX - fromX;
      const dy = toY - fromY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return { dx: dx > 0 ? 1 : -1, dy: 0 };
      } else {
        return { dx: 0, dy: dy > 0 ? 1 : -1 };
      }
    }

    const safeDirs = valid.filter((d) => isSafe(d, 1));
    if (safeDirs.length === 0) return { dx: bike.dx, dy: bike.dy };

    // Se só tem uma opção segura, usar ela
    if (safeDirs.length === 1) return safeDirs[0];

    const apple = gameRef?.apple;
    const playerIsImmune =
      playerBike?.immuneUntil && Date.now() < playerBike.immuneUntil;
    const aiIsImmune = bike.immuneUntil && Date.now() < bike.immuneUntil;

    // Calcular espaço disponível para cada direção (CRÍTICO para sobrevivência)
    const dirsWithSpace = safeDirs.map((d) => {
      const nx = bike.x + d.dx,
        ny = bike.y + d.dy;
      const space = floodFill(nx, ny, `${bike.x},${bike.y}`);
      const safeDepth = [2, 3, 4, 5].filter((depth) => isSafe(d, depth)).length;
      return { d, space, safeDepth, nx, ny };
    });

    // Filtrar direções com espaço suficiente (pelo menos 20% do melhor)
    const maxSpace = Math.max(...dirsWithSpace.map((x) => x.space));
    const viableDirs = dirsWithSpace.filter(
      (x) => x.space >= maxSpace * 0.2 && x.space > 5,
    );

    // Se nenhuma viável, pegar a com mais espaço
    if (viableDirs.length === 0) {
      dirsWithSpace.sort((a, b) => b.space - a.space);
      return dirsWithSpace[0].d;
    }

    // Calcular scores para direções viáveis
    const scored = viableDirs.map((item) => {
      const { d, space, safeDepth, nx, ny } = item;
      let score = 0;

      // BASE: Espaço livre é fundamental (peso alto)
      score += space * 10;
      score += safeDepth * 50;

      // OBJETIVO 1: Ir para a maçã
      if (apple) {
        const currentDist = distance(bike.x, bike.y, apple.x, apple.y);
        const newDist = distance(nx, ny, apple.x, apple.y);
        const playerDist = playerBike
          ? distance(playerBike.x, playerBike.y, apple.x, apple.y)
          : Infinity;

        // Ir direto para a maçã se temos vantagem ou estamos perto
        if (currentDist <= playerDist + 5 || currentDist <= 12) {
          if (newDist < currentDist) {
            score += 2000 + (currentDist - newDist) * 200;
          }
        }

        // Bonus por aproximar da maçã em geral
        if (newDist < currentDist) {
          score += 500;
        }
      }

      // OBJETIVO 2: Derrotar o jogador
      if (playerBike && playerBike.alive && !playerIsImmune) {
        const currentDistPlayer = distance(
          bike.x,
          bike.y,
          playerBike.x,
          playerBike.y,
        );
        const newDistPlayer = distance(nx, ny, playerBike.x, playerBike.y);

        // Prever onde o jogador vai estar
        const futureX = playerBike.x + playerBike.dx * 4;
        const futureY = playerBike.y + playerBike.dy * 4;
        const distToFuture = distance(nx, ny, futureX, futureY);
        const currentDistToFuture = distance(bike.x, bike.y, futureX, futureY);

        // Calcular espaço do jogador se nos movermos para lá
        const playerSpace = floodFill(
          playerBike.x,
          playerBike.y,
          `${nx},${ny}`,
        );
        const playerCurrentSpace = floodFill(
          playerBike.x,
          playerBike.y,
          `${bike.x},${bike.y}`,
        );

        // CERCAR: Reduzir espaço do jogador (estratégia principal)
        if (playerSpace < playerCurrentSpace) {
          score += (playerCurrentSpace - playerSpace) * (40 + diff * 10);
        }

        // INTERCEPTAR: Cortar o caminho futuro do jogador
        if (distToFuture < currentDistToFuture && currentDistPlayer < 20) {
          score += 800 + diff * 100;
        }

        // PERSEGUIR: Aproximar quando não há maçã ou estamos imunes
        if (!apple || aiIsImmune) {
          if (newDistPlayer < currentDistPlayer) {
            score += 600 + diff * 50;
          }
        }

        // Bonus agressivo quando AI está imune
        if (aiIsImmune && newDistPlayer < currentDistPlayer) {
          score += 1500;
        }
      }

      // PENALIZAR: Bordas e cantos
      const margin = 4;
      if (
        nx < margin ||
        nx >= cols - margin ||
        ny < margin ||
        ny >= rows - margin
      ) {
        score -= 200;
      }

      // Cantos são muito perigosos
      const cornerDist = Math.min(nx, cols - 1 - nx, ny, rows - 1 - ny);
      if (cornerDist < 3) {
        score -= 400;
      }

      return { d, score, space };
    });

    // Ordenar por score
    scored.sort((a, b) => b.score - a.score);

    // Em dificuldade alta (7+), sempre escolher o melhor
    // Em dificuldade média, 90% melhor, 10% segundo melhor
    // Em dificuldade baixa, um pouco mais de variação
    if (diff >= 7 || scored.length === 1) {
      return scored[0].d;
    }

    if (diff >= 4) {
      // 95% melhor opção, 5% segunda
      if (scored.length > 1 && Math.random() < 0.05) {
        return scored[1].d;
      }
      return scored[0].d;
    }

    // Dificuldade baixa: 85% melhor, 15% outras
    if (scored.length > 1 && Math.random() < 0.15) {
      const idx = Math.min(1, scored.length - 1);
      return scored[idx].d;
    }

    return scored[0].d;
  }

  /* ─── Build Overlay DOM ─── */
  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "tron-overlay";

    closeBtn = document.createElement("button");
    closeBtn.className = "tron-close";
    closeBtn.textContent = "ESC / Fechar";
    closeBtn.addEventListener("click", closeTron);

    canvas = document.createElement("canvas");
    canvas.className = "tron-canvas";

    scoreUI = document.createElement("div");
    scoreUI.className = "tron-ui";
    scoreUI.style.display = "none";
    scoreP1 = document.createElement("span");
    scoreP1.className = "tron-score-p1";
    const sep = document.createElement("span");
    sep.className = "tron-score-sep";
    sep.textContent = "|";
    scoreP2 = document.createElement("span");
    scoreP2.className = "tron-score-p2";
    scoreUI.append(scoreP1, sep, scoreP2);

    revengeOverlay = document.createElement("div");
    revengeOverlay.style.cssText =
      "position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:100;animation:revenge-flash 1.2s ease-out forwards;";
    const revengeText = document.createElement("div");
    revengeText.style.cssText =
      "font-family:'Barlow Condensed',sans-serif;font-size:clamp(6rem,20vw,16rem);font-weight:900;color:#8860ff;text-transform:uppercase;letter-spacing:-.04em;text-shadow:0 0 60px #8860ff,0 0 120px #8860ff;animation:revenge-text 1.2s ease-out forwards;";
    revengeText.textContent = "AI REVENGE";
    revengeOverlay.appendChild(revengeText);

    menuPanel = buildMenuPanel();
    gameOverPanel = buildGameOverPanel();

    overlay.append(
      closeBtn,
      canvas,
      scoreUI,
      revengeOverlay,
      menuPanel,
      gameOverPanel,
    );
    document.body.appendChild(overlay);

    ctx = canvas.getContext("2d");
  }

  function buildKnobRow(onSpeedChange, onDiffChange) {
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;gap:3rem;margin-top:2rem;padding:1.5rem;background:rgba(0,0,0,.3);border-radius:8px;border:1px solid rgba(255,255,255,.05);";
    const sk = new Knob(row, {
      value: speed,
      min: 1,
      max: 10,
      label: "Velocidade",
      color: "#e8186d",
      onChange: onSpeedChange,
    });
    const dk = new Knob(row, {
      value: difficulty,
      min: 1,
      max: 10,
      label: "Dificuldade",
      color: "#8860ff",
      onChange: onDiffChange,
    });
    return { row, sk, dk };
  }

  function buildMenuPanel() {
    const panel = document.createElement("div");
    panel.className = "tron-menu";

    const title = document.createElement("div");
    title.className = "tron-menu-title";
    title.textContent = "TRON";

    const sub = document.createElement("div");
    sub.className = "tron-menu-sub";
    sub.textContent = "Light Bikes";

    const hint = document.createElement("div");
    hint.className = "tron-menu-sub";
    hint.style.cssText = "color:#e8186d;font-size:.65rem;margin-top:.5rem;";
    hint.textContent = "Use Setas ou WASD para mover";

    const players = document.createElement("div");
    players.style.cssText = "display:flex;gap:3rem;margin-top:1.5rem;";
    players.innerHTML = `
      <div style="text-align:center">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:#e8186d;margin-bottom:.5rem;letter-spacing:.1em">P1 (VOCÊ)</div>
        <div style="font-size:2rem">🏍️</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:#8860ff;margin-bottom:.5rem;letter-spacing:.1em">P2 (AI)</div>
        <div style="font-size:2rem">🤖</div>
      </div>
    `;

    const {
      row: knobRow,
      sk,
      dk,
    } = buildKnobRow(
      (v) => {
        speed = v;
        if (extremeWarning) updateExtremeWarning(extremeWarning);
      },
      (v) => {
        difficulty = v;
        if (extremeWarning) updateExtremeWarning(extremeWarning);
      },
    );
    speedKnob = sk;
    diffKnob = dk;

    const extremeWarning = document.createElement("div");
    extremeWarning.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#8860ff;margin-top:.5rem;letter-spacing:.08em;display:none;";
    extremeWarning.textContent = "⚠️ MODO EXTREMO: AI tem vida extra";
    updateExtremeWarning(extremeWarning);

    const startBtn = document.createElement("button");
    startBtn.className = "tron-btn";
    startBtn.style.marginTop = "1.5rem";
    startBtn.textContent = "INICIAR JOGO";
    startBtn.addEventListener("click", startGame);

    panel.append(title, sub, hint, players, knobRow, extremeWarning, startBtn);
    return panel;
  }

  function buildGameOverPanel() {
    const panel = document.createElement("div");
    panel.className = "tron-menu";
    panel.style.display = "none";

    const winnerEl = document.createElement("div");
    winnerEl.className = "tron-winner";

    const scoreEl = document.createElement("div");
    scoreEl.className = "tron-menu-sub";
    scoreEl.style.marginTop = "1rem";

    const {
      row: knobRow,
      sk,
      dk,
    } = buildKnobRow(
      (v) => {
        speed = v;
        if (goExtremeWarning) updateExtremeWarning(goExtremeWarning);
      },
      (v) => {
        difficulty = v;
        if (goExtremeWarning) updateExtremeWarning(goExtremeWarning);
      },
    );
    speedKnob2 = sk;
    diffKnob2 = dk;

    const goExtremeWarning = document.createElement("div");
    goExtremeWarning.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#8860ff;margin-top:.5rem;letter-spacing:.08em;display:none;";
    goExtremeWarning.textContent = "⚠️ MODO EXTREMO: AI tem vida extra";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:1rem;margin-top:1.5rem;";

    const replayBtn = document.createElement("button");
    replayBtn.className = "tron-btn";
    replayBtn.textContent = "JOGAR NOVAMENTE";
    replayBtn.addEventListener("click", startGame);

    const backBtn = document.createElement("button");
    backBtn.className = "tron-btn tron-btn-outline";
    backBtn.textContent = "VOLTAR AO SITE";
    backBtn.addEventListener("click", closeTron);

    btnRow.append(replayBtn, backBtn);
    panel.append(winnerEl, scoreEl, knobRow, goExtremeWarning, btnRow);
    panel._winnerEl = winnerEl;
    panel._scoreEl = scoreEl;
    panel._extremeWarning = goExtremeWarning;
    return panel;
  }

  function updateExtremeWarning(el) {
    el.style.display = speed === 10 && difficulty === 10 ? "block" : "none";
  }

  /* ─── Game Logic ─── */
  function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60;
  }

  function drawGrid() {
    ctx.fillStyle = "#020208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let y = 0; y < canvas.height; y += 4)
      ctx.fillRect(0, y, canvas.width, 2);

    // Desenhar bordas visíveis do campo de jogo
    const borderWidth = 3;
    const glowSize = 15;
    const borderColor = "#e8186d";
    const borderColorAlt = "#8860ff";

    ctx.save();

    // Glow externo
    ctx.shadowBlur = glowSize;
    ctx.shadowColor = borderColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    // Borda superior
    ctx.beginPath();
    ctx.moveTo(0, borderWidth / 2);
    ctx.lineTo(canvas.width, borderWidth / 2);
    ctx.stroke();

    // Borda inferior
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - borderWidth / 2);
    ctx.lineTo(canvas.width, canvas.height - borderWidth / 2);
    ctx.stroke();

    // Bordas laterais com cor alternada
    ctx.shadowColor = borderColorAlt;
    ctx.strokeStyle = borderColorAlt;

    // Borda esquerda
    ctx.beginPath();
    ctx.moveTo(borderWidth / 2, 0);
    ctx.lineTo(borderWidth / 2, canvas.height);
    ctx.stroke();

    // Borda direita
    ctx.beginPath();
    ctx.moveTo(canvas.width - borderWidth / 2, 0);
    ctx.lineTo(canvas.width - borderWidth / 2, canvas.height);
    ctx.stroke();

    // Cantos com brilho extra
    const cornerSize = 20;
    ctx.shadowBlur = 25;
    ctx.lineWidth = 4;

    // Canto superior esquerdo
    ctx.shadowColor = borderColor;
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(0, cornerSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.stroke();

    // Canto superior direito
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerSize, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width, cornerSize);
    ctx.stroke();

    // Canto inferior esquerdo
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - cornerSize);
    ctx.lineTo(0, canvas.height);
    ctx.lineTo(cornerSize, canvas.height);
    ctx.stroke();

    // Canto inferior direito
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerSize, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width, canvas.height - cornerSize);
    ctx.stroke();

    ctx.restore();
  }

  function drawBike(bike) {
    if (!bike.alive) return;
    const isImmune = bike.immuneUntil && Date.now() < bike.immuneUntil;
    bike.trail.forEach((seg, i) => {
      const alpha = 0.3 + (i / bike.trail.length) * 0.7;
      ctx.shadowBlur = isImmune ? 14 : 8;
      ctx.shadowColor = isImmune ? "#ffffff" : bike.glow;
      ctx.fillStyle = isImmune ? "#ffffff" : bike.color;
      ctx.globalAlpha = alpha * (isImmune ? 0.6 : 1);
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (isImmune) {
      // Pulsing shield aura
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 80);
      const cx = bike.x * CELL + CELL / 2;
      const cy = bike.y * CELL + CELL / 2;
      const r = CELL * (1.4 + 0.4 * pulse);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * pulse;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ffffff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = isImmune ? "#ffffff" : bike.color;
    ctx.fillStyle = isImmune ? "#ffffff" : bike.color;
    ctx.fillRect(bike.x * CELL, bike.y * CELL, CELL, CELL);
    ctx.shadowBlur = 0;
  }

  function drawApple(apple) {
    if (!apple) return;
    const cx = apple.x * CELL + CELL / 2;
    const cy = apple.y * CELL + CELL / 2;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    const r = CELL * (0.8 + 0.12 * pulse);

    ctx.save();
    ctx.shadowBlur = 18 + 10 * pulse;
    ctx.shadowColor = "#00ff55";
    ctx.fillStyle = "#22dd44";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#aaffbb";
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Stem
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#885500";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(
      cx + CELL * 0.4,
      cy - r - CELL * 0.5,
      cx + CELL * 0.2,
      cy - r - CELL * 0.6,
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawImmunityBars(bikes) {
    const now = Date.now();
    const barW = 140,
      barH = 10,
      barY = 8,
      gap = 10;

    ["p1", "p2"].forEach((key) => {
      const bike = bikes[key];
      if (!bike.immuneUntil || now >= bike.immuneUntil) return;
      const remaining = bike.immuneUntil - now;
      const pct = remaining / IMMUNE_DURATION;
      const isP1 = key === "p1";
      const barX = isP1 ? gap : canvas.width - barW - gap;

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(barX, barY, barW, barH + 16);

      // Background
      ctx.fillStyle = "#1a1030";
      ctx.fillRect(barX + 2, barY + 14, barW - 4, barH - 2);

      // Fill
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffffff";
      ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now / 80))})`;
      ctx.fillRect(barX + 2, barY + 14, (barW - 4) * pct, barH - 2);
      ctx.shadowBlur = 0;

      // Label
      ctx.font = "bold 9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = isP1 ? COLORS.p1 : COLORS.p2;
      ctx.fillText(
        `${isP1 ? "P1" : "AI"} IMUNE ${(remaining / 1000).toFixed(1)}s`,
        barX + 3,
        barY + 11,
      );
      ctx.restore();
    });
  }

  function startGame() {
    if (rafId) cancelAnimationFrame(rafId);
    updateSize();

    const W = canvas.width,
      H = canvas.height;
    const cols = Math.floor(W / CELL),
      rows = Math.floor(H / CELL);
    const bikes = initBikes(cols, rows);
    bikes.p1.trail.push({ x: bikes.p1.x, y: bikes.p1.y });
    bikes.p2.trail.push({ x: bikes.p2.x, y: bikes.p2.y });
    const occupied = new Set();
    occupied.add(`${bikes.p1.x},${bikes.p1.y}`);
    occupied.add(`${bikes.p2.x},${bikes.p2.y}`);
    gameRef = { bikes, occupied, cols, rows, apple: null, appleTimer: null };

    function scheduleApple(delay) {
      clearTimeout(gameRef.appleTimer);
      gameRef.appleTimer = setTimeout(() => {
        if (!gameRef) return;
        gameRef.apple = spawnApple(cols, rows, gameRef.occupied);
        // Despawn after 15s if not collected
        gameRef.appleTimer = setTimeout(() => {
          if (!gameRef) return;
          gameRef.apple = null;
          scheduleApple(3000); // respawn 3s later
        }, 15000);
      }, delay);
    }
    scheduleApple(2000); // first apple appears after 2s

    aiLives = speed === 10 && difficulty === 10 ? 1 : 0;
    winner = null;
    gameState = "PLAYING";

    menuPanel.style.display = "none";
    gameOverPanel.style.display = "none";
    scoreUI.style.display = "flex";
    updateScoreUI();

    let lastTick = 0;
    function tick(now) {
      if (!gameRef) return;
      const { bikes, occupied, cols, rows } = gameRef;
      const tickMs = 150 - speed * 12;
      if (now - lastTick < tickMs) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastTick = now;

      if (
        (keysPressed["ArrowUp"] || keysPressed["w"] || keysPressed["W"]) &&
        bikes.p1.dy !== 1
      ) {
        bikes.p1.dx = 0;
        bikes.p1.dy = -1;
      } else if (
        (keysPressed["ArrowDown"] || keysPressed["s"] || keysPressed["S"]) &&
        bikes.p1.dy !== -1
      ) {
        bikes.p1.dx = 0;
        bikes.p1.dy = 1;
      } else if (
        (keysPressed["ArrowLeft"] || keysPressed["a"] || keysPressed["A"]) &&
        bikes.p1.dx !== 1
      ) {
        bikes.p1.dx = -1;
        bikes.p1.dy = 0;
      } else if (
        (keysPressed["ArrowRight"] || keysPressed["d"] || keysPressed["D"]) &&
        bikes.p1.dx !== -1
      ) {
        bikes.p1.dx = 1;
        bikes.p1.dy = 0;
      }

      if (bikes.p2.alive) {
        const dir = aiMove(
          bikes.p2,
          occupied,
          cols,
          rows,
          difficulty,
          gameRef,
          bikes.p1,
        );
        bikes.p2.dx = dir.dx;
        bikes.p2.dy = dir.dy;
      }

      function moveBike(bike) {
        if (!bike.alive) return;
        const nx = bike.x + bike.dx,
          ny = bike.y + bike.dy;
        const isImmune = bike.immuneUntil && Date.now() < bike.immuneUntil;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
          bike.alive = false;
          return;
        }
        if (!isImmune && occupied.has(`${nx},${ny}`)) {
          bike.alive = false;
          return;
        }
        // Collect apple
        const { apple } = gameRef;
        if (apple && apple.x === nx && apple.y === ny) {
          bike.immuneUntil = Date.now() + IMMUNE_DURATION;
          gameRef.apple = null;
          scheduleApple(5000); // respawn 5s after collection
        }
        bike.trail.push({ x: bike.x, y: bike.y });
        occupied.add(`${nx},${ny}`);
        bike.x = nx;
        bike.y = ny;
      }

      moveBike(bikes.p1);
      moveBike(bikes.p2);
      drawGrid();
      drawApple(gameRef.apple);
      drawBike(bikes.p1);
      drawBike(bikes.p2);
      drawImmunityBars(bikes);

      if (!bikes.p1.alive || !bikes.p2.alive) {
        if (!bikes.p2.alive && bikes.p1.alive && aiLives > 0) {
          aiLives--;
          showRevenge();
          // Encontrar posição mais distante das trilhas ocupadas
          const margin = 5;
          let bestPos = {
            x: Math.floor((cols * 2) / 3),
            y: Math.floor(rows / 2),
          };
          let bestDist = -1;
          // Testar várias posições candidatas
          for (let attempts = 0; attempts < 50; attempts++) {
            const cx = margin + Math.floor(Math.random() * (cols - margin * 2));
            const cy = margin + Math.floor(Math.random() * (rows - margin * 2));
            if (occupied.has(`${cx},${cy}`)) continue;
            // Calcular distância mínima para qualquer célula ocupada
            let minDist = Infinity;
            for (const key of occupied) {
              const [ox, oy] = key.split(",").map(Number);
              const dist = Math.abs(cx - ox) + Math.abs(cy - oy);
              if (dist < minDist) minDist = dist;
            }
            if (minDist > bestDist) {
              bestDist = minDist;
              bestPos = { x: cx, y: cy };
            }
          }
          bikes.p2.x = bestPos.x;
          bikes.p2.y = bestPos.y;
          bikes.p2.dx = bikes.p1.x > bikes.p2.x ? -1 : 1;
          bikes.p2.dy = 0;
          bikes.p2.alive = true;
          bikes.p2.trail = [];
          occupied.add(`${bikes.p2.x},${bikes.p2.y}`);
          rafId = requestAnimationFrame(tick);
          return;
        }

        if (!bikes.p1.alive && !bikes.p2.alive) winner = "draw";
        else if (!bikes.p1.alive) winner = "p2";
        else winner = "p1";

        if (winner === "p1") score.p1++;
        else if (winner === "p2") score.p2++;
        gameState = "GAME_OVER";
        showGameOver();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    drawGrid();
    rafId = requestAnimationFrame(tick);
  }

  function showRevenge() {
    revengeOverlay.style.display = "flex";
    clearTimeout(revengeTimer);
    revengeTimer = setTimeout(() => {
      revengeOverlay.style.display = "none";
    }, 1200);
  }

  function updateScoreUI() {
    scoreP1.textContent = `P1 (Você): ${score.p1}`;
    scoreP2.textContent = `P2 (AI): ${score.p2}`;
  }

  function showGameOver() {
    scoreUI.style.display = "none";
    gameOverPanel.style.display = "flex";
    const we = gameOverPanel._winnerEl;
    const se = gameOverPanel._scoreEl;
    const gew = gameOverPanel._extremeWarning;

    if (winner === "p1") {
      we.textContent = "🏆 VOCÊ VENCEU!";
      we.style.color = "#e8186d";
      we.style.textShadow = "0 0 30px #e8186d";
    } else if (winner === "p2") {
      we.textContent = "AI VENCEU";
      we.style.color = "#8860ff";
      we.style.textShadow = "0 0 30px #8860ff";
    } else {
      we.textContent = "EMPATE";
      we.style.color = "#7a6fa0";
      we.style.textShadow = "0 0 30px #7a6fa0";
    }
    se.innerHTML = `Placar — <span style="color:#e8186d">P1: ${score.p1}</span> / <span style="color:#8860ff">AI: ${score.p2}</span>`;
    updateExtremeWarning(gew);

    // Sync knob2 visuals
    if (speedKnob2) speedKnob2.setValue(speed);
    if (diffKnob2) diffKnob2.setValue(difficulty);
  }

  function openTron() {
    overlay.classList.add("visible");
    updateSize();
    gameState = "MENU";
    menuPanel.style.display = "flex";
    gameOverPanel.style.display = "none";
    scoreUI.style.display = "none";
    revengeOverlay.style.display = "none";
    score = { p1: 0, p2: 0 };
    // Sync knob visuals
    if (speedKnob) speedKnob.setValue(speed);
    if (diffKnob) diffKnob.setValue(difficulty);
  }

  function closeTron() {
    overlay.classList.remove("visible");
    if (rafId) cancelAnimationFrame(rafId);
    if (gameRef) clearTimeout(gameRef.appleTimer);
    gameRef = null;
    gameState = "MENU";
  }

  /* ─── Key Handling ─── */
  document.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
    if (e.key === "Escape" && overlay && overlay.classList.contains("visible"))
      closeTron();
    if (overlay && overlay.classList.contains("visible")) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
  });

  window.addEventListener("resize", () => {
    if (overlay && overlay.classList.contains("visible")) updateSize();
  });

  /* ─── Init ─── */
  document.addEventListener("DOMContentLoaded", () => {
    buildOverlay();
    window.openTronGame = openTron;
  });
})();
