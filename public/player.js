class Player {
  constructor(game, options) {
    // this.deltaPosition = new THREE.Vector3(0, 0, 0);
    this.game = game;
    this.local = true;
    // this.options = type;
    this.anims = ["run2", "idle", "jump", "back", "push"];
    this.animations = {};
    this.dirs = [];
    this.currDir = new THREE.Vector3(0, 0, 1);
    this.axis = new THREE.Vector3(0, 1, 0);
    this.init(game, options);
    // this.raycaster = new THREE.Raycaster();
    this.blocked = false;
    this.prevBlocked = false;
    this.movingBox;
  }

  init(game, options) {
    // event listeners
    window.addEventListener("keydown", this.checkKey.bind(this));
    window.addEventListener("keyup", this.filterKey.bind(this));
    let model = "characterMedium";
    let skin;
    if (options == undefined) {
      // means it is local player
      const skins = [
        "criminalMale",
        "cyborgFemale",
        "skaterFemale",
        "skaterMale",
      ];
      skin = skins[Math.floor(Math.random() * skins.length)];
    }
    if (typeof options == "object") {
      this.local = false;
      this.options = options;
      this.id = options.id;
      skin = options.skin;
    }
    this.model = model;
    this.skin = skin;
    this.game = game;
    const loader = new THREE.FBXLoader();
    const player = this;
    console.log("path ", `static/Model/${model}.fbx`);
    loader.load(`static/Model/${model}.fbx`, function (object) {
      console.log("loading");

      object.mixer = new THREE.AnimationMixer(object);
      player.root = object;
      player.mixer = object.mixer;

      object.name = "Person";
      console.log("object ", object.rotation._x);
      // this.currRotation = object.rotation;
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const textureLoader = new THREE.TextureLoader();
      const texturePath = `static/Skins/${skin}.png`;
      console.log("PATH ", texturePath);
      textureLoader.load(`static/Skins/${skin}.png`, function (texture) {
        console.log("loading texture");
        object.traverse(function (child) {
          if (child.isMesh) {
            console.log("child", child);
            console.log("texture", texture);
            child.material = new THREE.MeshBasicMaterial({
              map: texture,
              skinning: true,
            });
          }
        });
      });

      player.object = new THREE.Object3D();
      player.object.scale.multiplyScalar(0.25);
      //   player.object.position.set(3122, 0, -173);
      player.object.rotation.set(0, 0, 0);

      player.object.add(object);
      player.loadAnim(loader);
      console.log("should have called", player.local);
      if (player.deleted === undefined) {
        console.log("adding player to scene");
        game.scene.add(player.object);
        player.object.position.copy(new THREE.Vector3(0, 0, 0));
        console.log("POSITION ", player.object.position);
      }

      if (player.local) {
        console.log(io);
        game.createCameras();
        // if (player.initSocket !== undefined) player.initSocket();
        player.socket = io.connect();
        player.socket.emit("init", {
          skin: player.skin,
          x: player.object.position.x,
          y: player.object.position.y,
          z: player.object.position.z,
          h: player.object.rotation.y,
          pb: player.object.rotation.x,
        });
        player.socket.on("setId", function (data) {
          player.id = data.id;
        });
        player.socket.on("remoteData", function (data) {
          game.remoteData = data;
        });
        player.socket.on("initBox", function (data) {
          console.log("data", data);
          Object.entries(data).forEach(([index, pos]) => {
            game.colliders[index].position.set(pos.x, pos.y, pos.z);
          });
        });
        player.socket.on("updateMovingBox", function (data) {
          game.colliders[data.index].position.set(data.x, data.y, data.z);
        });
        player.socket.on("deletePlayer", function (data) {
          const players = game.remotePlayers.filter(function (player) {
            if (player.id == data.id) {
              return player;
            }
          });
          // if player not in remotePlayers, remove from scene
          if (players.length > 0) {
            let index = game.remotePlayers.indexOf(players[0]);
            if (index != -1) {
              game.remotePlayers.splice(index, 1);
              game.scene.remove(players[0].object);
            }
          } else {
            index = game.initialisingPlayers.indexOf(data.id);
            if (index != -1) {
              const player = game.initialisingPlayers[index];
              player.deleted = true;
              game.initialisingPlayers.splice(index, 1);
            }
          }
        });
      } else {
        const geometry = new THREE.BoxGeometry(100, 300, 100);
        const material = new THREE.MeshBasicMaterial({ visible: false });
        const box = new THREE.Mesh(geometry, material);
        box.name = "Collider";
        box.position.set(0, 150, 0);
        player.object.add(box);
        player.collider = box;
        player.object.userData.id = player.id;
        player.object.userData.remotePlayer = true;
        const players = game.initialisingPlayers.splice(
          game.initialisingPlayers.indexOf(this),
          1
        );
        game.remotePlayers.push(players[0]);
      }
      if (this.animations.idle !== undefined) player.action = "idle";
    });
  }

  moveUpdate(dt) {
    if (this.dirs.length == 0) {
      this.action = "idle";
      return;
    }

    const speed = 300;
    var angle;
    let anim = "run2";
    this.dirs.forEach((dir) => {
      switch (dir) {
        case "left":
          angle = Math.PI / 128;
          this.currDir.applyAxisAngle(this.axis, angle);
          this.object.rotateY(angle);

          break;
        case "right":
          angle = -Math.PI / 128;
          this.currDir.applyAxisAngle(this.axis, angle);
          this.object.rotateY(angle);
          break;
        case "forward":
          const pos = this.object.position.clone();
          pos.y += 50;
          let direction = new THREE.Vector3();
          this.object.getWorldDirection(direction);
          let raycaster = new THREE.Raycaster(pos, direction);
          const colliders = this.game.colliders;
          const envColliders = this.game.envColliders;

          const intersect1 = raycaster.intersectObjects(envColliders);
          if (intersect1.length > 0) {
            if (intersect1[0].distance < 60) {
              return;
            }
          }

          // blocked = this.game.sphereBBox.intersectsBox(this.game.cubeBBox);
          const intersect = raycaster.intersectObjects(colliders);
          this.prevBlocked = this.blocked;
          if (intersect.length > 0) {
            if (intersect[0].distance < 40) {
              this.blocked = true;
            }
          }

          if (this.blocked || this.prevBlocked) {
            this.object.position.add(
              this.currDir.clone().multiplyScalar((dt * speed) / 2.5)
            );

            intersect[0].object.position.add(
              this.currDir.clone().multiplyScalar((dt * speed) / 2.5)
            );

            this.movingBox = colliders.indexOf(intersect[0].object);

            this.updateBoxSocket();

            anim = "push";
          } else {
            this.object.position.add(
              this.currDir.clone().multiplyScalar(dt * speed)
            );
            // const physicsBody = this.game.rigidBodies[0].userData.physicsBody;
            // let vr = this.currDir.clone();
            // const velocity = new Ammo.btVector3(vr.x, vr.y, vr.z);
            // velocity.op_mul(25);
            // physicsBody.setLinearVelocity(velocity);
            anim = "run2";
          }

          // console.log(this.blocked, this.prevBlocked);
          this.action = anim;
          break;
        case "backward":
          this.object.position.add(
            this.currDir.clone().multiplyScalar((dt * -speed) / 2)
          );
          this.action = "back";
          break;
        default:
          this.game.push = false;
          const stop = new Ammo.btVector3(0, 0, 0);
          stop.op_mul(0);
          physicsBody.setLinearVelocity(stop);
          break;
      }
      this.blocked = false;
    });
    this.updateSocket();
  }

  loadAnim(loader) {
    const scope = this;
    let anim = this.anims.pop();
    loader.load(`static/Animations/${anim}.fbx`, function (object) {
      scope.animations[anim] = object.animations[0];
      if (scope.anims.length > 0) {
        scope.loadAnim(loader);
      } else {
        delete scope.anims;
        scope.action = "idle";
        console.log("action is set");
        scope.game.animate();
      }
    });
  }

  set action(name) {
    //Make a copy of the clip if this is a remote player
    if (this.actionName == name) return;
    const clip = this.local
      ? this.animations[name]
      : THREE.AnimationClip.parse(
          THREE.AnimationClip.toJSON(this.animations[name])
        );
    if (this.local == false) console.log("CLIP", clip);
    const action = this.mixer.clipAction(clip);
    action.time = 0;
    this.mixer.stopAllAction();
    this.actionName = name;
    this.actionTime = Date.now();

    action.fadeIn(0.5);
    action.play();
  }

  get action() {
    return this.actionName;
  }

  checkKey(event) {
    // if (event.repeat) return;
    if (event.key == "a" || event.key == "A") {
      if (this.dirs.includes("left") == false) {
        this.dirs.push("left");
      }
    } else if (event.key == "d" || event.key == "D") {
      if (this.dirs.includes("right") == false) {
        this.dirs.push("right");
      }
    } else if (event.key == "w" || event.key == "W") {
      if (this.dirs.includes("forward") == false) {
        this.dirs.push("forward");
      }
    } else if (event.key == "s" || event.key == "S") {
      if (this.dirs.includes("backward") == false) {
        this.dirs.push("backward");
      }
    }
  }

  filterKey(event) {
    var filtered = [];
    if (event.key == "a" || event.key == "A") {
      filtered = this.dirs.filter((dir) => dir != "left");
    } else if (event.key == "d" || event.key == "D") {
      filtered = this.dirs.filter((dir) => dir != "right");
    } else if (event.key == "w" || event.key == "W") {
      filtered = this.dirs.filter((dir) => dir != "forward");
      console.log("idle action");
      this.action = "idle";
    } else if (event.key == "s" || event.key == "S") {
      filtered = this.dirs.filter((dir) => dir != "backward");
      this.action = "idle";
      console.log("idle action");
    }

    this.dirs = filtered;
    if (this.dirs.length == 0) {
      this.action = "idle";
    }

    this.updateSocket();
  }

  updateSocket() {
    if (this.socket !== undefined) {
      //console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
      this.socket.emit("update", {
        x: this.object.position.x,
        y: this.object.position.y,
        z: this.object.position.z,
        h: this.object.rotation.y,
        pb: this.object.rotation.x,
        action: this.action,
      });
    }
  }

  updateBoxSocket() {
    if (this.socket !== undefined) {
      this.socket.emit("updateMovingBox", {
        index: this.movingBox,
        x: this.game.colliders[this.movingBox].position.x,
        y: this.game.colliders[this.movingBox].position.y,
        z: this.game.colliders[this.movingBox].position.z,
      });
    }
  }

  update(dt) {
    this.mixer.update(dt);

    if (this.game.remoteData.length > 0) {
      let found = false;
      for (let data of this.game.remoteData) {
        if (data.id != this.id) continue;
        //Found the player
        this.object.position.set(data.x, data.y, data.z);
        const euler = new THREE.Euler(data.pb, data.heading, data.pb);
        this.object.quaternion.setFromEuler(euler);
        this.action = data.action;
        found = true;
      }
      if (!found) this.game.removePlayer(this);
    }
  }
}
