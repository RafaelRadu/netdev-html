/* ════════════════════════════════════════
   TRON LIGHT BIKES — Vanilla JS
   v2 · Campaign Mode (3 Fases)
════════════════════════════════════════ */
(function () {
  const CELL = 8;
  const COLORS = {
    p1: "#e8186d",
    p1glow: "rgba(232,24,109,0.5)",
    ai: ["#8860ff", "#00ccff", "#ff8800"],
    aiglow: [
      "rgba(136,96,255,0.5)",
      "rgba(0,204,255,0.5)",
      "rgba(255,136,0,0.5)",
    ],
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

  /* ─── Leaderboard (Local + Global via jsonbin.io) ─── */
  const LS_KEY = "netdev_tron_scores_v2";

  // ═══════════════════════════════════════════════════════════
  // RANKING GLOBAL — Configuração
  // Para ativar o ranking global visível por qualquer pessoa:
  // 1. Acesse https://jsonbin.io e crie uma conta gratuita
  // 2. Crie um novo Bin com o conteúdo:  []
  // 3. Copie o BIN ID e a API KEY (Master Key)
  // 4. Cole abaixo:
  // ═══════════════════════════════════════════════════════════
  const REMOTE_LEADERBOARD = {
    binId: "69b1fa7daa77b81da9d8e48e",
    apiKey: "$2a$10$8R4UjmhhMGYfDs7uU79BZerT3RguOPZMhv8jVW16O3pBuybmvAhri",
    get enabled() {
      return !!(this.binId && this.apiKey);
    },
  };

  function getLocalLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveScoreLocal(name, sc) {
    var board = getLocalLeaderboard();
    board.push({
      name: (name || "???").toUpperCase().slice(0, 12),
      score: sc,
      date: new Date().toLocaleDateString("pt-BR"),
    });
    board.sort(function (a, b) {
      return b.score - a.score;
    });
    board.splice(10);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(board));
    } catch (e) {}
    return board;
  }

  function saveScoreRemote(name, sc) {
    if (!REMOTE_LEADERBOARD.enabled) return Promise.resolve(null);
    var base = "https://api.jsonbin.io/v3/b/" + REMOTE_LEADERBOARD.binId;
    var headers = { "X-Master-Key": REMOTE_LEADERBOARD.apiKey };
    return fetch(base + "/latest", { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error("GET " + res.status);
        return res.json();
      })
      .then(function (data) {
        var board = Array.isArray(data.record) ? data.record : [];
        board.push({
          name: (name || "???").toUpperCase().slice(0, 12),
          score: sc,
          date: new Date().toLocaleDateString("pt-BR"),
        });
        board.sort(function (a, b) {
          return b.score - a.score;
        });
        board.splice(10);
        return fetch(base, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": REMOTE_LEADERBOARD.apiKey,
          },
          body: JSON.stringify(board),
        }).then(function (putRes) {
          if (!putRes.ok) throw new Error("PUT " + putRes.status);
          return board;
        });
      })
      .catch(function (e) {
        console.warn("[Tron] Ranking global — falha ao salvar:", e.message);
        return null;
      });
  }

  function getRemoteLeaderboard() {
    if (!REMOTE_LEADERBOARD.enabled) return Promise.resolve(null);
    var url =
      "https://api.jsonbin.io/v3/b/" + REMOTE_LEADERBOARD.binId + "/latest";
    return fetch(url, {
      headers: { "X-Master-Key": REMOTE_LEADERBOARD.apiKey },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("" + res.status);
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data.record) ? data.record : [];
      })
      .catch(function (e) {
        console.warn("[Tron] Ranking global — falha ao carregar:", e.message);
        return null;
      });
  }

  function saveScore(name, sc) {
    saveScoreLocal(name, sc);
    if (REMOTE_LEADERBOARD.enabled) {
      saveScoreRemote(name, sc).then(function (board) {
        if (!board || !overlay) return;
        var lists = overlay.querySelectorAll(".tron-lb-list");
        for (var i = 0; i < lists.length; i++) {
          renderLeaderboardRows(lists[i], board);
        }
      });
    }
  }

  function getLeaderboard() {
    return getLocalLeaderboard();
  }

  /* ─── Game State ─── */
  let gameState = "MENU";
  let speed = 5;
  let difficulty = 5;
  let gameRef = null;
  let rafId = null;
  let keysPressed = {};
  let currentPhase = 1;
  let currentScore = 0;
  let playerName = "JOGADOR";
  let phaseTransition = false;

  const MAX_PHASES = 3;
  const SCORE_AI_KILL = 100;
  const SCORE_APPLE_COLLECT = 50;
  const SCORE_PHASE = [0, 200, 400, 600]; // index = phase number
  const SCORE_PER_SECOND = 3;

  /* ─── DOM Elements ─── */
  let overlay, canvas, ctx, closeBtn;
  let hudEl, hudNameEl, hudPhaseEl, hudScoreEl;
  let menuPanel, gameOverPanel, phaseOverlay, phaseOverlayMain, phaseOverlaySub;
  let speedKnob, diffKnob, speedKnob2, diffKnob2;
  let nameInput;

  /* ─── Bikes Init ─── */
  function initBikes(cols, rows, numAIs) {
    const player = {
      x: Math.floor(cols / 4),
      y: Math.floor(rows / 2),
      dx: 1,
      dy: 0,
      trail: [],
      alive: true,
      color: COLORS.p1,
      glow: COLORS.p1glow,
      immuneUntil: 0,
    };
    const ais = [];
    for (let i = 0; i < numAIs; i++) {
      const yFrac = (i + 1) / (numAIs + 1);
      ais.push({
        x: Math.floor((cols * 3) / 4) - i * 3,
        y: Math.floor(rows * yFrac),
        dx: -1,
        dy: 0,
        trail: [],
        alive: true,
        color: COLORS.ai[i],
        glow: COLORS.aiglow[i],
        immuneUntil: 0,
        id: i,
      });
    }
    return { player, ais };
  }

  const IMMUNE_DURATION = 10000;

  /* ─── Apple ─── */
  function spawnApple(cols, rows, occupied) {
    const margin = 3;
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = margin + Math.floor(Math.random() * (cols - margin * 2));
      const y = margin + Math.floor(Math.random() * (rows - margin * 2));
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
    return null;
  }

  /* ─── AI ─── */
  function aiMove(bike, occupied, cols, rows, diff, gameRef, playerBike) {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const valid = dirs.filter((d) => !(d.dx === -bike.dx && d.dy === -bike.dy));

    const playerIsImmune =
      playerBike?.immuneUntil && Date.now() < playerBike.immuneUntil;
    const aiIsImmune = bike.immuneUntil && Date.now() < bike.immuneUntil;

    function isSafe(d, depth = 1) {
      let x = bike.x,
        y = bike.y;
      for (let i = 0; i < depth; i++) {
        x += d.dx;
        y += d.dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
        if (!aiIsImmune && occupied.has(`${x},${y}`)) return false;
      }
      return true;
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

    function distance(x1, y1, x2, y2) {
      return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

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
    if (safeDirs.length === 1) return safeDirs[0];

    // MODO IMUNE: perseguição total, sem restrições de espaço ou bordas
    if (aiIsImmune && playerBike && playerBike.alive) {
      const dirToPlayer = directionTo(
        bike.x,
        bike.y,
        playerBike.x,
        playerBike.y,
      );
      const futureX = playerBike.x + playerBike.dx * 3;
      const futureY = playerBike.y + playerBike.dy * 3;

      const immuneScored = safeDirs.map((d) => {
        const nx = bike.x + d.dx,
          ny = bike.y + d.dy;
        let sc = 0;
        const distNow = distance(bike.x, bike.y, playerBike.x, playerBike.y);
        const distNext = distance(nx, ny, playerBike.x, playerBike.y);
        sc += (distNow - distNext) * 500;
        if (d.dx === dirToPlayer.dx && d.dy === dirToPlayer.dy) sc += 3000;
        const distFuture = distance(nx, ny, futureX, futureY);
        sc += (100 - distFuture) * 30;
        return { d, sc };
      });
      immuneScored.sort((a, b) => b.sc - a.sc);
      return immuneScored[0].d;
    }

    const apple = gameRef?.apple;

    const dirsWithSpace = safeDirs.map((d) => {
      const nx = bike.x + d.dx,
        ny = bike.y + d.dy;
      const space = floodFill(nx, ny, `${bike.x},${bike.y}`);
      const safeDepth = [2, 3, 4, 5].filter((depth) => isSafe(d, depth)).length;
      return { d, space, safeDepth, nx, ny };
    });

    const maxSpace = Math.max(...dirsWithSpace.map((x) => x.space));
    const viableDirs = dirsWithSpace.filter(
      (x) => x.space >= maxSpace * 0.2 && x.space > 5,
    );

    if (viableDirs.length === 0) {
      dirsWithSpace.sort((a, b) => b.space - a.space);
      return dirsWithSpace[0].d;
    }

    const scored = viableDirs.map((item) => {
      const { d, space, safeDepth, nx, ny } = item;
      let score = 0;

      score += space * 10;
      score += safeDepth * 50;

      if (apple) {
        const currentDist = distance(bike.x, bike.y, apple.x, apple.y);
        const newDist = distance(nx, ny, apple.x, apple.y);
        const playerDist = playerBike
          ? distance(playerBike.x, playerBike.y, apple.x, apple.y)
          : Infinity;

        if (currentDist <= playerDist + 5 || currentDist <= 12) {
          if (newDist < currentDist) {
            score += 2000 + (currentDist - newDist) * 200;
          }
        }
        if (newDist < currentDist) score += 500;
      }

      if (playerBike && playerBike.alive && !playerIsImmune) {
        const currentDistPlayer = distance(
          bike.x,
          bike.y,
          playerBike.x,
          playerBike.y,
        );
        const newDistPlayer = distance(nx, ny, playerBike.x, playerBike.y);
        const futureX = playerBike.x + playerBike.dx * 4;
        const futureY = playerBike.y + playerBike.dy * 4;
        const distToFuture = distance(nx, ny, futureX, futureY);
        const currentDistToFuture = distance(bike.x, bike.y, futureX, futureY);
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

        if (playerSpace < playerCurrentSpace) {
          score += (playerCurrentSpace - playerSpace) * (40 + diff * 10);
        }
        if (distToFuture < currentDistToFuture && currentDistPlayer < 20) {
          score += 800 + diff * 100;
        }
        if (!apple && newDistPlayer < currentDistPlayer) {
          score += 600 + diff * 50;
        }
      }

      const margin = 4;
      if (
        nx < margin ||
        nx >= cols - margin ||
        ny < margin ||
        ny >= rows - margin
      ) {
        score -= 200;
      }
      const cornerDist = Math.min(nx, cols - 1 - nx, ny, rows - 1 - ny);
      if (cornerDist < 3) score -= 400;

      return { d, score, space };
    });

    scored.sort((a, b) => b.score - a.score);

    if (diff >= 7 || scored.length === 1) return scored[0].d;
    if (diff >= 4) {
      if (scored.length > 1 && Math.random() < 0.05) return scored[1].d;
      return scored[0].d;
    }
    if (scored.length > 1 && Math.random() < 0.15) return scored[1].d;
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

    // HUD durante o jogo
    hudEl = document.createElement("div");
    hudEl.className = "tron-ui";
    hudEl.style.display = "none";

    hudNameEl = document.createElement("span");
    hudNameEl.className = "tron-score-p1";

    const sep1 = document.createElement("span");
    sep1.className = "tron-score-sep";
    sep1.textContent = "|";

    hudPhaseEl = document.createElement("span");
    hudPhaseEl.className = "tron-score-p2";

    const sep2 = document.createElement("span");
    sep2.className = "tron-score-sep";
    sep2.textContent = "|";

    hudScoreEl = document.createElement("span");
    hudScoreEl.style.cssText =
      "font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:#ffffff;letter-spacing:.04em;";

    hudEl.append(hudNameEl, sep1, hudPhaseEl, sep2, hudScoreEl);

    // Overlay de transição de fase
    phaseOverlay = document.createElement("div");
    phaseOverlay.style.cssText =
      "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:100;background:rgba(2,2,8,0.92);";
    phaseOverlayMain = document.createElement("div");
    phaseOverlayMain.style.cssText =
      "font-family:'Barlow Condensed',sans-serif;font-size:clamp(4rem,14vw,11rem);font-weight:900;text-transform:uppercase;letter-spacing:-.04em;text-align:center;";
    phaseOverlaySub = document.createElement("div");
    phaseOverlaySub.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:clamp(.65rem,1.8vw,.95rem);color:#7a6fa0;margin-top:1.2rem;letter-spacing:.12em;text-align:center;line-height:2;";
    phaseOverlay.append(phaseOverlayMain, phaseOverlaySub);

    menuPanel = buildMenuPanel();
    gameOverPanel = buildGameOverPanel();

    overlay.append(
      closeBtn,
      canvas,
      hudEl,
      phaseOverlay,
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
    sub.textContent = "Light Bikes · Campaign";

    const hint = document.createElement("div");
    hint.className = "tron-menu-sub";
    hint.style.cssText = "color:#e8186d;font-size:.65rem;margin-top:.5rem;";
    hint.textContent = "Use Setas ou WASD para mover";

    // Fases info
    const phasesInfo = document.createElement("div");
    phasesInfo.style.cssText =
      "display:flex;gap:1.5rem;margin-top:1.5rem;padding:1rem;background:rgba(0,0,0,.25);border-radius:8px;border:1px solid rgba(255,255,255,.04);";
    phasesInfo.innerHTML = `
      <div style="text-align:center;flex:1;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:#e8186d;">1</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#7a6fa0;letter-spacing:.08em;margin-top:.2rem;">FASE 1<br>1 vs 1</div>
      </div>
      <div style="text-align:center;flex:1;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:#8860ff;">2</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#7a6fa0;letter-spacing:.08em;margin-top:.2rem;">FASE 2<br>1 vs 2</div>
      </div>
      <div style="text-align:center;flex:1;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:#00ccff;">3</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#7a6fa0;letter-spacing:.08em;margin-top:.2rem;">FASE 3<br>1 vs 3</div>
      </div>
    `;

    // Name input
    const nameWrap = document.createElement("div");
    nameWrap.style.cssText =
      "margin-top:1.5rem;display:flex;flex-direction:column;gap:.5rem;";
    const nameLabel = document.createElement("label");
    nameLabel.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:#7a6fa0;letter-spacing:.1em;text-transform:uppercase;";
    nameLabel.textContent = "Seu Nome";
    nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 12;
    nameInput.placeholder = "JOGADOR";
    nameInput.value = playerName !== "JOGADOR" ? playerName : "";
    nameInput.style.cssText =
      "font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:#ffffff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:.4rem .75rem;outline:none;text-transform:uppercase;letter-spacing:.06em;width:100%;box-sizing:border-box;";
    nameInput.addEventListener("focus", () => {
      nameInput.style.borderColor = "#e8186d";
    });
    nameInput.addEventListener("blur", () => {
      nameInput.style.borderColor = "rgba(255,255,255,.12)";
    });
    nameWrap.append(nameLabel, nameInput);

    const {
      row: knobRow,
      sk,
      dk,
    } = buildKnobRow(
      (v) => {
        speed = v;
      },
      (v) => {
        difficulty = v;
      },
    );
    speedKnob = sk;
    diffKnob = dk;

    const startBtn = document.createElement("button");
    startBtn.className = "tron-btn";
    startBtn.style.marginTop = "1.5rem";
    startBtn.textContent = "INICIAR CAMPANHA";
    startBtn.addEventListener("click", startGame);

    // Leaderboard preview no menu
    const lbWrap = buildLeaderboardEl();

    panel.append(
      title,
      sub,
      hint,
      phasesInfo,
      nameWrap,
      knobRow,
      startBtn,
      lbWrap,
    );
    panel._lbWrap = lbWrap;
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
      },
      (v) => {
        difficulty = v;
      },
    );
    speedKnob2 = sk;
    diffKnob2 = dk;

    const lbEl = buildLeaderboardEl();

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
    panel.append(winnerEl, scoreEl, lbEl, knobRow, btnRow);
    panel._winnerEl = winnerEl;
    panel._scoreEl = scoreEl;
    panel._lbEl = lbEl;
    return panel;
  }

  function buildLeaderboardEl() {
    var wrap = document.createElement("div");
    wrap.style.cssText =
      "margin-top:1.5rem;padding:1rem 1.5rem;background:rgba(0,0,0,.3);border-radius:8px;border:1px solid rgba(255,255,255,.05);width:100%;max-width:420px;margin-left:auto;margin-right:auto;box-sizing:border-box;";

    var titleRow = document.createElement("div");
    titleRow.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;";

    var title = document.createElement("div");
    title.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:#7a6fa0;letter-spacing:.12em;text-transform:uppercase;";
    title.textContent = REMOTE_LEADERBOARD.enabled
      ? "\uD83C\uDF10 Ranking Global \u2014 Top 10"
      : "\uD83D\uDCBE Ranking Local \u2014 Top 10";

    var syncIndicator = document.createElement("div");
    syncIndicator.className = "tron-lb-sync";
    syncIndicator.style.cssText =
      "font-family:'IBM Plex Mono',monospace;font-size:.45rem;color:#e8186d;letter-spacing:.06em;display:none;";
    syncIndicator.textContent = "\u27F3 sincronizando...";

    titleRow.append(title, syncIndicator);

    var list = document.createElement("div");
    list.className = "tron-lb-list";
    list.style.cssText = "display:flex;flex-direction:column;gap:.25rem;";

    wrap.append(titleRow, list);
    wrap._list = list;
    wrap._sync = syncIndicator;
    wrap._title = title;

    refreshLeaderboardEl(wrap);
    return wrap;
  }

  function renderLeaderboardRows(list, board) {
    list.innerHTML = "";
    if (!board || board.length === 0) {
      var empty = document.createElement("div");
      empty.style.cssText =
        "font-family:'IBM Plex Mono',monospace;font-size:.55rem;color:#3a3060;letter-spacing:.08em;";
      empty.textContent = "Nenhum registro ainda. Seja o primeiro!";
      list.appendChild(empty);
      return;
    }
    board.forEach(function (entry, i) {
      var row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:.6rem;padding:.25rem 0;border-bottom:1px solid rgba(255,255,255,.04);";

      var rank = document.createElement("span");
      rank.style.cssText =
        "font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:800;width:1.5rem;text-align:right;color:" +
        (i === 0
          ? "#e8186d"
          : i === 1
            ? "#8860ff"
            : i === 2
              ? "#00ccff"
              : "#3a3060") +
        ";";
      rank.textContent = "" + (i + 1);

      var name = document.createElement("span");
      name.style.cssText =
        "font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:700;color:#ffffff;flex:1;letter-spacing:.04em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      name.textContent = entry.name;

      var sc = document.createElement("span");
      sc.style.cssText =
        "font-family:'IBM Plex Mono',monospace;font-size:.75rem;font-weight:700;min-width:4rem;text-align:right;color:" +
        (i === 0 ? "#e8186d" : i === 1 ? "#8860ff" : "#b0a8d0") +
        ";";
      sc.textContent = (entry.score || 0).toLocaleString("pt-BR") + " pts";

      var date = document.createElement("span");
      date.style.cssText =
        "font-family:'IBM Plex Mono',monospace;font-size:.5rem;color:#7a6fa0;min-width:4.5rem;text-align:right;";
      date.textContent = entry.date;

      row.append(rank, name, sc, date);
      list.appendChild(row);
    });
  }

  function refreshLeaderboardEl(wrap) {
    var list = wrap._list;
    var sync = wrap._sync;
    if (!list) return;

    // Mostra dados locais imediatamente
    renderLeaderboardRows(list, getLocalLeaderboard());

    // Se API remota configurada, busca ranking global em background
    if (REMOTE_LEADERBOARD.enabled) {
      if (sync) sync.style.display = "inline";
      getRemoteLeaderboard().then(function (board) {
        if (sync) sync.style.display = "none";
        if (board) renderLeaderboardRows(list, board);
      });
    }
  }

  /* ─── Game Logic ─── */
  function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60;
  }

  function updateHUD() {
    hudNameEl.textContent = playerName.toUpperCase();
    hudPhaseEl.textContent = `FASE ${currentPhase}/${MAX_PHASES}`;
    hudScoreEl.textContent = `${currentScore.toLocaleString("pt-BR")} PTS`;
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

    const borderWidth = 3;
    const glowSize = 15;
    ctx.save();
    ctx.shadowBlur = glowSize;
    ctx.shadowColor = "#e8186d";
    ctx.strokeStyle = "#e8186d";
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.moveTo(0, borderWidth / 2);
    ctx.lineTo(canvas.width, borderWidth / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - borderWidth / 2);
    ctx.lineTo(canvas.width, canvas.height - borderWidth / 2);
    ctx.stroke();
    ctx.shadowColor = "#8860ff";
    ctx.strokeStyle = "#8860ff";
    ctx.beginPath();
    ctx.moveTo(borderWidth / 2, 0);
    ctx.lineTo(borderWidth / 2, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width - borderWidth / 2, 0);
    ctx.lineTo(canvas.width - borderWidth / 2, canvas.height);
    ctx.stroke();
    const cornerSize = 20;
    ctx.shadowBlur = 25;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#e8186d";
    ctx.strokeStyle = "#e8186d";
    ctx.beginPath();
    ctx.moveTo(0, cornerSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerSize, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width, cornerSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - cornerSize);
    ctx.lineTo(0, canvas.height);
    ctx.lineTo(cornerSize, canvas.height);
    ctx.stroke();
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
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#aaffbb";
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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

  function drawImmunityBars(player, ais) {
    const now = Date.now();
    const barW = 130,
      barH = 10,
      barY = 8,
      gap = 10;

    const allBikes = [player, ...ais];
    allBikes.forEach((bike, idx) => {
      if (!bike.immuneUntil || now >= bike.immuneUntil) return;
      const remaining = bike.immuneUntil - now;
      const pct = remaining / IMMUNE_DURATION;
      const isPlayer = idx === 0;
      const barX = isPlayer
        ? gap
        : canvas.width - barW - gap - (idx - 1) * (barW + gap);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(barX, barY, barW, barH + 16);
      ctx.fillStyle = "#1a1030";
      ctx.fillRect(barX + 2, barY + 14, barW - 4, barH - 2);
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffffff";
      ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now / 80))})`;
      ctx.fillRect(barX + 2, barY + 14, (barW - 4) * pct, barH - 2);
      ctx.shadowBlur = 0;
      ctx.font = "bold 9px 'IBM Plex Mono', monospace";
      ctx.fillStyle = isPlayer ? COLORS.p1 : bike.color;
      ctx.fillText(
        `${isPlayer ? "P1" : `AI${idx}`} IMUNE ${(remaining / 1000).toFixed(1)}s`,
        barX + 3,
        barY + 11,
      );
      ctx.restore();
    });
  }

  function drawPhaseLabel() {
    const label = `FASE ${currentPhase}`;
    ctx.save();
    ctx.font = "bold 11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(136,96,255,0.25)";
    ctx.textAlign = "right";
    ctx.fillText(label, canvas.width - 12, canvas.height - 10);
    ctx.restore();
  }

  /* ─── Phase Transition Overlay ─── */
  function showPhaseTransition(text, color, subLines, duration, cb) {
    phaseOverlayMain.textContent = text;
    phaseOverlayMain.style.color = color;
    phaseOverlayMain.style.textShadow = `0 0 60px ${color},0 0 120px ${color}`;
    phaseOverlaySub.innerHTML = subLines
      .map((l) => `<span>${l}</span>`)
      .join("<br>");
    phaseOverlay.style.display = "flex";
    phaseTransition = true;
    setTimeout(() => {
      phaseOverlay.style.display = "none";
      phaseTransition = false;
      if (cb) cb();
    }, duration);
  }

  /* ─── Start / Phase Logic ─── */
  function startGame() {
    playerName =
      (nameInput && nameInput.value.trim().toUpperCase()) || "JOGADOR";
    currentScore = 0;
    startPhase(1);
  }

  function startPhase(phase) {
    if (rafId) cancelAnimationFrame(rafId);
    currentPhase = phase;
    updateSize();

    const W = canvas.width,
      H = canvas.height;
    const cols = Math.floor(W / CELL),
      rows = Math.floor(H / CELL);
    const numAIs = phase; // fase 1→1 AI, fase 2→2 AIs, fase 3→3 AIs
    const bikes = initBikes(cols, rows, numAIs);

    bikes.player.trail.push({ x: bikes.player.x, y: bikes.player.y });
    const occupied = new Set();
    occupied.add(`${bikes.player.x},${bikes.player.y}`);
    for (const ai of bikes.ais) {
      ai.trail.push({ x: ai.x, y: ai.y });
      occupied.add(`${ai.x},${ai.y}`);
    }

    gameRef = { bikes, occupied, cols, rows, apple: null, appleTimer: null };

    function scheduleApple(delay) {
      clearTimeout(gameRef.appleTimer);
      gameRef.appleTimer = setTimeout(() => {
        if (!gameRef) return;
        gameRef.apple = spawnApple(cols, rows, gameRef.occupied);
        gameRef.appleTimer = setTimeout(() => {
          if (!gameRef) return;
          gameRef.apple = null;
          scheduleApple(3000);
        }, 15000);
      }, delay);
    }
    scheduleApple(2000);

    gameState = "PLAYING";
    phaseTransition = false;

    menuPanel.style.display = "none";
    gameOverPanel.style.display = "none";
    hudEl.style.display = "flex";
    updateHUD();

    // Pontuação de sobrevivência: +SCORE_PER_SECOND a cada segundo
    let scoreTickInterval = setInterval(() => {
      if (gameState !== "PLAYING") {
        clearInterval(scoreTickInterval);
        return;
      }
      currentScore += SCORE_PER_SECOND;
      updateHUD();
    }, 1000);

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

      // Bloquear input e lógica durante transição de fase
      if (phaseTransition) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // ── Movimento do jogador ──
      if (
        (keysPressed["ArrowUp"] || keysPressed["w"] || keysPressed["W"]) &&
        bikes.player.dy !== 1
      ) {
        bikes.player.dx = 0;
        bikes.player.dy = -1;
      } else if (
        (keysPressed["ArrowDown"] || keysPressed["s"] || keysPressed["S"]) &&
        bikes.player.dy !== -1
      ) {
        bikes.player.dx = 0;
        bikes.player.dy = 1;
      } else if (
        (keysPressed["ArrowLeft"] || keysPressed["a"] || keysPressed["A"]) &&
        bikes.player.dx !== 1
      ) {
        bikes.player.dx = -1;
        bikes.player.dy = 0;
      } else if (
        (keysPressed["ArrowRight"] || keysPressed["d"] || keysPressed["D"]) &&
        bikes.player.dx !== -1
      ) {
        bikes.player.dx = 1;
        bikes.player.dy = 0;
      }

      // ── Movimento das AIs ──
      const aiDiff = Math.min(10, difficulty + phase - 1);
      for (const ai of bikes.ais) {
        if (ai.alive) {
          const dir = aiMove(
            ai,
            occupied,
            cols,
            rows,
            aiDiff,
            gameRef,
            bikes.player,
          );
          ai.dx = dir.dx;
          ai.dy = dir.dy;
        }
      }

      // ── Mover todos os bikes ──
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
        const { apple } = gameRef;
        if (apple && apple.x === nx && apple.y === ny) {
          bike.immuneUntil = Date.now() + IMMUNE_DURATION;
          gameRef.apple = null;
          scheduleApple(5000);
          // Bônus de pontuação por coletar maçã (só para o jogador)
          if (bike === bikes.player) {
            currentScore += SCORE_APPLE_COLLECT;
            updateHUD();
          }
        }
        bike.trail.push({ x: bike.x, y: bike.y });
        occupied.add(`${nx},${ny}`);
        bike.x = nx;
        bike.y = ny;
      }

      // Rastrear estado anterior das AIs para detectar morte e pontuar
      const aiWasAlive = bikes.ais.map((ai) => ai.alive);

      moveBike(bikes.player);
      for (const ai of bikes.ais) moveBike(ai);

      // Pontuar kills de AI e limpar trilha do occupied
      for (let i = 0; i < bikes.ais.length; i++) {
        if (aiWasAlive[i] && !bikes.ais[i].alive) {
          currentScore += SCORE_AI_KILL;
          updateHUD();
          // Remover trilha da AI morta do occupied para não criar paredes invisíveis
          const deadAI = bikes.ais[i];
          for (const seg of deadAI.trail) {
            occupied.delete(`${seg.x},${seg.y}`);
          }
          occupied.delete(`${deadAI.x},${deadAI.y}`);
        }
      }

      // ── Desenhar ──
      drawGrid();
      drawApple(gameRef.apple);
      drawBike(bikes.player);
      for (const ai of bikes.ais) drawBike(ai);
      drawImmunityBars(bikes.player, bikes.ais);
      drawPhaseLabel();

      // ── Verificar condições de fim ──
      const allAIsDead = bikes.ais.every((ai) => !ai.alive);
      const playerDead = !bikes.player.alive;

      if (playerDead) {
        clearInterval(scoreTickInterval);
        gameState = "GAME_OVER";
        clearTimeout(gameRef.appleTimer);
        saveScore(playerName, currentScore);
        showGameOver(false, phase);
        return;
      }

      if (allAIsDead) {
        clearInterval(scoreTickInterval);
        clearTimeout(gameRef.appleTimer);
        const phaseBonus = SCORE_PHASE[phase];
        currentScore += phaseBonus;
        updateHUD();

        if (phase < MAX_PHASES) {
          const subLines = [
            `+${phaseBonus} PTS BÔNUS DE FASE`,
            `SCORE ATUAL: ${currentScore.toLocaleString("pt-BR")}`,
            `PRÓXIMO: FASE ${phase + 1} — ${phase + 1} IA${phase + 1 > 1 ? "s" : ""}`,
          ];
          showPhaseTransition(
            `FASE ${phase} ✓`,
            "#e8186d",
            subLines,
            2800,
            () => startPhase(phase + 1),
          );
        } else {
          // Completou todas as fases — VITÓRIA!
          saveScore(playerName, currentScore);
          const subLines = [
            `+${phaseBonus} PTS BÔNUS FINAL`,
            `SCORE FINAL: ${currentScore.toLocaleString("pt-BR")}`,
            "CAMPANHA COMPLETA!",
          ];
          showPhaseTransition("VITÓRIA!", "#e8186d", subLines, 3000, () => {
            gameState = "GAME_OVER";
            showGameOver(true, phase);
          });
        }
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    drawGrid();
    rafId = requestAnimationFrame(tick);
  }

  function showGameOver(win, phase) {
    hudEl.style.display = "none";
    gameOverPanel.style.display = "flex";
    const we = gameOverPanel._winnerEl;
    const se = gameOverPanel._scoreEl;
    const le = gameOverPanel._lbEl;

    if (win) {
      we.textContent = "🏆 CAMPANHA COMPLETA!";
      we.style.color = "#e8186d";
      we.style.textShadow = "0 0 30px #e8186d";
    } else {
      we.textContent = `GAME OVER — Fase ${phase}`;
      we.style.color = "#8860ff";
      we.style.textShadow = "0 0 30px #8860ff";
    }

    se.innerHTML = `<span style="color:#e8186d">${playerName}</span> — Score: <span style="color:#ffffff;font-weight:700;">${currentScore.toLocaleString("pt-BR")} PTS</span>`;

    refreshLeaderboardEl(le);

    if (speedKnob2) speedKnob2.setValue(speed);
    if (diffKnob2) diffKnob2.setValue(difficulty);
  }

  function openTron() {
    overlay.classList.add("visible");
    updateSize();
    gameState = "MENU";
    menuPanel.style.display = "flex";
    gameOverPanel.style.display = "none";
    phaseOverlay.style.display = "none";
    hudEl.style.display = "none";

    // Sincronizar knobs e atualizar leaderboard no menu
    if (speedKnob) speedKnob.setValue(speed);
    if (diffKnob) diffKnob.setValue(difficulty);
    if (menuPanel._lbWrap) refreshLeaderboardEl(menuPanel._lbWrap);
  }

  function closeTron() {
    overlay.classList.remove("visible");
    if (rafId) cancelAnimationFrame(rafId);
    if (gameRef) clearTimeout(gameRef.appleTimer);
    gameRef = null;
    gameState = "MENU";
    phaseTransition = false;
  }

  /* ─── Key Handling ─── */
  document.addEventListener("keydown", (e) => {
    // Não interceptar teclas enquanto o input de nome estiver focado
    if (document.activeElement === nameInput) return;
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
