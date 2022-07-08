import Floor from "./world/floor.js";

export default class Game {
  constructor() {
    this.cameras;
    this.camera;
    this.scene;
    this.renderer;
    this.remotePlayers = [];
    this.remoteColliders = [];
    this.initialisingPlayers = [];
    this.remoteData = [];

    this.assetsPath = "../assets/";

    this.boxTypes = {
      type1: {
        tag: "TYPE_1",
        color: "#feca57",
      },
      type2: {
        tag: "TYPE_2",
        color: "#54a0ff",
      },
      type3: {
        tag: "TYPE_3",
        color: "#ee5253",
      },
      type4: {
        tag: "TYPE_4",
        color: "#1dd1a1",
      },
    };

    this.container = document.createElement("div");
    document.body.appendChild(this.container);

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    const loader = new THREE.FBXLoader();
    const glbLoader = new THREE.GLTFLoader();
    this.rigidBodies = [];
    this.colliders = [];
    this.envColliders = [];
    this.push = false;
    this.currentDirection;
    this.boxHouses = [];
    this.boxes = [];

    this.particleArray = [];
    this.slowMoFactor = 1;

    this.cloudTargetPosX = 0.65;
    this.cloudTargetPosY = 0.65;
    this.cloudTargetSpeed = 0.65;
    this.cloudTargetColor = 0.65;
    this.cloudSlowMoFactor = 0.65;
    this.gameOver = false;

    this.clock = new THREE.Clock();

    this.setAmmo();
    this.setRenderer();
    this.setCamera();
    this.setLights();
    // this.setOrbitControls();
    this.loadEnvironment(loader);
    // this.loadEnvironmentGlb(glbLoader);
    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.loadEnvironmentGlb(glbLoader);

    this.animate();
  }

  async setAmmo() {
    this.physics = await Ammo();

    this.tmpTrans = new Ammo.btTransform();

    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    let overlappingPairCache = new Ammo.btDbvtBroadphase();
    let solver = new Ammo.btSequentialImpulseConstraintSolver();

    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      overlappingPairCache,
      solver,
      collisionConfiguration
    );
    this.physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));
    this.startTimer();
    this.loadBoxes();
    this.setWorld();
    this.setWorldFence();
    this.setBoxStoreHouses();
    this.loadPlayer();
    this.createRocket();
  }
  startTimer() {
    const startingMinutes = 5;
    this.time = startingMinutes * 60;
    this.countdownEl = document.getElementById("timer");
    console.log("CD", this.countdownEl);
    this.timerInterval = setInterval(this.updateTimer.bind(this), 1000);
    setTimeout(this.gameOverMain.bind(this), 30100);
  }

  updateTimer() {
    const minutes = Math.floor(this.time / 60);
    let seconds = this.time % 60;
    // console.log('CDDDDD', this)
    seconds = seconds < 10 ? "0" + seconds : seconds;
    this.countdownEl.innerHTML = `${minutes}:${seconds}`;
    this.time--;
  }

  gameOverMain() {
    clearInterval(this.timerInterval);
    console.log("GameOver");
    // this.toggleScreen('gameover-screen', true);
    // this.toggleScreen('canvas', false);
  }

  toggleScreen(id, toggle) {
    let el = document.getElementById(id);
    let display = toggle ? "block" : NamedNodeMap;
    el.style.display = display;
  }
  createRocket() {
    this.rocket = new Rocket();
    this.rocket.mesh.scale.set(0.2, 0.2, 0.2);
    this.rocket.mesh.position.y = 80;
    this.rocket.mesh.rotation.y = 1.5;
    this.envColliders.push(this.rocket.mesh);
    this.scene.add(this.rocket.mesh);

    let base = new Base();
    base.mesh.position.y = 5;
    base.mesh.scale.set(1, 0.2, 1);
    this.scene.add(base.mesh);
  }

  getParticle() {
    let p;
    if (this.particleArray.length > 0) {
      p = this.particleArray.pop();
    } else {
      p = new Particle(this);
    }
    return p;
  }

  createSmoke = (rocket) => {
    let p = this.getParticle();
    this.dropParticle(p, rocket);
  };

  dropParticle = (p, rocket) => {
    p.mesh.material.opacity = 1;
    p.mesh.position.x = 0;
    p.mesh.position.y = rocket.mesh.position.y - 80;
    p.mesh.position.z = 0;
    var s = Math.random(0.2) + 0.35;
    p.mesh.scale.set(0.4 * s, 0.4 * s, 0.4 * s);
    this.cloudTargetPosX = 0;
    this.cloudTargetPosY = rocket.mesh.position.y - 500;
    this.cloudTargetSpeed = 0.8 + Math.random() * 0.6;
    this.cloudTargetColor = 0xa3a3a3;

    TweenMax.to(
      p.mesh.position,
      1.3 * this.cloudTargetSpeed * this.cloudSlowMoFactor,
      {
        x: this.cloudTargetPosX,
        y: this.cloudTargetPosY,
        ease: Linear.easeNone,
        onComplete: this.recycleParticle,
        onCompleteParams: [p],
      }
    );

    TweenMax.to(p.mesh.scale, this.cloudTargetSpeed * this.cloudSlowMoFactor, {
      x: s * 1.8,
      y: s * 1.8,
      z: s * 1.8,
      ease: Linear.ease,
    });
  };

  recycleParticle(p) {
    p.mesh.position.x = 0;
    p.mesh.position.y = 0;
    p.mesh.position.z = 0;
    p.mesh.rotation.x = Math.random() * Math.PI * 2;
    p.mesh.rotation.y = Math.random() * Math.PI * 2;
    p.mesh.rotation.z = Math.random() * Math.PI * 2;
    p.mesh.scale.set(0.1, 0.1, 0.1);
    p.mesh.material.opacity = 0;
    p.color = 0xe3e3e3;
    p.mesh.material.color.set(p.color);
    p.material.needUpdate = true;
    return p;
  }

  updateParticles() {}

  loadBoxes() {
    // this.createBox(-700, 50, -700, this.boxTypes["type2"]);

    this.createBox(200, 50, 200, this.boxTypes["type2"]);
    this.createBox(-200, 50, -200, this.boxTypes["type1"]);
    this.createBox(200, 50, -200, this.boxTypes["type4"]);
    this.createBox(-200, 50, 200, this.boxTypes["type3"]);

    this.createBox(700, 50, 700, this.boxTypes["type2"]);
    this.createBox(-700, 50, -700, this.boxTypes["type1"]);
    this.createBox(700, 50, -700, this.boxTypes["type4"]);
    this.createBox(-700, 50, 700, this.boxTypes["type3"]);
  }

  createBox(x, y, z, type) {
    const { tag, color } = type;
    let pos = { x: x, y: y, z: z };
    // let radius = 50;
    // let quat = { x: 0, y: 0, z: 0, w: 1 };
    // let mass = 1

    const geometry = new THREE.BoxGeometry(50, 50, 50);
    const material = new THREE.MeshLambertMaterial({ color });

    const box = new THREE.Mesh(geometry, material);
    box.position.set(pos.x, pos.y, pos.z);
    box.castShadow = true;
    box.userData.tag = tag;
    // box.receiveShadow = true;
    box.updateMatrixWorld();

    const cubeBoxHelper = new THREE.BoxHelper(box, 0x00ff00);
    cubeBoxHelper.visible = false;
    cubeBoxHelper.update();
    const cubeBBox = new THREE.Box3();
    cubeBBox.setFromObject(cubeBoxHelper);
    this.boxes.push({ helper: cubeBoxHelper, cube: cubeBBox, tag });
    this.scene.add(box);
    this.scene.add(cubeBoxHelper);

    this.colliders.push(box);
    // //Ammo js Section
    // let transform = new Ammo.btTransform();
    // transform.setIdentity();
    // transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    // transform.setRotation(
    //   new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    // );
    // let motionState = new Ammo.btDefaultMotionState(transform);

    // let colShape = new Ammo.btBoxShape(
    //   new Ammo.btVector3(50 * 0.5, 50 * 0.5, 50 * 0.5)
    // );
    // colShape.setMargin(0.05);

    // let localInertia = new Ammo.btVector3(0, 0, 0);
    // colShape.calculateLocalInertia(mass, localInertia);

    // let rbInfo = new Ammo.btRigidBodyConstructionInfo(
    //   mass,
    //   motionState,
    //   colShape,
    //   localInertia
    // );
    // let body = new Ammo.btRigidBody(rbInfo);

    // this.physicsWorld.addRigidBody(body);

    // box.userData.physicsBody = body;
    // this.rigidBodies.push(box);
  }

  setRenderer() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.physicallyCorrectLights = true;
    this.renderer.gammaFactor = 2.2;
    this.renderer.gammaOutPut = true;
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
  }

  setCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      20000
    );

    this.camera.position.set(0, 200, 0);
  }

  setLights() {
    this.scene.background = new THREE.Color(0x00a0f0);
    const ambient = new THREE.AmbientLight(0xaaaaaa);
    const light = new THREE.DirectionalLight(0xaaaaaa);
    light.position.set(30, 100, 40);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;

    const lightSize = 500;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 5000;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;

    light.shadow.bias = 0.0039;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    this.sun = light;
    this.scene.add(light);
    this.scene.add(ambient);
  }

  initLights() {
    const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);

    // an ambient light modifies the global color of a scene and makes the shadows softer
    const ambientLight = new THREE.AmbientLight(0xccb8b4, 0.6);
    this.scene.add(ambientLight);

    // A directional light shines from a specific direction.
    // It acts like the sun, that means that all the rays produced are parallel.
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.8);

    // Set the direction of the light
    shadowLight.position.set(150, 150, 0);
    shadowLight.castShadow = true;

    // define the visible area of the projected shadow
    shadowLight.shadow.camera.left = -800;
    shadowLight.shadow.camera.right = 800;
    shadowLight.shadow.camera.top = 800;
    shadowLight.shadow.camera.bottom = -800;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1200;

    // res of shadow
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;

    const burnerLight = new THREE.DirectionalLight(Colors.thrusterOrange, 0.75);

    burnerLight.position.set(0, -5, 0);
    burnerLight.castShadow = true;

    burnerLight.shadow.camera.left = -100;
    burnerLight.shadow.camera.right = 100;
    shadowLight.shadow.camera.top = 100;
    burnerLight.shadow.camera.bottom = -100;
    burnerLight.shadow.camera.near = 1;
    burnerLight.shadow.camera.far = 1000;

    burnerLight.shadow.mapSize.width = 2048;
    burnerLight.shadow.mapSize.height = 2048;

    this.scene.add(hemisphereLight);
    this.scene.add(shadowLight);
    this.scene.add(burnerLight);
    this.scene.add(ambientLight);
  }

  setWorld() {
    // SKY BOX

    const tgaLoader = new THREE.TGALoader();
    const image = "interstellar";
    const imgType = ".tga";
    const materialArray = this.createMaterialArray(image, imgType, tgaLoader);
    const skyboxGeo = new THREE.BoxGeometry(5000, 5000, 5000);
    const skybox = new THREE.Mesh(skyboxGeo, materialArray);
    skybox.position.y = 600;
    this.skybox = skybox;

    this.scene.add(skybox);

    this.scene.fog = new THREE.Fog("white", 1000, 5000);

    // const floor = new Floor();
    // this.scene.add(floor);

    const texture = new THREE.TextureLoader().load("../assets/gravel.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);

    var mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(2000, 2000),
      // new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, metalness: 0})
      new THREE.MeshPhongMaterial({
        color: 0x999999,
        depthWrite: false,
        reflectivity: 0.0,
        shininess: 0,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // MARKER
    const markerGeo = new THREE.BoxGeometry(100, 2, 100);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(markerGeo, material);
    this.scene.add(cube);

    const width = 100;
    const height = 100;
    const intensity = 1;
    const rectLight = new THREE.RectAreaLight(
      0xffffff,
      intensity,
      width,
      height
    );
    rectLight.position.set(0, 2, 0);
    rectLight.lookAt(0, 1, 0);
    // this.scene.add(rectLight);

    var grid = new THREE.GridHelper(2000, 40, 0x000000, 0x999999);
    grid.material.opacity = 0.2;
    grid.position.y = 0;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  // setOrbitControls() {
  //   this.controls = new THREE.OrbitControls(
  //     this.camera,
  //     this.renderer.domElement
  //   );
  //   this.controls.target.set(0, 10, 0);
  //   this.controls.update();
  // }
  createPathStrings(fileName, type) {
    const basePath = "../assets/envmap/";
    const baseFileName = basePath + fileName;
    const sides = ["ft", "bk", "up", "dn", "rt", "lf"];

    const pathStrings = sides.map((side) => {
      return baseFileName + "_" + side + type;
    });
    return pathStrings;
  }

  createMaterialArray(fileName, type, loader) {
    const skyboxImagepaths = this.createPathStrings(fileName, type);
    const materialArray = skyboxImagepaths.map((image) => {
      let texture = loader.load(image);
      return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
      });
    });
    return materialArray;
  }

  loadEnvironment(loader) {
    this.fbxLoader(loader, false, "trees/tree1.fbx", 0, 155, 980, 0.8, 0);
    this.fbxLoader(loader, false, "trees/tree4.fbx", 0, 130, -980, 0.8, 0);
    this.fbxLoader(loader, false, "trees/tree3.fbx", 500, 100, 0, 0.5, 90);
    this.fbxLoader(loader, false, "trees/tree3.fbx", -500, 100, 0, 0.5, 90);
  }

  loadEnvironmentGlb(loader) {
    // this.glbLoader(loader, "props/barrel.glb", 0, 155, 980, 0.8, 0);
  }

  glbLoader(loader, path, x, y, z, scale, rot) {
    const game = this;
    loader.load(`${this.assetsPath}glb/${path}`, function (object) {
      const sword = object.scene;
      sword.traverse(function (child) {
        if (child.isMesh) {
          // child.castShadow = true;
          // child.receiveShadow = true;
          child.material.metalness = -5;
        }
      });
      sword.scale.multiplyScalar(200);
      sword.position.y = 4;
      sword.position.z = 4;
      sword.position.x = 4;
      game.scene.add(sword);
    });
  }

  fbxLoader(loader, collisionBool = true, path, x, y, z, scale, rot) {
    const game = this;
    const newObject = new THREE.Object3D();
    loader.load(`${this.assetsPath}fbx/${path}`, function (object) {
      object.traverse(function (child) {
        if (child.isMesh) {
          // child.material.map = null;
          child.castShadow = true;
          child.receiveShadow = false;
          newObject.add(object);
          if (collisionBool) {
            game.envColliders.push(child);
          }
        }
      });
      // this.envColliders.push(object.children);
      newObject.scale.multiplyScalar(scale);
      newObject.position.set(x, y, z);
      newObject.rotation.set(0, rot, 0);
      game.scene.add(newObject);
    });
  }

  updatePhysics(deltaTime) {
    this.physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < this.rigidBodies.length; i++) {
      let objThree = this.rigidBodies[i];
      let objAmmo = objThree.userData.physicsBody;
      let ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(this.tmpTrans);
        let p = this.tmpTrans.getOrigin();
        let q = this.tmpTrans.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  /**
   * CAMERAS
   */
  set activeCamera(object) {
    this.cameras.active = object;
  }

  createCameras() {
    const offset = new THREE.Vector3(0, 80, 0);
    const front = new THREE.Object3D();
    front.position.set(112, 100, 600);
    front.parent = this.player.object;
    const back = new THREE.Object3D();
    back.position.set(0, 800, -1500);
    back.parent = this.player.object;
    const chat = new THREE.Object3D();
    chat.position.set(0, 200, -450);
    chat.parent = this.player.object;
    const wide = new THREE.Object3D();
    wide.position.set(178, 139, 1665);
    wide.parent = this.player.object;
    const overhead = new THREE.Object3D();
    overhead.position.set(0, 400, 0);
    overhead.parent = this.player.object;
    const collect = new THREE.Object3D();
    collect.position.set(40, 82, 94);
    collect.parent = this.player.object;
    this.cameras = { front, back, wide, overhead, collect, chat };
    this.activeCamera = this.cameras.back;
  }

  checkCamera() {
    if (
      this.cameras != undefined &&
      this.cameras.active != undefined &&
      this.player !== undefined &&
      this.player.object !== undefined
    ) {
      const newPosition = new THREE.Vector3();
      this.cameras.active.getWorldPosition(newPosition);
      this.camera.position.lerp(newPosition, 0.2);
    }
    const pos = this.player.object.position.clone();

    pos.add(new THREE.Vector3(0, 50, 0));

    if (this.gameOver) {
      const posx = this.rocket.mesh.position.clone();
      posx.add(new THREE.Vector3(0, 50, 0));
      this.camera.lookAt(posx);
    } else {
      this.camera.lookAt(pos);
    }
  }

  onWindowResize() {
    console.log("RESIZING");
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async loadPlayer() {
    this.player = new Player(this);
    // const delay = (ms) => new Promise((res) => setTimeout(res, ms));
    // await delay(1000);
    // this.animate();
  }

  moveBox(dir) {
    let physicsBody = this.rigidBodies[0].userData.physicsBody;
    let vr = dir.clone();
    const velocity = new Ammo.btVector3(vr.x, vr.y, vr.z);
    velocity.op_mul(20);
    physicsBody.setLinearVelocity(velocity);
  }
  getRemotePlayerById(id) {
    if (this.remotePlayers === undefined || this.remotePlayers.length == 0)
      return;

    const players = this.remotePlayers.filter(function (player) {
      if (player.id == id) return true;
    });

    if (players.length == 0) return;

    return players[0];
  }
  updateRemotePlayers(dt) {
    if (
      this.remoteData === undefined ||
      this.remoteData.length == 0 ||
      this.player === undefined ||
      this.player.id === undefined
    )
      return;

    const newPlayers = [];
    const game = this;
    //Get all remotePlayers from remoteData array
    const remotePlayers = [];
    const remoteColliders = [];

    this.remoteData.forEach(function (data) {
      // if it's the same as game.player.id, we can ignore since that's the local player
      if (game.player.id != data.id) {
        //Is this player being initialised?
        let iplayer;
        game.initialisingPlayers.forEach(function (player) {
          if (player.id == data.id) iplayer = player;
        });
        //If not being initialised check the remotePlayers array
        if (iplayer === undefined) {
          let rplayer;
          game.remotePlayers.forEach(function (player) {
            if (player.id == data.id) rplayer = player;
          });
          if (rplayer === undefined) {
            //Initialise player
            game.initialisingPlayers.push(new Player(game, data));
          } else {
            //Player exists
            remotePlayers.push(rplayer);
            remoteColliders.push(rplayer.collider);
          }
        }
      }
    });

    this.scene.children.forEach(function (object) {
      if (
        object.userData.remotePlayer &&
        game.getRemotePlayerById(object.userData.id) == undefined
      ) {
        game.scene.remove(object);
      }
    });

    this.remotePlayers = remotePlayers;
    this.remoteColliders = remoteColliders;
    this.remotePlayers.forEach(function (player) {
      player.update(dt);
    });
  }

  setBoxStoreHouses() {
    this.drawBoxHouse(880, 100, 880, this.boxTypes["type1"]);
    this.drawBoxHouse(-880, 100, -880, this.boxTypes["type2"]);
    this.drawBoxHouse(880, 100, -880, this.boxTypes["type3"]);
    this.drawBoxHouse(-880, 100, 880, this.boxTypes["type4"]);
  }

  drawBoxHouse(x, y, z, type) {
    const { color, tag } = type;
    const geometry = new THREE.BoxGeometry(200, 200, 200);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, y, z);
    const boxHelper = new THREE.BoxHelper(box, color);
    box.visible = false;
    box.userData.tag = tag;
    boxHelper.update();
    this.scene.add(boxHelper);

    const cubeBBox = new THREE.Box3();
    cubeBBox.setFromObject(boxHelper);
    this.scene.add(box);
    this.boxHouses.push(cubeBBox);
  }

  setWorldFence() {
    const geometry = new THREE.BoxGeometry(2000, 80, 20);
    const material = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const box1 = new THREE.Mesh(geometry, material);
    box1.position.set(0, 20, 1000);
    this.scene.add(box1);

    const box2 = new THREE.Mesh(geometry, material);
    box2.position.set(0, 20, -1000);
    this.scene.add(box2);

    const geometry1 = new THREE.BoxGeometry(20, 80, 2000);
    const box3 = new THREE.Mesh(geometry1, material);
    box3.position.set(1000, 20, 0);
    this.scene.add(box3);

    const box4 = new THREE.Mesh(geometry1, material);
    box4.position.set(-1000, 20, 0);
    this.scene.add(box4);

    this.envColliders.push(box1);
    this.envColliders.push(box2);
    this.envColliders.push(box3);
    this.envColliders.push(box4);
  }

  animate() {
    const game = this;

    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.colliders.forEach((box) => {
      box.position.y = Math.cos(time) * 7 + 50;
    });

    this.skybox.position.y = Math.cos(time + 120) * 35;
    // this.camera.position.y = Math.cos(time + 120) * 2 + 100;
    this.skybox.rotation.y += dt / 40;

    this.updateRemotePlayers(dt);
    if (this.player.mixer != undefined) {
      this.player.mixer.update(dt);
    }

    //update player movement;
    this.player.moveUpdate(dt);
    // camera setting
    this.checkCamera();
    // light
    if (this.sun !== undefined) {
      this.sun.position.copy(this.camera.position);
      this.sun.position.y += 10;
    }

    if (this.gameOver && this.rocket.mesh.position.y < 1000) {
      if (this.rocket.mesh.position.y < 180) {
        this.rocket.mesh.position.y += 0.5;
        this.rocket.mesh.position.x = Math.random() * Math.PI * 0.5;
        this.rocket.mesh.rotation.x = Math.random() * Math.sin(1) * 0.04;
        this.rocket.mesh.rotation.z = Math.random() * Math.sin(1) * 0.04;
        this.rocket.mesh.position.z = Math.random() * Math.PI * 0.5;
      } else {
        this.rocket.mesh.position.y += 1;
      }
      this.rocket.mesh.rotation.y += Math.sin(1) * 0.02;
    } else {
      this.rocket.mesh.rotation.y += Math.sin(1) * 0.02;
    }

    if (this.gameOver) {
      setTimeout(() => {
        // this.scene.fog = new THREE.Fog("white", 5000, 15000);
        this.createSmoke(this.rocket);
      }, 1000);
    }

    requestAnimationFrame(function () {
      game.animate();
    });

    this.boxes.forEach((element) => {
      element.helper.update();
      element.cube.setFromObject(element.helper);

      if (
        element.tag === "TYPE_1" &&
        this.boxHouses[0].intersectsBox(element.cube)
      ) {
        element.helper.visible = true;
      } else if (
        element.tag === "TYPE_2" &&
        this.boxHouses[1].intersectsBox(element.cube)
      ) {
        element.helper.visible = true;
      } else if (
        element.tag === "TYPE_3" &&
        this.boxHouses[2].intersectsBox(element.cube)
      ) {
        element.helper.visible = true;
      } else if (
        element.tag === "TYPE_4" &&
        this.boxHouses[3].intersectsBox(element.cube)
      ) {
        element.helper.visible = true;
      } else {
        element.helper.visible = false;
      }
    });

    if (this.boxes.every((element) => element.helper.visible === true)) {
      this.gameOver = true;
    }

    if (this.physicsWorld) game.updatePhysics(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

class Particle {
  constructor(mGame) {
    this.isFlying = false;
    this.mGame = mGame;
    var scale = 20 + Math.random() * 20;
    var nLines = 3 + Math.floor(Math.random() * 5);
    var nRows = 3 + Math.floor(Math.random() * 5);
    this.geometry = new THREE.SphereGeometry(scale, nLines, nRows);

    this.material = new THREE.MeshLambertMaterial({
      color: 0xe3e3e3,
      flatShading: THREE.FlatShading,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    const x = mGame.recycleParticle(this);
    mGame.scene.add(x.mesh);
    mGame.particleArray.push(x);
  }
}

class Base {
  constructor() {
    this.mesh = new THREE.Object3D();
    let geo = new THREE.CylinderGeometry(70, 80, 50, 8);
    let mat = new THREE.MeshLambertMaterial({
      color: "#e17055",
    });
    let m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    // m.receiveShadow = true;
    this.mesh.add(m);
  }
}
