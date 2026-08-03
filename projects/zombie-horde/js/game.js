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

    // Realistic Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(15, 35, 15);
    mainLight.castShadow = true;
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    rimLight.position.set(-15, 20, -15);
    this.scene.add(rimLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x162030);
    this.scene.add(gridHelper);

    // Ultra Realistic Humanoid Player Model
    this.playerMesh = this.createUltraRealisticHumanoidPlayer();
    this.scene.add(this.playerMesh);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createUltraRealisticHumanoidPlayer() {
    const group = new THREE.Group();

    // High Quality Materials
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffcca8, roughness: 0.3, metalness: 0.1 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x1c130d, roughness: 0.8 });
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x00d0ff, roughness: 0.2, metalness: 0.7 });
    const matVest = new THREE.MeshStandardMaterial({ color: 0x121b2d, roughness: 0.5 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.6 });
    const matBoots = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.4 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x111116, metalness: 0.95, roughness: 0.05 });
    const matVisor = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const matPad = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2 });

    // 1. Head & Facial Features
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), matSkin);
    head.position.y = 2.15;
    group.add(head);

    // Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.08), matSkin);
    nose.position.set(0, 2.14, 0.32);
    group.add(nose);

    // Ears
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), matSkin);
    earL.position.set(-0.33, 2.15, 0);
    group.add(earL);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), matSkin);
    earR.position.set(0.33, 2.15, 0);
    group.add(earR);

    // Tactical Helmet & Hair
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.75), matHair);
    helmet.position.y = 2.18;
    group.add(helmet);

    // Sci-Fi Goggles / Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), matVisor);
    visor.position.set(0, 2.16, 0.24);
    group.add(visor);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 12), matSkin);
    neck.position.y = 1.82;
    group.add(neck);

    // 2. Chest & Tactical Vest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.45), matVest);
    chest.position.y = 1.4;
    group.add(chest);

    // Armor Plates
    const armorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.48), matArmor);
    armorPlate.position.set(0, 1.42, 0);
    group.add(armorPlate);

    // Shoulder Pads
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matPad);
    shoulderL.position.set(-0.52, 1.65, 0);
    group.add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matPad);
    shoulderR.position.set(0.52, 1.65, 0);
    group.add(shoulderR);

    // Waist Belt & Pouches
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.15, 0.42), matBoots);
    belt.position.y = 1.05;
    group.add(belt);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), matVest);
    pouch.position.set(-0.25, 1.05, 0.22);
    group.add(pouch);

    // 3. Legs & Kneepads
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.8, 0);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 12), matPants);
    thighL.position.y = -0.22;
    legLGroup.add(thighL);
    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), matPad);
    kneeL.position.set(0, -0.45, 0.1);
    legLGroup.add(kneeL);
    const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.4, 12), matPants);
    calfL.position.y = -0.55;
    legLGroup.add(calfL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.38), matBoots);
    bootL.position.set(0, -0.72, 0.08);
    legLGroup.add(bootL);
    group.add(legLGroup);
    this.playerLegL = legLGroup;

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.8, 0);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 12), matPants);
    thighR.position.y = -0.22;
    legRGroup.add(thighR);
    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), matPad);
    kneeR.position.set(0, -0.45, 0.1);
    legRGroup.add(kneeR);
    const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.4, 12), matPants);
    calfR.position.y = -0.55;
    legRGroup.add(calfR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.38), matBoots);
    bootR.position.set(0, -0.72, 0.08);
    legRGroup.add(bootR);
    group.add(legRGroup);
    this.playerLegR = legRGroup;

    // 4. Arms & Forearms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.52, 1.55, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.65, 12), matArmor);
    armL.position.y = -0.3;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.52, 1.55, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.65, 12), matArmor);
    armR.position.y = -0.3;
    armRGroup.add(armR);
    group.add(armRGroup);

    // 5. Detailed Assault Rifle Gun with Scope
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.95), matGun);
    gunGroup.add(gunBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12), matGun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.65);
    gunGroup.add(barrel);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 10), matGun);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.18, 0.1);
    gunGroup.add(scope);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.35, 0.16), matGun);
    magazine.position.set(0, -0.22, 0.1);
    gunGroup.add(magazine);

    gunGroup.position.set(0.35, 1.25, 0.45);
    group.add(gunGroup);

    return group;
  }

  createUltraRealisticHumanoidZombie() {
    const group = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({ color: 0x22c255, roughness: 0.7 });
    const matTornCloth = new THREE.MeshStandardMaterial({ color: 0x242d24, roughness: 0.9 });
    const matRedEyes = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const matTeeth = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), matSkin);
    head.position.y = 2.15;
    group.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matRedEyes);
    eyeL.position.set(-0.11, 2.18, 0.28);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matRedEyes);
    eyeR.position.set(0.11, 2.18, 0.28);
    group.add(eyeR);

    // Open Mouth & Teeth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.15), matTeeth);
    mouth.position.set(0, 2.02, 0.25);
    group.add(mouth);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.45), matTornCloth);
    torso.position.y = 1.35;
    group.add(torso);

    // Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.8, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.75, 12), matTornCloth);
    legL.position.y = -0.375;
    legLGroup.add(legL);
    group.add(legLGroup);

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.8, 0);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.75, 12), matTornCloth);
    legR.position.y = -0.375;
    legRGroup.add(legR);
    group.add(legRGroup);

    // Outstretched Arms
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.5, 1.55, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12), matSkin);
    armL.position.set(0, -0.2, 0.3);
    armL.rotation.x = -Math.PI / 2.1;
    armLGroup.add(armL);
    group.add(armLGroup);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.5, 1.55, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12), matSkin);
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
    const zombieCount = 12 + this.wave * 6;
    for (let i = 0; i < zombieCount; i++) {
      this.spawnZombie();
    }
  }

  spawnZombie() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 22 + Math.random() * 12;
    const zx = this.player.x + Math.cos(angle) * distance;
    const zz = this.player.z + Math.sin(angle) * distance;

    const zombieMesh = this.createUltraRealisticHumanoidZombie();
    zombieMesh.position.set(zx, 0, zz);
    this.scene.add(zombieMesh);

    this.zombies.push({
      mesh: zombieMesh,
      hp: 1,
      speed: 0.04
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

    // UPDATE BULLETS WITH CONTINUOUS LINE-SEGMENT COLLISION
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
          this.scene.remove(zm.mesh);
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

    const bulletGeo = new THREE.SphereGeometry(0.3, 8, 8);
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
      const pMat = new THREE.MeshBasicMaterial({ color: 0x22cc55 });
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
