// UserMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function UserMenu({ user, currentLeague, handleBackToLeagues }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const copyInviteCodeToClipboard = (e) => {
        e.stopPropagation();
        if (currentLeague?.inviteCode) {
            navigator.clipboard.writeText(currentLeague.inviteCode)
                .then(() => {
                    alert("Invite code copied to clipboard!");
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                });
        }
    };

    const handleLogout = (e) => {
        e.stopPropagation();
        signOut(auth);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            {/* Menu Button */}
            <button
                onClick={toggleMenu}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                aria-label="User menu"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                    />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-gray-800 rounded-md shadow-lg z-50 border border-gray-700">
                    <div className="p-3 border-b border-gray-700">
                        <p className="text-gray-200 font-medium truncate">{user.displayName}</p>
                        <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    </div>

                    {currentLeague && (
                        <div className="p-3 border-b border-gray-700">
                            <p className="text-gray-300 text-sm font-medium mb-1">Current League</p>
                            <p className="text-white mb-1">{currentLeague.name}</p>
                            <div className="flex items-center">
                                <span className="text-gray-400 text-sm mr-2 truncate">
                                    {currentLeague.inviteCode}
                                </span>
                                <button
                                    onClick={copyInviteCodeToClipboard}
                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                    title="Copy invite code"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-1">
                        {currentLeague && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleBackToLeagues();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded flex items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 17l-5-5m0 0l5-5m-5 5h12"
                                    />
                                </svg>
                                Back to Leagues
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded flex items-center"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}