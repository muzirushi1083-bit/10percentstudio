import { GravityDashGame } from './game.js';
import { leaderboard } from './leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new GravityDashGame(canvas);

  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const shareBtn = document.getElementById('share-btn');
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
  
  const playerNameInput = document.getElementById('player-name-input');
  const leaderboardList = document.getElementById('leaderboard-list');
  const rivalBanner = document.getElementById('rival-banner');
  const rivalText = document.getElementById('rival-text');
  
  const scoreDisplay = document.getElementById('score-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const finalScore = document.getElementById('final-score');
  const playerRankDisplay = document.getElementById('player-rank-display');

  // Load saved name
  let savedName = 'SPEED_RUNNER';
  try {
    savedName = localStorage.getItem('gravity_dash_player_name') || 'SPEED_RUNNER';
  } catch(e) {}
  playerNameInput.value = savedName;

  highScoreDisplay.textContent = `${leaderboard.board[0] ? leaderboard.board[0].score : 0}m`;

  window.addEventListener('resize', () => game.resize());

  playerNameInput.addEventListener('change', () => {
    const val = playerNameInput.value.trim().toUpperCase() || 'RUNNER';
    try {
      localStorage.setItem('gravity_dash_player_name', val);
    } catch(e) {}
  });

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = playerNameInput.value.trim().toUpperCase() || 'RUNNER';
    try {
      localStorage.setItem('gravity_dash_player_name', name);
    } catch(e) {}
    
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    game.start();
  });

  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gameoverScreen.classList.remove('active');
    gameoverScreen.classList.add('hidden');
    game.start();
  });

  leaderboardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    leaderboard.renderList(leaderboardList);
    leaderboardModal.classList.remove('hidden');
    leaderboardModal.classList.add('active');
  });

  closeLeaderboardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    leaderboardModal.classList.remove('active');
    leaderboardModal.classList.add('hidden');
  });

  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = playerNameInput.value.trim().toUpperCase() || 'RUNNER';
    const text = encodeURIComponent(`🎮 重力反転！『Gravity Shift Dash』で【${name}】が【${game.distance}m】を走破し、世界ランク【${game.finalRank || 1}位】を達成！記録を超えられるか？ #10percentstudio #GravityShift #ゲーム`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(shareUrl, '_blank');
  });

  const handleAction = () => {
    if (game.state === 'PLAYING') {
      game.flipGravity();
    }
  };

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.btn') || e.target.closest('input') || e.target.closest('.overlay')) return;
    handleAction();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.state === 'START') startBtn.click();
      else if (game.state === 'GAMEOVER') restartBtn.click();
      else handleAction();
    }
  });

  function gameLoop() {
    game.update();
    game.draw();

    scoreDisplay.textContent = `${game.distance}m`;

    if (game.state === 'PLAYING') {
      const nextRival = leaderboard.getNextRival(game.distance);
      if (nextRival) {
        rivalBanner.classList.remove('hidden');
        if (nextRival.needed <= 50) {
          rivalText.textContent = `🔥 あと ${nextRival.needed}m で ${nextRival.rank}位 [${nextRival.name}] を突破！`;
        } else {
          rivalText.textContent = `🎯 次のライバル: ${nextRival.rank}位 [${nextRival.name}] (${nextRival.targetScore}m)`;
        }
      } else {
        rivalBanner.classList.remove('hidden');
        rivalText.textContent = `👑 あなたが現在 世界第1位 です！最高記録走行中！`;
      }
    } else {
      rivalBanner.classList.add('hidden');
    }

    if (game.state === 'GAMEOVER' && !gameoverScreen.classList.contains('active')) {
      const playerName = playerNameInput.value.trim().toUpperCase() || 'RUNNER';
      const rank = leaderboard.submitScore(playerName, game.distance);
      game.finalRank = rank;

      finalScore.textContent = `${game.distance}m`;
      playerRankDisplay.textContent = `RANK ${rank}th`;
      highScoreDisplay.textContent = `${leaderboard.board[0] ? leaderboard.board[0].score : game.distance}m`;

      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
