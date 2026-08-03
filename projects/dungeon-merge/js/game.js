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
    this.shufflesLeft = 3;
    
    this.player = {
      hp: 100,
      maxHp: 100,
      shield: 0,
      baseAttack: 8
    };

    this.board = [];
    this.selectedCell = null;
  }

  start() {
    this.floor = 1;
    this.gold = 0;
    this.kills = 0;
    this.shufflesLeft = 3;
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

    // Dynamic tile balance
    const monsterCount = this.board.filter(t => t && (t.type === 'monster' || t.type === 'boss')).length;
    let types = ['sword', 'sword', 'shield', 'potion', 'monster'];
    
    if (monsterCount >= 6) {
      // If board is getting flooded with monsters, guarantee weapon/heal drops!
      types = ['sword', 'sword', 'potion', 'shield'];
    } else if (monsterCount === 0) {
      types = ['monster', 'monster', 'sword', 'potion'];
    }

    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === 'monster') {
      this.board[randomIndex] = {
        type: 'monster',
        level: 1,
        hp: 10 + this.floor * 5,
        maxHp: 10 + this.floor * 5,
        atk: 5 + this.floor * 2
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

    // Case 1: No cell selected -> CONSUME, DIRECT PUNCH, or SELECT
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
        } else if (clickedTile.type === 'monster' || clickedTile.type === 'boss') {
          // FEAT: Direct Bare-Hand Punch (Ensures player can ALWAYS attack even without swords!)
          this.bareHandPunch(index);
          this.endTurn();
          return;
        }
        // Select sword for action
        this.selectedCell = index;
        this.renderBoard();
        if (this.onUIUpdate) this.onUIUpdate();
      }
      return;
    }

    // Case 2: Clicked same cell -> Deselect / Swing Sword into thin air
    if (this.selectedCell === index) {
      const tile = this.board[index];
      if (tile && tile.type === 'sword') {
        soundEngine.playAttack();
        this.selectedCell = null;
        this.endTurn();
        return;
      }
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
      soundEngine.playMerge();
      this.endTurn();
      return;
    }

    // Case 4: Merge same type & level (Swords OR Monsters)
    if (sourceTile.type === clickedTile.type && sourceTile.level === clickedTile.level) {
      if (sourceTile.type === 'monster') {
        // Merge monsters into 1 stronger monster (Frees up board space!)
        clickedTile.level += 1;
        clickedTile.hp += 10;
        clickedTile.maxHp += 10;
        this.board[this.selectedCell] = null;
        this.selectedCell = null;
        soundEngine.playMerge();
        this.endTurn();
        return;
      } else if (sourceTile.type === 'sword') {
        clickedTile.level += 1;
        this.board[this.selectedCell] = null;
        this.selectedCell = null;
        soundEngine.playMerge();
        this.endTurn();
        return;
      }
    }

    // Case 5: Attack Monster / Boss with Sword
    if (sourceTile.type === 'sword' && (clickedTile.type === 'monster' || clickedTile.type === 'boss')) {
      const damage = this.player.baseAttack + (sourceTile.level * 14);
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

    // Default: Change selection
    this.selectedCell = index;
    this.renderBoard();
    if (this.onUIUpdate) this.onUIUpdate();
  }

  bareHandPunch(index) {
    const clickedTile = this.board[index];
    if (!clickedTile) return;

    // Bare-hand damage
    const damage = this.player.baseAttack;
    clickedTile.hp -= damage;
    soundEngine.playAttack();

    if (clickedTile.hp <= 0) {
      soundEngine.playMerge();
      this.kills++;
      this.gold += clickedTile.type === 'boss' ? 50 : 10;
      this.board[index] = null;
      
      if (clickedTile.type === 'boss' || this.kills % 4 === 0) {
        this.floor++;
      }
    }
  }

  shuffleBoard() {
    if (this.state !== 'PLAYING') return;
    soundEngine.playFever();
    
    // Randomize all current non-null tiles
    const tiles = this.board.filter(t => t !== null);
    this.board = Array(this.GRID_SIZE * this.GRID_SIZE).fill(null);
    
    tiles.forEach(tile => {
      const emptyIndices = [];
      this.board.forEach((t, idx) => { if (!t) emptyIndices.push(idx); });
      if (emptyIndices.length > 0) {
        const r = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        this.board[r] = tile;
      }
    });

    // Spawn 1 extra weapon/heal
    this.spawnRandomTile();
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
      if (this.board.filter(t => t !== null).length < 5) {
        this.spawnRandomTile();
      }
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

      cell.onclick = (e) => {
        e.stopPropagation();
        this.handleCellClick(index);
      };

      this.gridElement.appendChild(cell);
    });
  }
}
