import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

export default function Room() {
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const name = searchParams.get('user');
    const [copied, setCopied] = useState(false);

    const { users, transfers, sendFile } = useWebRTC(roomId, name);

    useEffect(() => {
        if (!name) {
            navigate('/');
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

    if (!name) return null;

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Room:</span>
                    <span style={{ color: 'var(--accent-color)', fontSize: '1rem', lineHeight: 1 }}>{roomId}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('user');
                            navigator.clipboard.writeText(url.toString());
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1000);
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            background: copied ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: copied ? '#000' : 'var(--text-primary)',
                            transition: 'all 0.3s ease',
                            transform: copied ? 'scale(1.05)' : 'scale(1)',
                            fontWeight: copied ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        {copied ? '✅' : '🔗'}<span></span>{copied ? 'Copied!' : 'Share Link'}
                    </button>
                </div>
            </div>

            <div className="room-grid">
                <div className="peers-panel">
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Peers ({users.length})</h3>

                    <div className="peers-list" style={{ marginTop: '1rem' }}>
                        {users.map(user => (
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
                                {name == user.name ? user.name + ' (You)' : user.name}
                            </div>
                        ))}
                    </div>
                </div>

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
                                        {transfer.type === 'upload' ? `To: ${transfer.peerName}` : `From: ${transfer.peerName}`}
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
                                    {transfer.status === 'Completed' && transfer.type === 'upload' ? (
                                        <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Uploaded!</span>
                                    ) : transfer.url ? (
                                        <a
                                            href={transfer.url}
                                            download={transfer.fileName}
                                            className="download-btn"
                                            style={{
                                                color: 'var(--accent-color)',
                                                textDecoration: 'underline',
                                                background: 'transparent',
                                                padding: '4px 0',
                                                fontWeight: 'bold',
                                                display: 'inline-block',
                                                cursor: 'pointer'
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
