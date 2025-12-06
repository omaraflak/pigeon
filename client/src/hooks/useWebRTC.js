import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';


const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const CHUNK_SIZE = 16 * 1024; // 16KB

export function useWebRTC(roomId, name) {
    const [users, setUsers] = useState([]); // List of users in room
    const usersRef = useRef([]); // Ref to access users in callbacks
    const [transfers, setTransfers] = useState({}); // { [fileId]: { type: 'upload'|'download', progress, fileName, peerName } }

    const socketRef = useRef();
    const peersRef = useRef({}); // { [socketId]: RTCPeerConnection }
    const dataChannelsRef = useRef({}); // { [socketId]: RTCDataChannel }
    const myIdRef = useRef();
    const filesRef = useRef({}); // Receiving files buffer: { [fileId]: { chunks: [], metadata: {} } }

    const updateTransfer = (id, data) => {
        setTransfers(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
    };

    const handleDataMessage = useCallback((e, senderId) => {
        const data = e.data;
        if (typeof data === 'string') {
            const metadata = JSON.parse(data);
            if (metadata.type === 'start') {
                filesRef.current[metadata.fileId] = {
                    metadata,
                    chunks: [],
                    received: 0
                };
                const peerNode = usersRef.current.find(u => u.id === senderId);
                const peerName = peerNode ? peerNode.name : 'Peer ' + senderId.substr(0, 4);

                updateTransfer(metadata.fileId, {
                    type: 'download',
                    fileName: metadata.fileName,
                    peerName: peerName,
                    progress: 0
                });
            } else if (metadata.type === 'end') {
                // Reassemble
                const fileData = filesRef.current[metadata.fileId];
                if (fileData) {
                    console.log('File Transfer Complete. Reassembling...', {
                        fileId: metadata.fileId,
                        chunksCount: fileData.chunks.length,
                        totalReceived: fileData.received,
                        expectedSize: fileData.metadata.size,
                        mimeType: fileData.metadata.fileType
                    });

                    const blob = new Blob(fileData.chunks, { type: fileData.metadata.fileType || 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);

                    console.log('Blob created:', { size: blob.size, url });

                    updateTransfer(metadata.fileId, { progress: 100, url, status: 'Completed' });
                    delete filesRef.current[metadata.fileId]; // Keep metadata/url in transfers state, remove buffer
                } else {
                    console.warn('Received END for unknown file:', metadata.fileId);
                }
            }
        } else {
            // Chunk
            const activeFileId = Object.keys(filesRef.current).find(id => filesRef.current[id].chunks);

            if (activeFileId) {
                const fileInfo = filesRef.current[activeFileId];
                fileInfo.chunks.push(data);

                const chunkSize = data.byteLength || data.size || 0;
                fileInfo.received += chunkSize;


                const progress = Math.round((fileInfo.received / fileInfo.metadata.size) * 100);
                updateTransfer(activeFileId, { progress });
            } else {
                console.warn('Received BINARY chunk but no active file transfer found.', data);
            }
        }
    }, []);

    const setupDataChannel = useCallback((dc, remotePeerId) => {
        dc.binaryType = 'arraybuffer'; // Handle as ArrayBuffer explicitly
        dataChannelsRef.current[remotePeerId] = dc;
        dc.onopen = () => console.log(`Data Channel Open with ${remotePeerId}`);
        dc.onmessage = (e) => handleDataMessage(e, remotePeerId);
    }, [handleDataMessage]);

    const createPeer = useCallback((targetId, socket) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);
        peersRef.current[targetId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { target: targetId, candidate: event.candidate });
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel, targetId);
        };

        // If I am supposed to offer
        if (myIdRef.current < targetId) {
            const dc = pc.createDataChannel("file-transfer");
            setupDataChannel(dc, targetId);

            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socket.emit('offer', { target: targetId, offer });
            });
        }

        return pc;
    }, [setupDataChannel]);

    useEffect(() => {
        // Initialize Socket

        const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3000`;

        socketRef.current = io(serverUrl);

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server', socket.id);
            myIdRef.current = socket.id;
            socket.emit('join-room', { room: roomId, name });
        });

        socket.on('room-users', (userList) => {
            console.log('Room users updated:', userList);
            setUsers(userList);
            usersRef.current = userList;

            // Manage connections
            userList.forEach(user => {
                if (user.id === myIdRef.current) return;
                if (!peersRef.current[user.id]) {
                    createPeer(user.id, socket);
                }
            });

            // Cleanup disconnected peers
            const activeIds = new Set(userList.map(u => u.id));
            Object.keys(peersRef.current).forEach(id => {
                if (!activeIds.has(id)) {
                    console.log('Removing peer', id);
                    if (peersRef.current[id]) peersRef.current[id].close();
                    delete peersRef.current[id];
                    delete dataChannelsRef.current[id];
                }
            });
        });

        socket.on('offer', async ({ sender, offer }) => {
            const pc = peersRef.current[sender];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', { target: sender, answer });
            } else {
                // Should not happen if room-users fired first, but possible if race.
                // If we receive offer from unknown, create pc?
                // Yes, likely we missed room-users update or it's coming.
                const newPc = createPeer(sender, socket, false); // false = don't initiate
                await newPc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await newPc.createAnswer();
                await newPc.setLocalDescription(answer);
                socket.emit('answer', { target: sender, answer });
            }
        });

        socket.on('answer', async ({ sender, answer }) => {
            const pc = peersRef.current[sender];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('ice-candidate', async ({ sender, candidate }) => {
            const pc = peersRef.current[sender];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        return () => {
            socket.disconnect();
            const peers = peersRef.current; // Copy ref for cleanup
            Object.values(peers).forEach(pc => pc.close());
        };
    }, [roomId, name, createPeer]);



    const sendFile = (file) => {
        const fileId = Math.random().toString(36).substr(2, 9);
        const metadata = {
            type: 'start',
            fileId,
            fileName: file.name,
            fileType: file.type,
            size: file.size
        };

        // Broadcast to all connected data channels
        Object.entries(dataChannelsRef.current).forEach(([peerId, dc]) => {
            if (dc.readyState === 'open') {
                updateTransfer(fileId + peerId, { // Unique transfer ID per peer
                    type: 'upload',
                    fileName: file.name,
                    peerName: 'Peer ' + peerId.substr(0, 4),
                    progress: 0
                });

                dc.send(JSON.stringify(metadata));

                // Check bufferedAmount to avoid overwhelming the channel
                const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB

                const reader = new FileReader();
                let offset = 0;

                reader.onload = (e) => {
                    // If the buffer is full, wait a bit
                    if (dc.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                        // Wait for buffer to drain
                        const interval = setInterval(() => {
                            if (dc.bufferedAmount < MAX_BUFFERED_AMOUNT) {
                                clearInterval(interval);
                                sendChunk(e.target.result);
                            }
                        }, 10);
                    } else {
                        sendChunk(e.target.result);
                    }
                };

                const sendChunk = (data) => {
                    dc.send(data);
                    offset += data.byteLength;

                    updateTransfer(fileId + peerId, {
                        progress: Math.round((offset / file.size) * 100)
                    });

                    if (offset < file.size) {
                        readSlice(offset);
                    } else {
                        updateTransfer(fileId + peerId, { progress: 100, status: 'Completed' });
                        dc.send(JSON.stringify({ type: 'end', fileId }));
                    }
                };

                const readSlice = (o) => {
                    const slice = file.slice(o, o + CHUNK_SIZE);
                    reader.readAsArrayBuffer(slice);
                };

                readSlice(0);
            }
        });
    };

    return { users, transfers, sendFile };
}
