import { useState, useEffect } from 'react';
import { useLocalNetwork } from '../hooks/useLocalNetwork';
import { VideoGrid } from '../components/VideoGrid';
import { Chat } from '../components/Chat';
import { FileTransfer } from '../components/FileTransfer';
import { PeerList } from '../components/PeerList';
import { Controls } from '../components/Controls';
import { Wifi, LogOut, Copy, Check } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MeetingRoomProps {
    account: Account;
    roomId: string;
    onLeave: () => void;
}

export function MeetingRoom({ account, roomId, onLeave }: MeetingRoomProps) {
    const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
    const [copied, setCopied] = useState(false);
    const [isWaitingForOthers, setIsWaitingForOthers] = useState(true);

    // Fixed: useLocalNetwork expects 2 parameters (userName, roomId)
    const {
        peers,
        messages,
        fileTransfers,
        localStream,
        isAudioEnabled,
        isVideoEnabled,
        startVideo,
        sendMessage,
        sendFile,
        toggleAudio,
        toggleVideo,
        localPeerId,
        localPeerName,
    } = useLocalNetwork(account.fullName, roomId);

    const handleLeave = async () => {
        const activeCallId = localStorage.getItem('activeCallId');
        if (activeCallId) {
            await fetch(`${API_URL}/api/calls/${activeCallId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ended' }),
            }).catch(err => console.error('Failed to end call:', err));
            localStorage.removeItem('activeCallId');
        }
        onLeave();
    };

    // Monitor peer connections
    useEffect(() => {
        if (peers.length > 0) {
            setIsWaitingForOthers(false);
        }
    }, [peers]);

    // Start video when peer ID is ready
    useEffect(() => {
        if (!localPeerId) return;

        startVideo();

        fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: localPeerId,
                name: localPeerName,
                peerId: localPeerId,
                accountId: account.id,
            }),
        }).catch(err => {
            console.error('Failed to save user info:', err);
        });
    }, [localPeerId]);

    // Send heartbeat to keep session alive
    useEffect(() => {
        if (!localPeerId) return;

        const heartbeatInterval = setInterval(() => {
            fetch(`${API_URL}/api/users/${localPeerId}/heartbeat`, {
                method: 'PUT',
            }).catch(err => console.error('Failed to send heartbeat:', err));
        }, 30000);

        return () => clearInterval(heartbeatInterval);
    }, [localPeerId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localPeerId) {
                fetch(`${API_URL}/api/users/${localPeerId}`, {
                    method: 'DELETE',
                }).catch(err => console.error('Failed to delete user:', err));
            }

            const activeCallId = localStorage.getItem('activeCallId');
            if (activeCallId) {
                fetch(`${API_URL}/api/calls/${activeCallId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'ended' }),
                }).catch(err => console.error('Failed to end call:', err));
                localStorage.removeItem('activeCallId');
            }
        };
    }, [localPeerId]);

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Wifi className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Meeting Room</h1>
                            <p className="text-sm text-gray-500">Connected as {account.fullName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                            <span className="text-sm font-mono text-gray-700">{roomId}</span>
                            <button
                                onClick={handleCopyRoomId}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy room ID"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-600" />
                                )}
                            </button>
                        </div>
                        <button
                            onClick={handleLeave}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Leave meeting"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Leave</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <VideoGrid
                            localStream={localStream}
                            peers={peers}
                            localPeerName={localPeerName}
                            isAudioEnabled={isAudioEnabled}
                            isVideoEnabled={isVideoEnabled}
                        />
                    </div>

                    <Controls
                        isAudioEnabled={isAudioEnabled}
                        isVideoEnabled={isVideoEnabled}
                        onToggleAudio={toggleAudio}
                        onToggleVideo={toggleVideo}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>

                <div className="w-96 border-l border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <PeerList peers={peers} localPeerName={localPeerName} />
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'chat' ? (
                            <Chat messages={messages} onSendMessage={sendMessage} localPeerId={localPeerId} />
                        ) : (
                            <FileTransfer
                                fileTransfers={fileTransfers}
                                onFileSelect={sendFile}
                                roomId={roomId}
                                uploaderId={account.id}
                                uploaderName={account.fullName}
                            />
                        )}
                    </div>
                </div>
            </div>

            {isWaitingForOthers && roomId.startsWith('call-') && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Wifi className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Waiting for others to join...
                        </h2>
                        <p className="text-gray-600 mb-6">
                            The call is active. Waiting for the other person to accept.
                        </p>
                        <button
                            onClick={handleLeave}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            Cancel Call
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}