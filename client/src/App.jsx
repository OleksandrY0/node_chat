import { useEffect, useState } from "react";
import "./App.css";
import { MessageForm } from "./components/MessageForm.jsx";
import { MessageList } from "./components/MessageList.jsx";
import axios from "axios";

export const API = "http://localhost:3005";

export function App() {
  const [authorName, setAuthorName] = useState(localStorage.getItem("authorName") || "");
  const [localName, setLocalName] = useState(localStorage.getItem("authorName") || "");
  const [roomName, setRoomName] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);

  // Завантаження всіх кімнат при старті
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API}/rooms`);
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
        setRooms([]);
      }
    };
    fetchRooms();
  }, []);

  const saveAuthorName = () => {
    if (!localName) return;
    localStorage.setItem("authorName", localName);
    setAuthorName(localName);
  };

  const joinOrCreateRoom = async () => {
    if (!roomName) return;

    const existingRoom = rooms.find((r) => r.name === roomName);
    let roomId;

    if (existingRoom) {
      roomId = existingRoom.id;
    } else {
      try {
        const res = await axios.post(`${API}/rooms`, { name: roomName });
        roomId = res.data.id;
        setRooms((prev) => [...prev, res.data]);
      } catch (err) {
        console.error("Failed to create room:", err);
        alert("Failed to create room");
        return;
      }
    }

    setCurrentRoomId(roomId);
    setRoomName("");

    // Завантажуємо історію повідомлень для цієї кімнати
    try {
      const res = await axios.get(`${API}/rooms/${roomId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setMessages([]);
    }
  };

  // SSE для нових повідомлень
  useEffect(() => {
    if (!currentRoomId) return;

    const eventSource = new EventSource(`${API}/events?roomId=${currentRoomId}`);

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "new-message") {
        setMessages((prev) => [...prev, parsed.payload]); // додаємо нове повідомлення в кінець
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [currentRoomId]);

  return (
    <section className="section content">
      {!authorName && (
        <section className="section name">
          <input
            className="input"
            placeholder="Enter your name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
          />
          <button className="button" onClick={saveAuthorName}>
            Save
          </button>
        </section>
      )}

      {authorName && !currentRoomId && (
        <section className="section room">
          <input
            className="input"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button className="button" onClick={joinOrCreateRoom}>
            Join / Create room
          </button>

          {rooms.length > 0 && (
            <div className="room-list">
              <p>Existing rooms:</p>
              <ul>
                {rooms.map((r) => (
                  <li
                    key={r.id}
                    style={{ cursor: "pointer", color: "blue" }}
                    onClick={() => setRoomName(r.name)}
                  >
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {authorName && currentRoomId && (
        <>
          <h1 className="title">Chat: {rooms.find((r) => r.id === currentRoomId)?.name}</h1>
          <MessageForm authorName={authorName} roomId={currentRoomId} />
          <MessageList messages={messages} />
        </>
      )}
    </section>
  );
}
