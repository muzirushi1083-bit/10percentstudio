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

  function updateUIHeader() {
    floorDisplay.textContent = `F ${game.floor}`;
    goldDisplay.textContent = `${game.gold} G`;
    
    const hpPct = Math.max(0, (game.player.hp / game.player.maxHp) * 100);
    hpBarFill.style.width = `${hpPct}%`;
    hpText.textContent = `${game.player.hp}/${game.player.maxHp}`;
    shieldText.textContent = `${game.player.shield}`;

    if (game.state === 'GAMEOVER') {
      finalFloor.textContent = `F ${game.floor}`;
      finalKills.textContent = `${game.kills}`;
      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }
  }

  // Pass UI update callback to game instance (Event-Driven)
  const game = new DungeonMergeGame(gridContainer, updateUIHeader);

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

  // Start Screen Click Event
  startScreen.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A' && !e.target.classList.contains('btn-portal')) {
      startGame();
    }
  });

  // Initial setup render
  game.start();
});
