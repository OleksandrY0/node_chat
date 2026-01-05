import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import { MessageForm } from "./components/MessageForm.jsx";
import { MessageList } from "./components/MessageList.jsx";

export const API = "http://localhost:3005";

export function App() {
  // ---------------------------
  // State variables
  // ---------------------------
  const [authorName, setAuthorName] = useState(
    localStorage.getItem("authorName") || ""
  ); // Current user name
  const [localName, setLocalName] = useState(
    localStorage.getItem("authorName") || ""
  ); // Temporary input before saving
  const [roomName, setRoomName] = useState(""); // Input for joining/creating a room
  const [currentRoomId, setCurrentRoomId] = useState(""); // Active room ID
  const [rooms, setRooms] = useState([]); // List of rooms
  const [messages, setMessages] = useState([]); // Messages in current room

  // ---------------------------
  // Fetch all rooms on startup
  // ---------------------------
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API}/rooms`);
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
    fetchRooms();
  }, []);

  // ---------------------------
  // Save author name
  // ---------------------------
  const saveAuthorName = () => {
    if (!localName) return;
    localStorage.setItem("authorName", localName);
    setAuthorName(localName);
  };

  // ---------------------------
  // Join an existing room or create a new one
  // ---------------------------
  const joinOrCreateRoom = async () => {
    if (!roomName) return;

    // Check if room already exists
    const existingRoom = rooms.find((r) => r.name === roomName);
    if (existingRoom) {
      setCurrentRoomId(existingRoom.id);
      setRoomName("");
      return;
    }

    // Create new room
    try {
      const res = await axios.post(`${API}/rooms`, { name: roomName });
      setCurrentRoomId(res.data.id);
      setRooms((prev) => [...prev, res.data]);
      setRoomName("");
    } catch (err) {
      console.error("Failed to create room:", err);
      alert("Failed to create room");
    }
  };

  // ---------------------------
  // Fetch initial messages for the current room
  // ---------------------------
  useEffect(() => {
    if (!currentRoomId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API}/rooms/${currentRoomId}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [currentRoomId]);

  // ---------------------------
  // SSE: listen for new messages in real-time
  // ---------------------------
  useEffect(() => {
    if (!currentRoomId) return;

    const eventSource = new EventSource(`${API}/events?roomId=${currentRoomId}`);

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "new-message") {
        setMessages((prev) => [...prev, parsed.payload]);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [currentRoomId]);

  return (
    <section className="section content">
      {/* ---------------------------
          Author Name Input
          --------------------------- */}
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

      {/* ---------------------------
          Join or Create Room
          --------------------------- */}
      {authorName && !currentRoomId && (
        <section className="section room">
          <input
            className="input"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button className="button" onClick={joinOrCreateRoom}>
            Join / Create Room
          </button>

          {/* List of existing rooms */}
          {rooms.length > 0 && (
            <div className="room-list">
              <p>Existing rooms:</p>
              <ul>
                {rooms.map((r) => (
                  <li
                    key={r.id}
                    style={{ display: "flex", gap: "8px", alignItems: "center" }}
                  >
                    {/* Click to join room */}
                    <span
                      style={{ cursor: "pointer", color: "blue" }}
                      onClick={() => setCurrentRoomId(r.id)}
                    >
                      {r.name}
                    </span>

                    {/* Rename room */}
                    <button
                      onClick={async () => {
                        const newName = prompt("Enter new room name", r.name);
                        if (!newName) return;
                        try {
                          const res = await axios.patch(`${API}/rooms/${r.id}`, { name: newName });
                          setRooms((prev) =>
                            prev.map((room) => (room.id === r.id ? res.data : room))
                          );
                        } catch (err) {
                          console.error("Failed to rename room:", err);
                        }
                      }}
                    >
                      Rename
                    </button>

                    {/* Delete room */}
                    <button
                      onClick={async () => {
                        // eslint-disable-next-line no-restricted-globals
                        if (!confirm("Delete this room?")) return;
                        try {
                          await axios.delete(`${API}/rooms/${r.id}`);
                          setRooms((prev) => prev.filter((room) => room.id !== r.id));
                          if (currentRoomId === r.id) setCurrentRoomId("");
                        } catch (err) {
                          console.error("Failed to delete room:", err);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------
          Chat Section
          --------------------------- */}
      {authorName && currentRoomId && (
        <>
          <h1 className="title">
            Chat: {rooms.find((r) => r.id === currentRoomId)?.name || "Unknown"}
          </h1>
          <MessageForm authorName={authorName} roomId={currentRoomId} />
          <MessageList messages={messages} />
        </>
      )}
    </section>
  );
}
