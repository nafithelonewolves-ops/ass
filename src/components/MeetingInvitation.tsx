import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MeetingInvitationProps {
    account: Account;
    onClose: () => void;
    onStartMeeting: (roomId: string, invitedUsers: Account[]) => void;
}

export function MeetingInvitation({ account, onClose, onStartMeeting }: MeetingInvitationProps) {
    const [users, setUsers] = useState<Account[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [meetingTitle, setMeetingTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/accounts`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.filter((u: Account) => u.id !== account.id));
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleStartMeeting = async () => {
        if (selectedUsers.size === 0) {
            alert('Please select at least one user to invite');
            return;
        }

        setIsCreating(true);
        const roomId = `room-${Date.now()}`;
        const invitedUsers = users.filter(u => selectedUsers.has(u.id));

        try {
            for (const invitedUser of invitedUsers) {
                await fetch(`${API_URL}/api/calls`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fromAccountId: account.id,
                        toAccountId: invitedUser.id,
                        fromName: account.fullName,
                        toName: invitedUser.fullName,
                        roomId: roomId,
                        type: 'meeting',
                        meetingTitle: meetingTitle || 'Group Meeting',
                    }),
                });
            }

            console.log('✅ Meeting invitations sent to', selectedUsers.size, 'users');
            onStartMeeting(roomId, invitedUsers);
        } catch (error) {
            console.error('Failed to send invitations:', error);
            alert('Failed to send invitations');
            setIsCreating(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Create Meeting</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Meeting Title (Optional)
                        </label>
                        <input
                            type="text"
                            value={meetingTitle}
                            onChange={(e) => setMeetingTitle(e.target.value)}
                            placeholder="Enter meeting title..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Search Users ({selectedUsers.size} selected)
                        </label>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-600 mt-2">Loading users...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                {searchQuery ? 'No users found' : 'No other users available'}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleToggleUser(user.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                                            selectedUsers.has(user.id)
                                                ? 'bg-blue-100 border-2 border-blue-500'
                                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-bold text-white">
                                                        {user.fullName.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{user.fullName}</p>
                                                    <p className="text-sm text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                            {selectedUsers.has(user.id) && (
                                                <Check className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStartMeeting}
                        disabled={isCreating || selectedUsers.size === 0}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Sending Invitations...' : `Start Meeting (${selectedUsers.size} invited)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
