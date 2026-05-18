const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // מאפשר לאתר שלך ב-GitHub Pages להתחבר ללא חסימת אבטחה
});

// התחברות ל-HiveMQ Cloud (כאן הסיסמאות מוגנות כי זה רץ בשרת)
const mqttClient = mqtt.connect('mqtts://0852feda51774f119a43581a3c72b6b9.s1.eu.hivemq.cloud:8883', {
  username: 'avihai',
  password: 'Love5683',
  clientId: 'NodeServer_' + Math.random().toString(16).substring(2, 8)
});

// שמירת המצב האחרון כדי שמי שפותח את האפליקציה יראה מיד את הקומה
let lastLeft = "--";
let lastRight = "--";
let viewers = 0;

mqttClient.on('connect', () => {
  console.log('Connected to HiveMQ Cloud');
  mqttClient.subscribe('building/elevator/left');
  mqttClient.subscribe('building/elevator/right');
});

// קבלת עדכון מ-HiveMQ והפצתו לכל הדפדפנים המחוברים
mqttClient.on('message', (topic, message) => {
  const payload = message.toString();
  if (topic.includes('left')) {
    lastLeft = payload;
    io.emit('elevator_update', { side: 'left', floor: payload });
  } else if (topic.includes('right')) {
    lastRight = payload;
    io.emit('elevator_update', { side: 'right', floor: payload });
  }
});

// ניהול דיירים שמתחברים דרך הדפדפן
io.on('connection', (socket) => {
  viewers++;
  io.emit('viewers_count', viewers); // שידור מספר הצופים המעודכן לכולם
  
  // שליחת המצב העדכני מיד עם ההתחברות
  socket.emit('elevator_update', { side: 'left', floor: lastLeft });
  socket.emit('elevator_update', { side: 'right', floor: lastRight });

  socket.on('disconnect', () => {
    viewers--;
    io.emit('viewers_count', viewers);
  });
});

app.get('/ping', (req, res) => res.send('Server is running!'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});