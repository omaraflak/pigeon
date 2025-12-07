import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Join() {
    const [searchParams] = useSearchParams();
    const [name, setName] = useState('');
    const [room, setRoom] = useState(searchParams.get('room') || '');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (name.trim() && room.trim()) {
            navigate(`/room/${room}?user=${name}`);
        }
    };

    return (
        <div className="glass-card">
            <h1 className="title">Peer-to-Peer File Sharing</h1>
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
                    onChange={(e) => setRoom(e.target.value.toLowerCase())}
                    required
                />
                <button type="submit">Join Room</button>
            </form>
        </div>
    );
}
