import { soundEngine } from './audio.js';

export class DungeonMergeGame {
  constructor(gridElement, onUIUpdate) {
    this.gridElement = gridElement;
    this.onUIUpdate = onUIUpdate;
    this.GRID_SIZE = 4;
    
    this.state = 'START';
    this.floor = 1;
    this.gold = 0;
    this.kills = 0;
    
    this.player = {
      hp: 100,
      maxHp: 100,
      shield: 0,
      baseAttack: 10
    };

    this.board = [];
    this.selectedCell = null;
  }

  start() {
    this.floor = 1;
    this.gold = 0;
    this.kills = 0;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.player.shield = 0;
    this.selectedCell = null;
    
    this.initBoard();
    this.state = 'PLAYING';
    this.renderBoard();
    if (this.onUIUpdate) this.onUIUpdate();
  }

  initBoard() {
    this.board = Array(this.GRID_SIZE * this.GRID_SIZE).fill(null);
    for (let i = 0; i < 8; i++) {
      this.spawnRandomTile();
    }
  }

  spawnRandomTile() {
    const emptyIndices = [];
    this.board.forEach((tile, index) => {
      if (!tile) emptyIndices.push(index);
    });

    if (emptyIndices.length === 0) return;

    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    
    if (this.floor % 5 === 0 && !this.board.some(t => t && t.type === 'boss')) {
      this.board[randomIndex] = {
        type: 'boss',
        level: Math.floor(this.floor / 5) || 1,
        hp: 40 + this.floor * 15,
        maxHp: 40 + this.floor * 15,
        atk: 15 + this.floor * 3
      };
      return;
    }

    const types = ['sword', 'sword', 'shield', 'potion', 'monster'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === 'monster') {
      this.board[randomIndex] = {
        type: 'monster',
        level: 1,
        hp: 12 + this.floor * 6,
        maxHp: 12 + this.floor * 6,
        atk: 6 + this.floor * 2
      };
    } else {
      this.board[randomIndex] = {
        type: type,
        level: 1
      };
    }
  }

  handleCellClick(index) {
    if (this.state !== 'PLAYING') return;
    soundEngine.init();

    const clickedTile = this.board[index];

    // Case 1: No cell selected -> SELECT or CONSUME
    if (this.selectedCell === null) {
      if (clickedTile) {
        if (clickedTile.type === 'potion') {
          this.usePotion(index);
          this.endTurn();
          return;
        } else if (clickedTile.type === 'shield') {
          this.useShield(index);
          this.endTurn();
          return;
        }
        // Select cell for action (Turns YELLOW)
        this.selectedCell = index;
        this.renderBoard();
        if (this.onUIUpdate) this.onUIUpdate();
      }
      return;
    }

    // Case 2: Clicked same cell -> Deselect
    if (this.selectedCell === index) {
      this.selectedCell = null;
      this.renderBoard();
      if (this.onUIUpdate) this.onUIUpdate();
      return;
    }

    const sourceTile = this.board[this.selectedCell];

    // Case 3: Move to empty cell
    if (!clickedTile) {
      this.board[index] = sourceTile;
      this.board[this.selectedCell] = null;
      this.selectedCell = null;
      this.endTurn();
      return;
    }

    // Case 4: Merge same type & level (Swords)
    if (sourceTile.type === clickedTile.type && sourceTile.level === clickedTile.level && sourceTile.type !== 'monster' && sourceTile.type !== 'boss') {
      clickedTile.level += 1;
      this.board[this.selectedCell] = null;
      this.selectedCell = null;
      soundEngine.playMerge();
      this.endTurn();
      return;
    }

    // Case 5: Attack Monster / Boss with Sword
    if (sourceTile.type === 'sword' && (clickedTile.type === 'monster' || clickedTile.type === 'boss')) {
      const damage = this.player.baseAttack + (sourceTile.level * 12);
      clickedTile.hp -= damage;
      soundEngine.playAttack();

      if (clickedTile.hp <= 0) {
        soundEngine.playMerge();
        this.kills++;
        this.gold += clickedTile.type === 'boss' ? 50 : 10;
        this.board[index] = null;
        this.board[this.selectedCell] = null;
        
        if (clickedTile.type === 'boss' || this.kills % 4 === 0) {
          this.floor++;
        }
      } else {
        this.board[this.selectedCell] = null;
      }

      this.selectedCell = null;
      this.endTurn();
      return;
    }

    // Default: Change selection to clicked tile
    this.selectedCell = index;
    this.renderBoard();
    if (this.onUIUpdate) this.onUIUpdate();
  }

  usePotion(index) {
    const tile = this.board[index];
    const healAmount = tile.level * 25;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
    this.board[index] = null;
    soundEngine.playHeal();
  }

  useShield(index) {
    const tile = this.board[index];
    const shieldAmount = tile.level * 15;
    this.player.shield += shieldAmount;
    this.board[index] = null;
    soundEngine.playShield();
  }

  endTurn() {
    // Monsters Attack
    this.board.forEach(tile => {
      if (tile && (tile.type === 'monster' || tile.type === 'boss')) {
        let dmg = tile.atk;
        if (this.player.shield > 0) {
          if (this.player.shield >= dmg) {
            this.player.shield -= dmg;
            dmg = 0;
          } else {
            dmg -= this.player.shield;
            this.player.shield = 0;
          }
        }
        if (dmg > 0) {
          this.player.hp -= dmg;
          soundEngine.playDamage();
        }
      }
    });

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.state = 'GAMEOVER';
    } else {
      this.spawnRandomTile();
    }

    this.renderBoard();
    if (this.onUIUpdate) this.onUIUpdate();
  }

  renderBoard() {
    this.gridElement.innerHTML = '';
    
    this.board.forEach((tile, index) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      
      if (this.selectedCell === index) {
        cell.classList.add('selected');
      }
      
      if (tile) {
        cell.classList.add(`tile-${tile.type}`);
        
        let icon = '⚔️';
        if (tile.type === 'shield') icon = '🛡️';
        else if (tile.type === 'potion') icon = '🧪';
        else if (tile.type === 'monster') icon = '👾';
        else if (tile.type === 'boss') icon = '👹';
        
        let infoText = `Lv.${tile.level}`;
        if (tile.type === 'monster' || tile.type === 'boss') {
          infoText = `HP:${tile.hp}`;
        }
        
        cell.innerHTML = `
          <div class="tile-icon">${icon}</div>
          <div class="tile-level">${infoText}</div>
        `;
      }

      // STRICT SINGLE CLICK LISTENER
      cell.onclick = (e) => {
        e.stopPropagation();
        this.handleCellClick(index);
      };

      this.gridElement.appendChild(cell);
    });
  }
}
