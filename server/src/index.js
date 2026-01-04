'use strict';

import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { roomsRouter } from './routes/rooms.route.js';
import { messagesRouter } from './routes/messages.route.js';

let clients = [];

export const sendEvent = (data) => {
  clients
    .filter(client => client.roomId === data.roomId) // тільки ті, хто у цій кімнаті
    .forEach(client => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
};

const PORT = process.env.PORT || 3005;

const app = express();

app.use(cors());
app.use(express.json());

app.use(roomsRouter);
app.use(messagesRouter);

app.get('/events', (req, res) => {
  const roomId = req.query.roomId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res, roomId };

  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
