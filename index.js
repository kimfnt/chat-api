import http from "http";
import express from "express";
import logger from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import path from 'path'
import fetch from "node-fetch"

// Mongo connection
import "./config/mongo.js";

// Swagger
import swaggerUi from 'swagger-ui-express'
import swaggerFile from './swagger_output.json'

// Routes
import loginRouter from "./routes/login.js";
import userRouter from "./routes/user.js";
import memberRouter from "./routes/member.js";
import roomRouter from "./routes/room.js";
import { decode } from './models/middleware.js';

// Misc


const app = express();

/** Get port from environment and store in Express. */
const port = "8080";
app.set("port", port);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/login", loginRouter);
app.use("/users", decode, userRouter);
app.use("/rooms", decode, roomRouter);
app.use("/members", decode, memberRouter);
app.use(express.static(path.join('./client')))

app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

/** catch 404 and forward to error handler */
app.use('*', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint doesnt exist'
  })
});

/** Create HTTP server. */
const server = http.createServer(app);
/** Listen on provided port, on all network interfaces. */
server.listen(port);
/** Event listener for HTTP server "listening" event. */
server.on("listening", () => {
  console.log(`Listening on port:: http://localhost:${port}/`)  
  console.log(`Swagger on port:: http://localhost:${port}/doc`)
});





// Socket.io initialize
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

var users = {}
var usernames = {}


// Fonction qui nous sert à faire les requêtes POST/GET
async function fetchRequest(url, type, body, token) {
  if (type != "GET") {
    const response = await fetch(url, {
      method: type,
      headers: { 'Content-Type': 'application/json' ,
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });
    try {
      const res = await response.json();
      return res;
    }
    catch (error) {
      console.log("Cant parse JSON")
    }
  }
  else {
    const response = await fetch(url, {
      method: type,
      headers: { 'Content-Type': 'application/json' ,
      'Authorization': 'Bearer ' + token
      },
    });
    const res = await response.json();
    return res;
  }
}

// update conversations when a conv is created
async function getSingleConversation(room, userId, token) {
  let url = "http://localhost:8080/rooms/messages/" + room._id + "/?limit=1";
  let message
  await fetchRequest(url, "GET", null, token).then(res => {
    message = res.result[0]
  })
  let conv = {};

  conv.id = message._id
  conv.type = message.type
  conv.tagIds = message.tagIds
  conv.message = message.type == -1 ? "<i>Message supprimé</i>" : message.message
  conv.roomId = room._id
  conv.createdAt = message.createdAt
  conv.userId = message.userId
  conv.nbNotifications = 1


  if (message.userId) conv.senderName = usernames[message.userId]
  else conv.senderName = "Bot"

  if (room.type == 'group') {
    conv.roomName = room.name
  }
  else {
    conv.roomName = usernames[message.userId]
  }
  return conv
}

// function to 'simulate' a conv when a bot sends a message (user kicked, ...)
function createBotConv(roomId, userId, text) {
  let message = {
    id : "0",
    type : "1",
    tagIds : {},
    message : text,
    roomId : roomId,
    userId : userId,
    name : usernames[userId],
    createdAt : new Date(),
  }
  return message
}


io.on('connection', async (socket) => {
  // Get the list of names of all users, by id
  let url = "http://localhost:8080/users";
  await fetchRequest(url, "GET", null, socket.token).then(res => {
    let listUsers = res.users;
    listUsers.forEach(user => {
      usernames[user._id] = user.name;
    })
  })
  //console.log(socket.handshake)
  users[socket.user._id] = socket.id;


  // A la connection, on récupère : 
  // - la liste des users (pour créer les rooms 1on1)
  // - la liste des clés des rooms (normalement déjà stockée sur le téléphone, mais pas ici)
  // - la list des conversations : C'est-à-dire le dernier message d'une room, avec l'utilisateur, la date, etc...

  url = "http://localhost:8080/users";
  fetchRequest(url, "GET", null, socket.token).then(res => {
    let listUsers = res.users;
    listUsers = listUsers.filter(item => item._id !== socket.user._id);
    socket.emit('response-list-user', listUsers);
  })




  url = "http://localhost:8080/rooms/userId/" + socket.user._id;
  await fetchRequest(url, "GET", null, socket.token).then(res => {
    let rooms = res.rooms
    let keys = {};
    rooms.forEach(function (item) {
      keys[item._id] = item.key;
    })
    socket.emit('set keys', keys)
  })

  

  socket.on('get all conversations', async () => {
    let url = "http://localhost:8080/users/lastMessage/" + socket.user._id;
    var res = await fetchRequest(url, "GET", null, socket.token);
    let messages = res.messages

    url = "http://localhost:8080/rooms/userId/" + socket.user._id;
    await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
      let rooms = res.rooms.map(({ createdAt, updatedAt, adminId, url, urlMaxDate, type, ...item }) => ({ groupType: type, ...item }));
      let listConversations = []

      // On joint les 2 array ensemble, pour savoir quel message appartient à quel room
      var joined = messages.reduce((arr, e) => {
        arr.push(Object.assign({}, e, rooms.find(a => a._id == e.roomId)))
        return arr;
      }, [])

      url = "http://localhost:8080/members/userId/" + socket.user._id;
      await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
        let members = res.members.map(({ roomId, numberNotifications }) => ({ roomId, numberNotifications }));
        joined = joined.reduce((arr, e) => {
          arr.push(Object.assign({}, e, members.find(a => a.roomId == e.roomId)))
          return arr;
        }, [])
      })

      for (const join of joined) {
        let conv = {};

        conv.id = join._id
        conv.type = join.type
        conv.tagIds = join.tagIds
        conv.message = join.type == -1 ? "<i>Message supprimé</i>" : join.message
        conv.roomId = join._id
        conv.createdAt = join.createdAt
        conv.userId = join.userId
        conv.nbNotifications = join.numberNotifications
        if (join.userId) conv.senderName = usernames[join.userId]
        else conv.senderName = "Bot"


        // Chooses name depending on the room's type.
        if (join.groupType == 'group') {
          conv.roomName = join.name
          listConversations.push(conv)
        }
        else {
          url = "http://localhost:8080/users/otherUser/" + conv.roomId + "/" + socket.user._id;
          await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
            conv.roomName = usernames[res.user._id]
            listConversations.push(conv)
          })
        }
      }
      socket.emit('set all conversations', listConversations);

    })
  })



  // when the user send a message
  socket.on('send message', async ({ message, messageURL, tagIds, parentId, type }) => {
    if (!socket.user.roomId) {
      console.log("User needs to be in a room to send a message.")
    }
    else {
      let url = "http://localhost:8080/rooms/sendMessage";
      let data = { message: message, userId: socket.user._id, roomId: socket.user.roomId, url: messageURL, tagIds: tagIds, parentId: parentId, type: type }
      await fetchRequest(url, "POST", data, socket.token).then(res => {
        var mes = res.message;
        // Sends a message, and a field for the name.
        mes.name = usernames[mes.userId]

        url = "http://localhost:8080/members/roomId/" + mes.roomId;
        fetchRequest(url, "GET", null, socket.token).then(res => {
          var result = res.members;
          result.forEach((element) => {
            socket.to(users[element.userId]).emit('receive message', { message: mes, user: socket.user })
          })
          socket.emit('receive message', { message: mes, user: socket.user })

        })
      })
    }
  });


  // user creates a group room
  socket.on('create group room', async (name) => {

    let url = "http://localhost:8080/rooms/initiateGroup";
    let data = { name: name, adminId: socket.user._id }
    await fetchRequest(url, "POST", data, socket.token).then(async(res) => {
      if (res.success) {
        var room = res.room;
        socket.user.roomId = room._id;

        socket.emit('add key', { key: room.key, id: room._id })
        socket.emit('enter group room', { name: room.name, roomId: room._id });

        // Add conv to creator of room
        let conv = await getSingleConversation(room, socket.user._id, socket.token)
        socket.emit('add conversation', conv)
      }
      else {
        console.log("Erreur lors de la création de room")
      }
    })
  });

  // User tries to join a group room via URL
  socket.on('join group room', async (roomURL) => {

    let url = "http://localhost:8080/rooms/join/" + roomURL;
    let data = { userId: socket.user._id }
    await fetchRequest(url, "POST", data, socket.token).then(async(res) => {
      if (!res.success) {
        console.log("Erreur pour rejoindre la room via URL");
      }
      else {
        let room = res.room;
        socket.user.roomId = room._id;

        socket.emit('add key', { key: room.key, id: room._id })
        socket.emit('enter group room', { name: room.name, roomId: room._id });
        
        let conv = await getSingleConversation(room, socket.user._id, socket.token)
        socket.emit('add conversation', conv)

        // Send tye bot message to everyone (since it's created within the request)
        let message = createBotConv(socket.user.roomId, socket.user._id, " a rejoint le groupe.");
        url = "http://localhost:8080/members/roomId/" + message.roomId;
        fetchRequest(url, "GET", null, socket.token).then(res => {
          var result = res.members;
          result.forEach((element) => {
            socket.to(users[element.userId]).emit('receive message', { message: message, user: socket.user })
          })
        })
      }
    })
  });

  socket.on('leave room', async (roomId) => {
    let url = "http://localhost:8080/rooms/leaveRoom";
    let data = { userId: socket.user._id, roomId: roomId }
    await fetchRequest(url, "DELETE", data, socket.token).then(res => {
      if (!res.success) console.log("Error on leaving room")
      socket.emit('has left room')
    })

    // Send tye bot message to everyone (since it's created within the request)
    let message = createBotConv(socket.user.roomId, socket.user._id, " a quitté le groupe.");
    url = "http://localhost:8080/members/roomId/" + message.roomId;
    fetchRequest(url, "GET", null, socket.token).then(res => {
      var result = res.members;
      result.forEach((element) => {
        socket.to(users[element.userId]).emit('receive message', { message: message, user: socket.user })
      })

    })
  })

  socket.on('open room', async (roomId) => {
    let url = "http://localhost:8080/rooms/" + roomId;
    await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
      let result = res.room;
      socket.user.roomId = roomId;

      url = "http://localhost:8080/members/" + roomId + "/" + socket.user._id;
      let tmp = await fetchRequest(url, "GET", null, socket.token);
      let member = tmp.member

      if (result.type === '1on1') {
        url = "http://localhost:8080/users/room/" + roomId;
        fetchRequest(url, "GET", null, socket.token).then(async (res) => {
          let users = res.users;
          let name = users[0]._id == socket.user._id ? usernames[users[1]._id] : usernames[users[0]._id] 
          socket.emit('enter 1to1 room', { roomId, userId: name });
          socket.emit('display notifications', (member.notifications));
        })
      }
      else {
        socket.emit('enter group room', { name: result.name, roomId: roomId });
        socket.emit('display notifications', (member.notifications));

      }
    })
  });

  socket.on('admin display', async () => {
    let url = "http://localhost:8080/rooms/admin/" + socket.user._id + "/" + socket.user.roomId;
    await fetchRequest(url, "GET", null, socket.token).then(res => {
      var result = res.success;
      // True if the user is indeed admin of the room
      socket.emit("admin display reply", { answer: result });
    })
  })

  socket.on('read conv', async(roomId) => {
    url = "http://localhost:8080/members/read";
    let data = { userId: socket.user._id, roomId: roomId }
    await fetchRequest(url, "PUT", data, socket.token);

    socket.emit('has read conv', roomId)
  })



  // User tries to join a 1to1 room
  socket.on('create 1to1 room', async (userId) => {

    let url = "http://localhost:8080/rooms/initiate1On1";
    let data = { creatorId: socket.user._id, invitedId: userId }
    await fetchRequest(url, "POST", data, socket.token).then(async (res) => {
      if (res.success) {
        var room = res.room;
        socket.user.roomId = room._id;
        let name = usernames[userId] 

        socket.emit('enter 1to1 room', { userId: name, roomId: socket.user.roomId });
   
        let conv = await getSingleConversation(room, socket.user._id, socket.token)
        conv.roomName = usernames[userId];
        
        socket.emit('add key', { key: room.key, id: room._id })
        socket.emit('add conversation', conv)
        // Add conv to the other user
        conv.roomName = usernames[socket.user._id]

        socket.to(users[userId]).emit('add key', { key: room.key, id: room._id })
        socket.to(users[userId]).emit('add conversation', conv)
      }
      else {
        console.log("1to1 room already exists.")
      }

    })

  });

  /**
   * socket to retrieve previous messages from a conversation
   */
  socket.on('get message', async ({ limit }) => {

    let url = "http://localhost:8080/rooms/messages/" + socket.user.roomId + "/?limit=" + limit * 4;
    await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
      var messages = res.result;
      messages.reverse();

      for (let i = 0; i < messages.length; i++) {
        messages[i].userId = messages[i].userId;
        messages[i].name = usernames[messages[i].userId];
          
        if(messages[i].type == "-1") {
          messages[i].message = "Message supprimé"
        }
      };

      socket.emit('print message', ({ messages }));
    })
  });

  socket.on("is user admin", async () => {
    let url = "http://localhost:8080/users/admin/" + socket.user._id + "/" + socket.user.roomId;
    await fetchRequest(url, "GET", null, socket.token).then(async (res) => {
      if (res.success) {
        socket.emit('is admin')
      }
    })
  })

  socket.on('create URL', async (date) => {
    let data = { roomId: socket.user.roomId, date: date };
    await fetchRequest("http://localhost:8080/rooms/generateURL", "PUT", data, socket.token).then(res => {

    
      socket.emit('get url', 'http://localhost:8080/join/?url=' + res.room.url)
    })
  });

  socket.on('change notifications', async (notification) => {
    let data = { roomId: socket.user.roomId, userId: socket.user._id, notification: notification };
    let url = "http://localhost:8080/members/updateNotification";
    fetchRequest(url, "PUT", data, socket.token);
  });

  socket.on('kick user', async (userId) => {
    let data = { roomId: socket.user.roomId, userId: userId, adminId: socket.user._id };
    let url = "http://localhost:8080/rooms/kickUser";
    await fetchRequest(url, "DELETE", data, socket.token).then(res => {
      if (!res.success) console.log("Error on kicking user")
      socket.to(users[userId]).emit('has left room');

      // Send tye bot message to everyone (since it's created within the request)
      let message = createBotConv(socket.user.roomId, userId, " a été exclu(e) du groupe.");
      url = "http://localhost:8080/members/roomId/" + message.roomId;
      fetchRequest(url, "GET", null, socket.token).then(res => {
        var result = res.members;
        result.forEach((element) => {
          socket.to(users[element.userId]).emit('receive message', { message: message, user: socket.user })
        })
        socket.emit('receive message', { message: message, user: socket.user })
      })
    })
  });

  socket.on('change group name', async (newName) => {
    let data = { roomId: socket.user.roomId, userId: socket.user._id, name: newName };
    let url = "http://localhost:8080/rooms/modifyName";
    await fetchRequest(url, "PUT", data, socket.token).then(async (res) => {
      let room = res.room;

      url = "http://localhost:8080/members/roomId/" + socket.user.roomId;
      fetchRequest(url, "GET", null, socket.token).then(res => {
        var result = res.members;
        result.forEach((element) => {
          socket.to(users[element.userId]).emit('update room name', room)
          socket.emit('update room name', room)
        })

      })
    });
  });

  socket.on('delete message', async (messageId) => {
    let data = { messageId: messageId, userId: socket.user._id };
    let url = "http://localhost:8080/rooms/deleteMessage";
    await fetchRequest(url, "PUT", data, socket.token);

    url = "http://localhost:8080/members/roomId/" + socket.user.roomId;
    fetchRequest(url, "GET", null, socket.token).then(res => {
      var result = res.members;
      result.forEach((element) => {
        socket.to(users[element.userId]).emit('hide message', ({messageId, roomId : socket.user.roomId}))
        socket.emit('hide message', ({messageId, roomId : socket.user.roomId}))
      })

    })
  })

  socket.on('get members in room', async () => {
    let roomId = socket.user.roomId;
    let url = "http://localhost:8080/members/roomId/" + roomId;
    await fetchRequest(url, "GET", null, socket.token).then(res => {
      let memberList = []
      for(const member of res.members) 
      {
        member.name = usernames[member.userId]
        memberList.push(member)
      }
      socket.emit('display members in room', memberList);
    })
  })

   // When user disconnects
   socket.on('disconnect', async (data) => {
    delete users[socket.user._id]
    let name = usernames[socket.user._id]
    console.log(name + ' disconnected')
  });
})



io.use(async (socket, next) => {
  if(socket.handshake.auth.id && socket.handshake.auth.token)
  {
    let url = "http://localhost:8080/login/" + socket.handshake.auth.id + "/" + socket.handshake.auth.token;
    await fetchRequest(url, "GET", null, socket.token).then(res => {
      if(res.success)
      {
        var user = res.user;
        user.roomId = undefined;
        socket.user = user;
        socket.token = res.authorization
        next()
      }
      else console.log("Erreur dans le login : ", res.message)
    })
  }
});

