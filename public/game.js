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

    this.clock = new THREE.Clock();

    this.setAmmo();
    this.setRenderer();
    this.setCamera();
    this.setLights();
    // this.setOrbitControls();
    this.loadEnvironment(loader);
    // this.loadEnvironmentGlb(glbLoader);

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

    this.loadBoxes();
    this.setWorld();
    this.setWorldFence();
    this.setBoxStoreHouses();
    this.loadPlayer();
    this.createRocket();
  }

  createRocket() {}

  loadBoxes() {
    this.createBox(50, 50, 50, this.boxTypes["type1"]);
    this.createBox(100, 50, 80, this.boxTypes["type2"]);
    this.createBox(250, 50, 250, this.boxTypes["type3"]);
    this.createBox(500, 50, 350, this.boxTypes["type4"]);
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
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
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
    this.camera.position.set(112, 100, 1100);
  }

  setLights() {
    this.scene.background = new THREE.Color(0x00a0f0);
    const ambient = new THREE.AmbientLight(0xaaaaaa);
    this.scene.add(ambient);

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
  }

  initLights() {}

  setWorld() {
    // this.scene.fog = new THREE.Fog("lightblue", 50, 6000);
    let pos = { x: 0, y: 0, z: 0 };
    let scale = { x: 2000, y: 0, z: 2000 };
    let quat = { x: 0, y: 0, z: 0, w: 10 };
    let mass = 0;

    const floor = new Floor();
    this.scene.add(floor);

    var mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(2000, 2000),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // let transform = new Ammo.btTransform();
    // transform.setIdentity();
    // transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    // transform.setRotation(
    //   new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    // );
    // let motionState = new Ammo.btDefaultMotionState(transform);

    // let colShape = new Ammo.btBoxShape(
    //   new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
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

  loadEnvironment(loader) {
    this.fbxLoader(loader, "trees/tree1.fbx", 0, 155, 980, 0.8, 0);
    this.fbxLoader(loader, "trees/tree4.fbx", 0, 130, -980, 0.8, 0);
    this.fbxLoader(loader, "trees/tree3.fbx", 500, 100, 0, 0.5, 90);
  }
  loadEnvironmentGlb(loader) {
    this.glbLoader(loader, `${this.assetsPath}fbx/trees/barrel.glb`);
  }
  fbxLoader(loader, path, x, y, z, scale, rot) {
    const game = this;
    const newObject = new THREE.Object3D();
    loader.load(`${this.assetsPath}fbx/${path}`, function (object) {
      object.traverse(function (child) {
        if (child.isMesh) {
          child.material.map = null;
          child.castShadow = true;
          child.receiveShadow = false;
          game.envColliders.push(child);
          newObject.add(object);
        }
      });
      // this.envColliders.push(object.children);
      newObject.scale.multiplyScalar(scale);
      newObject.position.set(x, y, z);
      newObject.rotation.set(0, rot, 0);
      game.scene.add(newObject);
    });
  }

  glbLoader(loader, path, x, y, z, scale, rot) {
    // loader.load(`${this.assetsPath}fbx/trees/barrel.glb`, function (object) {
    //   const sword = object.scene; // sword 3D object is loaded
    //   sword.traverse(function (child) {
    //     if (child.isMesh) {
    //       child.castShadow = true;
    //       child.receiveShadow = true;
    //       child.material.metalness = 0;
    //     }
    //   });
    //   sword.scale.set(200, 200, 200);
    //   sword.position.y = 4;
    //   sword.position.z = 4;
    //   sword.position.x = 4;
    //   game.scene.add(sword);
    // });
  }

  loadObjects() {
    let pos = { x: 200, y: 400, z: 0 };
    let scale = { x: 50, y: 2, z: 50 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;

    const geometry = new THREE.BoxGeometry(50, 50, 50);

    const material = new THREE.MeshLambertMaterial({ color: "#81ecec" });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    this.scene.add(cube);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    this.physicsWorld.addRigidBody(body);

    cube.userData.physicsBody = body;
    this.rigidBodies.push(cube);
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
    back.position.set(0, 400, -1500);
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
    // console.log('active', this.camera.position);
    this.camera.lookAt(pos);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async loadPlayer() {
    this.player = new Player(this);

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    await delay(1000);

    // if (this.player.object) {
    //   this.sphereBoxHelper = new THREE.BoxHelper(this.player.object, 0x00ff00);
    //   this.sphereBoxHelper.update();
    //   this.sphereBBox = new THREE.Box3();
    //   this.sphereBBox.setFromObject(this.sphereBoxHelper);
    //   this.sphereBoxHelper.visible = true;
    //   this.scene.add(this.sphereBoxHelper);
    // }

    // if (this.player.object) {
    //   const mass = 100;
    //   const pos = this.player.object.position.clone();
    //   const quat = { x: 0, y: 0, z: 0, w: 1 };

    //   let transform = new Ammo.btTransform();
    //   transform.setIdentity();
    //   transform.setOrigin(new Ammo.btVector3(pos.x, 20, pos.z));
    //   transform.setRotation(
    //     new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    //   );
    //   let motionState = new Ammo.btDefaultMotionState(transform);

    //   let colShape = new Ammo.btBoxShape(
    //     new Ammo.btVector3(1 * 0.5, 1 * 0.5, 1 * 0.5)
    //   );
    //   colShape.setMargin(0.05);

    //   let localInertia = new Ammo.btVector3(0, 0, 0);
    //   colShape.calculateLocalInertia(mass, localInertia);

    //   let rbInfo = new Ammo.btRigidBodyConstructionInfo(
    //     mass,
    //     motionState,
    //     colShape,
    //     localInertia
    //   );
    //   let body = new Ammo.btRigidBody(rbInfo);

    //   this.physicsWorld.addRigidBody(body);

    //   this.player.object.userData.physicsBody = body;
    //   this.rigidBodies.push(this.player.object);
    // }
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
    const material = new THREE.MeshLambertMaterial({ color: "#81ecec" });
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

    if (this.physicsWorld) game.updatePhysics(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
