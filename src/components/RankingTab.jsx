// RankingTab.jsx
import React, { useState, useRef, useEffect } from "react";
import {
    StyledButton,
    // Remove or adjust default StyledInput if it was causing white BG:
    // We'll do custom classes directly below.
} from "./UIComponents";

import Tooltip from "./Tooltip";
import { PlusCircleIcon } from "@heroicons/react/24/solid";
// In RankingTab.jsx
import { ratingHelp } from "./ratingHelp";

export default function RankingTab({
    players,
    newRating,
    setNewRating,
    handleRatingSubmit,
    handleDeletePlayer,
    openEditModal,
    isAdmin,
    user,
    toastMessage,
    setToastMessage,
}) {
    const [sortKey, setSortKey] = useState("name");
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [activeRatingIndex, setActiveRatingIndex] = useState(null);
    const handleRatingSubmitWithPreserve = () => {
        // Store current values before submission
        const currentValues = { ...newRating };

        // Call the original submit function from props
        handleRatingSubmit();

        // After the original function resets the values to 5, put back our stored values
        setTimeout(() => {
            setNewRating(currentValues);
            setHasUnsavedChanges(false); // Reset the unsaved changes flag after submission
        }, 10);
    };
    const openRatingModal = (index) => {
        const p = sortedPlayers[index];
        const userSubmission = p.submissions?.find((s) => s.submittedBy === user?.email);

        setNewRating({
            name: p.name,
            scoring: userSubmission?.scoring ?? p.scoring ?? 5,
            defense: userSubmission?.defense ?? p.defense ?? 5,
            rebounding: userSubmission?.rebounding ?? p.rebounding ?? 5,
            playmaking: userSubmission?.playmaking ?? p.playmaking ?? 5,
            stamina: userSubmission?.stamina ?? p.stamina ?? 5,
            physicality: userSubmission?.physicality ?? p.physicality ?? 5,
            xfactor: userSubmission?.xfactor ?? p.xfactor ?? 5,
        });

        setActiveRatingIndex(index);
        setShowRatingModal(true);
    };


    const closeRatingModal = () => {
        setShowRatingModal(false);
    };

    const nextPlayer = () => {
        const nextIndex = Math.min(activeRatingIndex + 1, sortedPlayers.length - 1);
        setActiveRatingIndex(nextIndex);

        // Load the next player's data
        const nextPlayer = sortedPlayers[nextIndex];
        if (nextPlayer) {
            const userSubmission = nextPlayer.submissions?.find((s) => s.submittedBy === user?.email);

            setNewRating({
                name: nextPlayer.name,
                scoring: userSubmission?.scoring ?? nextPlayer.scoring ?? 5,
                defense: userSubmission?.defense ?? nextPlayer.defense ?? 5,
                rebounding: userSubmission?.rebounding ?? nextPlayer.rebounding ?? 5,
                playmaking: userSubmission?.playmaking ?? nextPlayer.playmaking ?? 5,
                stamina: userSubmission?.stamina ?? nextPlayer.stamina ?? 5,
                physicality: userSubmission?.physicality ?? nextPlayer.physicality ?? 5,
                xfactor: userSubmission?.xfactor ?? nextPlayer.xfactor ?? 5,
            });

            setHasUnsavedChanges(false);
        }
    };

    const prevPlayer = () => {
        const prevIndex = Math.max(activeRatingIndex - 1, 0);
        setActiveRatingIndex(prevIndex);

        // Load the previous player's data
        const prevPlayer = sortedPlayers[prevIndex];
        if (prevPlayer) {
            const userSubmission = prevPlayer.submissions?.find((s) => s.submittedBy === user?.email);

            setNewRating({
                name: prevPlayer.name,
                scoring: userSubmission?.scoring ?? prevPlayer.scoring ?? 5,
                defense: userSubmission?.defense ?? prevPlayer.defense ?? 5,
                rebounding: userSubmission?.rebounding ?? prevPlayer.rebounding ?? 5,
                playmaking: userSubmission?.playmaking ?? prevPlayer.playmaking ?? 5,
                stamina: userSubmission?.stamina ?? prevPlayer.stamina ?? 5,
                physicality: userSubmission?.physicality ?? prevPlayer.physicality ?? 5,
                xfactor: userSubmission?.xfactor ?? prevPlayer.xfactor ?? 5,
            });

            setHasUnsavedChanges(false);
        }
    };

    const computeRating = (p) => {
        return (
            (p.scoring || 5) * 0.25 +
            (p.defense || 5) * 0.2 +
            (p.rebounding || 5) * 0.15 +
            (p.playmaking || 5) * 0.15 +
            (p.stamina || 5) * 0.1 +
            (p.physicality || 5) * 0.1 +
            (p.xfactor || 5) * 0.05
        ).toFixed(2);
    };
    const [sortedPlayers, setSortedPlayers] = useState([]);

    const modalRef = useRef();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        function handleClickOutside(e) {
            if (showRatingModal && modalRef.current && !modalRef.current.contains(e.target)) {
                if (hasUnsavedChanges) {
                    if (confirm("You have unsaved changes. Are you sure you want to close?")) {
                        setShowRatingModal(false);
                    }
                } else {
                    setShowRatingModal(false);
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showRatingModal, hasUnsavedChanges]);


    useEffect(() => {
        const sorted = [...players].sort((a, b) => {
            if (sortKey === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortKey === 'rating') {
                return computeRating(b) - computeRating(a); // Sort by rating descending
            }
            return 0;
        });

        setSortedPlayers(sorted);
    }, [players, sortKey]);

    useEffect(() => {
        if (showRatingModal) {
            // Set hasUnsavedChanges to true if user modifies any rating
            setHasUnsavedChanges(true);
        }
    }, [newRating]);



    return (
        <div className="p-6 space-y-8 bg-gray-900 text-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Player Rankings</h2>
                <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-300">Add Player</span>
                    <button
                        onClick={() => openEditModal({
                            name: "",
                            scoring: 5,
                            defense: 5,
                            rebounding: 5,
                            playmaking: 5,
                            stamina: 5,
                            physicality: 5,
                            xfactor: 5,
                        }, false)} // false means it's not editing existing
                        title="Add new player"
                    >
                        <PlusCircleIcon className="w-6 h-6 text-green-400 hover:text-green-300" />
                    </button>
                </div>
            </div>

            {showRatingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div ref={modalRef} className="bg-gray-800 p-4 rounded-lg w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-lg relative">
                        {/* Close button - fixed in the top right */}
                        <button
                            onClick={closeRatingModal}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold mb-4 text-white pr-8">
                            Rate: {sortedPlayers[activeRatingIndex]?.name}
                        </h2>

                        {Object.entries(newRating).map(([key, value]) => {
                            if (key === "name") return null;
                            return (
                                <div key={key} className="mb-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-white flex items-center">
                                            {capitalize(key)}
                                            <span className="ml-2">
                                                <Tooltip text={ratingHelp[key]} />
                                            </span>
                                        </label>
                                        <span className="text-sm">{value}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={value}
                                        onChange={(e) =>
                                            setNewRating({ ...newRating, [key]: parseInt(e.target.value) })
                                        }
                                        className="w-full mt-1 accent-blue-500"
                                    />
                                </div>
                            );
                        })}

                        <div className="flex justify-between items-center mt-4">
                            <button
                                className="text-white text-lg disabled:text-gray-500 p-1"
                                onClick={prevPlayer}
                                disabled={activeRatingIndex === 0}
                            >
                                ⬅️
                            </button>
                            <StyledButton
                                onClick={handleRatingSubmitWithPreserve}
                                className="bg-blue-600 hover:bg-blue-700 py-1 px-3 text-sm"
                            >
                                Submit Rating
                            </StyledButton>
                            <button
                                className="text-white text-lg disabled:text-gray-500 p-1"
                                onClick={nextPlayer}
                                disabled={activeRatingIndex === sortedPlayers.length - 1}
                            >
                                ➡️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sort & Filter Controls */}
            <div className="flex items-center space-x-4 mb-4">
                <label className="font-medium">Sort By:</label>
                <select
                    className="border border-gray-700 bg-gray-800 rounded px-3 py-2 text-gray-100"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                >
                    <option value="name">Name</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            {/* Player List */}
            <div className="space-y-2">
                {sortedPlayers.map((player, index) => {
                    const rating = computeRating(player);
                    const userSubmission = player.submissions?.find(
                        (s) => s.submittedBy === user?.email
                    );
                    const isRatedByUser = !!userSubmission;
                    return (
                        <div
                            key={player.name}
                            className="flex items-center bg-gray-800 shadow p-3 rounded justify-between"
                        >
                            <div>
                                <span className="font-medium text-white">{player.name}</span>
                                <span className="ml-2 text-sm text-gray-400">(Rating: {rating})</span>
                                <p className="text-xs text-gray-400">Ratings submitted: {player.submissions?.length || 0}</p>
                                {user && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => openRatingModal(index)}
                                            className="hover:scale-110 transition"
                                            title="Rate or update rating"
                                        >
                                            📝
                                        </button>
                                        {userSubmission ? (
                                            <span className="text-xs text-green-400">✓ You've rated this player</span>
                                        ) : (
                                            <span className="text-xs text-yellow-400">🟡 You haven’t rated this player yet.</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                {isAdmin && (
                                    <StyledButton
                                        onClick={() => openEditModal(player)}
                                        className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                        Edit
                                    </StyledButton>
                                )}
                               
                                {isAdmin && (
                                    <StyledButton
                                        onClick={() => handleDeletePlayer(player.name)}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Delete
                                    </StyledButton>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
