// import {Player} from 'player';
class Game {
  constructor() {
    this.cameras;
    this.camera;
    this.scene;
    this.renderer;
    this.assetsPath = "/assets";
    this.clock = new THREE.Clock();

    this.container = document.createElement("div");
    this.container.style.height = "100%";
    document.body.appendChild(this.container);

    this.init();
    this.loadModels();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.scene.background = new THREE.Color(0x00a0f0);

    const ambient = new THREE.AmbientLight(0xaaaaaa);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight(0xaaaaaa);
    light.position.set(30, 100, 40);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;

    const lightSize = 500;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;

    light.shadow.bias = 0.0039;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    this.sun = light;
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.player = new Player(this);

    const size = 10000;
    const divisions = 20;

    const gridHelper = new THREE.GridHelper(size, divisions);
    this.scene.add(gridHelper);
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
    back.position.set(0, 500, -600);
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
      this.camera.position.lerp(newPosition, 0.1);
    }
    const pos = this.player.object.position.clone();
    // console.log('active', this.camera.position);
    // this.camera.currentLookat.lerp(pos, 0.1);
    // console.log('CAMERA' , this.camera);
    // this.camera.lookAt(pos);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initLights() {}

  loadModels() {
    const material = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.cube = new THREE.Mesh(geometry, material);
    // this.scene.add(this.cube);
    this.camera.position.z = 10;
    this.camera.position.y = 10;
  }

  animate() {
    // console.log(this.scene);
    const dt = this.clock.getDelta();
    if (this.player.mixer != undefined) {
      this.player.mixer.update(dt);
    }

    //update player movement;
    this.checkCamera();
    this.player.moveUpdate(dt);
    // camera setting
    // light
    if (this.sun !== undefined) {
      this.sun.position.copy(this.camera.position);
      this.sun.position.y += 10;
    }

    const game = this;
    requestAnimationFrame(function () {
      game.animate();
    });
    this.renderer.render(this.scene, this.camera);
  }
}
