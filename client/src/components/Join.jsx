import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Join() {
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (name.trim() && room.trim()) {
            // Pass name via state or query param, or store in context. 
            // For simplicity, we'll suggest passing it via query param or simple navigation
            // But URL might look cleaner if we just store it in local storage or pass in state.
            // Let's pass it in navigation state.
            navigate(`/user/${name}/room/${room}`);
        }
    };

    return (
        <div className="glass-card">
            <h1 className="title">Filesharing P2P</h1>
            <form onSubmit={handleJoin}>
                <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Room Code"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    required
                />
                <button type="submit">Join Room</button>
            </form>
        </div>
    );
}
