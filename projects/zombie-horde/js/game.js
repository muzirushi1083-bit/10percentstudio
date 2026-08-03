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
      fireRate: 5,
      fireTimer: 0
    };

    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.deadZombies = [];
    
    this.init3D();
  }

  init3D() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c14);
    this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.018);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 22, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Unity-Style Lighting (Main Directional Light + Ambient + Hemisphere)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x111122, 0.6);
    this.scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(15, 35, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    this.scene.add(mainLight);

    // Unity-style Ground Mesh with Grid Texture
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x121622, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(120, 40, 0x00f0ff, 0x1d2636);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Unity-Style Humanoid Player Model
    this.playerMesh = this.createUnityStyleHumanoidPlayer();
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createUnityStyleHumanoidPlayer() {
    const group = new THREE.Group();

    // Unity Low-Poly Shader Style Materials (Flat Shading for Clean Anime/Game Look)
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffd3b4, flatShading: true, roughness: 0.4 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x2b1d0c, flatShading: true, roughness: 0.7 });
    const matJacket = new THREE.MeshStandardMaterial({ color: 0x0099ff, flatShading: true, roughness: 0.4 });
    const matVest = new THREE.MeshStandardMaterial({ color: 0x1a2233, flatShading: true, roughness: 0.5 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x242d40, flatShading: true, roughness: 0.6 });
    const matBoots = new THREE.MeshStandardMaterial({ color: 0x0f0f14, flatShading: true, roughness: 0.3 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x181820, flatShading: true, metalness: 0.8 });
    const matEye = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // 1. Head & Face (Unity Low-Poly Mesh)
    const headGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.42, 8);
    const head = new THREE.Mesh(headGeo, matSkin);
    head.position.y = 2.15;
    group.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), matEye);
    eyeL.position.set(-0.1, 2.18, 0.24);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), matEye);
    eyeR.position.set(0.1, 2.18, 0.24);
    group.add(eyeR);

    // Stylized Anime Hair
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 8), matHair);
    hair.position.set(0, 2.4, -0.02);
    hair.rotation.x = -0.2;
    group.add(hair);

    // 2. Torso & Jacket
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.42), matJacket);
    torso.position.y = 1.4;
    torso.castShadow = true;
    group.add(torso);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.5, 0.46), matVest);
    vest.position.set(0, 1.42, 0);
    group.add(vest);

    // 3. Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.22, 0.8, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), matPants);
    legL.position.y = -0.375;
    legL.castShadow = true;
    legLGroup.add(legL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.35), matBoots);
    bootL.position.set(0, -0.72, 0.05);
    legLGroup.add(bootL);
    group.add(legLGroup);
    this.playerLegL = legLGroup;

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.22, 0.8, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), matPants);
    legR.position.y = -0.375;
    legR.castShadow = true;
    legRGroup.add(legR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.35), matBoots);
    bootR.position.set(0, -0.72, 0.05);
    legRGroup.add(bootR);
    group.add(legRGroup);
    this.playerLegR = legRGroup;

    // 4. Arms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.48, 1.58, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), matJacket);
    armL.position.y = -0.3;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.48, 1.58, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), matJacket);
    armR.position.y = -0.3;
    armRGroup.add(armR);
    group.add(armRGroup);

    // 5. Unity-Style Rifle Weapon
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.9), matGun);
    gunGroup.add(gunBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), matGun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.6);
    gunGroup.add(barrel);

    // Muzzle Flash Mesh
    const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    muzzleFlash.position.set(0, 0.05, 0.9);
    muzzleFlash.visible = false;
    gunGroup.add(muzzleFlash);
    this.muzzleFlash = muzzleFlash;

    gunGroup.position.set(0.3, 1.25, 0.45);
    group.add(gunGroup);

    return group;
  }

  createUnityStyleZombie() {
    const group = new THREE.Group();
    const matZombieSkin = new THREE.MeshStandardMaterial({ color: 0x33aa55, flatShading: true, roughness: 0.6 });
    const matTornCloth = new THREE.MeshStandardMaterial({ color: 0x2a332a, flatShading: true, roughness: 0.8 });
    const matRedEyes = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.42, 8), matZombieSkin);
    head.position.y = 2.15;
    group.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), matRedEyes);
    eyeL.position.set(-0.1, 2.18, 0.24);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), matRedEyes);
    eyeR.position.set(0.1, 2.18, 0.24);
    group.add(eyeR);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.42), matTornCloth);
    torso.position.y = 1.4;
    torso.castShadow = true;
    group.add(torso);

    // Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.22, 0.8, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), matTornCloth);
    legL.position.y = -0.375;
    legLGroup.add(legL);
    group.add(legLGroup);

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.22, 0.8, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), matTornCloth);
    legR.position.y = -0.375;
    legRGroup.add(legR);
    group.add(legRGroup);

    // Outstretched Zombie Arms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.48, 1.58, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), matZombieSkin);
    armL.position.set(0, -0.2, 0.3);
    armL.rotation.x = -Math.PI / 2.1;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.48, 1.58, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), matZombieSkin);
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
    this.deadZombies.forEach(d => this.scene.remove(d.mesh));
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.deadZombies = [];

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
    const distance = 22 + Math.random() * 12;
    const zx = this.player.x + Math.cos(angle) * distance;
    const zz = this.player.z + Math.sin(angle) * distance;

    const zombieMesh = this.createUnityStyleZombie();
    zombieMesh.position.set(zx, 0, zz);
    this.scene.add(zombieMesh);

    this.zombies.push({
      mesh: zombieMesh,
      hp: 1,
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
    this.animTime += 0.18;

    // Player Position
    this.player.x += this.player.vx;
    this.player.z += this.player.vz;
    this.playerMesh.position.x = this.player.x;
    this.playerMesh.position.z = this.player.z;

    // Walking Animation
    const isMoving = Math.abs(this.player.vx) > 0.01 || Math.abs(this.player.vz) > 0.01;
    if (isMoving) {
      this.playerLegL.rotation.x = Math.sin(this.animTime) * 0.65;
      this.playerLegR.rotation.x = -Math.sin(this.animTime) * 0.65;
    } else {
      this.playerLegL.rotation.x = 0;
      this.playerLegR.rotation.x = 0;
    }

    // Camera Follow
    this.camera.position.x = this.player.x;
    this.camera.position.z = this.player.z + 18;
    this.camera.lookAt(this.player.x, 0, this.player.z);

    // Muzzle Flash Hide
    if (this.muzzleFlash.visible && Math.random() < 0.5) {
      this.muzzleFlash.visible = false;
    }

    // Auto-Fire Guns
    this.player.fireTimer++;
    if (this.player.fireTimer >= this.player.fireRate && this.zombies.length > 0) {
      this.player.fireTimer = 0;
      this.fireBulletAtNearest();
    }

    // Bullets Collision
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];

      const oldX = b.mesh.position.x;
      const oldZ = b.mesh.position.z;

      b.mesh.position.x += b.vx;
      b.mesh.position.z += b.vz;
      b.life--;

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      const newX = b.mesh.position.x;
      const newZ = b.mesh.position.z;

      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const zm = this.zombies[j];
        const zx = zm.mesh.position.x;
        const zz = zm.mesh.position.z;

        const distToSegment = this.pointToSegmentDistance(zx, zz, oldX, oldZ, newX, newZ);

        if (distToSegment < 1.8) {
          zm.hp = 0;
          soundEngine.playZombieHit();
          this.spawnHitParticle(b.mesh.position);

          this.scene.remove(b.mesh);
          this.bullets.splice(i, 1);

          soundEngine.playZombieDeath();
          this.spawnDeathParticles(zm.mesh.position);

          // Unity-Style Ragdoll Fall Animation
          zm.mesh.rotation.x = Math.PI / 2;
          zm.mesh.position.y = 0.2;
          this.deadZombies.push({ mesh: zm.mesh, life: 60 });

          this.zombies.splice(j, 1);
          this.kills++;

          if (this.zombies.length === 0) {
            this.wave++;
            this.spawnHordeWave();
          }
          break;
        }
      }
    }

    // Dead Zombie Fade & Despawn
    for (let i = this.deadZombies.length - 1; i >= 0; i--) {
      const d = this.deadZombies[i];
      d.life--;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.deadZombies.splice(i, 1);
      }
    }

    // Zombie Horde Movement & Walk Animation
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

  pointToSegmentDistance(px, pz, x1, z1, x2, z2) {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.hypot(px - projX, pz - projZ);
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

    // Show Muzzle Flash Effect
    this.muzzleFlash.visible = true;

    const bulletGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.position.set(this.player.x, 1.25, this.player.z);
    this.scene.add(bulletMesh);

    const speed = 0.85;
    this.bullets.push({
      mesh: bulletMesh,
      vx: Math.sin(targetAngle) * speed,
      vz: Math.cos(targetAngle) * speed,
      life: 45
    });

    soundEngine.playGunfire();
  }

  spawnHitParticle(pos) {
    const pGeo = new THREE.SphereGeometry(0.12, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
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
      const pMat = new THREE.MeshBasicMaterial({ color: 0x33aa55 });
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
