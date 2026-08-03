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
      fireRate: 4,
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
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.02);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 22, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x162030);
    this.scene.add(gridHelper);

    // High-Detail Humanoid Player Model
    this.playerMesh = this.createHighDetailHumanoidPlayer();
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createHighDetailHumanoidPlayer() {
    const group = new THREE.Group();

    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.4 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.6 });
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x162035, roughness: 0.7 });
    const matBoots = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.5 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.9, roughness: 0.1 });
    const matVisor = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // Head Sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), matSkin);
    head.position.y = 2.15;
    group.add(head);

    // Hair / Cap
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8), matHair);
    hair.position.y = 2.18;
    group.add(hair);

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), matVisor);
    visor.position.set(0, 2.15, 0.24);
    group.add(visor);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 10), matSkin);
    neck.position.y = 1.82;
    group.add(neck);

    // Torso / Chest Armor
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.45), matArmor);
    chest.position.y = 1.4;
    group.add(chest);

    // Abs / Waist
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.35, 0.38), matPants);
    waist.position.y = 0.98;
    group.add(waist);

    // Left Leg Group (Thigh + Calf + Boot)
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.8, 0);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 10), matPants);
    thighL.position.y = -0.22;
    legLGroup.add(thighL);
    const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.4, 10), matPants);
    calfL.position.y = -0.55;
    legLGroup.add(calfL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.38), matBoots);
    bootL.position.set(0, -0.72, 0.08);
    legLGroup.add(bootL);
    group.add(legLGroup);
    this.playerLegL = legLGroup;

    // Right Leg Group
    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.8, 0);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 10), matPants);
    thighR.position.y = -0.22;
    legRGroup.add(thighR);
    const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.4, 10), matPants);
    calfR.position.y = -0.55;
    legRGroup.add(calfR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.38), matBoots);
    bootR.position.set(0, -0.72, 0.08);
    legRGroup.add(bootR);
    group.add(legRGroup);
    this.playerLegR = legRGroup;

    // Left Arm Group (Shoulder + Arm + Forearm)
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.52, 1.55, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.65, 10), matArmor);
    armL.position.y = -0.3;
    armLGroup.add(armL);
    group.add(armLGroup);
    this.playerArmL = armLGroup;

    // Right Arm Group holding Rifle
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.52, 1.55, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.65, 10), matArmor);
    armR.position.y = -0.3;
    armRGroup.add(armR);
    group.add(armRGroup);
    this.playerArmR = armRGroup;

    // Detailed Assault Rifle Weapon
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.95), matGun);
    gunGroup.add(gunBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10), matGun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.65);
    gunGroup.add(barrel);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.35, 0.16), matGun);
    magazine.position.set(0, -0.22, 0.1);
    gunGroup.add(magazine);

    gunGroup.position.set(0.35, 1.25, 0.45);
    group.add(gunGroup);

    return group;
  }

  createHighDetailHumanoidZombie() {
    const group = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({ color: 0x1fc752, roughness: 0.7 });
    const matTornCloth = new THREE.MeshStandardMaterial({ color: 0x273027, roughness: 0.9 });
    const matRedEyes = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), matSkin);
    head.position.y = 2.15;
    group.add(head);

    // Glowing Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matRedEyes);
    eyeL.position.set(-0.11, 2.18, 0.28);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matRedEyes);
    eyeR.position.set(0.11, 2.18, 0.28);
    group.add(eyeR);

    // Jaw / Mouth
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.22), matSkin);
    jaw.position.set(0, 2.0, 0.2);
    group.add(jaw);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.45), matTornCloth);
    torso.position.y = 1.35;
    group.add(torso);

    // Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.8, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.75, 10), matTornCloth);
    legL.position.y = -0.375;
    legLGroup.add(legL);
    group.add(legLGroup);

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.8, 0);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.75, 10), matTornCloth);
    legR.position.y = -0.375;
    legRGroup.add(legR);
    group.add(legRGroup);

    // Outstretched Zombie Arms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.5, 1.55, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 10), matSkin);
    armL.position.set(0, -0.2, 0.3);
    armL.rotation.x = -Math.PI / 2.1;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.5, 1.55, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 10), matSkin);
    armR.position.set(0, -0.2, 0.3);
    armR.rotation.x = -Math.PI / 2.1;
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

    const zombieMesh = this.createHighDetailHumanoidZombie();
    zombieMesh.position.set(zx, 0, zz);
    this.scene.add(zombieMesh);

    this.zombies.push({
      mesh: zombieMesh,
      hp: 1, // 1-HIT GUARANTEED SATISFYING DIE! (NO MORE BUG!)
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

    // Leg Walk Animation
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

    // Auto-Fire Guns
    this.player.fireTimer++;
    if (this.player.fireTimer >= this.player.fireRate && this.zombies.length > 0) {
      this.player.fireTimer = 0;
      this.fireBulletAtNearest();
    }

    // Update Bullets & PERFECT 2D-XZ COLLISION DETECTION (100% FIX FOR COLLISION BUG!)
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

      const bx = b.mesh.position.x;
      const bz = b.mesh.position.z;

      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const zm = this.zombies[j];
        const zx = zm.mesh.position.x;
        const zz = zm.mesh.position.z;
        
        // 2D Radial Collision Distance (Fixes Y-height mismatch bug completely!)
        const distXZ = Math.hypot(bx - zx, bz - zz);

        if (distXZ < 1.4) {
          zm.hp -= 100; // Guaranteed Kill
          soundEngine.playZombieHit();
          this.spawnHitParticle(b.mesh.position);

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
      const dist = Math.hypot(dx, dz);

      if (dist > 0.1) {
        zm.mesh.position.x += (dx / dist) * zm.speed;
        zm.mesh.position.z += (dz / dist) * zm.speed;
        zm.mesh.rotation.y = Math.atan2(dx, dz);

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
      const dist = Math.hypot(this.player.x - zm.mesh.position.x, this.player.z - zm.mesh.position.z);
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
    const pGeo = new THREE.SphereGeometry(0.12, 4, 4);
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
    for (let i = 0; i < 12; i++) {
      const pGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x1fc752 });
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
