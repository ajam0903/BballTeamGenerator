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
    const [sortDirection, setSortDirection] = useState("asc");
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

    // Modify the handleSort function to toggle the sort direction
    const handleSort = (column) => {
        if (sortKey === column) {
            // Toggle sort direction if clicking the same column
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new sort column and reset direction to ascending
            setSortKey(column);
            setSortDirection("asc");
        }
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

    const getPercentage = (rating) => {
        // rating is from 0–10, so rating=5 => 50%
        return (rating / 10) * 100;
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
        if (showRatingModal) {
            // Set hasUnsavedChanges to true if user modifies any rating
            setHasUnsavedChanges(true);
        }
    }, [newRating]);

    useEffect(() => {
        const sorted = [...players].sort((a, b) => {
            if (sortKey === 'name') {
                // Alphabetical sorting for names
                const compareResult = a.name.localeCompare(b.name);
                return sortDirection === "asc" ? compareResult : -compareResult;
            } else if (sortKey === 'rating') {
                // Numerical sorting for ratings (highest to lowest or lowest to highest)
                const ratingA = parseFloat(computeRating(a));
                const ratingB = parseFloat(computeRating(b));
                return sortDirection === "asc" ? ratingA - ratingB : ratingB - ratingA;
            }
            return 0;
        });

        setSortedPlayers(sorted);
    }, [players, sortKey, sortDirection]);


    return (
        <div className="space-y-1">
            {/* Header with Add Player button */}
            <div className="flex justify-end items-center mb-4">
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
                    }, false)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                >
                    Add Player
                    <PlusCircleIcon className="ml-1 w-5 h-5" />
                </button>
            </div>

            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={() => handleSort("name")}
                    className={`text-sm font-medium px-2 py-1 rounded transition-colors ${sortKey === "name"
                            ? "text-blue-400"
                            : "text-gray-300 hover:text-gray-100"
                        }`}
                >
                    Name {sortKey === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                    onClick={() => handleSort("rating")}
                    className={`text-sm font-medium px-2 py-1 rounded transition-colors ${sortKey === "rating"
                            ? "text-blue-400"
                            : "text-gray-300 hover:text-gray-100"
                        }`}
                >
                    Rating {sortKey === "rating" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
            </div>

            {/* Player cards */}
            <div className="space-y-1">
                {sortedPlayers.map((player, index) => {
                    const rating = computeRating(player);
                    const userSubmission = player.submissions?.find(
                        (s) => s.submittedBy === user?.email
                    );
                    const bgColorClass = index % 2 === 0 ? "bg-gray-800" : "bg-gray-800/50";
                    return (
                        <div key={player.name} className={`${bgColorClass} rounded p-2`}>
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-base text-white">{player.name}</span>
                                <span className="text-base font-medium text-blue-400">
                                    {rating}
                                </span>
                            </div>

                            <div className="mb-1">
                                <div className="text-xs text-gray-400">Ratings: {player.submissions?.length || 0}</div>
                                <div className="mt-0.5 bg-gray-700 h-1 rounded w-full">
                                    <div
                                        className="bg-blue-500 h-1 rounded"
                                        style={{ width: `${getPercentage(parseFloat(rating))}%` }}
                                    />
                                </div>
                            </div>

                        <div className="flex items-center">
                            <button
                                onClick={() => openRatingModal(index)}
                                className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 mr-2"
                            >
                                Rate
                            </button>

                            <div className={`flex items-center px-2 py-0.5 rounded-md text-xs ${userSubmission
                                ? "bg-green-900 bg-opacity-30 text-green-400"
                                : "bg-yellow-900 bg-opacity-30 text-yellow-400"
                                }`}>
                                {userSubmission ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Rated</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        <span>Not rated</span>
                                    </>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="flex space-x-1 ml-auto">
                                    <StyledButton
                                        onClick={() => {
                                            const playerToEdit = {
                                                name: player.name,
                                                scoring: player.scoring || 5,
                                                defense: player.defense || 5,
                                                rebounding: player.rebounding || 5,
                                                playmaking: player.playmaking || 5,
                                                stamina: player.stamina || 5,
                                                physicality: player.physicality || 5,
                                                xfactor: player.xfactor || 5,
                                                active: player.active !== undefined ? player.active : true
                                            };
                                            openEditModal(playerToEdit, true);
                                        }}
                                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700"
                                    >
                                        Edit
                                    </StyledButton>
                                    <StyledButton
                                        onClick={() => handleDeletePlayer(player.name)}
                                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                                    >
                                        Delete
                                    </StyledButton>
                                </div>
                            )}
                        </div>
                    </div>
                );
                })}
            </div>
            {/* Rating Modal */}
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
        </div>
    );
}