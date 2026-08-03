import { soundEngine } from './audio.js';

export class ZombieHordeGame {
  constructor(container) {
    this.container = container;
    this.state = 'START'; // START, PLAYING, GAMEOVER
    
    this.kills = 0;
    this.wave = 1;
    
    this.player = {
      hp: 100,
      maxHp: 100,
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      speed: 0.18,
      weapon: 'MACHINE GUN',
      fireRate: 8, // frames per shot
      fireTimer: 0
    };

    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    
    this.init3D();
  }

  init3D() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.03);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 22, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    // 3D Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x162030);
    this.scene.add(gridHelper);

    // Player Mesh
    const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 8);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3, metalness: 0.8 });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.position.y = 0.8;
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.kills = 0;
    this.wave = 1;
    this.player.hp = 100;
    this.player.x = 0;
    this.player.z = 0;
    this.playerMesh.position.set(0, 0.8, 0);
    
    // Clear 3D objects
    this.zombies.forEach(z => this.scene.remove(z.mesh));
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.zombies = [];
    this.bullets = [];
    this.particles = [];

    this.state = 'PLAYING';
    this.spawnHordeWave();
  }

  spawnHordeWave() {
    const zombieCount = 15 + this.wave * 10;
    for (let i = 0; i < zombieCount; i++) {
      this.spawnZombie();
    }
  }

  spawnZombie() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 15;
    const zx = this.player.x + Math.cos(angle) * distance;
    const zz = this.player.z + Math.sin(angle) * distance;

    const zombieGeo = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const zombieMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.5 });
    const zombieMesh = new THREE.Mesh(zombieGeo, zombieMat);
    zombieMesh.position.set(zx, 0.75, zz);
    this.scene.add(zombieMesh);

    this.zombies.push({
      mesh: zombieMesh,
      hp: 20 + this.wave * 5,
      speed: 0.06 + Math.random() * 0.04
    });
  }

  movePlayer(dx, dz) {
    if (this.state !== 'PLAYING') return;
    this.player.vx = dx * this.player.speed;
    this.player.vz = dz * this.player.speed;
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // Update Player Position
    this.player.x += this.player.vx;
    this.player.z += this.player.vz;
    this.playerMesh.position.x = this.player.x;
    this.playerMesh.position.z = this.player.z;

    // Smooth Top-down Camera Follow
    this.camera.position.x = this.player.x;
    this.camera.position.z = this.player.z + 18;
    this.camera.lookAt(this.player.x, 0, this.player.z);

    // Auto-Fire Guns at Nearest Zombie
    this.player.fireTimer++;
    if (this.player.fireTimer >= this.player.fireRate && this.zombies.length > 0) {
      this.player.fireTimer = 0;
      this.fireBulletAtNearest();
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.x += b.vx;
      b.mesh.position.z += b.vz;
      b.life--;

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Bullet Collision with Zombies
      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const zm = this.zombies[j];
        const dist = b.mesh.position.distanceTo(zm.mesh.position);
        if (dist < 1.0) {
          zm.hp -= 15;
          soundEngine.playZombieHit();
          this.spawnHitParticle(b.mesh.position);

          // Knockback
          zm.mesh.position.x += b.vx * 0.3;
          zm.mesh.position.z += b.vz * 0.3;

          // Remove Bullet
          this.scene.remove(b.mesh);
          this.bullets.splice(i, 1);

          // Zombie Defeated!
          if (zm.hp <= 0) {
            soundEngine.playZombieDeath();
            this.spawnDeathParticles(zm.mesh.position);
            this.scene.remove(zm.mesh);
            this.zombies.splice(j, 1);
            this.kills++;

            // Wave Clear & Spawn Horde
            if (this.zombies.length === 0) {
              this.wave++;
              this.spawnHordeWave();
            }
          }
          break;
        }
      }
    }

    // Update Zombie Horde Movement toward Player
    for (let i = 0; i < this.zombies.length; i++) {
      const zm = this.zombies[i];
      const dx = this.player.x - zm.mesh.position.x;
      const dz = this.player.z - zm.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.1) {
        zm.mesh.position.x += (dx / dist) * zm.speed;
        zm.mesh.position.z += (dz / dist) * zm.speed;
        zm.mesh.rotation.y = Math.atan2(dx, dz);
      }

      // Zombie Attack Player Collision
      if (dist < 1.2) {
        this.player.hp -= 0.5;
        soundEngine.playPlayerDamage();
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.state = 'GAMEOVER';
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      p.life--;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  fireBulletAtNearest() {
    let nearestZombie = null;
    let minDist = Infinity;

    this.zombies.forEach(zm => {
      const dist = this.playerMesh.position.distanceTo(zm.mesh.position);
      if (dist < minDist) {
        minDist = dist;
        nearestZombie = zm;
      }
    });

    let targetAngle = 0;
    if (nearestZombie) {
      const dx = nearestZombie.mesh.position.x - this.player.x;
      const dz = nearestZombie.mesh.position.z - this.player.z;
      targetAngle = Math.atan2(dx, dz);
    } else {
      targetAngle = Math.random() * Math.PI * 2;
    }

    this.playerMesh.rotation.y = targetAngle;

    const bulletGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.position.set(this.player.x, 1.0, this.player.z);
    this.scene.add(bulletMesh);

    const speed = 0.8;
    this.bullets.push({
      mesh: bulletMesh,
      vx: Math.sin(targetAngle) * speed,
      vz: Math.cos(targetAngle) * speed,
      life: 40
    });

    soundEngine.playGunfire();
  }

  spawnHitParticle(pos) {
    const pGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.copy(pos);
    this.scene.add(pMesh);

    this.particles.push({
      mesh: pMesh,
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.2,
      vz: (Math.random() - 0.5) * 0.2,
      life: 10
    });
  }

  spawnDeathParticles(pos) {
    for (let i = 0; i < 8; i++) {
      const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      this.scene.add(pMesh);

      this.particles.push({
        mesh: pMesh,
        vx: (Math.random() - 0.5) * 0.4,
        vy: Math.random() * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        life: 20
      });
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
