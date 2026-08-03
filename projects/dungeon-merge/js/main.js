import { ChronoBounceGame } from './game.js';
import { soundEngine } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const scoreDisplay = document.getElementById('score-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const finalScore = document.getElementById('final-score');
  const comboBanner = document.getElementById('combo-banner');
  const comboText = document.getElementById('combo-text');

  const game = new ChronoBounceGame(canvas);

  function updateUI() {
    scoreDisplay.textContent = `STAGE ${game.stage}`;
    highScoreDisplay.textContent = `STAGE ${game.highScore}`;
    
    if (game.comboCount > 10) {
      comboText.textContent = `⚡ FEVER BOUNCE x${game.comboCount}!`;
      comboBanner.classList.remove('hidden');
    } else {
      comboBanner.classList.add('hidden');
    }

    if (game.state === 'GAMEOVER') {
      finalScore.textContent = `STAGE ${game.stage}`;
      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }
  }

  function loop() {
    game.update();
    game.draw();
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

  // Pointer Events for Laser Aiming & Slow-Mo
  window.addEventListener('pointerdown', (e) => {
    if (game.state === 'AIMING') {
      game.handlePointerDown(e.clientX, e.clientY);
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (game.state === 'AIMING') {
      game.handlePointerMove(e.clientX, e.clientY);
    }
  });

  window.addEventListener('pointerup', () => {
    if (game.state === 'AIMING') {
      game.handlePointerUp();
    }
  });

  loop();
});
