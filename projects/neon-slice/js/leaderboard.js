// Leaderboard & Rival Competition Manager
export class LeaderboardManager {
  constructor() {
    this.STORAGE_KEY = 'neon_slice_leaderboard';
    this.DEFAULT_RIVALS = [
      { name: 'CYBER_VIPER', score: 48 },
      { name: 'NEON_SAMURAI', score: 35 },
      { name: 'ZERO_SLICER', score: 27 },
      { name: 'PIXEL_KING', score: 20 },
      { name: 'HYPER_BOY', score: 15 },
      { name: 'TOKYO_GHOST', score: 10 },
      { name: 'NOOB_MASTER', score: 5 }
    ];

    this.board = this.loadBoard();
  }

  loadBoard() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable, using default rivals:', e);
    }
    return [...this.DEFAULT_RIVALS];
  }

  saveBoard() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.board));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  submitScore(playerName, score) {
    if (!playerName) playerName = 'PLAYER';
    
    const existingIndex = this.board.findIndex(item => item.name === playerName);
    if (existingIndex !== -1) {
      if (score > this.board[existingIndex].score) {
        this.board[existingIndex].score = score;
      }
    } else {
      this.board.push({ name: playerName, score: score });
    }

    this.board.sort((a, b) => b.score - a.score);
    this.saveBoard();

    const rankIndex = this.board.findIndex(item => item.name === playerName && item.score === score);
    return rankIndex !== -1 ? rankIndex + 1 : this.board.length;
  }

  getRank(score) {
    let rank = 1;
    for (let i = 0; i < this.board.length; i++) {
      if (score < this.board[i].score) {
        rank++;
      } else {
        break;
      }
    }
    return rank;
  }

  getNextRival(currentScore) {
    const rivalsAhead = this.board.filter(r => r.score > currentScore).sort((a, b) => a.score - b.score);
    if (rivalsAhead.length > 0) {
      const nextRival = rivalsAhead[0];
      const rank = this.getRank(nextRival.score);
      return {
        name: nextRival.name,
        targetScore: nextRival.score,
        rank: rank,
        needed: nextRival.score - currentScore + 1
      };
    }
    return null;
  }

  renderList(containerElement) {
    containerElement.innerHTML = '';
    this.board.forEach((item, index) => {
      const rank = index + 1;
      const row = document.createElement('div');
      row.className = 'leaderboard-item';
      
      let badgeClass = '';
      if (rank === 1) badgeClass = 'top-1';
      else if (rank === 2) badgeClass = 'top-2';
      else if (rank === 3) badgeClass = 'top-3';

      row.innerHTML = `
        <span class="rank-badge ${badgeClass}">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : '#' + rank}</span>
        <span class="player-name-col">${this.escapeHtml(item.name)}</span>
        <span class="player-score-col">${item.score} pts</span>
      `;
      containerElement.appendChild(row);
    });
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
}

export const leaderboard = new LeaderboardManager();
