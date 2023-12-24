const express = require('express');
const app = express();

const http = require("http");
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000","http://172.17.200.185:3000"]
  }
});

const port = 5000;

//接続テスト
// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });

const rooms = {}
/*配列の形状
{
  roomID1: [
    {id:"123",name:"user1",hand:"rock"},
    {id:"234",name:"user1",hand:"paper"}
  ]
}
*/
//usreの入場処理
const joinRoom = (roomID,userName,userID) =>{
  if(rooms[roomID] && rooms[roomID].some(user => user.id === userID)){
    //すでにルームにいる場合何もしない
    return 0
  }else if(rooms[roomID] && rooms[roomID].length >= 2){
    //ルームに2人以上いた場合エラーハンドリング
    return -1
  }else if(!rooms[roomID]){
    //ルームが存在しない場合,新たにルームを作成

    rooms[roomID] = [];
    rooms[roomID].push({id:userID,name:userName});

    return 1
  }else if(rooms[roomID] && !rooms[roomID].some(user => user.id === userID)){
    //ルームに1人だった時かつ自分じゃない場合入る
    rooms[roomID].push({id:userID,name:userName});
    return 1
  }
  return true
} 

function judge(user1, user2) {
  if (user1 === user2) {
      return "draw";
  }

  if ((user1 === "rock" && user2 === "scissors") ||
      (user1 === "scissors" && user2 === "paper") ||
      (user1 === "paper" && user2 === "rock")) {
      return "0";
  } else {
      return "1";
  }
}

const handInput = (room,hand,userID) =>{
  // console.log(room)
  // console.log(hand)
  // console.log(userID)
  if (rooms[room]) {
    const user = rooms[room].find(user => user.id === userID);
    if (user) {
      user.hand = hand;
    }
    if (rooms[room][0].hand !== undefined && rooms[room][1].hand !== undefined) {
      //console.log(judge(rooms[room][0].hand,rooms[room][1].hand));
      
      const fuga = judge(rooms[room][0].hand,rooms[room][1].hand)
      
      if(fuga === "draw"){
        delete rooms[room][0].hand
        delete rooms[room][1].hand
        
        return fuga
      }else{
        return rooms[room][fuga].id
      }

    }
  }
  return "input"
}

//userの退室処理
const disconnect = (userID) => {
  Object.keys(rooms).forEach(roomID => {
    // ユーザーIDに一致するユーザーを検索
    const userIndex = rooms[roomID].findIndex(user => user.id === userID);

    if (userIndex !== -1) {
      // ユーザーをルームから削除
      rooms[roomID].splice(userIndex, 1);

      // ルームの参加者が0人になった場合はルームも削除
      if (rooms[roomID].length === 0) {
        delete rooms[roomID];
      }

      //console.log(`User ${userID} has been removed from room ${roomID}`);
    }
  });

  //console.log('Updated rooms:', rooms);
};


// Socket.IOのイベントハンドリング
io.on('connection', (socket) => {
  console.log('a user connected');
  
  //socket.emit('userid', socket.id);


  
  // ルームへの参加
  socket.on('joinRoom', userdata => {
    socket.emit('userid', socket.id);
    if(joinRoom(userdata.room, userdata.name ,socket.id) === 1){
      socket.join(userdata.room);
      io.to(userdata.room).emit('roomer', rooms[userdata.room])
      console.log(rooms)
    }else if(joinRoom(userdata.room, userdata.name ,socket.id) === 0){

    }else{
      //入れない場合の処理
      io.to(socket.id).emit('roomError', '');
    }
    //
  });

  socket.on('pon',pon=>{
    //console.log(pon)
    //console.log(handInput(pon.room,pon.hand,socket.id))
    
    const fuga = handInput(pon.room,pon.hand,socket.id)

    if(fuga === "input") {
      return
    }else{
      io.to(pon.room).emit('winner', fuga)
    }


  })
  
  socket.on('disconnect', () => {
    disconnect(socket.id)
    console.log(`Client ${socket.id} disconnected`);
  });

  // // ルームからの離脱
  // socket.on('leave room', () => {
  //   console.log(`Client ${socket.id} disconnected`);
  // });

  socket.recovered
});

// ExpressとSocket.IOの両方で同じポートをリスニング
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});