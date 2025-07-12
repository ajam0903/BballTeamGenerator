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
import PlayerBeltIcons from "./PlayerBeltIcons";
import { badgeCategories } from "./badgeSystem.jsx";
import PlayerBadges from "./playerBadges";
import UnratedPlayersNotification from './UnratedPlayersNotification';

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
    currentBelts = {},
    leaderboard = {},
    matchHistory = [],
    onPlayerClick,
}) {
    const [sortKey, setSortKey] = useState("rating");
    const [sortDirection, setSortDirection] = useState("desc");
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [activeRatingIndex, setActiveRatingIndex] = useState(null);
    const [showingUnratedOnly, setShowingUnratedOnly] = useState(false);

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
        let playersToNavigate = showingUnratedOnly
            ? players.filter(player => {
                const userSubmission = player.submissions?.find(s => s.submittedBy === user?.email);
                return !userSubmission;
            })
            : sortedPlayers;

        const currentPlayerName = newRating.name;
        const currentIndex = playersToNavigate.findIndex(p => p.name === currentPlayerName);
        const nextIndex = Math.min(currentIndex + 1, playersToNavigate.length - 1);

        if (nextIndex === currentIndex) {
            // We're at the last player
            if (showingUnratedOnly) {
                // Exit unrated-only mode when reaching the end
                setShowingUnratedOnly(false);
                setShowRatingModal(false);
                return;
            }
        }

        const nextPlayer = playersToNavigate[nextIndex];
        if (nextPlayer) {
            const userSubmission = nextPlayer.submissions?.find((s) => s.submittedBy === user?.email);
            const playerIndexInSorted = sortedPlayers.findIndex(p => p.name === nextPlayer.name);

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

            setActiveRatingIndex(playerIndexInSorted);
            setHasUnsavedChanges(false);
        }
    };

    const prevPlayer = () => {
        let playersToNavigate = showingUnratedOnly
            ? players.filter(player => {
                const userSubmission = player.submissions?.find(s => s.submittedBy === user?.email);
                return !userSubmission;
            })
            : sortedPlayers;

        const currentPlayerName = newRating.name;
        const currentIndex = playersToNavigate.findIndex(p => p.name === currentPlayerName);
        const prevIndex = Math.max(currentIndex - 1, 0);

        const prevPlayer = playersToNavigate[prevIndex];
        if (prevPlayer) {
            const userSubmission = prevPlayer.submissions?.find((s) => s.submittedBy === user?.email);
            const playerIndexInSorted = sortedPlayers.findIndex(p => p.name === prevPlayer.name);

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

            setActiveRatingIndex(playerIndexInSorted);
            setHasUnsavedChanges(false);
        }
    };

    const computeRating = (p) => {
        // If player has submissions, calculate from them
        if (p.submissions && p.submissions.length > 0) {
            const weightings = {
                scoring: 0.25,
                defense: 0.2,
                rebounding: 0.15,
                playmaking: 0.15,
                stamina: 0.1,
                physicality: 0.1,
                xfactor: 0.05,
            };

            const total = p.submissions.reduce((sum, sub) => {
                const weightedAvg = (
                    (sub.scoring || 5) * weightings.scoring +
                    (sub.defense || 5) * weightings.defense +
                    (sub.rebounding || 5) * weightings.rebounding +
                    (sub.playmaking || 5) * weightings.playmaking +
                    (sub.stamina || 5) * weightings.stamina +
                    (sub.physicality || 5) * weightings.physicality +
                    (sub.xfactor || 5) * weightings.xfactor
                );
                return sum + weightedAvg;
            }, 0);

            return (total / p.submissions.length).toFixed(2);
        }

        // Fallback to individual stats if no submissions
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

    // Helper function to get player initials
    const getPlayerInitials = (name) => {
        if (!name) return "?";
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return words.slice(0, 2).map(word => word.charAt(0)).join("").toUpperCase();
    };

    const startRatingUnratedPlayers = () => {
        const unratedPlayers = players.filter(player => {
            const userSubmission = player.submissions?.find(s => s.submittedBy === user?.email);
            return !userSubmission;
        });

        if (unratedPlayers.length > 0) {
            setShowingUnratedOnly(true);
            // Find the index of the first unrated player in sortedPlayers
            const firstUnratedPlayer = unratedPlayers[0];
            const indexInSorted = sortedPlayers.findIndex(p => p.name === firstUnratedPlayer.name);

            if (indexInSorted !== -1) {
                openRatingModal(indexInSorted);
            }
        }
    };

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
            <UnratedPlayersNotification
                user={user}
                players={players}
                onStartRating={startRatingUnratedPlayers}
            />
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
                        <div
                            key={player.name}
                            className={`${bgColorClass} rounded overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors`}
                            onClick={() => onPlayerClick && onPlayerClick(player)}
                        >
                            <div className="flex items-stretch min-h-[80px]">
                                {/* Player Image or Initials - Full Height */}
                                <div className="flex-shrink-0 w-20 relative">
                                    {player.customPhotoURL ? (
                                        <img
                                            src={player.customPhotoURL}
                                            alt={player.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Fallback to initials if image fails to load
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`absolute inset-0 bg-gray-600 flex items-center justify-center text-white font-semibold text-lg ${player.customPhotoURL ? 'hidden' : 'flex'}`}
                                    >
                                        {getPlayerInitials(player.name)}
                                    </div>
                                </div>

                                {/* Player Info */}
                                <div className="flex-1 min-w-0 p-2 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="flex items-center">
                                                <span className="text-base text-white truncate">{player.name}</span>
                                                <PlayerBeltIcons playerName={player.name} currentBelts={currentBelts} />
                                                <PlayerBadges
                                                    playerName={player.name}
                                                    leaderboard={leaderboard}
                                                    matchHistory={matchHistory}
                                                    size="small"
                                                    maxDisplay={2}
                                                />
                                            </div>
                                            <span className="text-base font-medium text-blue-400 flex-shrink-0">
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
                                    </div>

                                    <div className="flex items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRatingModal(index);
                                            }}
                                            className="px-1.5 py-0.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 mr-1"
                                        >
                                            Rate
                                        </button>

                                        <div className={`flex items-center px-1.5 py-0.5 rounded text-xs ${userSubmission
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-600 text-gray-300"
                                            }`}>
                                            <span className="mr-1">●</span>
                                            {userSubmission ? "Rated" : "Not Rated"}
                                        </div>

                                        {isAdmin && (
                                            <div className="ml-auto flex space-x-0.5">
                                                <StyledButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const playerToEdit = {
                                                            ...player,
                                                            active: player.active !== undefined ? player.active : true
                                                        };
                                                        openEditModal(playerToEdit, true, true);
                                                    }}
                                                    className="px-1.5 py-0.5 text-xs bg-yellow-600 hover:bg-yellow-700"
                                                >
                                                    Edit
                                                </StyledButton>
                                                <StyledButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Are you sure you want to delete ${player.name}? This will permanently remove all player data including ratings, match history, and statistics. This action cannot be undone.`)) {
                                                            handleDeletePlayer(player.name);
                                                        }
                                                    }}
                                                    className="px-1.5 py-0.5 text-xs bg-red-600 hover:bg-red-700"
                                                >
                                                    Delete
                                                </StyledButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                            Rate: {newRating.name}
                            {showingUnratedOnly && (
                                <span className="block text-sm font-normal text-blue-400 mt-1">
                                    Rating unrated players only
                                </span>
                            )}
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
                                        step="0.1"
                                        value={value}
                                        onChange={(e) =>
                                            setNewRating({ ...newRating, [key]: parseFloat(e.target.value) })
                                        }
                                        className="w-full mt-1 accent-blue-500"
                                    />
                                </div>
                            );
                        })}

                        {/* Navigation and Submit buttons */}
                        <div className="flex justify-between items-center mt-4">
                            <StyledButton
                                onClick={prevPlayer}
                                disabled={showingUnratedOnly ?
                                    (players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email))
                                        .findIndex(p => p.name === newRating.name) === 0) :
                                    (activeRatingIndex === 0)
                                }
                                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-2 py-1"
                            >
                                ← Prev
                            </StyledButton>

                            <StyledButton
                                onClick={handleRatingSubmitWithPreserve}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 mx-2"
                            >
                                Submit Rating
                            </StyledButton>

                            <StyledButton
                                onClick={nextPlayer}
                                disabled={showingUnratedOnly ?
                                    (players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email))
                                        .findIndex(p => p.name === newRating.name) ===
                                        players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email)).length - 1) :
                                    (activeRatingIndex === sortedPlayers.length - 1)
                                }
                                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-2 py-1"
                            >
                                {showingUnratedOnly &&
                                    players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email))
                                        .findIndex(p => p.name === newRating.name) ===
                                    players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email)).length - 1
                                    ? 'Finish' : 'Next'} →
                            </StyledButton>
                        </div>

                        {/* Progress indicator */}
                        <div className="text-center mt-2">
                            <span className="text-gray-400 text-xs">
                                {showingUnratedOnly ? (
                                    `${players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email))
                                        .findIndex(p => p.name === newRating.name) + 1} of ${players.filter(p => !p.submissions?.find(s => s.submittedBy === user?.email)).length
                                    } unrated`
                                ) : (
                                    `${activeRatingIndex + 1} of ${sortedPlayers.length}`
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}