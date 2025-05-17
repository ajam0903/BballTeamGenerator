import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, setDoc, query, orderBy, limit, getDocs, deleteDoc } from "firebase/firestore";
import { StyledButton } from "./UIComponents";

export default function LogTab({
    currentLeagueId,
    currentSet,
    isAdmin,
    db,
    user,
    updatePlayers,
    setToastMessage
}) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [logToDelete, setLogToDelete] = useState(null);
    useEffect(() => {
        if (!currentLeagueId) return;

        const fetchLogs = async () => {
            setLoading(true);
            try {
                const logsRef = collection(db, "leagues", currentLeagueId, "logs");
                const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
                const querySnapshot = await getDocs(q);

                const logsData = [];
                querySnapshot.forEach((doc) => {
                    logsData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                setLogs(logsData);
                console.log("Fetched logs:", logsData); // Debug log
            } catch (error) {
                console.error("Error fetching logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [currentLeagueId, currentSet]);

    const handleDeleteLog = async (logId) => {
        if (!currentLeagueId || !isAdmin) return;

        try {
            // First, get the log details to determine what action needs to be reversed
            const logRef = doc(db, "leagues", currentLeagueId, "logs", logId);
            const logSnap = await getDoc(logRef);

            if (!logSnap.exists()) {
                console.error("Log entry not found");
                return;
            }

            const logData = logSnap.data();

            // Get the player name from the log details
            const playerName = logData.details?.playerName ||
                logData.details?.name ||
                logData.details?.player;

            // Prepare log details for the new log entry about the deletion
            let logDetails = {
                logId,
                deletedAction: logData.action,
                message: "Log entry was deleted"
            };

            // For player-related logs, include player name
            if (["player_added", "player_updated", "player_deleted", "player_rating_changed",
                "player_rating_updated", "player_rating_added"].includes(logData.action) && playerName) {
                logDetails.playerName = playerName;
                logDetails.message = "Rating change was reversed";
            }

            // For match-related logs, include match-specific details
            if (["match_result_saved", "match_completed"].includes(logData.action)) {
                logDetails.scoreA = logData.details?.scoreA;
                logDetails.scoreB = logData.details?.scoreB;
                logDetails.message = "Match result was deleted";
            }

            // Handle reversion based on log action type
            if (logData.action === "player_added" && playerName) {
                // If this was a player addition, delete the player
                await deletePlayer(playerName);
            }
            else if (["player_rating_changed", "player_rating_updated", "player_rating_added"].includes(logData.action)) {
                await reversePlayerRating(logData);
            }
            else if (["match_result_saved", "match_completed"].includes(logData.action)) {
                // Add this to handle match result reversals
                await reverseMatchResult(logData);
            }

            // Delete the log entry only after successfully reversing the action
            await deleteDoc(logRef);

            // Add a new log entry about the deletion
            const newLogRef = doc(collection(db, "leagues", currentLeagueId, "logs"));
            await setDoc(newLogRef, {
                action: "log_deleted",
                details: logDetails,
                userId: user?.uid || "unknown",
                userName: user?.displayName || user?.email || "Admin",
                timestamp: new Date(),
                undoable: false
            });

            // Update the local state
            setLogs(logs.filter(log => log.id !== logId));
            setShowConfirmDelete(null);

            // Show success message
            setToastMessage("Log entry deleted and action reversed");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            console.error("Error deleting log:", error);
            setToastMessage("Error deleting log: " + error.message);
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const reverseMatchResult = async (logData) => {
        // Match logs might not have all the same fields, but we'll try to extract useful info
        if (!logData.details) {
            console.error("Cannot reverse match result: missing details");
            return;
        }

        // For match reversal, we primarily need to update the leaderboard
        // by removing wins, losses, and MVPs that this match caused

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.error("Set data not found");
            return;
        }

        const data = docSnap.data();

        // Make a copy of the current leaderboard
        let updatedLeaderboard = { ...data.leaderboard };

        // Try to get team data from the log
        const teamA = logData.details.teamA || logData.details.teams?.[0] || [];
        const teamB = logData.details.teamB || logData.details.teams?.[1] || [];
        const scoreA = parseInt(logData.details.scoreA) || 0;
        const scoreB = parseInt(logData.details.scoreB) || 0;
        const mvp = logData.details.mvp;

        // Determine winner and loser teams
        const teamAWon = scoreA > scoreB;
        const winningTeam = teamAWon ? teamA : teamB;
        const losingTeam = teamAWon ? teamB : teamA;

        // Remove wins from winners and losses from losers
        if (winningTeam && winningTeam.length > 0) {
            winningTeam.forEach(playerName => {
                if (typeof playerName === 'string' && updatedLeaderboard[playerName]) {
                    // Decrement win count
                    updatedLeaderboard[playerName]._w = Math.max(0, (updatedLeaderboard[playerName]._w || 0) - 1);
                } else if (playerName.name && updatedLeaderboard[playerName.name]) {
                    // Decrement win count (object format)
                    updatedLeaderboard[playerName.name]._w = Math.max(0, (updatedLeaderboard[playerName.name]._w || 0) - 1);
                }
            });
        }

        if (losingTeam && losingTeam.length > 0) {
            losingTeam.forEach(playerName => {
                if (typeof playerName === 'string' && updatedLeaderboard[playerName]) {
                    // Decrement loss count
                    updatedLeaderboard[playerName]._l = Math.max(0, (updatedLeaderboard[playerName]._l || 0) - 1);
                } else if (playerName.name && updatedLeaderboard[playerName.name]) {
                    // Decrement loss count (object format)
                    updatedLeaderboard[playerName.name]._l = Math.max(0, (updatedLeaderboard[playerName.name]._l || 0) - 1);
                }
            });
        }

        // Remove MVP if applicable
        if (mvp && updatedLeaderboard[mvp]) {
            updatedLeaderboard[mvp].MVPs = Math.max(0, (updatedLeaderboard[mvp].MVPs || 0) - 1);
        }

        // Save the updated leaderboard
        await setDoc(docRef, { ...data, leaderboard: updatedLeaderboard });

        console.log("Reversed match result in leaderboard");
    };

    const reversePlayerRating = async (logData) => {
        // Skip if essential data is missing
        if (!logData.details?.playerName && !logData.details?.name) {
            console.error("Cannot reverse rating: player name missing");
            return;
        }

        if (!logData.userId) {
            console.error("Cannot reverse rating: user ID missing");
            return;
        }

        const playerName = logData.details?.playerName || logData.details?.name;
        const userId = logData.userId;

        // Get the current set data
        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.error("Set data not found");
            return;
        }

        const data = docSnap.data();
        const updatedPlayers = [...data.players];

        // Find the player
        const playerIndex = updatedPlayers.findIndex(
            (p) => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (playerIndex === -1) {
            console.error("Player not found:", playerName);
            return;
        }

        const player = updatedPlayers[playerIndex];

        // Handle different scenarios based on the action
        if (logData.action === "player_rating_added") {
            // If this was the first rating, remove the player entirely
            if (player.submissions.length === 1 &&
                player.submissions[0].submittedBy === logData.userId) {
                updatedPlayers.splice(playerIndex, 1);
               
            } else {
                // Remove just this user's submission
                const updatedSubmissions = player.submissions.filter(
                    (s) => s.submittedBy !== logData.userId
                );

                // Recalculate player's rating without this submission
                let newRating = 0;
                if (updatedSubmissions.length > 0) {
                    const total = updatedSubmissions.reduce((sum, sub) => {
                        const { name, submittedBy, ...scores } = sub;
                        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
                        return sum + avg;
                    }, 0);
                    newRating = total / updatedSubmissions.length;
                }

                // Update the player
                updatedPlayers[playerIndex] = {
                    ...player,
                    submissions: updatedSubmissions,
                    rating: newRating
                };
            }
        } else {
            // For updated ratings, remove this user's submission
            const updatedSubmissions = player.submissions.filter(
                (s) => s.submittedBy !== logData.userId
            );

            // Recalculate player's rating without this submission
            let newRating = 0;
            if (updatedSubmissions.length > 0) {
                const total = updatedSubmissions.reduce((sum, sub) => {
                    const { name, submittedBy, ...scores } = sub;
                    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
                    return sum + avg;
                }, 0);
                newRating = total / updatedSubmissions.length;
            }

            // Update the player
            updatedPlayers[playerIndex] = {
                ...player,
                submissions: updatedSubmissions,
                rating: newRating || 5 // Default to 5 if no other submissions
            };
        }

        // Save the updated player data
        await setDoc(docRef, { ...data, players: updatedPlayers });

        // Update local state to reflect changes
        if (typeof updatePlayers === 'function') {
            updatePlayers(updatedPlayers);
        }

        console.log(`Rating submission for ${playerName} by user ${logData.userId} was reversed`);
    };

    const deletePlayer = async (playerName) => {
        if (!playerName) return;

        console.log("Deleting player:", playerName);

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.error("Set data not found");
            return;
        }

        const data = docSnap.data();

        // Check if player exists
        const playerIndex = data.players.findIndex(
            p => p && p.name && p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (playerIndex === -1) {
            console.log("Player not found:", playerName);
            return;
        }

        // Store the player data for logging
        const playerData = data.players[playerIndex];

        // Remove the player
        const updatedPlayers = data.players.filter(
            (p, idx) => idx !== playerIndex
        );

        // Also update leaderboard if needed
        let updatedLeaderboard = { ...data.leaderboard };
        if (updatedLeaderboard[playerName]) {
            delete updatedLeaderboard[playerName];
        }

        // Save to Firestore
        await setDoc(docRef, {
            ...data,
            players: updatedPlayers,
            leaderboard: updatedLeaderboard
        });

        // Update local state
        if (typeof updatePlayers === 'function') {
            updatePlayers(updatedPlayers);
        }

        console.log(`Player ${playerName} was deleted as a result of log deletion`);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "Unknown date";

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionText = (log) => {
        // Helper function to get the player name from different possible fields
        const getPlayerName = (details) => {
            if (!details) return "Unknown Player";
            return details.playerName || details.name || details.player || "Unknown Player";
        };

        switch (log.action) {
            case "player_added":
                return `Added player: ${getPlayerName(log.details)}`;
            case "player_updated":
                return `Updated player: ${getPlayerName(log.details)}`;
            case "player_deleted":
                return `Deleted player: ${getPlayerName(log.details)}`;
            case "player_rating_changed":
            case "player_rating_updated":
            case "player_rating_added": {
                const playerName = getPlayerName(log.details);
                const overallRating = log.details?.overallRating ? `(${log.details.overallRating})` : '';


                if (log.details?.changedValues) {
                    // Get names of changed ratings
                    const changedRatings = Object.keys(log.details.changedValues);

                    if (changedRatings.length === 1) {
                        // If only one rating changed, show it specifically
                        const ratingName = changedRatings[0];
                        const change = log.details.changedValues[ratingName];
                        return `Updated ${ratingName} rating for ${playerName} from ${change.from} to ${change.to} ${overallRating}`;
                    } else if (changedRatings.length <= 3) {
                        // If 2-3 ratings changed, list them all
                        const ratingsList = changedRatings.join(', ');
                        return `Updated ratings (${ratingsList}) for ${playerName} ${overallRating}`;
                    }
                }

                // Default message if no specifics or too many changes
                return `Updated rating for ${playerName} ${overallRating}`;
            }
            case "match_result_saved":
                // For match_result_saved, show a slightly different title to reduce redundancy
                return `Saved match result: ${log.details?.scoreA || 0} - ${log.details?.scoreB || 0}`;
            case "match_completed": {
                // For completed match, show more info about completion
                const scoreA = log.details?.scoreA || 0;
                const scoreB = log.details?.scoreB || 0;
                const scoreDisplay = `${scoreA} - ${scoreB}`;
                const mvp = log.details?.mvp ? `MVP: ${log.details.mvp}` : 'No MVP selected';
                return `Completed match: ${scoreDisplay} (${mvp})`;
            }
            case "rematch_created": {
                return `Created rematch with the same teams`;
            }
            case "teams_generated": {
                return `Generated ${log.details?.teamCount || 0} teams (${log.details?.teamSize || "unknown"}v${log.details?.teamSize || "unknown"})`;
            }
            case "leaderboard_reset":
                return "Reset leaderboard";
            case "log_deleted": {
                const target = getPlayerName(log.details) || log.details?.deletedAction || "entry";
                return `Deleted log and reversed ${target}`;
            }
            case "schema_initialized":
                return "Log system initialized";
            case "user_joined_league":
                return `User ${log.userName} joined the league`;
            case "rematch_created":
                return `Created rematch with same teams`;
            default:
                return log.action?.replace(/_/g, " ") || "Unknown action";
        }
    };

    const renderMatchDetails = (log) => {
        // Only render for match-related logs
        if (!["match_result_saved", "match_completed"].includes(log.action)) {
            return null;
        }

        // Get team data from the appropriate location in details
        const teamA = log.details?.teams?.[0] || log.details?.teamA || [];
        const teamB = log.details?.teams?.[1] || log.details?.teamB || [];
        const scoreA = log.details?.scoreA || 0;
        const scoreB = log.details?.scoreB || 0;
        const mvp = log.details?.mvp || "";

        // Format date if available
        const matchDate = log.details?.date ? new Date(log.details.date) : null;
        const dateStr = matchDate ? matchDate.toLocaleDateString() : "";

        return (
            <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                    {/* Team A */}
                    <div className={`p-2 rounded ${scoreA > scoreB ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Team A</span>
                            <span className="text-sm font-bold text-white">{scoreA}</span>
                        </div>
                        <div className="space-y-1">
                            {Array.isArray(teamA) ? (
                                teamA.map((player, idx) => {
                                    const playerName = typeof player === 'string' ? player : player.name;
                                    const isMVP = mvp === playerName;
                                    return (
                                        <div key={idx} className="text-xs flex items-center">
                                            <span className={`${isMVP ? 'text-yellow-400 font-medium' : 'text-gray-300'}`}>
                                                {playerName}
                                                {isMVP && <span className="ml-1">👑</span>}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-xs text-gray-400">No players listed</div>
                            )}
                        </div>
                    </div>

                    {/* Team B */}
                    <div className={`p-2 rounded ${scoreB > scoreA ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Team B</span>
                            <span className="text-sm font-bold text-white">{scoreB}</span>
                        </div>
                        <div className="space-y-1">
                            {Array.isArray(teamB) ? (
                                teamB.map((player, idx) => {
                                    const playerName = typeof player === 'string' ? player : player.name;
                                    const isMVP = mvp === playerName;
                                    return (
                                        <div key={idx} className="text-xs flex items-center">
                                            <span className={`${isMVP ? 'text-yellow-400 font-medium' : 'text-gray-300'}`}>
                                                {playerName}
                                                {isMVP && <span className="ml-1">👑</span>}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-xs text-gray-400">No players listed</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRatingDetails = (log) => {
        // Get the current ratings data
        const currentRatings = log.details?.ratingData || log.details?.playerData || {};

        // Try to get previous rating data from the log
        const previousRating = log.details?.previousRating || {};
        const changedValues = log.details?.changedValues || {};

        // Extract only the rating fields (skip metadata fields)
        const ratingEntries = Object.entries(currentRatings).filter(([key]) =>
            ["scoring", "defense", "rebounding", "playmaking", "stamina", "physicality", "xfactor"].includes(key)
        );

        return (
            <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="flex flex-wrap gap-2 text-xs mt-2">
                    {ratingEntries.map(([key, currentValue]) => {
                        // Get shortened key name
                        const shortKey = key.substring(0, 3);

                        // Get the previous value for this key
                        let previousValue = null;
                        if (previousRating && previousRating[key] !== undefined) {
                            previousValue = previousRating[key];
                        } else if (changedValues && changedValues[key]) {
                            previousValue = changedValues[key].from;
                        }

                        // Determine color based on change direction
                        let textColorClass = "text-blue-400"; // Default for unchanged

                        if (previousValue !== null && currentValue !== previousValue) {
                            if (currentValue > previousValue) {
                                textColorClass = "text-green-400";
                            } else if (currentValue < previousValue) {
                                textColorClass = "text-red-400";
                            }
                        }

                        return (
                            <div key={key} className="px-2 py-1 rounded-md bg-gray-800 flex items-center">
                                <span className="capitalize mr-1">{shortKey}:</span>
                                <span className={textColorClass}>{currentValue}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getIconForAction = (action) => {
        switch (action) {
            case "player_added":
                return "👤+";
            case "player_updated":
                return "👤✏️";
            case "player_deleted":
                return "👤🗑️";
            case "player_rating_changed":
                return "👤⭐";
            case "match_result_saved":
                return "🏀✓";
            case "match_completed":
                return "🏆";
            case "rematch_created":
                return "🔄";
            case "leaderboard_reset":
                return "🏆🗑️";
            case "log_deleted":
                return "📜🗑️";
            case "schema_initialized":
                return "🔧";
            default:
                return "📝";
            case "user_joined_league":
                return "👋";
        }
    };

    const getColorForAction = (action) => {
        switch (action) {
            case "player_added":
                return "bg-green-900 bg-opacity-30 text-green-400";
            case "player_updated":
            case "player_rating_changed":
                return "bg-blue-900 bg-opacity-30 text-blue-400";
            case "player_deleted":
                return "bg-red-900 bg-opacity-30 text-red-400";
            case "match_result_saved":
                return "bg-yellow-900 bg-opacity-30 text-yellow-400";
            case "teams_generated":
                return "bg-indigo-900 bg-opacity-30 text-indigo-400";
            case "leaderboard_reset":
                return "bg-purple-900 bg-opacity-30 text-purple-400";
            case "log_deleted":
                return "bg-gray-800 text-gray-400";
            case "schema_initialized":
                return "bg-gray-800 text-gray-400";
            default:
                return "bg-gray-800 text-gray-400";
        }
    };

    const getFilteredLogs = () => {
        if (filter === "all") {
            // Even for "all", filter out certain log types
            return logs.filter(log =>
                log.action !== "match_completed" &&
                log.action !== "teams_generated"
            );
        }

        return logs.filter(log => {
            // First filter out the unwanted log types regardless of category
            if (log.action === "match_completed" || log.action === "teams_generated") {
                return false;
            }

            // Then apply the category filters
            switch (filter) {
                case "players":
                    return ["player_added", "player_updated", "player_deleted", "player_rating_changed", "player_rating_updated", "player_rating_added"].includes(log.action);
                case "matches":
                    // Only include match_result_saved and not other match-related logs
                    return log.action === "match_result_saved" ||
                        (log.action && log.action.includes("rematch"));
                case "admin":
                    return ["leaderboard_reset", "log_deleted", "schema_initialized", "user_joined_league"].includes(log.action);
                default:
                    return true;
            }
        });
    };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Activity Log</h2>

                <div className="flex space-x-3">
                    <select
                        className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-3 py-1.5 text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Activities</option>
                        <option value="players">Players</option>
                        <option value="matches">Matches</option>
                        <option value="admin">Admin Actions</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-pulse text-gray-400">Loading logs...</div>
                </div>
            ) : getFilteredLogs().length === 0 ? (
                <div className="bg-gray-800 rounded p-6 text-center text-gray-400">
                    No logs found.
                </div>
            ) : (
                <div className="space-y-3">
                            {getFilteredLogs().map(log => (
                                <div key={log.id}
                                    className={`rounded p-3 border border-gray-800 ${getColorForAction(log.action)}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                            <div className="text-xl">{getIconForAction(log.action)}</div>
                                            <div className="flex-grow">
                                                <div className="font-medium">{getActionText(log)}</div>
                                                <div className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</div>
                                                {log.userName && isAdmin && (
                                                    <div className="text-xs mt-1 text-gray-300">
                                                        By: {log.userName}
                                                    </div>
                                                )}

                                                {/* This is the key part - render rating details for ALL player-related actions */}
                                                {["player_rating_changed", "player_rating_updated", "player_rating_added",
                                                    "player_added", "player_updated"].includes(log.action) &&
                                                    renderRatingDetails(log)
                                                }
                                                {["match_result_saved", "match_completed"].includes(log.action) &&
                                                    renderMatchDetails(log)
                                                }
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center space-x-2">
                                                {showConfirmDelete === log.id ? (
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                // Show confirmation modal for player and match operations
                                                                if (["player_rating_changed", "player_rating_updated", "player_rating_added", "player_added",
                                                                    "match_result_saved", "match_completed"].includes(log.action)) {
                                                                    setLogToDelete(log);
                                                                    setShowDeleteModal(true);
                                                                    setShowConfirmDelete(null);
                                                                } else {
                                                                    // For other logs, delete immediately
                                                                    handleDeleteLog(log.id);
                                                                }
                                                            }}
                                                            className="text-red-500 hover:text-red-400 text-xs font-bold"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setShowConfirmDelete(null)}
                                                            className="text-gray-400 hover:text-gray-300 text-xs"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowConfirmDelete(log.id)}
                                                        className="text-gray-500 hover:text-red-400"
                                                        title="Delete log entry"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {showDeleteModal && logToDelete && (
                                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                            <div className="bg-gray-800 p-4 rounded-lg max-w-md w-full">
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {logToDelete.action === "player_added"
                                                        ? "Confirm Player Deletion"
                                                        : ["match_result_saved", "match_completed"].includes(logToDelete.action)
                                                            ? "Confirm Match Result Deletion"
                                                            : "Confirm Rating Reversal"}
                                                </h3>
                                                <p className="text-gray-300 mb-4">
                                                    {logToDelete.action === "player_added"
                                                        ? `This will delete player ${logToDelete.details?.playerName || logToDelete.details?.name} completely from the league.`
                                                        : ["match_result_saved", "match_completed"].includes(logToDelete.action)
                                                            ? `This will remove this match result and update the leaderboard accordingly.`
                                                            : `This will delete the rating submission for ${logToDelete.details?.playerName || logToDelete.details?.name} by ${logToDelete.userName}.`
                                                    }
                                                </p>
                                                <p className="text-yellow-400 text-sm mb-4">
                                                    {logToDelete.action === "player_added"
                                                        ? "All player data and ratings will be permanently removed. This action cannot be undone."
                                                        : ["match_result_saved", "match_completed"].includes(logToDelete.action)
                                                            ? "Player win/loss records and MVP counts will be adjusted. This action cannot be undone."
                                                            : "This will recalculate the player's rating based on other submissions. This action cannot be undone."
                                                    }
                                                </p>
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => setShowDeleteModal(false)}
                                                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteLog(logToDelete.id);
                                                            setShowDeleteModal(false);
                                                        }}
                                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                                    >
                                                        {logToDelete.action === "player_added"
                                                            ? "Delete Player"
                                                            : ["match_result_saved", "match_completed"].includes(logToDelete.action)
                                                                ? "Delete Match Result"
                                                                : "Delete & Revert Rating"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {log.details &&
                                        Object.keys(log.details).length > 0 &&
                                        !["player_rating_changed", "player_rating_updated", "player_rating_added"].includes(log.action) &&
                                        !["name", "playerName", "userId", "scoreA", "scoreB", "teamCount"].some(key => key in log.details) && (
                                            <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
                                                <details>
                                                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                                                        Details
                                                    </summary>
                                                    <pre className="mt-2 p-2 bg-gray-900 rounded overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        )}
                                </div>
                            ))}
                </div>
            )}
        </div>
    );
}