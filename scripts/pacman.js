(function () {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const stateEl = document.getElementById('state');
  const stageEl = document.getElementById('stage');
  const ghostCountEl = document.getElementById('ghostCount');
  const ghostStateEl = document.getElementById('ghostState');
  const ghostStatusRing = document.getElementById('ghostStatusRing');
  const successOverlay = document.getElementById('successOverlay');
  const overlayStageEl = document.getElementById('overlayStage');

  const palette = {
    background: '#020512',
    grid: 'rgba(255,255,255,0.08)',
    wallBase: '#051639',
    wallHighlight: '#13235a',
    wallOutline: '#3f5dd2',
    pellet: '#ffe747',
    pelletGlow: 'rgba(255,231,71,0.85)',
    pacman: '#ffe747',
    pacmanShadow: 'rgba(255,170,38,0.6)',
    eyeWhite: '#ffffff',
    pupil: '#0b1b39',
  };

  const grid = 18;
  const rows = canvas.height / grid;
  const cols = canvas.width / grid;
  const walls = [];
  const pellets = [];

  const stateLabels = {
    ready: 'READY',
    running: 'RUNNING',
    hit: 'HIT!',
    win: 'PERFECT!',
    over: 'GAME OVER',
  };

  const stageLog = [];
  function recordStage(reason) {
    stageLog.push({
      timestamp: new Date().toISOString(),
      reason,
      state: stateLabels[gameState] || 'UNKNOWN',
      stage: stage.toString().padStart(2, '0'),
    });
  }

  const trailLimit = 260;
  const directionMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyW: { x: 0, y: -1 },
    KeyS: { x: 0, y: 1 },
    KeyA: { x: -1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };

  const ghostBlueprints = [
    {
      name: 'Nova',
      body: '#ff7f8d',
      trim: '#fb1b3a',
      aura: 'rgba(255, 159, 173, 0.25)',
      speedProfile: [14, 12, 11, 10, 9, 8],
    },
    {
      name: 'Circuit',
      body: '#64c8ff',
      trim: '#1d9eff',
      aura: 'rgba(100, 200, 255, 0.25)',
      speedProfile: [15, 13, 12, 10, 9, 8],
    },
    {
      name: 'Glow',
      body: '#f6ff72',
      trim: '#fddf38',
      aura: 'rgba(246, 255, 114, 0.28)',
      speedProfile: [16, 14, 11, 10, 9, 7],
    },
    {
      name: 'Bloom',
      body: '#a27bff',
      trim: '#d7b7ff',
      aura: 'rgba(162, 123, 255, 0.28)',
      speedProfile: [15, 13, 12, 10, 9, 8],
    },
  ];

  const ghosts = [];
  const cardinalDirections = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const SCARED_DURATION = 360;

  let pacman = createPacman();
  let score = 0;
  let lives = 3;
  let gameState = 'ready';
  let frame = 0;
  let stage = 1;
  let pathTrail = [];
  let highlightPath = [];
  let showHighlight = false;

  canvas.addEventListener('click', () => canvas.focus());
  canvas.addEventListener('touchstart', (event) => {
    canvas.focus();
    handleTouch(event);
  });
  setTimeout(() => canvas.focus(), 600);

  function createPacman() {
    return { x: 1, y: 1, dir: { x: 1, y: 0 }, next: null };
  }

  function createGhosts() {
    ghosts.length = 0;
    ghostBlueprints.forEach((blueprint, index) => {
      const offsetX = index % 3;
      const offsetY = Math.floor(index / 3);
      ghosts.push({
        name: blueprint.name,
        body: blueprint.body,
        trim: blueprint.trim,
        aura: blueprint.aura,
        speedProfile: blueprint.speedProfile,
        spawnX: cols - 2 - offsetX,
        spawnY: rows - 2 - offsetY,
        x: cols - 2 - offsetX,
        y: rows - 2 - offsetY,
        dir: { x: -1, y: 0 },
        moveTicker: 0,
        scaredTimer: 0,
        state: 'active',
        bobPhase: index * 0.8,
        jitterPhase: Math.random() * Math.PI * 2,
      });
    });
  }

  function buildMaze() {
    walls.length = 0;
    pellets.length = 0;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const isEdge = y === 0 || x === 0 || y === rows - 1 || x === cols - 1;
        const coreZone = x <= 2 && y <= 2;
        const reverseZone = x >= cols - 3 && y >= rows - 3;
        const mazeLine = (x % 4 === 0 && y % 2 === 0) || (y % 4 === 0 && x % 2 === 0);
        if (isEdge || (mazeLine && Math.random() > 0.35 && !coreZone && !reverseZone)) {
          walls.push({ x, y });
        } else {
          pellets.push({ x, y, glow: Math.random(), isPower: false });
        }
      }
    }

    walls.push({ x: 2, y: 3 });
    walls.push({ x: cols - 3, y: rows - 4 });

    const powerPelletCount = Math.min(5, Math.max(3, Math.floor((rows + cols) / 8)));
    const shuffledPellets = [...pellets].sort(() => Math.random() - 0.5);
    shuffledPellets.slice(0, powerPelletCount).forEach((pellet) => {
      pellet.isPower = true;
      pellet.glow = 1;
    });
  }

  function hasWall(x, y) {
    return walls.some((wall) => wall.x === x && wall.y === y);
  }

  function updateHUD() {
    scoreEl.textContent = score.toString().padStart(4, '0');
    livesEl.textContent = lives;
    stateEl.textContent = stateLabels[gameState] || 'RUNNING';
    stageEl.textContent = stage.toString().padStart(2, '0');
    updateGhostHUD();
  }

  function updateGhostHUD() {
    if (!ghostCountEl || !ghostStateEl || !ghostStatusRing) return;
    const totalGhosts = ghosts.length;
    const ghostMode = ghosts.some((ghost) => ghost.state === 'scared') ? 'SCARED' : 'ACTIVE';
    ghostCountEl.textContent = totalGhosts.toString().padStart(2, '0');
    ghostStateEl.textContent = ghostMode;
    ghostStatusRing.dataset.state = ghostMode.toLowerCase();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#031028');
    gradient.addColorStop(0.5, '#040f3a');
    gradient.addColorStop(1, '#01030c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * grid, 0);
      ctx.lineTo(i * grid, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, j * grid);
      ctx.lineTo(canvas.width, j * grid);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(
      canvas.width * 0.35,
      canvas.height * 0.2,
      40,
      canvas.width * 0.35,
      canvas.height * 0.2,
      220
    );
    glow.addColorStop(0, 'rgba(62, 194, 255, 0.35)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawWalls() {
    const wallGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    wallGradient.addColorStop(0, palette.wallBase);
    wallGradient.addColorStop(1, palette.wallHighlight);
    ctx.fillStyle = wallGradient;
    ctx.strokeStyle = palette.wallOutline;
    ctx.lineWidth = 1.5;
    walls.forEach((wall) => {
      ctx.fillRect(wall.x * grid + 1, wall.y * grid + 1, grid - 2, grid - 2);
      ctx.strokeRect(wall.x * grid + 1, wall.y * grid + 1, grid - 2, grid - 2);
    });
  }

  function drawPellets() {
    pellets.forEach((pellet) => {
      const px = pellet.x * grid + grid / 2;
      const py = pellet.y * grid + grid / 2;
      const glow = (Math.sin(frame / 12 + pellet.glow) + 1) / 2;
      const radius = pellet.isPower ? grid * 0.3 : grid * 0.1 + glow * 0.3;
      ctx.fillStyle = pellet.isPower
        ? 'rgba(138, 215, 255, 0.85)'
        : `rgba(255, 231, 71, ${0.5 + glow * 0.5})`;

      ctx.save();
      if (pellet.isPower) {
        ctx.shadowColor = 'rgba(138, 215, 255, 0.6)';
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (pellet.isPower) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  function drawPathHighlight() {
    if (!highlightPath.length) return;
    ctx.save();
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 231, 71, 0.75)';
    ctx.shadowColor = palette.pelletGlow;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    highlightPath.forEach((point, index) => {
      const px = point.x * grid + grid / 2;
      const py = point.y * grid + grid / 2;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawPacman() {
    const px = pacman.x * grid + grid / 2;
    const py = pacman.y * grid + grid / 2;
    const radius = grid / 2 - 2;
    const mouthAngle = 0.25 + Math.sin(frame / 12) * 0.1;

    const pacGradient = ctx.createRadialGradient(px - radius * 0.2, py - radius * 0.2, 4, px, py, radius);
    pacGradient.addColorStop(0, '#fff99c');
    pacGradient.addColorStop(0.5, palette.pacman);
    pacGradient.addColorStop(1, palette.pacmanShadow);

    ctx.fillStyle = pacGradient;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, radius, mouthAngle * Math.PI, (2 - mouthAngle) * Math.PI, false);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(px + radius * 0.25, py - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGhosts() {
    ghosts.forEach((ghost) => {
      const px = ghost.x * grid + grid / 2;
      const py = ghost.y * grid + grid / 2;
      const bounce = Math.sin((frame + ghost.bobPhase) / (11 - stage * 0.15)) * 2.2;
      const jump = ghost.state === 'scared'
        ? Math.sin((frame + ghost.jitterPhase) / 6) * 3
        : Math.sin((frame + ghost.jitterPhase) / 9) * 1.8;
      const size = grid * 0.55 - 1.5;

      ctx.save();
      ctx.translate(px, py + bounce + jump);
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(-size, -size * 0.65);
      ctx.quadraticCurveTo(-size, -size * 0.9, -size * 0.35, -size);
      ctx.lineTo(size * 0.35, -size);
      ctx.quadraticCurveTo(size, -size * 0.9, size, -size * 0.65);
      ctx.lineTo(size, 0);
      const waveCount = 5;
      const waveWidth = (size * 2) / waveCount;
      for (let i = 0; i < waveCount; i += 1) {
        const x = size - i * waveWidth;
        const y = Math.sin(frame / 8 + i + ghost.jitterPhase) * 3 + 6;
        ctx.quadraticCurveTo(x - waveWidth / 2, y, x - waveWidth, 0);
      }
      ctx.closePath();

      ctx.save();
      ctx.shadowColor = ghost.aura;
      ctx.shadowBlur = ghost.state === 'scared' ? 18 : 8;
      ctx.fillStyle = ghost.state === 'scared' ? '#8ad7ff' : ghost.body;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = ghost.state === 'scared' ? '#5a9ec4' : ghost.trim;
      ctx.lineWidth = 2;
      ctx.stroke();

      const eyeOffsetX = size * 0.4;
      const eyeOffsetY = -size * 0.2;
      const pupilShift = Math.sin((frame + ghost.bobPhase) / 10) * 0.3;
      ctx.fillStyle = ghost.state === 'scared' ? '#f1fbff' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-eyeOffsetX, eyeOffsetY, size * 0.3, size * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeOffsetX, eyeOffsetY, size * 0.3, size * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ghost.state === 'scared' ? '#1f5d82' : palette.pupil;
      ctx.beginPath();
      ctx.ellipse(-eyeOffsetX + pupilShift, eyeOffsetY + pupilShift * 0.8, size * 0.16, size * 0.2, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeOffsetX + pupilShift, eyeOffsetY + pupilShift * 0.8, size * 0.16, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function draw() {
    drawBackground();
    drawWalls();
    if (showHighlight) {
      drawPathHighlight();
    }
    drawPellets();
    drawGhosts();
    drawPacman();
  }

  function setGhostsScared() {
    ghosts.forEach((ghost) => {
      ghost.state = 'scared';
      ghost.scaredTimer = SCARED_DURATION;
    });
    updateGhostHUD();
  }

  function buildGhostCandidates(ghost, target) {
    const deltaX = target.x - ghost.x;
    const deltaY = target.y - ghost.y;
    const preferHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);
    const candidates = [];
    if (preferHorizontal && deltaX !== 0) {
      candidates.push({ x: Math.sign(deltaX), y: 0 });
    }
    if (deltaY !== 0) {
      candidates.push({ x: 0, y: Math.sign(deltaY) });
    }
    if (!preferHorizontal && deltaX !== 0) {
      candidates.push({ x: Math.sign(deltaX), y: 0 });
    }
    cardinalDirections.forEach((dir) => {
      if (!candidates.some((existing) => existing.x === dir.x && existing.y === dir.y)) {
        candidates.push(dir);
      }
    });
    return ghost.state === 'scared' ? candidates.reverse() : candidates;
  }

  function handleGhostMovement() {
    ghosts.forEach((ghost) => {
      const stageIndex = Math.min(stage - 1, ghost.speedProfile.length - 1);
      const moveDelay = ghost.speedProfile[stageIndex] || ghost.speedProfile[ghost.speedProfile.length - 1];
      ghost.moveTicker += 1;
      if (ghost.scaredTimer > 0) {
        ghost.scaredTimer -= 1;
        if (ghost.scaredTimer <= 0) {
          ghost.scaredTimer = 0;
          ghost.state = 'active';
        }
      }
      if (ghost.moveTicker < moveDelay) return;
      ghost.moveTicker = 0;

      const target = ghost.state === 'scared'
        ? { x: ghost.x - (pacman.x - ghost.x), y: ghost.y - (pacman.y - ghost.y) }
        : { x: pacman.x, y: pacman.y };
      const candidates = buildGhostCandidates(ghost, target);
      let moved = false;
      for (const candidate of candidates) {
        const nextX = (ghost.x + candidate.x + cols) % cols;
        const nextY = (ghost.y + candidate.y + rows) % rows;
        if (!hasWall(nextX, nextY)) {
          ghost.x = nextX;
          ghost.y = nextY;
          ghost.dir = candidate;
          moved = true;
          break;
        }
      }
      if (!moved) {
        const randomDir = cardinalDirections[Math.floor(Math.random() * cardinalDirections.length)];
        const nextX = (ghost.x + randomDir.x + cols) % cols;
        const nextY = (ghost.y + randomDir.y + rows) % rows;
        if (!hasWall(nextX, nextY)) {
          ghost.x = nextX;
          ghost.y = nextY;
          ghost.dir = randomDir;
        }
      }
    });
  }

  function handleGhostCollision() {
    for (const ghost of ghosts) {
      if (ghost.x === pacman.x && ghost.y === pacman.y) {
        if (ghost.state === 'scared') {
          score += 150 + stage * 10;
          resetGhost(ghost);
          updateHUD();
          return;
        }
        lives -= 1;
        if (lives <= 0) {
          gameState = 'over';
          updateHUD();
          return;
        }
        gameState = 'hit';
        updateHUD();
        respawnEntities();
        setTimeout(() => {
          gameState = 'running';
          updateHUD();
        }, 400);
        return;
      }
    }
  }

  function resetGhost(ghost) {
    ghost.x = ghost.spawnX;
    ghost.y = ghost.spawnY;
    ghost.scaredTimer = 0;
    ghost.state = 'active';
    ghost.moveTicker = 0;
    ghost.dir = { x: -1, y: 0 };
  }

  function recordTrail() {
    const last = pathTrail[pathTrail.length - 1];
    if (!last || last.x !== pacman.x || last.y !== pacman.y) {
      pathTrail.push({ x: pacman.x, y: pacman.y });
      if (pathTrail.length > trailLimit) {
        pathTrail.shift();
      }
    }
  }

  function handleStageWin() {
    if (gameState !== 'running') return;
    recordStage('모든 펠릿 먹음 감지');
    gameState = 'win';
    highlightPath = pathTrail.slice();
    showHighlight = true;
    pathTrail = [];
    updateHUD();
    recordStage('성공 메시지 표시');
    showSuccessOverlay();
  }

  function forceStageWin() {
    pellets.length = 0;
    recordStage('강제 펠릿 소진');
    handleStageWin();
  }

  function showSuccessOverlay() {
    overlayStageEl.textContent = stage.toString().padStart(2, '0');
    successOverlay.setAttribute('aria-hidden', 'false');
    successOverlay.classList.add('is-visible');

    setTimeout(() => {
      successOverlay.classList.remove('is-visible');
      successOverlay.setAttribute('aria-hidden', 'true');
      stage += 1;
      prepareStage();
    }, 2600);
  }

  function prepareStage({ resetStats = false } = {}) {
    if (resetStats) {
      score = 0;
      lives = 3;
    }
    pathTrail = [];
    highlightPath = [];
    showHighlight = false;
    buildMaze();
    respawnEntities();
    gameState = 'running';
    updateHUD();
    recordStage('스테이지 준비 완료 (RUNNING)');
  }

  function respawnEntities() {
    pacman = createPacman();
    createGhosts();
  }

  function reset() {
    stage = 1;
    successOverlay.classList.remove('is-visible');
    successOverlay.setAttribute('aria-hidden', 'true');
    prepareStage({ resetStats: true });
  }

  function loop() {
    step();
    draw();
    frame += 1;
    const delay = gameState === 'running' ? 120 : 280;
    setTimeout(loop, delay);
  }

  function step() {
    if (gameState !== 'running') return;

    if (pacman.next) {
      const attempt = {
        x: (pacman.x + pacman.next.x + cols) % cols,
        y: (pacman.y + pacman.next.y + rows) % rows,
      };
      if (!hasWall(attempt.x, attempt.y)) {
        pacman.dir = pacman.next;
        pacman.next = null;
      }
    }

    const to = {
      x: (pacman.x + pacman.dir.x + cols) % cols,
      y: (pacman.y + pacman.dir.y + rows) % rows,
    };
    if (!hasWall(to.x, to.y)) {
      pacman.x = to.x;
      pacman.y = to.y;
    }

    recordTrail();

    const pelletIndex = pellets.findIndex((pellet) => pellet.x === pacman.x && pellet.y === pacman.y);
    if (pelletIndex > -1) {
      const pellet = pellets.splice(pelletIndex, 1)[0];
      score += pellet.isPower ? 50 : 10;
      if (pellet.isPower) {
        setGhostsScared();
      }
      updateHUD();
      if (pellets.length === 0) {
        handleStageWin();
      }
    }

    handleGhostMovement();
    handleGhostCollision();
  }

  function handleTouch(event) {
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const dx = touch.clientX - rect.left - rect.width / 2;
    const dy = touch.clientY - rect.top - rect.height / 2;
    if (Math.abs(dx) > Math.abs(dy)) {
      pacman.next = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      pacman.next = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      reset();
      return;
    }
    const nextDir = directionMap[event.code];
    if (nextDir) {
      event.preventDefault();
      pacman.next = nextDir;
    }
  });

  window.pacmanParty = {
    triggerStageWin: handleStageWin,
    forceStageWin,
    restart: reset,
    getStage: () => stage,
    getState: () => gameState,
    stageLog,
    ghosts,
    getGhostStateSummary: () => ({
      count: ghosts.length,
      states: ghosts.map((ghost) => ghost.state),
      positions: ghosts.map((ghost) => ({ x: ghost.x, y: ghost.y })),
      activeMode: ghosts.some((ghost) => ghost.state === 'scared') ? 'scared' : 'active',
    }),
    triggerGhostScare: setGhostsScared,
  };

  reset();
  loop();
})();
