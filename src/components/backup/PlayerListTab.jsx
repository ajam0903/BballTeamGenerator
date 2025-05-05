import React, { useState, useEffect } from "react";
import { StyledButton, StyledSelect } from "./UIComponents";

export default function PlayerListTab({
    players,
    handleTogglePlayerActive,
    handleBatchPlayerActiveToggle,
    weightings = {
        scoring: 0.25,
        defense: 0.2,
        rebounding: 0.15,
        playmaking: 0.15,
        stamina: 0.1,
        physicality: 0.1,
        xfactor: 0.05,
    }
}) {
    const [playerSortBy, setPlayerSortBy] = useState("name");
    const [playerSortDirection, setPlayerSortDirection] = useState("asc");
    const [selectAll, setSelectAll] = useState(false);

    // Calculate rating 1-10 based on skill weighting
    const computeRating = (player) => {
        return (
            (player.scoring || 5) * weightings.scoring +
            (player.defense || 5) * weightings.defense +
            (player.rebounding || 5) * weightings.rebounding +
            (player.playmaking || 5) * weightings.playmaking +
            (player.stamina || 5) * weightings.stamina +
            (player.physicality || 5) * weightings.physicality +
            (player.xfactor || 5) * weightings.xfactor
        ).toFixed(2);
    };

    // For the percentage-based bar
    const getPercentage = (rating) => {
        // Rating is typically 0-10, so rating=5 => 50%
        return (parseFloat(rating) / 10) * 100;
    };

    // Handle sorting logic
    const handlePlayerSort = (column) => {
        if (playerSortBy === column) {
            setPlayerSortDirection(playerSortDirection === "asc" ? "desc" : "asc");
        } else {
            setPlayerSortBy(column);
            setPlayerSortDirection("asc");
        }
    };

    // Handle select all checkbox
    const handleSelectAll = () => {
        const newSelectAllState = !selectAll;
        setSelectAll(newSelectAllState);

        // Create updates for all players
        const updates = players.map(player => ({
            name: player.name,
            active: newSelectAllState
        }));

        // Use batch update if available, otherwise fall back to individual updates
        if (handleBatchPlayerActiveToggle) {
            handleBatchPlayerActiveToggle(updates);
        } else {
            players.forEach(player => {
                handleTogglePlayerActive(player.name, newSelectAllState);
            });
        }
    };

    // Check if all players have the same active state
    useEffect(() => {
        const allActive = players.every(p => p.active);
        const allInactive = players.every(p => !p.active);

        if (allActive) {
            setSelectAll(true);
        } else if (allInactive) {
            setSelectAll(false);
        }
    }, [players]);

    // Sort players based on current sort settings
    const sortedPlayers = [...players].sort((a, b) => {
        if (playerSortBy === "name") {
            return playerSortDirection === "asc"
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        } else if (playerSortBy === "rating") {
            const ratingA = parseFloat(computeRating(a));
            const ratingB = parseFloat(computeRating(b));
            return playerSortDirection === "asc" ? ratingA - ratingB : ratingB - ratingA;
        } else if (playerSortBy === "active") {
            if (a.active !== b.active) {
                return playerSortDirection === "asc"
                    ? (a.active ? -1 : 1)
                    : (a.active ? 1 : -1);
            }
            // Secondary sort by name if active status is the same
            return a.name.localeCompare(b.name);
        }
        return 0;
    });

    // Count active players
    const activePlayerCount = players.filter(player => player.active).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Players</h2>
                <div className="text-sm text-gray-400">
                    Active Players: <span className="text-white font-medium">{activePlayerCount}</span>
                </div>
            </div>

            {/* Column headers with sort controls */}
            <div className="flex items-center mb-2 border-b border-gray-800 pb-2">
                <div className="w-8 flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="form-checkbox h-4 w-4 text-blue-600"
                    />
                </div>

                <div className="flex-grow flex justify-between items-center ml-3">
                    <button
                        onClick={() => handlePlayerSort("name")}
                        className={`text-xs font-medium flex items-center ${playerSortBy === "name" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                            }`}
                    >
                        Name
                        {playerSortBy === "name" && (
                            <span className="ml-1">
                                {playerSortDirection === "asc" ? "↑" : "↓"}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handlePlayerSort("rating")}
                        className={`text-xs font-medium flex items-center ${playerSortBy === "rating" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                            }`}
                    >
                        Rating
                        {playerSortBy === "rating" && (
                            <span className="ml-1">
                                {playerSortDirection === "asc" ? "↑" : "↓"}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handlePlayerSort("active")}
                        className={`text-xs font-medium flex items-center ${playerSortBy === "active" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                            }`}
                    >
                        Active
                        {playerSortBy === "active" && (
                            <span className="ml-1">
                                {playerSortDirection === "asc" ? "↑" : "↓"}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Player list */}
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                {sortedPlayers.map((player) => {
                    const rating = computeRating(player);
                    const ratingPercent = getPercentage(rating);

                    return (
                        <div
                            key={player.name}
                            className={`flex items-center border-b border-gray-800 py-2 ${player.active ? "" : "opacity-60"
                                }`}
                        >
                            {/* Active checkbox */}
                            <div className="w-8 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-4 w-4 text-blue-600"
                                    checked={player.active}
                                    onChange={(e) => handleTogglePlayerActive(player.name, e.target.checked)}
                                />
                            </div>

                            {/* Player name and rating */}
                            <div className="flex-grow ml-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-white">
                                        {player.name}
                                    </div>
                                    <div className="text-sm font-medium text-blue-400">
                                        {rating}
                                    </div>
                                </div>

                                {/* Rating bar visual */}
                                <div className="flex items-center mt-1">
                                    <div className="bg-gray-800 h-1 rounded flex-grow">
                                        <div
                                            className="bg-blue-500 h-1 rounded"
                                            style={{ width: `${ratingPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No players message */}
            {players.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    No players available. Add players to start generating teams.
                </div>
            )}

            {/* Rating explanation */}
            <div className="text-xs text-gray-400 mt-4 p-3 bg-gray-800 rounded">
                <p className="mb-1 text-sm text-white">Rating Formula</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Scoring: {weightings.scoring * 100}%</li>
                    <li>Defense: {weightings.defense * 100}%</li>
                    <li>Rebounding: {weightings.rebounding * 100}%</li>
                    <li>Playmaking: {weightings.playmaking * 100}%</li>
                    <li>Stamina: {weightings.stamina * 100}%</li>
                    <li>Physicality: {weightings.physicality * 100}%</li>
                    <li>X-Factor: {weightings.xfactor * 100}%</li>
                </ul>
            </div>
        </div>
    );
}