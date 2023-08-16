const express = require("express");
const cors = require("cors");
const { scryRenderedDOMComponentsWithTag } = require("react-dom/test-utils");
const mysql = require("mysql2");
const { connect } = require("http2");

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const port = 9999;

const rooms = new Map();

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ahtiger2",
  database: "messager_vkr",
  port: 8889
});

app.use(cors());
app.use(express.json());

const sqlMessages =
"SELECT room AS roomId FROM rooms";

connection.query(sqlMessages, function (err, results) {
if (err) console.log(err);

results.forEach(element => {
  rooms.set(element.roomId, new Map([["users", new Map()]]))
});

});


app.get("/rooms/:id", function (req, res) {
  const { id: roomId } = req.params;

  const sqlMessages =
    "SELECT user AS 'userName',text FROM messages " +
    "INNER JOIN users ON messages.userId = users.userId " +
    "INNER JOIN rooms ON messages.roomID = rooms.roomId " +
    "WHERE rooms.room = ?";

  connection.query(sqlMessages, [roomId], function (err, results) {
    if (err) console.log(err);

    const sqlRoomKey = "SELECT roomKey FROM rooms WHERE rooms.room = ?";

    connection.query(sqlRoomKey, [roomId], function (err, resultKey) {
      if (err) console.log(err);

      const obj = rooms.has(roomId)
        ? {
            users: [...rooms.get(roomId).get("users").values()],
            messages: [...results],
            roomKey: resultKey[0].roomKey,
          }
        : {
            users: [],
            messages: [...results],
            roomKey: resultKey[0].roomKey,
          };
      res.json(obj);
    });
  });
});

app.post("/rooms", (req, res) => {
  const { roomId, userName, userKey } = req.body;
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map([["users", new Map()]]));

    const sqlRooms = "INSERT IGNORE INTO rooms(room,roomKey) VALUES (?,?)";

    connection.query(sqlRooms, [roomId, userKey], function (err, results) {
      if (err) console.log(err);
    });
  }

  const sqlUsers = "INSERT IGNORE INTO users(user) VALUES (?)";

  connection.query(sqlUsers, [userName], function (err, results) {
    if (err) console.log(err);
  });
  res.send();
});

io.on("connection", (socket) => {
  socket.emit("CONNECTION");

  socket.on("ROOM:JOIN", ({ roomId, userName }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map([["users", new Map()]]));
    }

    socket.join(roomId);
    rooms.get(roomId).get("users").set(socket.id, userName);
    const users = [...rooms.get(roomId).get("users").values()];
    socket.broadcast.to(roomId).emit("ROOM:SET_USERS", users);
  });

  socket.on("CHECK_ROOM", (roomId) => {
    success=false;
    if (rooms.has(roomId)) success=true; 
    socket.emit("CHECKED_ROOM", success);
  });

  socket.on("ROOM:NEW_MESSAGE_FROM", ({ roomId, userName, text }) => {
    
    const obj = {
      userName,
      text,
    };

    socket.broadcast.to(roomId).emit("ROOM:NEW_MESSAGE_TO", obj);

    const sql =
      "INSERT INTO messages(text, userId, roomId) " +
      "SELECT ?, userId, roomId FROM users,rooms WHERE user = ? AND room = ?";
    const data = [text, userName, roomId];

    connection.query(sql, data, function (err, results) {
      if (err) console.log(err);
    });
  });

  socket.on("disconnect", () => {
    rooms.forEach((value, roomId) => {
      if (value.get("users").delete(socket.id)) {
        const users = [...value.get("users").values()];
        socket.broadcast.to(roomId).emit("ROOM:SET_USERS", users);
      }
    });
  });

  console.log("user connected", socket.id);
});

server.listen(port, (err) => {
  if (err) {
    throw Error(err);
  }
  console.log("Сервер запущен на порту " + port);
});
