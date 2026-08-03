import { soundEngine } from './audio.js';

export class ChronoBounceGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.state = 'START'; // START, AIMING, FIRING, GAMEOVER
    this.stage = 1;
    this.highScore = localStorage.getItem('chrono_bounce_best') || 1;
    
    this.balls = [];
    this.blocks = [];
    this.particles = [];
    
    // Shooter Configuration
    this.shooter = { x: 0, y: 0 };
    this.aimAngle = -Math.PI / 2;
    this.isAiming = false;
    this.ballCount = 30;
    this.ballsToFire = 0;
    this.fireTimer = 0;
    
    // Time Distortion (Slow-mo)
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    
    // Screen Shake Effect
    this.shake = 0;
    this.comboCount = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.shooter.x = this.width / 2;
    this.shooter.y = this.height - 80;
  }

  start() {
    this.stage = 1;
    this.ballCount = 30;
    this.balls = [];
    this.particles = [];
    this.isAiming = false;
    this.state = 'AIMING';
    this.generateStageBlocks();
  }

  generateStageBlocks() {
    this.blocks = [];
    const cols = 6;
    const rows = 4;
    const blockWidth = (this.width - 60) / cols;
    const blockHeight = 36;
    const startY = 100;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.7) {
          const hp = this.stage * 3 + Math.floor(Math.random() * 4);
          this.blocks.push({
            x: 30 + c * blockWidth,
            y: startY + r * (blockHeight + 8),
            w: blockWidth - 6,
            h: blockHeight,
            hp: hp,
            maxHp: hp,
            hue: (r * 40 + c * 20 + this.stage * 15) % 360
          });
        }
      }
    }
  }

  handlePointerDown(x, y) {
    if (this.state !== 'AIMING' || this.balls.length > 0) return;
    soundEngine.init();
    soundEngine.playSlowMo();
    this.isAiming = true;
    this.targetTimeScale = 0.15;
    this.updateAim(x, y);
  }

  handlePointerMove(x, y) {
    if (this.isAiming) {
      this.updateAim(x, y);
    }
  }

  handlePointerUp() {
    if (!this.isAiming) return;
    this.isAiming = false;
    this.targetTimeScale = 1.0;
    this.fireLasers();
  }

  updateAim(x, y) {
    const dx = x - this.shooter.x;
    const dy = y - this.shooter.y;
    let angle = Math.atan2(dy, dx);
    if (angle > -0.2) angle = -0.2;
    if (angle < -Math.PI + 0.2) angle = -Math.PI + 0.2;
    this.aimAngle = angle;
  }

  fireLasers() {
    this.state = 'FIRING';
    this.ballsToFire = this.ballCount;
    this.comboCount = 0;
  }

  update() {
    this.timeScale += (this.targetTimeScale - this.timeScale) * 0.2;
    if (this.shake > 0) this.shake *= 0.9;

    // Fire laser balls sequentially
    if (this.ballsToFire > 0) {
      this.fireTimer += 1;
      if (this.fireTimer >= 2) {
        this.fireTimer = 0;
        const speed = 16;
        this.balls.push({
          x: this.shooter.x,
          y: this.shooter.y,
          vx: Math.cos(this.aimAngle) * speed,
          vy: Math.sin(this.aimAngle) * speed,
          radius: 5,
          hue: (this.ballsToFire * 12) % 360
        });
        soundEngine.playLaserShot();
        this.ballsToFire--;
      }
    }

    // Update laser balls physics
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * this.timeScale;
      b.y += b.vy * this.timeScale;

      if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -1; soundEngine.playBounce(); }
      if (b.x + b.radius > this.width) { b.x = this.width - b.radius; b.vx *= -1; soundEngine.playBounce(); }
      if (b.y - b.radius < 60) { b.y = 60 + b.radius; b.vy *= -1; soundEngine.playBounce(); }

      if (b.y > this.height) {
        this.balls.splice(i, 1);
        continue;
      }

      for (let j = this.blocks.length - 1; j >= 0; j--) {
        const blk = this.blocks[j];
        if (this.checkCollision(b, blk)) {
          blk.hp--;
          this.shake = 4;
          this.comboCount++;
          soundEngine.playBounce();

          this.spawnSparkles(b.x, b.y, blk.hue);

          if (blk.hp <= 0) {
            soundEngine.playBlockDestroy();
            this.spawnExplosion(blk.x + blk.w / 2, blk.y + blk.h / 2, blk.hue);
            this.blocks.splice(j, 1);
          }
          break;
        }
      }
    }

    // Check Stage Clear
    if (this.state === 'FIRING' && this.blocks.length === 0) {
      soundEngine.playStageClear();
      this.stage++;
      if (this.stage > this.highScore) {
        this.highScore = this.stage;
        localStorage.setItem('chrono_bounce_best', this.highScore);
      }
      this.ballCount += 4;
      this.balls = [];
      this.ballsToFire = 0;
      this.generateStageBlocks();
      this.state = 'AIMING';
    }

    // Check Turn End -> Descend Blocks & Check GAMEOVER
    if (this.state === 'FIRING' && this.balls.length === 0 && this.ballsToFire === 0) {
      // Descend all blocks by 1 row step
      const stepY = 44;
      let isGameOver = false;

      this.blocks.forEach(blk => {
        blk.y += stepY;
        // GAMEOVER CONDITION: If any block touches the bottom shooter line (shooter.y - 40)
        if (blk.y + blk.h >= this.shooter.y - 20) {
          isGameOver = true;
        }
      });

      if (isGameOver) {
        soundEngine.playGameOver();
        this.state = 'GAMEOVER';
      } else {
        // Spawn 1 new top row if needed
        this.state = 'AIMING';
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  checkCollision(ball, rect) {
    const nearestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    
    if (dx * dx + dy * dy < ball.radius * ball.radius) {
      if (Math.abs(dx) > Math.abs(dy)) ball.vx *= -1;
      else ball.vy *= -1;
      return true;
    }
    return false;
  }

  spawnSparkles(x, y, hue) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        hue: hue,
        radius: 3,
        alpha: 1
      });
    }
  }

  spawnExplosion(x, y, hue) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 8 + 2;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        hue: hue,
        radius: 4,
        alpha: 1
      });
    }
  }

  draw() {
    this.ctx.save();
    if (this.shake > 0.5) {
      const rx = (Math.random() - 0.5) * this.shake;
      const ry = (Math.random() - 0.5) * this.shake;
      this.ctx.translate(rx, ry);
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Danger Deadline
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.shooter.y - 20);
    this.ctx.lineTo(this.width, this.shooter.y - 20);
    this.ctx.stroke();
    this.ctx.restore();

    // Draw Aiming Guide Line
    if (this.isAiming) {
      this.ctx.save();
      this.ctx.strokeStyle = '#00ffaa';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([8, 6]);
      this.ctx.shadowColor = '#00ffaa';
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.moveTo(this.shooter.x, this.shooter.y);
      this.ctx.lineTo(this.shooter.x + Math.cos(this.aimAngle) * 400, this.shooter.y + Math.sin(this.aimAngle) * 400);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Draw Blocks
    this.blocks.forEach(blk => {
      this.ctx.save();
      const color = `hsl(${blk.hue}, 90%, 60%)`;
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.roundRect(blk.x, blk.y, blk.w, blk.h, 8);
      this.ctx.fill();

      // Block HP Text
      this.ctx.fillStyle = '#000';
      this.ctx.font = '700 13px Orbitron, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(blk.hp, blk.x + blk.w / 2, blk.y + blk.h / 2);
      this.ctx.restore();
    });

    // Draw Laser Balls
    this.balls.forEach(b => {
      this.ctx.save();
      const color = `hsl(${b.hue}, 100%, 65%)`;
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Shooter Launcher Base
    this.ctx.save();
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(this.shooter.x, this.shooter.y, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.restore();
  }
}
