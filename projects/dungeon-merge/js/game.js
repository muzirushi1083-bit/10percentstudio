import { soundEngine } from './audio.js';

export class DungeonMergeGame {
  constructor(gridElement) {
    this.gridElement = gridElement;
    this.GRID_SIZE = 4;
    
    this.state = 'START'; // START, PLAYING, GAMEOVER
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
  }

  initBoard() {
    this.board = Array(this.GRID_SIZE * this.GRID_SIZE).fill(null);
    
    // Fill initial 8 tiles
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
    
    // Determine tile type
    const types = ['sword', 'sword', 'shield', 'potion', 'monster'];
    // 5th Floor Boss Spawn
    if (this.floor % 5 === 0 && !this.board.some(t => t && t.type === 'boss')) {
      this.board[randomIndex] = {
        type: 'boss',
        level: Math.floor(this.floor / 5),
        hp: 50 + this.floor * 20,
        maxHp: 50 + this.floor * 20,
        atk: 25 + this.floor * 5
      };
      return;
    }

    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === 'monster') {
      this.board[randomIndex] = {
        type: 'monster',
        level: 1,
        hp: 15 + this.floor * 8,
        maxHp: 15 + this.floor * 8,
        atk: 8 + this.floor * 3
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

    // If nothing selected yet
    if (!this.selectedCell) {
      if (clickedTile) {
        // Direct Action Tiles (Potion & Shield)
        if (clickedTile.type === 'potion') {
          this.usePotion(index);
          this.endTurn();
          return;
        } else if (clickedTile.type === 'shield') {
          this.useShield(index);
          this.endTurn();
          return;
        }

        this.selectedCell = index;
      }
      return;
    }

    // Same cell clicked -> Deselect
    if (this.selectedCell === index) {
      this.selectedCell = null;
      return;
    }

    const sourceTile = this.board[this.selectedCell];

    // If target is empty -> Move tile
    if (!clickedTile) {
      this.board[index] = sourceTile;
      this.board[this.selectedCell] = null;
      this.selectedCell = null;
      this.endTurn();
      return;
    }

    // Attempt MERGE (Same type & level)
    if (sourceTile.type === clickedTile.type && sourceTile.level === clickedTile.level && sourceTile.type !== 'monster' && sourceTile.type !== 'boss') {
      clickedTile.level += 1;
      this.board[this.selectedCell] = null;
      this.selectedCell = null;
      soundEngine.playMerge();
      this.endTurn();
      return;
    }

    // Attempt ATTACK (Sword onto Monster/Boss)
    if (sourceTile.type === 'sword' && (clickedTile.type === 'monster' || clickedTile.type === 'boss')) {
      const damage = (this.player.baseAttack + sourceTile.level * 15);
      clickedTile.hp -= damage;
      soundEngine.playAttack();

      // Monster Defeated!
      if (clickedTile.hp <= 0) {
        soundEngine.playMerge();
        this.kills++;
        this.gold += clickedTile.type === 'boss' ? 50 : 10;
        
        // Remove Monster & Sword
        this.board[index] = null;
        this.board[this.selectedCell] = null;
        
        // Check Floor Clear (Boss or Kills threshold)
        if (clickedTile.type === 'boss' || this.kills % 5 === 0) {
          this.floor++;
        }
      } else {
        // Sword consumed in attack
        this.board[this.selectedCell] = null;
      }

      this.selectedCell = null;
      this.endTurn();
      return;
    }

    // Otherwise change selection to clicked tile
    this.selectedCell = index;
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
    // Monsters Attack Player!
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

    // Check Game Over
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.state = 'GAMEOVER';
      return;
    }

    // Spawn new tile into empty cell
    this.spawnRandomTile();
  }

  renderBoard() {
    this.gridElement.innerHTML = '';
    
    this.board.forEach((tile, index) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (this.selectedCell === index) cell.classList.add('selected');
      
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

      cell.addEventListener('click', () => this.handleCellClick(index));
      this.gridElement.appendChild(cell);
    });
  }
}
