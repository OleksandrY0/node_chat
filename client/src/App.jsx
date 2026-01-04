import { useEffect, useState } from "react";
import "./App.css";
import { MessageForm } from "./MessageForm.jsx";
import { MessageList } from "./MessageList.jsx";
import axios from "axios";

const API = "http://localhost:3005";

export function App() {
  const [rooms, setRooms] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [deletedRoom, setDeletedRoom] = useState(null);

  // Завантажуємо список кімнат
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API}/rooms`);
      setRooms(res.data);

      if (!currentRoomId && res.data.length > 0) {
        setCurrentRoomId(res.data[0].id); // вибираємо першу кімнату
      }
    } catch (e) {
      console.error("Failed to fetch rooms:", e);
    }
  };

  // Завантажуємо повідомлення для обраної кімнати
  const fetchMessages = async (roomId) => {
    try {
      const res = await axios.get(`${API}/rooms/${roomId}/messages`);
      setMessages(res.data.reverse());
    } catch (e) {
      console.error("Failed to fetch messages:", e);
      setMessages([]);
    }
  };

  const saveMessage = (msg) => {
    setMessages((prev) => [msg, ...prev]);
  };

  // SSE для поточної кімнати
  useEffect(() => {
    if (!currentRoomId) return;

    const eventSource = new EventSource(`${API}/events?roomId=${currentRoomId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-message") {
        saveMessage(data.payload);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [currentRoomId]);

  // Завантажуємо кімнати при старті
  useEffect(() => {
    fetchRooms();
  }, []);

  // Завантажуємо повідомлення при зміні кімнати
  useEffect(() => {
    if (currentRoomId) {
      fetchMessages(currentRoomId);
      setDeletedRoom(null);
    }
  }, [currentRoomId]);

  // Створення кімнати
  const createRoom = async () => {
    if (!newRoomName) return;
    try {
      const res = await axios.post(`${API}/rooms`, { name: newRoomName });
      setCurrentRoomId(res.data.id);
      setNewRoomName("");
      fetchRooms();
    } catch (e) {
      alert("Failed to create room");
    }
  };

  // Видалення кімнати
  const deleteRoom = async (id) => {
    try {
      await axios.delete(`${API}/rooms/${id}`);
      if (currentRoomId === id) setCurrentRoomId(null);
      setDeletedRoom(id);
      fetchRooms();
    } catch (e) {
      console.error("Failed to delete room:", e);
    }
  };

  // Перейменування кімнати
  const renameRoom = async (id, oldName) => {
    const newName = prompt("Enter new room name", oldName);
    if (!newName || newName === oldName) return;

    try {
      await axios.patch(`${API}/rooms/${id}`, { name: newName });
      fetchRooms();
    } catch (e) {
      alert("Failed to rename room");
    }
  };

  return (
    <section className="section">
      <div className="container">
        <h2 className="title is-4">Rooms</h2>

        {rooms.length === 0 ? (
          <p className="notification is-warning is-light">
            No rooms yet. Create one below 👇
          </p>
        ) : (
          <ul className="box">
            {rooms.map((room) => (
              <li key={room.id} className="level is-mobile">
                <div className="level-left">
                  <button
                    className={`button is-small mr-2 ${
                      room.id === currentRoomId ? "is-link is-light" : "is-light"
                    }`}
                    onClick={() => {
                      setDeletedRoom(null);
                      setCurrentRoomId(room.id);
                    }}
                  >
                    {room.name}
                  </button>
                </div>
                <div className="level-right">
                  <button
                    className="button is-small is-info mr-2"
                    onClick={() => renameRoom(room.id, room.name)}
                  >
                    Rename
                  </button>
                  <button
                    className="button is-small is-danger"
                    onClick={() => deleteRoom(room.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="field has-addons mt-4">
          <div className="control is-expanded">
            <input
              className="input"
              type="text"
              placeholder="New room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
          </div>
          <div className="control">
            <button className="button is-primary" onClick={createRoom}>
              Create Room
            </button>
          </div>
        </div>

        {deletedRoom && (
          <div className="notification is-danger is-light mt-4">
            Room deleted. Pick another room or create a new one.
          </div>
        )}

        {currentRoomId && (
          <>
            <h1 className="title mt-6">Chat: {rooms.find(r => r.id === currentRoomId)?.name}</h1>

            <MessageForm roomId={currentRoomId} />

            <MessageList messages={messages} />
          </>
        )}
      </div>
    </section>
  );
}
