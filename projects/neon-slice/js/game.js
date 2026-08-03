import { soundEngine } from './audio.js';
import { EffectManager } from './effects.js';

export class NeonSliceGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effects = new EffectManager();
    
    // Game constants
    this.BLOCK_HEIGHT = 20;
    this.INITIAL_SIZE = 140;
    this.PERFECT_TOLERANCE = 5;
    
    // State variables
    this.state = 'START'; // START, PLAYING, GAMEOVER
    this.score = 0;
    this.highScore = 0;
    try {
      this.highScore = parseInt(localStorage.getItem('neon_slice_highscore') || '0', 10);
    } catch (e) {
      this.highScore = 0;
    }
    
    this.perfectStreak = 0;
    this.isFever = false;
    this.feverTimer = 0;
    this.gameOverReason = '';
    
    this.stack = [];
    this.activeBlock = null;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.speed = 3;
    this.direction = 'x';
    this.movePos = 0;
    this.moveLimit = 220;
    this.moveSign = 1;
    
    this.hue = 180;
    this.rainbowHue = 0;
    
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2 + 100;
  }

  start() {
    this.score = 0;
    this.perfectStreak = 0;
    this.isFever = false;
    this.feverTimer = 0;
    this.gameOverReason = '';
    this.hue = Math.floor(Math.random() * 360);
    this.speed = 3.5;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.effects.reset();
    
    this.stack = [{
      x: 0,
      z: 0,
      y: 0,
      width: this.INITIAL_SIZE,
      depth: this.INITIAL_SIZE,
      color: this.getColor(0),
      type: 'normal'
    }];
    
    this.spawnBlock();
    this.state = 'PLAYING';
  }

  // Revive player via Rewarded Ad
  revive() {
    if (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      top.width = Math.max(top.width, 100);
      top.depth = Math.max(top.depth, 100);
    }
    this.perfectStreak = 0;
    this.isFever = true;
    this.feverTimer = 120; // Short fever bonus on revive!
    this.spawnBlock();
    this.state = 'PLAYING';
  }

  getColor(index) {
    const currentHue = (this.hue + index * 12) % 360;
    return `hsl(${currentHue}, 100%, 60%)`;
  }

  spawnBlock() {
    const prevBlock = this.stack[this.stack.length - 1];
    this.direction = this.stack.length % 2 === 0 ? 'x' : 'z';
    this.moveSign = Math.random() > 0.5 ? 1 : -1;
    this.movePos = -this.moveLimit * this.moveSign;
    
    let type = 'normal';
    if (this.score > 5) {
      const rand = Math.random();
      if (rand < 0.12) type = 'bomb';
      else if (rand < 0.22) type = 'slow';
    }

    let color = this.getColor(this.stack.length);
    if (type === 'bomb') color = 'hsl(350, 100%, 50%)';
    else if (type === 'slow') color = 'hsl(180, 100%, 50%)';

    this.activeBlock = {
      x: this.direction === 'x' ? this.movePos : prevBlock.x,
      z: this.direction === 'z' ? this.movePos : prevBlock.z,
      y: this.stack.length * this.BLOCK_HEIGHT,
      width: prevBlock.width,
      depth: prevBlock.depth,
      color: color,
      type: type
    };

    let baseSpeed = Math.min(8.5, 3.5 + this.score * 0.12);
    if (type === 'slow') baseSpeed *= 0.5;
    this.speed = baseSpeed;
  }

  slice() {
    if (this.state !== 'PLAYING' || !this.activeBlock) return;
    
    soundEngine.init();
    const prevBlock = this.stack[this.stack.length - 1];
    const active = this.activeBlock;
    
    if (active.type === 'bomb') {
      soundEngine.playBombExplosion();
      this.effects.addSparkles(active.x, active.y, active.z, '#ff0033', 60);
      this.triggerGameOver('💣 BOMB EXPLODED!');
      return;
    }

    let diff = 0;
    let overlap = 0;
    
    if (this.direction === 'x') {
      diff = active.x - prevBlock.x;
      overlap = prevBlock.width - Math.abs(diff);
    } else {
      diff = active.z - prevBlock.z;
      overlap = prevBlock.depth - Math.abs(diff);
    }

    if (overlap <= 0) {
      this.triggerGameOver('MISSED!');
      return;
    }

    const isPerfect = Math.abs(diff) <= this.PERFECT_TOLERANCE;
    
    if (isPerfect) {
      this.perfectStreak++;
      
      if (this.perfectStreak >= 3) {
        this.isFever = true;
        this.feverTimer = 180;
        soundEngine.playFeverSound();
        active.width = this.INITIAL_SIZE;
        active.depth = this.INITIAL_SIZE;
      } else {
        soundEngine.playPerfectSound();
      }
      
      if (this.direction === 'x') active.x = prevBlock.x;
      else active.z = prevBlock.z;
      
      this.effects.addSparkles(active.x, active.y, active.z, '#ffffff', 30);
    } else {
      this.perfectStreak = 0;
      soundEngine.playCutSound(this.score);
      
      let newWidth = active.width;
      let newDepth = active.depth;
      
      let sliceWidth = 0;
      let sliceDepth = 0;
      let sliceX = active.x;
      let sliceZ = active.z;

      if (this.direction === 'x') {
        newWidth = overlap;
        sliceWidth = Math.abs(diff);
        if (diff > 0) {
          active.x = prevBlock.x + sliceWidth / 2;
          sliceX = active.x + newWidth / 2 + sliceWidth / 2;
        } else {
          active.x = prevBlock.x - sliceWidth / 2;
          sliceX = active.x - newWidth / 2 - sliceWidth / 2;
        }
        active.width = newWidth;
        sliceDepth = active.depth;
      } else {
        newDepth = overlap;
        sliceDepth = Math.abs(diff);
        if (diff > 0) {
          active.z = prevBlock.z + sliceDepth / 2;
          sliceZ = active.z + newDepth / 2 + sliceDepth / 2;
        } else {
          active.z = prevBlock.z - sliceDepth / 2;
          sliceZ = active.z - newDepth / 2 - sliceDepth / 2;
        }
        active.depth = newDepth;
        sliceWidth = active.width;
      }

      this.effects.addSlicedDebris(
        sliceX, active.y, sliceZ,
        sliceWidth, sliceDepth, this.BLOCK_HEIGHT,
        active.color, this.direction
      );
    }

    const pointsGained = this.isFever ? 2 : 1;
    this.score += pointsGained;
    
    this.stack.push({ ...active });
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('neon_slice_highscore', this.highScore.toString());
      } catch(e) {}
    }

    if (this.stack.length > 5) {
      this.targetCameraY = (this.stack.length - 5) * this.BLOCK_HEIGHT;
    }

    this.spawnBlock();
  }

  triggerGameOver(reason = 'GAMEOVER') {
    this.state = 'GAMEOVER';
    this.gameOverReason = reason;
    soundEngine.playGameOverSound();
    
    if (this.activeBlock) {
      this.effects.addSlicedDebris(
        this.activeBlock.x, this.activeBlock.y, this.activeBlock.z,
        this.activeBlock.width, this.activeBlock.depth, this.BLOCK_HEIGHT,
        this.activeBlock.color, this.direction
      );
      this.activeBlock = null;
    }
  }

  update() {
    this.effects.update();
    this.rainbowHue = (this.rainbowHue + 4) % 360;

    if (this.isFever) {
      this.feverTimer--;
      if (this.feverTimer <= 0) {
        this.isFever = false;
      }
    }
    
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    if (this.state === 'PLAYING' && this.activeBlock) {
      this.movePos += this.speed * this.moveSign;
      if (Math.abs(this.movePos) >= this.moveLimit) {
        this.moveSign *= -1;
      }
      
      if (this.direction === 'x') this.activeBlock.x = this.movePos;
      else this.activeBlock.z = this.movePos;
    }
  }

  projectIso(x, y, z) {
    const isoX = (x - z) * 0.866;
    const isoY = (x + z) * 0.5 - y;
    return {
      x: this.centerX + isoX,
      y: this.centerY + isoY
    };
  }

  drawIsoBlock(block, isGhost = false) {
    const { x, y, z, width, depth, type } = block;
    let color = block.color;
    
    if (this.isFever) {
      color = `hsl(${(this.rainbowHue + y) % 360}, 100%, 65%)`;
    }

    const renderY = y - this.cameraY;
    const hW = width / 2;
    const hD = depth / 2;

    const p1 = this.projectIso(x - hW, renderY + this.BLOCK_HEIGHT, z - hD);
    const p2 = this.projectIso(x + hW, renderY + this.BLOCK_HEIGHT, z - hD);
    const p3 = this.projectIso(x + hW, renderY + this.BLOCK_HEIGHT, z + hD);
    const p4 = this.projectIso(x - hW, renderY + this.BLOCK_HEIGHT, z + hD);

    const b2 = this.projectIso(x + hW, renderY, z - hD);
    const b3 = this.projectIso(x + hW, renderY, z + hD);
    const b4 = this.projectIso(x - hW, renderY, z + hD);

    const ctx = this.ctx;
    ctx.save();

    ctx.shadowColor = type === 'bomb' ? '#ff0033' : color;
    ctx.shadowBlur = type === 'bomb' ? 25 : 12;

    // Left Face
    ctx.fillStyle = this.adjustLightness(color, -20);
    ctx.beginPath();
    ctx.moveTo(p4.x, p4.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b4.x, b4.y);
    ctx.closePath();
    ctx.fill();

    // Right Face
    ctx.fillStyle = this.adjustLightness(color, -10);
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.closePath();
    ctx.fill();

    // Top Face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = type === 'bomb' ? '#ff0000' : '#ffffff';
    ctx.lineWidth = type === 'bomb' ? 3 : 1.5;
    ctx.stroke();

    if (type === 'bomb') {
      const topCenter = this.projectIso(x, renderY + this.BLOCK_HEIGHT, z);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('💣 DANGER', topCenter.x, topCenter.y + 4);
    } else if (type === 'slow') {
      const topCenter = this.projectIso(x, renderY + this.BLOCK_HEIGHT, z);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ SLOW', topCenter.x, topCenter.y + 4);
    }

    ctx.restore();
  }

  adjustLightness(hslColor, amount) {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return hslColor;
    const h = match[1];
    const s = match[2];
    let l = parseInt(match[3], 10) + amount;
    l = Math.max(0, Math.min(100, l));
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackgroundGrid();

    if (this.isFever) {
      this.ctx.save();
      this.ctx.fillStyle = `hsla(${this.rainbowHue}, 100%, 50%, 0.08)`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.font = '900 28px Orbitron';
      this.ctx.fillStyle = `hsl(${this.rainbowHue}, 100%, 65%)`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = `hsl(${this.rainbowHue}, 100%, 50%)`;
      this.ctx.shadowBlur = 20;
      this.ctx.fillText('🔥 FEVER MODE 2X SCORE 🔥', this.canvas.width / 2, 120);
      this.ctx.restore();
    }

    this.stack.forEach(block => this.drawIsoBlock(block));

    if (this.state === 'PLAYING' && this.activeBlock) {
      this.drawIsoBlock(this.activeBlock);
    }

    this.effects.draw(this.ctx, this.cameraY, this.projectIso.bind(this));
  }

  drawBackgroundGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.isFever 
      ? `hsla(${this.rainbowHue}, 100%, 50%, 0.12)` 
      : 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < this.canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
