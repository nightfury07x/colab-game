var express = require("express");

var app = express();
var server = app.listen(3000);

app.use(express.static("./public"));
console.log("server is running");

var socket = require("socket.io");

var io = socket(server, {
  cors: {
    origin: "http://localhost:8100",
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
    credentials: true,
  },
  allowEIO3: true,
});

var boxData = {};

io.sockets.on("connection", myConnection);

function myConnection(socket) {
  console.log("new connection id :" + socket.id);
  socket.userData = { x: 0, y: 0, z: 0, heading: 0 }; //Default values;
  socket.boxData = { x: 0, y: 0, z: 0, index: 0 }; //Default values;
  socket.emit("setId", { id: socket.id });

  socket.on("init", function (data) {
    console.log("INIT");
    socket.userData.skin = data.skin;
    socket.userData.x = data.x;
    socket.userData.y = data.y;
    socket.userData.z = data.z;
    socket.userData.heading = data.h;
    (socket.userData.pb = data.pb), (socket.userData.action = "idle");

    if (Object.keys(boxData).length > 0) {
      io.to(socket.id).emit("initBox", boxData);
    }
    // for ((key, value) in boxData) {

    // }
  });
  socket.on("disconnect", function () {
    socket.broadcast.emit("deletePlayer", { id: socket.id });
  });

  socket.on("update", function (data) {
    socket.userData.x = data.x;
    socket.userData.y = data.y;
    socket.userData.z = data.z;
    socket.userData.heading = data.h;
    (socket.userData.pb = data.pb), (socket.userData.action = data.action);
  });

  socket.on("updateMovingBox", function (data) {
    socket.boxData.index = data.index;
    socket.boxData.x = data.x;
    socket.boxData.y = data.y;
    socket.boxData.z = data.z;

    boxData[data.index] = { x: data.x, y: data.y, z: data.z };
    socket.broadcast.emit("updateMovingBox", socket.boxData);
  });
}

setInterval(function () {
  const nsp = io.of("/");
  let pack = [];
  // console.log(io.sockets.sockets);
  // console.log(io.sockets.clients());

  for (let id in io.sockets.sockets) {
    const socket = nsp.connected[id];
    // console.log('socket ', socket);
    //Only push sockets that have been initialised
    if (socket.userData.skin !== undefined) {
      pack.push({
        id: socket.id,
        skin: socket.userData.skin,
        x: socket.userData.x,
        y: socket.userData.y,
        z: socket.userData.z,
        heading: socket.userData.heading,
        pb: socket.userData.pb,
        action: socket.userData.action,
      });
    }
  }
  // console.log('packing');
  if (pack.length > 0) {
    io.emit("remoteData", pack);
  }
}, 15);
