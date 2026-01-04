import { sendEvent } from '../index.js';
import { messageService } from '../services/messages.service.js';

const getAllByRoom = async (req, res) => {
  const { id } = req.params;

  const messages = await messageService.getAllByRoom(id);
  if (messages === null) return res.sendStatus(404);

  res.json(messages);
};

const create = async (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  if (!author || !text) return res.sendStatus(400);

  const message = await messageService.create(id, { author, text });
  if (!message) return res.sendStatus(404);

  // Відправка події всім SSE клієнтам
  sendEvent({ type: 'new-message', payload: message });

  res.status(201).json(message);
};

const removeAllByRoom = async (req, res) => {
  const { id } = req.params;

  const room = await messageService.removeAllByRoom(id);
  if (!room) return res.sendStatus(404);

  res.sendStatus(204);
};

export const messageController = {
  getAllByRoom,
  create,
  removeAllByRoom,
};
