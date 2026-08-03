import { soundEngine } from './audio.js';

export class ZombieHordeGame {
  constructor(container) {
    this.container = container;
    this.state = 'START';
    
    this.kills = 0;
    this.wave = 1;
    this.animTime = 0;
    
    this.player = {
      hp: 100,
      maxHp: 100,
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      speed: 0.22,
      weapon: 'ULTRA MACHINE GUN',
      fireRate: 4, // Ultra fast firing rate!
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
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.025);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 22, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.0);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x162030);
    this.scene.add(gridHelper);

    // High-Quality Humanoid Player Model
    this.playerMesh = this.createRealisticHumanoidPlayer();
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createRealisticHumanoidPlayer() {
    const group = new THREE.Group();
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });
    const matCloth = new THREE.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.7 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.9, roughness: 0.1 });
    const matGlow = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // Head (Sphere for realistic round shape)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), matSkin);
    head.position.y = 2.1;
    group.add(head);

    // Hair / Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.37, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), matCloth);
    helmet.position.y = 2.12;
    group.add(helmet);

    // Visor / Eyes
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.2), matGlow);
    visor.position.set(0, 2.12, 0.25);
    group.add(visor);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 8), matSkin);
    neck.position.y = 1.78;
    group.add(neck);

    // Chest & Tactical Vest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.45), matArmor);
    chest.position.y = 1.35;
    group.add(chest);

    // Waist
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.4), matCloth);
    waist.position.y = 0.95;
    group.add(waist);

    // Left Leg Group (Thigh + Shin + Boot)
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.25, 0.8, 0);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.45, 8), matCloth);
    thighL.position.y = -0.22;
    legLGroup.add(thighL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.35), matCloth);
    bootL.position.set(0, -0.55, 0.05);
    legLGroup.add(bootL);
    group.add(legLGroup);
    this.playerLegL = legLGroup;

    // Right Leg Group
    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.25, 0.8, 0);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.45, 8), matCloth);
    thighR.position.y = -0.22;
    legRGroup.add(thighR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.35), matCloth);
    bootR.position.set(0, -0.55, 0.05);
    legRGroup.add(bootR);
    group.add(legRGroup);
    this.playerLegR = legRGroup;

    // Left Arm Group
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.55, 1.5, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8), matArmor);
    armL.position.y = -0.3;
    armLGroup.add(armL);
    group.add(armLGroup);
    this.playerArmL = armLGroup;

    // Right Arm Group holding Rifle
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.55, 1.5, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8), matArmor);
    armR.position.y = -0.3;
    armRGroup.add(armR);
    group.add(armRGroup);
    this.playerArmR = armRGroup;

    // Detailed Assault Rifle Gun
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.9), matGun);
    gunGroup.add(gunBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), matGun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.6);
    gunGroup.add(barrel);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.15), matGun);
    magazine.position.set(0, -0.2, 0.1);
    gunGroup.add(magazine);

    gunGroup.position.set(0.35, 1.25, 0.4);
    group.add(gunGroup);

    return group;
  }

  createRealisticHumanoidZombie() {
    const group = new THREE.Group();
    const matZombieSkin = new THREE.MeshStandardMaterial({ color: 0x22cc55, roughness: 0.7 });
    const matTornCloth = new THREE.MeshStandardMaterial({ color: 0x2b332b, roughness: 0.9 });
    const matRedEyes = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), matZombieSkin);
    head.position.y = 2.1;
    group.add(head);

    // Red Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), matRedEyes);
    eyeL.position.set(-0.12, 2.15, 0.3);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), matRedEyes);
    eyeR.position.set(0.12, 2.15, 0.3);
    group.add(eyeR);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.45), matTornCloth);
    torso.position.y = 1.35;
    group.add(torso);

    // Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.25, 0.8, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.7, 8), matTornCloth);
    legL.position.y = -0.35;
    legLGroup.add(legL);
    group.add(legLGroup);

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.25, 0.8, 0);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.7, 8), matTornCloth);
    legR.position.y = -0.35;
    legRGroup.add(legR);
    group.add(legRGroup);

    // Outstretched Zombie Arms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.5, 1.5, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.7, 8), matZombieSkin);
    armL.position.set(0, -0.2, 0.25);
    armL.rotation.x = -Math.PI / 2.2;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.5, 1.5, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.7, 8), matZombieSkin);
    armR.position.set(0, -0.2, 0.25);
    armR.rotation.x = -Math.PI / 2.2;
    armRGroup.add(armR);
    group.add(armRGroup);

    group.legL = legLGroup;
    group.legR = legRGroup;
    group.armL = armLGroup;
    group.armR = armRGroup;

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
    const zombieCount = 15 + this.wave * 8;
    for (let i = 0; i < zombieCount; i++) {
      this.spawnZombie();
    }
  }

  spawnZombie() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 15;
    const zx = this.player.x + Math.cos(angle) * distance;
    const zz = this.player.z + Math.sin(angle) * distance;

    const zombieMesh = this.createRealisticHumanoidZombie();
    zombieMesh.position.set(zx, 0, zz);
    this.scene.add(zombieMesh);

    this.zombies.push({
      mesh: zombieMesh,
      hp: 12, // EASY TO KILL & ULTRA SATISFYING!
      speed: 0.045
    });
  }

  movePlayer(dx, dz) {
    if (this.state !== 'PLAYING') return;
    this.player.vx = dx * this.player.speed;
    this.player.vz = dz * this.player.speed;
  }

  update() {
    if (this.state !== 'PLAYING') return;
    this.animTime += 0.15;

    // Update Player Position
    this.player.x += this.player.vx;
    this.player.z += this.player.vz;
    this.playerMesh.position.x = this.player.x;
    this.playerMesh.position.z = this.player.z;

    // Dynamic Humanoid Walking Animation (Player Legs Swing)
    const isMoving = Math.abs(this.player.vx) > 0.01 || Math.abs(this.player.vz) > 0.01;
    if (isMoving) {
      this.playerLegL.rotation.x = Math.sin(this.animTime) * 0.6;
      this.playerLegR.rotation.x = -Math.sin(this.animTime) * 0.6;
    } else {
      this.playerLegL.rotation.x = 0;
      this.playerLegR.rotation.x = 0;
    }

    // Camera Follow
    this.camera.position.x = this.player.x;
    this.camera.position.z = this.player.z + 18;
    this.camera.lookAt(this.player.x, 0, this.player.z);

    // Auto-Fire Super Machine Gun
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
        if (dist < 1.2) {
          zm.hp -= 40; // HIGH DAMAGE FOR SATISFYING ONE-TWO SHOT KILLS!
          soundEngine.playZombieHit();
          this.spawnHitParticle(b.mesh.position);

          // Massive Knockback
          zm.mesh.position.x += b.vx * 0.4;
          zm.mesh.position.z += b.vz * 0.4;

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

    // Update Zombie Horde Movement & Walking Animation
    for (let i = 0; i < this.zombies.length; i++) {
      const zm = this.zombies[i];
      const dx = this.player.x - zm.mesh.position.x;
      const dz = this.player.z - zm.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.1) {
        zm.mesh.position.x += (dx / dist) * zm.speed;
        zm.mesh.position.z += (dz / dist) * zm.speed;
        zm.mesh.rotation.y = Math.atan2(dx, dz);

        // Zombie Humanoid Walk Animation (Legs and Arms wobble)
        zm.mesh.legL.rotation.x = Math.sin(this.animTime + i) * 0.5;
        zm.mesh.legR.rotation.x = -Math.sin(this.animTime + i) * 0.5;
        zm.mesh.armL.rotation.z = Math.sin(this.animTime + i) * 0.15;
        zm.mesh.armR.rotation.z = -Math.sin(this.animTime + i) * 0.15;
      }

      if (dist < 1.2) {
        this.player.hp -= 0.3;
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

    const bulletGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.position.set(this.player.x, 1.25, this.player.z);
    this.scene.add(bulletMesh);

    const speed = 0.95;
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
    for (let i = 0; i < 10; i++) {
      const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      this.scene.add(pMesh);

      this.particles.push({
        mesh: pMesh,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 20
      });
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
