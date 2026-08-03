import { DungeonMergeGame } from './game.js';
import { soundEngine } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('grid-container');
  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  
  const floorDisplay = document.getElementById('floor-display');
  const goldDisplay = document.getElementById('gold-display');
  const hpBarFill = document.getElementById('hp-bar-fill');
  const hpText = document.getElementById('hp-text');
  const shieldText = document.getElementById('shield-text');
  const finalFloor = document.getElementById('final-floor');
  const finalKills = document.getElementById('final-kills');

  const game = new DungeonMergeGame(gridContainer);

  function updateUI() {
    floorDisplay.textContent = `F ${game.floor}`;
    goldDisplay.textContent = `${game.gold} G`;
    
    const hpPct = Math.max(0, (game.player.hp / game.player.maxHp) * 100);
    hpBarFill.style.width = `${hpPct}%`;
    hpText.textContent = `${game.player.hp}/${game.player.maxHp}`;
    shieldText.textContent = `${game.player.shield}`;

    game.renderBoard();

    if (game.state === 'GAMEOVER') {
      finalFloor.textContent = `F ${game.floor}`;
      finalKills.textContent = `${game.kills}`;
      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }
  }

  function gameLoop() {
    updateUI();
    if (game.state === 'PLAYING') {
      requestAnimationFrame(gameLoop);
    }
  }

  // Start immediately upon page load if overlay is clicked or start btn
  function startGame() {
    soundEngine.init();
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    game.start();
    gameLoop();
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', () => {
    soundEngine.init();
    gameoverScreen.classList.remove('active');
    gameoverScreen.classList.add('hidden');
    game.start();
    gameLoop();
  });

  // Auto-start if clicked anywhere on start screen overlay
  startScreen.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') {
      startGame();
    }
  });

  // Initial setup & start
  game.start();
  gameLoop();
});
