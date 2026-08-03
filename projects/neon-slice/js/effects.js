// Particle & Debris Animation Effects
export class EffectManager {
  constructor() {
    this.debris = [];
    this.particles = [];
  }

  reset() {
    this.debris = [];
    this.particles = [];
  }

  addSlicedDebris(x, y, z, width, depth, height, color, direction) {
    this.debris.push({
      x, y, z,
      width, depth, height,
      color,
      vy: 0.1,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      opacity: 1,
      direction
    });
  }

  addSparkles(x, y, z, color, count = 20) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 + 2,
        vz: (Math.random() - 0.5) * 6,
        size: Math.random() * 4 + 2,
        color,
        life: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  update() {
    // Update debris falling
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.y -= d.vy;
      d.vy += 0.4; // gravity
      d.rotation += d.rotSpeed;
      d.opacity -= 0.015;
      
      if (d.opacity <= 0 || d.y < -500) {
        this.debris.splice(i, 1);
      }
    }

    // Update sparkles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life -= p.decay;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx, cameraY, projectIso) {
    // Draw Debris
    this.debris.forEach(d => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.opacity);
      const pos = projectIso(d.x, d.y - cameraY, d.z);
      
      ctx.fillStyle = d.color;
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.rect(pos.x - d.width / 2, pos.y, d.width, d.height);
      ctx.fill();
      ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      const pos = projectIso(p.x, p.y - cameraY, p.z);
      
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
