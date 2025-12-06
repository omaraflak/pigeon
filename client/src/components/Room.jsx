import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

export default function Room() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const name = location.state?.name || sessionStorage.getItem('username');

    const { users, transfers, sendFile } = useWebRTC(roomId, name);
    const [isHere, setIsHere] = useState(false);

    useEffect(() => {
        if (!name) {
            navigate('/');
        } else {
            setIsHere(true);
        }
    }, [name, navigate]);

    /* Create a ref for the file input */
    const fileInputRef = useRef(null);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            sendFile(file);
        }
    }, [sendFile]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleZoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            sendFile(e.target.files[0]);
        }
    };

    if (!isHere) return null;

    return (
        <div className="glass-card" style={{ maxWidth: '1000px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Room: <span style={{ color: 'var(--accent-color)' }}>{roomId}</span></h2>
                <span className="badge">{name} (You)</span>
            </div>

            <div className="room-grid">
                {/* Left Column: Peers */}
                <div className="peers-panel">
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Peers ({users.length - 1})</h3>

                    <div className="peers-list" style={{ marginTop: '1rem' }}>
                        {users.filter(u => u.name !== name).map(user => (
                            <div key={user.id} className="peer-item" style={{
                                padding: '0.8rem',
                                marginBottom: '0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    width: '10px', height: '10px',
                                    borderRadius: '50%', background: '#00ecbc',
                                    marginRight: '10px'
                                }}></div>
                                {user.name}
                            </div>
                        ))}

                        {users.length <= 1 && (
                            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '1rem' }}>
                                Waiting for others to join...
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: File Transfer */}
                <div className="transfer-panel">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <div
                        className="dropzone"
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onClick={handleZoneClick}
                        style={{
                            border: '2px dashed var(--glass-border)',
                            borderRadius: '12px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: '2rem',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📂</div>
                        <p>Drag & Drop files here or <span style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Click to Browse</span></p>
                    </div>
                    <h3>Transfers</h3>
                    <div className="transfers-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {Object.entries(transfers).map(([id, transfer]) => (
                            <div key={id} className="transfer-item" style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '0.8rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {transfer.type === 'upload' ? '⬆️' : '⬇️'} {transfer.fileName}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        {transfer.peerName}
                                    </span>
                                </div>

                                <div className="progress-bar" style={{
                                    width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${transfer.progress}%`,
                                        height: '100%',
                                        background: transfer.type === 'upload' ? 'var(--accent-color)' : '#4facfe',
                                        transition: 'width 0.2s'
                                    }}></div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.8rem' }}>
                                    <span>{transfer.progress}%</span>
                                    {transfer.url ? (
                                        <a
                                            href={transfer.url}
                                            download={transfer.fileName}
                                            className="download-btn"
                                            style={{
                                                color: 'var(--bg-color)',
                                                textDecoration: 'none',
                                                background: 'var(--accent-color)',
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                display: 'inline-block'
                                            }}
                                        >
                                            Save to Disk
                                        </a>
                                    ) : (
                                        <span>{transfer.type === 'upload' ? 'Uploading...' : 'Downloading...'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {Object.keys(transfers).length === 0 && (
                            <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No active transfers</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
