// UserMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function UserMenu({
    user,
    currentLeague,
    handleBackToLeagues,
    showReviewerNames = false,
    onToggleReviewerVisibility,
    isAdmin = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
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
                <div className="absolute right-0 mt-1 w-60 bg-gray-800 rounded-md shadow-lg z-50 border border-gray-700">
                    <div className="py-1.5 px-2 border-b border-gray-700">
                        <p className="text-gray-200 font-medium truncate text-sm">{user.displayName}</p>
                        <p className="text-gray-400 text-xs truncate">{user.email}</p>
                    </div>

                    {currentLeague && (
                        <div className="py-1.5 px-2 border-b border-gray-700">
                            <p className="text-gray-300 text-xs font-medium">Current League</p>
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm">{currentLeague.name}</p>
                                <div className="flex items-center">
                                    <span className="text-gray-400 text-xs mr-1 truncate">
                                        {currentLeague.inviteCode}
                                    </span>
                                    <button
                                        onClick={copyInviteCodeToClipboard}
                                        className="text-blue-400 hover:text-blue-300"
                                        title="Copy invite code"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-3.5 w-3.5"
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
                        </div>
                    )}

                    {/* Preferences Section - Only for Admins */}
                    {isAdmin && (
                        <>
                            <div className="py-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPreferences(!showPreferences);
                                    }}
                                    className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 rounded flex items-center justify-between text-xs"
                                >
                                    <div className="flex items-center">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-3.5 w-3.5 mr-1.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        Preferences
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3 w-3 transform transition-transform ${showPreferences ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Preferences Submenu */}
                                {showPreferences && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        <div className="px-2 py-1 text-xs text-gray-400 border-b border-gray-700 mb-2">
                                            Privacy Settings
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleReviewerVisibility();
                                                setIsOpen(false);
                                            }}
                                            className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-600 rounded text-xs flex items-center justify-between"
                                        >
                                            <span>Show Reviewer Names</span>
                                            <div className={`w-8 h-4 rounded-full transition-colors ${showReviewerNames ? 'bg-blue-600' : 'bg-gray-600'
                                                }`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transform transition-transform mt-0.5 ${showReviewerNames ? 'translate-x-4' : 'translate-x-0.5'
                                                    }`} />
                                            </div>
                                        </button>
                                        <div className="px-2 py-1 text-xs text-gray-500">
                                            When enabled, reviewers' names are visible to admins in player reviews
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-gray-700 my-1"></div>
                        </>
                    )}

                    {/* Navigation Section */}
                    <div className="py-0.5">
                        {currentLeague && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleBackToLeagues();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 rounded flex items-center text-xs"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5 mr-1.5"
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
                            className="w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 rounded flex items-center text-xs"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 mr-1.5"
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