import { ZombieHordeGame } from './game.js';
import { soundEngine } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const scoreDisplay = document.getElementById('score-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const hpBarFill = document.getElementById('hp-bar-fill');
  const hpText = document.getElementById('hp-text');
  const finalScore = document.getElementById('final-score');
  const finalWave = document.getElementById('final-wave');

  const joystickZone = document.getElementById('joystick-zone');
  const joystickThumb = document.getElementById('joystick-thumb');

  const game = new ZombieHordeGame(canvasContainer);

  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  const keys = {};

  // Keyboard controls
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // Virtual Joystick Touch Controls
  joystickZone.addEventListener('pointerdown', (e) => {
    touchActive = true;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!touchActive) return;
    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;
    const maxDist = 40;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);

    const thumbX = Math.cos(angle) * dist;
    const thumbY = Math.sin(angle) * dist;
    joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    const normX = thumbX / maxDist;
    const normZ = thumbY / maxDist;
    game.movePlayer(normX, normZ);
  });

  window.addEventListener('pointerup', () => {
    if (touchActive) {
      touchActive = false;
      joystickThumb.style.transform = `translate(0px, 0px)`;
      game.movePlayer(0, 0);
    }
  });

  function processKeyboardInput() {
    let dx = 0;
    let dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      game.movePlayer(dx / len, dz / len);
    } else if (!touchActive) {
      game.movePlayer(0, 0);
    }
  }

  function updateUI() {
    scoreDisplay.textContent = `${game.kills}`;
    highScoreDisplay.textContent = `WAVE ${game.wave}`;
    
    const hpPct = Math.max(0, (game.player.hp / game.player.maxHp) * 100);
    hpBarFill.style.width = `${hpPct}%`;
    hpText.textContent = `${Math.ceil(game.player.hp)}/${game.player.maxHp}`;

    if (game.state === 'GAMEOVER') {
      finalScore.textContent = `${game.kills}`;
      finalWave.textContent = `WAVE ${game.wave}`;
      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }
  }

  function loop() {
    processKeyboardInput();
    game.update();
    game.render();
    updateUI();
    requestAnimationFrame(loop);
  }

  function startGame() {
    soundEngine.init();
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    game.start();
  }

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });

  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    soundEngine.init();
    gameoverScreen.classList.remove('active');
    gameoverScreen.classList.add('hidden');
    game.start();
  });

  startScreen.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A' && !e.target.classList.contains('btn-portal')) {
      startGame();
    }
  });

  loop();
});
