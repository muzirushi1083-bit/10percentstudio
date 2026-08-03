import { soundEngine } from './audio.js';

export class ZombieHordeGame {
  constructor(container) {
    this.container = container;
    this.state = 'START';
    
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
      fireRate: 8,
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x162030);
    this.scene.add(gridHelper);

    // Build Humanoid Player Model Group
    this.playerMesh = this.createHumanoidPlayer();
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createHumanoidPlayer() {
    const group = new THREE.Group();
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3, metalness: 0.8 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffd1a4 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x111122 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9 });

    // Torso (Body)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), matArmor);
    torso.position.y = 1.1;
    group.add(torso);

    // Head + Visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matSkin);
    head.position.y = 1.95;
    group.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
    visor.position.set(0, 1.98, 0.2);
    group.add(visor);

    // Left & Right Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), matDark);
    legL.position.set(-0.25, 0.35, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), matDark);
    legR.position.set(0.25, 0.35, 0);
    group.add(legR);

    // Arms & Gun
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), matArmor);
    armL.position.set(-0.55, 1.1, 0.2);
    armL.rotation.x = -Math.PI / 4;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), matArmor);
    armR.position.set(0.55, 1.1, 0.2);
    armR.rotation.x = -Math.PI / 4;
    group.add(armR);

    // Rifle Weapon in Hands
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 1.2), matGun);
    gun.position.set(0.3, 1.0, 0.5);
    group.add(gun);

    return group;
  }

  createHumanoidZombie() {
    const group = new THREE.Group();
    const matZombieSkin = new THREE.MeshStandardMaterial({ color: 0x00ff66, roughness: 0.6 });
    const matCloth = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 0.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), matCloth);
    torso.position.y = 1.1;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matZombieSkin);
    head.position.y = 1.95;
    group.add(head);

    // Red Glowing Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    eyeL.position.set(-0.15, 2.0, 0.25);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    eyeR.position.set(0.15, 2.0, 0.25);
    group.add(eyeR);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), matCloth);
    legL.position.set(-0.25, 0.35, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), matCloth);
    legR.position.set(0.25, 0.35, 0);
    group.add(legR);

    // Outstretched Zombie Arms (Classic Zombie Walk Pose!)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), matZombieSkin);
    armL.position.set(-0.55, 1.2, 0.35);
    armL.rotation.x = -Math.PI / 2;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), matZombieSkin);
    armR.position.set(0.55, 1.2, 0.35);
    armR.rotation.x = -Math.PI / 2;
    group.add(armR);

    return group;
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
    this.playerMesh.position.set(0, 0, 0);
    
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

    const zombieMesh = this.createHumanoidZombie();
    zombieMesh.position.set(zx, 0, zz);
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

    this.player.x += this.player.vx;
    this.player.z += this.player.vz;
    this.playerMesh.position.x = this.player.x;
    this.playerMesh.position.z = this.player.z;

    this.camera.position.x = this.player.x;
    this.camera.position.z = this.player.z + 18;
    this.camera.lookAt(this.player.x, 0, this.player.z);

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

      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const zm = this.zombies[j];
        const dist = b.mesh.position.distanceTo(zm.mesh.position);
        if (dist < 1.1) {
          zm.hp -= 15;
          soundEngine.playZombieHit();
          this.spawnHitParticle(b.mesh.position);

          zm.mesh.position.x += b.vx * 0.3;
          zm.mesh.position.z += b.vz * 0.3;

          this.scene.remove(b.mesh);
          this.bullets.splice(i, 1);

          if (zm.hp <= 0) {
            soundEngine.playZombieDeath();
            this.spawnDeathParticles(zm.mesh.position);
            this.scene.remove(zm.mesh);
            this.zombies.splice(j, 1);
            this.kills++;

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
    bulletMesh.position.set(this.player.x, 1.2, this.player.z);
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
