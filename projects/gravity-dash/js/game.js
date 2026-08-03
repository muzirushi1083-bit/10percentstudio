export class GravityDashGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.state = 'START'; // START, PLAYING, GAMEOVER
    this.distance = 0;
    
    this.MAX_BOOSTS = 2; // Maximum air flips allowed before landing or waiting for recovery
    this.player = {
      x: 100,
      y: 0,
      size: 24,
      vy: 0,
      gravitySign: 1,
      isGrounded: true,
      boosts: 2
    };

    this.boostRechargeTimer = 0;
    this.RECHARGE_INTERVAL = 45; // ~0.75 seconds to auto-recharge 1 boost stock

    this.obstacles = [];
    this.particles = [];
    this.speed = 5;
    this.spawnTimer = 0;
    
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.floorY = this.canvas.height - 80;
    this.ceilingY = 80;
  }

  start() {
    this.distance = 0;
    this.speed = 5.5;
    this.obstacles = [];
    this.particles = [];
    this.boostRechargeTimer = 0;
    
    this.player.y = this.floorY - this.player.size;
    this.player.vy = 0;
    this.player.gravitySign = 1;
    this.player.isGrounded = true;
    this.player.boosts = this.MAX_BOOSTS;
    
    this.state = 'PLAYING';
  }

  flipGravity() {
    if (this.state !== 'PLAYING') return;
    
    // GAME DESIGN: If grounded, flip is ALWAYS free and restores boosts!
    if (this.player.isGrounded) {
      this.player.gravitySign *= -1;
      this.player.vy = 0;
      this.player.isGrounded = false;
      this.player.boosts = this.MAX_BOOSTS;
      this.spawnFlipParticles();
      return;
    }

    // AIR FLIP (MID-AIR RETURN): Requires available boost charge!
    if (this.player.boosts > 0) {
      this.player.gravitySign *= -1;
      this.player.vy = 0; // Immediate direction flip with zero inertia overshoot
      this.player.boosts--; // Consume 1 air boost stock
      this.spawnFlipParticles();
    }
  }

  spawnFlipParticles() {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x + this.player.size / 2,
        y: this.player.y + this.player.size / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color: this.player.boosts === 0 ? '#ff0055' : '#00ffaa'
      });
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // Auto-recharge 1 boost over time if below max
    if (this.player.boosts < this.MAX_BOOSTS) {
      this.boostRechargeTimer++;
      if (this.boostRechargeTimer >= this.RECHARGE_INTERVAL) {
        this.player.boosts++;
        this.boostRechargeTimer = 0;
      }
    } else {
      this.boostRechargeTimer = 0;
    }

    this.distance += Math.floor(this.speed * 0.2);
    this.speed = Math.min(12.5, 5.5 + this.distance * 0.004);

    // Apply gravity acceleration
    const gravityAccel = 1.3;
    this.player.vy += gravityAccel * this.player.gravitySign;
    this.player.y += this.player.vy;

    // Strict Boundary Collision & Instant Boost Recharge on Wall Landing
    const minY = this.ceilingY;
    const maxY = this.floorY - this.player.size;

    if (this.player.y >= maxY) {
      this.player.y = maxY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.boosts = this.MAX_BOOSTS; // Instant full recharge on landing!
    } else if (this.player.y <= minY) {
      this.player.y = minY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.boosts = this.MAX_BOOSTS; // Instant full recharge on landing!
    } else {
      this.player.isGrounded = false;
    }

    // Spawn Obstacles (Spikes)
    this.spawnTimer++;
    if (this.spawnTimer > Math.max(28, 70 - Math.floor(this.distance * 0.04))) {
      this.spawnTimer = 0;
      const isTop = Math.random() > 0.5;
      this.obstacles.push({
        x: this.canvas.width + 40,
        y: isTop ? this.ceilingY : this.floorY,
        height: Math.random() * 50 + 40,
        width: 32,
        isTop: isTop
      });
    }

    // Move & Check Obstacle Collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      const pRight = this.player.x + this.player.size - 4;
      const pLeft = this.player.x + 4;
      const pTop = this.player.y + 4;
      const pBottom = this.player.y + 4;

      const oLeft = obs.x - obs.width / 2;
      const oRight = obs.x + obs.width / 2;
      const oTop = obs.isTop ? obs.y : obs.y - obs.height;
      const oBottom = obs.isTop ? obs.y + obs.height : obs.y;

      if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
        this.state = 'GAMEOVER';
      }

      if (obs.x < -50) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Ceiling & Floor Lines
    this.ctx.strokeStyle = '#ffaa00';
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = '#ffaa00';
    this.ctx.shadowBlur = 12;

    this.ctx.beginPath();
    this.ctx.moveTo(0, this.ceilingY);
    this.ctx.lineTo(this.canvas.width, this.ceilingY);
    this.ctx.moveTo(0, this.floorY);
    this.ctx.lineTo(this.canvas.width, this.floorY);
    this.ctx.stroke();

    // Draw Obstacles (Spikes)
    this.ctx.fillStyle = '#ff0055';
    this.ctx.shadowColor = '#ff0055';
    this.ctx.shadowBlur = 14;

    this.obstacles.forEach(obs => {
      this.ctx.beginPath();
      if (obs.isTop) {
        this.ctx.moveTo(obs.x - obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x, obs.y + obs.height);
      } else {
        this.ctx.moveTo(obs.x - obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x, obs.y - obs.height);
      }
      this.ctx.closePath();
      this.ctx.fill();
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    const clampedY = Math.max(this.ceilingY, Math.min(this.floorY - this.player.size, this.player.y));

    // Draw Player (Color changes based on available boost charge)
    this.ctx.save();
    let playerColor = '#00ffaa'; // Full boosts
    if (this.player.boosts === 1) playerColor = '#ffe600'; // 1 boost left
    else if (this.player.boosts === 0) playerColor = '#ff0055'; // 0 boosts left

    this.ctx.fillStyle = playerColor;
    this.ctx.shadowColor = playerColor;
    this.ctx.shadowBlur = 16;
    this.ctx.fillRect(this.player.x, clampedY, this.player.size, this.player.size);
    this.ctx.restore();

    // Draw Air Boost Charge Indicators above Player
    if (this.state === 'PLAYING') {
      this.drawBoostHUD();
    }
  }

  drawBoostHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 11px Orbitron';
    ctx.textAlign = 'center';
    
    // Draw Boost Dots
    for (let i = 0; i < this.MAX_BOOSTS; i++) {
      const dotX = this.player.x + (i - 0.5) * 14 + 12;
      const dotY = this.player.y - 12;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      if (i < this.player.boosts) {
        ctx.fillStyle = '#00ffaa';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 8;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
