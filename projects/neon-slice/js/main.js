import { NeonSliceGame } from './game.js';
import { leaderboard } from './leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new NeonSliceGame(canvas);

  // UI Elements
  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const adModal = document.getElementById('ad-modal');
  
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const rewardReviveBtn = document.getElementById('reward-revive-btn');
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
  
  const adCountdown = document.getElementById('ad-countdown');
  const adProgressFill = document.getElementById('ad-progress-fill');

  // Load saved name
  let savedName = 'CYBER_HERO';
  try {
    savedName = localStorage.getItem('neon_slice_player_name') || 'CYBER_HERO';
  } catch(e) {}
  playerNameInput.value = savedName;

  highScoreDisplay.textContent = leaderboard.board[0] ? leaderboard.board[0].score : game.highScore;

  window.addEventListener('resize', () => game.resize());

  playerNameInput.addEventListener('change', () => {
    const val = playerNameInput.value.trim().toUpperCase() || 'PLAYER';
    try {
      localStorage.setItem('neon_slice_player_name', val);
    } catch(e) {}
  });

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = playerNameInput.value.trim().toUpperCase() || 'PLAYER';
    try {
      localStorage.setItem('neon_slice_player_name', name);
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

  // Rewarded Ad Revive Handler
  rewardReviveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gameoverScreen.classList.remove('active');
    gameoverScreen.classList.add('hidden');
    
    // Show Ad Modal Simulation
    adModal.classList.remove('hidden');
    adModal.classList.add('active');
    
    let count = 3;
    adCountdown.textContent = count;
    adProgressFill.style.width = '0%';
    
    const interval = setInterval(() => {
      count--;
      adCountdown.textContent = count;
      adProgressFill.style.width = `${((3 - count) / 3) * 100}%`;
      
      if (count <= 0) {
        clearInterval(interval);
        adModal.classList.remove('active');
        adModal.classList.add('hidden');
        
        // Revive player!
        game.revive();
      }
    }, 1000);
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
    const name = playerNameInput.value.trim().toUpperCase() || 'PLAYER';
    const text = encodeURIComponent(`🎮 『Neon Slice 2.0』で【${name}】が【${game.score}pts】で世界ランク【${game.finalRank || 1}位】を達成！俺の記録を超えられるか？ #10percentstudio #NeonSlice #ゲーム`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(shareUrl, '_blank');
  });

  const handleAction = () => {
    if (game.state === 'PLAYING') {
      game.slice();
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
      if (game.state === 'START') {
        startBtn.click();
      } else if (game.state === 'GAMEOVER') {
        restartBtn.click();
      } else {
        handleAction();
      }
    }
  });

  function gameLoop() {
    game.update();
    game.draw();

    scoreDisplay.textContent = game.score;

    if (game.state === 'PLAYING') {
      const nextRival = leaderboard.getNextRival(game.score);
      if (nextRival) {
        rivalBanner.classList.remove('hidden');
        if (nextRival.needed <= 3) {
          rivalText.textContent = `🔥 あと ${nextRival.needed} スコアで ${nextRival.rank}位 [${nextRival.name}] を突破！`;
        } else {
          rivalText.textContent = `🎯 次のライバル: ${nextRival.rank}位 [${nextRival.name}] (${nextRival.targetScore}pts)`;
        }
      } else {
        rivalBanner.classList.remove('hidden');
        rivalText.textContent = `👑 あなたが現在 世界第1位 です！記録更新中！`;
      }
    } else {
      rivalBanner.classList.add('hidden');
    }

    if (game.state === 'GAMEOVER' && !gameoverScreen.classList.contains('active') && !adModal.classList.contains('active')) {
      const playerName = playerNameInput.value.trim().toUpperCase() || 'PLAYER';
      const rank = leaderboard.submitScore(playerName, game.score);
      game.finalRank = rank;

      finalScore.textContent = game.score;
      playerRankDisplay.textContent = `RANK ${rank}th`;
      
      const title = gameoverScreen.querySelector('.overlay-title');
      if (title && game.gameOverReason) {
        title.textContent = game.gameOverReason;
      }

      highScoreDisplay.textContent = leaderboard.board[0] ? leaderboard.board[0].score : game.score;
      
      gameoverScreen.classList.remove('hidden');
      gameoverScreen.classList.add('active');
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
