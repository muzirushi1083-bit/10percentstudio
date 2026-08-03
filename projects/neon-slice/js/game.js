import { soundEngine } from './audio.js';
import { particleSystem } from './effects.js';

export class NeonSliceGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.state = 'START'; // START, PLAYING, GAMEOVER, FEVER
    this.score = 0;
    this.highScore = localStorage.getItem('neon_slice_highscore') || 0;
    
    // Stack Physics Configuration
    this.BOX_HEIGHT = 16;
    this.stack = [];
    this.cutPieces = [];
    this.activeBlock = null;
    this.direction = 'x'; // 'x' or 'z'
    this.speed = 3.5;
    this.perfectCombo = 0;
    
    // Fever & Power-ups
    this.feverMeter = 0;
    this.isSlowMotion = false;
    this.slowMotionTimer = 0;
    
    this.cameraY = 0;
    this.targetCameraY = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    this.score = 0;
    this.stack = [];
    this.cutPieces = [];
    this.perfectCombo = 0;
    this.feverMeter = 0;
    this.isSlowMotion = false;
    this.slowMotionTimer = 0;
    this.speed = 3.5;
    this.cameraY = 0;
    this.targetCameraY = 0;
    
    // Base Box
    const baseWidth = Math.min(this.width * 0.35, 160);
    const baseDepth = baseWidth;
    
    this.stack.push({
      x: 0,
      z: 0,
      y: 0,
      width: baseWidth,
      depth: baseDepth,
      hue: 180
    });

    this.spawnNextBlock();
    this.state = 'PLAYING';
  }

  spawnNextBlock() {
    const prevBlock = this.stack[this.stack.length - 1];
    this.direction = this.direction === 'x' ? 'z' : 'x';
    
    // Progressive Speed
    this.speed = 3.5 + Math.min(this.score * 0.08, 6.0);
    const hue = (180 + this.score * 8) % 360;

    this.activeBlock = {
      x: this.direction === 'x' ? -this.width * 0.4 : prevBlock.x,
      z: this.direction === 'z' ? -this.width * 0.4 : prevBlock.z,
      y: this.stack.length * this.BOX_HEIGHT,
      width: prevBlock.width,
      depth: prevBlock.depth,
      hue: hue,
      dirSign: 1
    };

    this.targetCameraY = (this.stack.length - 3) * this.BOX_HEIGHT;
  }

  slice() {
    if (this.state !== 'PLAYING' && this.state !== 'FEVER') return;
    
    const prevBlock = this.stack[this.stack.length - 1];
    const curr = this.activeBlock;

    let delta = 0;
    let overlap = 0;
    let size = 0;

    if (this.direction === 'x') {
      delta = curr.x - prevBlock.x;
      size = curr.width;
    } else {
      delta = curr.z - prevBlock.z;
      size = curr.depth;
    }

    const absDelta = Math.abs(delta);
    const PERFECT_TOLERANCE = 5;

    // PERFECT SLICE
    if (absDelta < PERFECT_TOLERANCE) {
      if (this.direction === 'x') curr.x = prevBlock.x;
      else curr.z = prevBlock.z;

      this.perfectCombo++;
      this.score += 1 + Math.floor(this.perfectCombo / 3);
      soundEngine.playPerfect(this.perfectCombo);
      particleSystem.createSparkles(this.toScreenPos(curr.x, curr.y, curr.z), curr.hue);

      // FEVER Trigger (5 Perfects in a row)
      if (this.perfectCombo >= 5 && this.state !== 'FEVER') {
        this.triggerFever();
      }

      this.stack.push(curr);
      this.spawnNextBlock();
      return;
    }

    // REGULAR SLICE
    this.perfectCombo = 0;
    overlap = size - absDelta;

    if (overlap <= 0) {
      // MISSED COMPLETE BLOCK -> GAME OVER
      soundEngine.playGameOver();
      particleSystem.createExplosion(this.toScreenPos(curr.x, curr.y, curr.z), curr.hue);
      this.gameOver();
      return;
    }

    // Cut calculation
    if (this.direction === 'x') {
      const cutWidth = absDelta;
      const newWidth = overlap;
      const cutX = delta > 0 ? curr.x + newWidth / 2 + cutWidth / 2 : curr.x - newWidth / 2 - cutWidth / 2;
      curr.x = delta > 0 ? prevBlock.x + cutWidth / 2 : prevBlock.x - cutWidth / 2;
      curr.width = newWidth;

      this.cutPieces.push({
        x: cutX, y: curr.y, z: curr.z,
        width: cutWidth, depth: curr.depth,
        vy: 2, vx: delta > 0 ? 3 : -3, vz: 0,
        hue: curr.hue, alpha: 1
      });
    } else {
      const cutDepth = absDelta;
      const newDepth = overlap;
      const cutZ = delta > 0 ? curr.z + newDepth / 2 + cutDepth / 2 : curr.z - newDepth / 2 - cutDepth / 2;
      curr.z = delta > 0 ? prevBlock.z + cutDepth / 2 : prevBlock.z - cutDepth / 2;
      curr.depth = newDepth;

      this.cutPieces.push({
        x: curr.x, y: curr.y, z: cutZ,
        width: curr.width, depth: cutDepth,
        vy: 2, vx: 0, vz: delta > 0 ? 3 : -3,
        hue: curr.hue, alpha: 1
      });
    }

    soundEngine.playSlice();
    this.score++;
    this.stack.push(curr);
    this.spawnNextBlock();
  }

  triggerFever() {
    this.state = 'FEVER';
    soundEngine.playFever();
    setTimeout(() => {
      if (this.state === 'FEVER') this.state = 'PLAYING';
    }, 4000);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon_slice_highscore', this.highScore);
    }
  }

  update() {
    // Camera smooth follow
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    // Active block movement
    if (this.activeBlock && (this.state === 'PLAYING' || this.state === 'FEVER')) {
      const currentSpeed = this.state === 'FEVER' ? this.speed * 0.6 : this.speed;
      const limit = this.width * 0.35;

      if (this.direction === 'x') {
        this.activeBlock.x += currentSpeed * this.activeBlock.dirSign;
        if (this.activeBlock.x > limit) {
          this.activeBlock.x = limit;
          this.activeBlock.dirSign = -1;
        } else if (this.activeBlock.x < -limit) {
          this.activeBlock.x = -limit;
          this.activeBlock.dirSign = 1;
        }
      } else {
        this.activeBlock.z += currentSpeed * this.activeBlock.dirSign;
        if (this.activeBlock.z > limit) {
          this.activeBlock.z = limit;
          this.activeBlock.dirSign = -1;
        } else if (this.activeBlock.z < -limit) {
          this.activeBlock.z = -limit;
          this.activeBlock.dirSign = 1;
        }
      }
    }

    // Physics update for cut pieces
    for (let i = this.cutPieces.length - 1; i >= 0; i--) {
      const p = this.cutPieces[i];
      p.y -= p.vy;
      p.vy += 0.4;
      p.x += p.vx;
      p.z += p.vz;
      p.alpha -= 0.02;
      if (p.alpha <= 0) this.cutPieces.splice(i, 1);
    }

    particleSystem.update();
  }

  toScreenPos(x, y, z) {
    const isoX = (x - z) * 0.707;
    const isoY = (x + z) * 0.4 + (y - this.cameraY);
    return {
      x: this.width / 2 + isoX,
      y: this.height * 0.65 - isoY
    };
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Stack Blocks
    for (let i = 0; i < this.stack.length; i++) {
      this.drawIsoBox(this.stack[i]);
    }

    // Draw Cut Falling Pieces
    for (let i = 0; i < this.cutPieces.length; i++) {
      this.drawIsoBox(this.cutPieces[i]);
    }

    // Draw Active Moving Block
    if (this.activeBlock && (this.state === 'PLAYING' || this.state === 'FEVER')) {
      this.drawIsoBox(this.activeBlock);
    }

    particleSystem.draw(this.ctx);
  }

  drawIsoBox(box) {
    const pos = this.toScreenPos(box.x, box.y, box.z);
    const w = box.width * 0.707;
    const d = box.depth * 0.707;
    const h = this.BOX_HEIGHT;

    this.ctx.save();
    this.ctx.globalAlpha = box.alpha !== undefined ? box.alpha : 1;

    // Colors & Neon Glow
    const topColor = `hsl(${box.hue}, 90%, 65%)`;
    const leftColor = `hsl(${box.hue}, 80%, 45%)`;
    const rightColor = `hsl(${box.hue}, 85%, 55%)`;

    // Top Face
    this.ctx.fillStyle = topColor;
    this.ctx.shadowColor = topColor;
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - h);
    this.ctx.lineTo(pos.x + w, pos.y - h - w * 0.5);
    this.ctx.lineTo(pos.x, pos.y - h - w * 0.5 - d * 0.5);
    this.ctx.lineTo(pos.x - w, pos.y - h - d * 0.5);
    this.ctx.closePath();
    this.ctx.fill();

    // Left Face
    this.ctx.fillStyle = leftColor;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - w, pos.y - h - d * 0.5);
    this.ctx.lineTo(pos.x, pos.y - h);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.lineTo(pos.x - w, pos.y - d * 0.5);
    this.ctx.closePath();
    this.ctx.fill();

    // Right Face
    this.ctx.fillStyle = rightColor;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - h);
    this.ctx.lineTo(pos.x + w, pos.y - h - w * 0.5);
    this.ctx.lineTo(pos.x + w, pos.y - w * 0.5);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}
