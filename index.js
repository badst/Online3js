const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 8080;
let users = [];
var MY_USERNAME;
app.use(express.static(path.join(__dirname, 'public')));
app.get("/", (req, res) => {
  if(req.header("X-Replit-User-Name")){
    MY_USERNAME = req.header("X-Replit-User-Name")
    res.redirect('/index.html')
  }
  else{
    res.sendFile(__dirname + "/views/login.html")
  }
})
server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
app.get("/index.html",(req,res)=>{
  if(users.includes(MY_USERNAME)){
    res.sendFile(__dirname+"/views/nope.html")
  }
  else{
    res.sendFile(__dirname+"/views/index.html")
  }
})
io.on("connection", socket => {
    console.log(`${MY_USERNAME} connected`)
    if (users.length > 0) {
        socket.emit('render_current_players', {
            ids: users,
        })
    }
    socket.emit("assign_info", {
        id: MY_USERNAME
    })
    users.push(MY_USERNAME);
    socket.broadcast.emit("player_connection", {
        ids: users,
        id: MY_USERNAME
    })
    socket.on("send_position", data => {
        socket.broadcast.emit("update_positions", {
            x: data.x,
            y: data.y,
            rotX: data.rotX,
            rotY: data.rotY,
            id: MY_USERNAME
        });
    })
    socket.on("send_damage", data => {
        io.to(data.idTo).emit("damage_player", {
            idFrom: data.idFrom
        });
    })
    socket.on("disconnect", () => {
        console.log(`${MY_USERNAME} left`)
        if (users.length === 1) {
            users = []
            console.log("Server is empty.")
        } else {
            users = users.splice(MY_USERNAME, 1)
            socket.broadcast.emit("remove_player", {
                id: MY_USERNAME,
                ids: users
            })
        }
    })
})