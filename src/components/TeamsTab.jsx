// /src/components/TeamsTab.jsx
import React from "react";
import { StyledButton } from "./UIComponents";
import { useEffect, useState } from "react";

export default function TeamsTab({
    players = [],
    teams = [],
    setTeams,
    matchups = [],
    setMatchups,
    mvpVotes = [],
    setMvpVotes,
    scores = [],
    setScores,
    teamSize,
    setTeamSize,
    generateBalancedTeams,
    handlePlayerActiveToggle,
    weightings,
    saveMatchResults,
    archiveCompletedMatches,
    hasGeneratedTeams, // Add this prop
}) {
    // Sort players so active ones appear on top
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.active === b.active) return 0;
        return a.active ? -1 : 1;
    });

    // Count active players
    const activePlayerCount = players.filter(player => player.active).length;
    // Compute rating 1–10 based on your skill weighting
    const computeRating1to10 = (player) => {
        const {
            scoring = 5,
            defense = 5,
            rebounding = 5,
            playmaking = 5,
            stamina = 5,
            physicality = 5,
            xfactor = 5,
        } = player;

        const raw =
            scoring * weightings.scoring +
            defense * weightings.defense +
            rebounding * weightings.rebounding +
            playmaking * weightings.playmaking +
            stamina * weightings.stamina +
            physicality * weightings.physicality +
            xfactor * weightings.xfactor;

        // clamp rating to 10
        const rating = Math.min(raw, 10);
        return rating;
    };

    // For the percentage-based bar
    const getPercentage = (rating) => {
        // rating is from 0–10, so rating=5 => 50%
        return (rating / 10) * 100;
    };

    return (
        <div className="space-y-8">
            {/* Control Section - More minimal */}
            <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-400">Team Size:</label>
                <select
                    className="border-b border-gray-700 bg-gray-800 rounded-none px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                    style={{
                        /* Ensure background works in more browsers */
                        backgroundColor: "#1f2937", /* bg-gray-800 */
                    }}
                >
                    {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n} className="bg-gray-800 text-white">
                            {n}v{n}
                        </option>
                    ))}
                </select>
                <button
                    onClick={generateBalancedTeams}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    Generate Teams
                </button>
            </div>

            {/* Teams List - More minimal */}
            {!hasGeneratedTeams && teams.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                    No teams generated yet. Select active players and click "Generate Teams".
                </p>
            )}

            {hasGeneratedTeams && teams.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Teams</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teams.map((team, i) => (
                            <div key={i} className="border border-gray-800 p-3 rounded">
                                <span className="text-xs text-gray-400">Team {i + 1}</span>
                                <div className="text-sm mt-1">
                                    {team.map((p) => p.name).join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Matchups Section - More minimal */}
            {hasGeneratedTeams && matchups.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Matchups</h2>
                    {matchups.map(([teamA, teamB], i) => (
                        <div key={i} className="border border-gray-800 p-3 rounded">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-400">Match {i + 1}</span>
                                <button
                                    onClick={saveMatchResults}
                                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                                >
                                    Save Result
                                </button>
                            </div>

                            <p className="text-sm mb-3">
                                {teamA.map((p) => p.name).join(", ")} vs{" "}
                                {teamB.map((p) => p.name).join(", ")}
                            </p>

                            <div className="flex items-center space-x-3 mb-3">
                                <label className="text-xs text-gray-400">MVP:</label>
                                <select
                                    className="border-b border-gray-700 bg-transparent rounded-none px-2 py-1 text-sm text-white flex-grow focus:outline-none focus:border-blue-500"
                                    value={mvpVotes[i] || ""}
                                    onChange={(e) => {
                                        const updated = [...mvpVotes];
                                        updated[i] = e.target.value;
                                        setMvpVotes(updated);
                                    }}
                                >
                                    <option value="">-- Select MVP --</option>
                                    {[...teamA, ...teamB].map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-3">
                                <label className="text-xs text-gray-400">Score:</label>
                                <input
                                    type="number"
                                    placeholder="Team A"
                                    className="border-b border-gray-700 bg-transparent rounded-none px-2 py-1 w-16 text-sm text-white focus:outline-none focus:border-blue-500"
                                    value={scores[i]?.a || ""}
                                    onChange={(e) => {
                                        const updated = [...scores];
                                        updated[i] = { ...updated[i], a: e.target.value };
                                        setScores(updated);
                                    }}
                                />
                                <span className="text-xs text-gray-400">vs</span>
                                <input
                                    type="number"
                                    placeholder="Team B"
                                    className="border-b border-gray-700 bg-transparent rounded-none px-2 py-1 w-16 text-sm text-white focus:outline-none focus:border-blue-500"
                                    value={scores[i]?.b || ""}
                                    onChange={(e) => {
                                        const updated = [...scores];
                                        updated[i] = { ...updated[i], b: e.target.value };
                                        setScores(updated);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
     
            {/* Player List - More minimal */}
            {sortedPlayers.length > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Player List</h2>
                        <div className="text-xs text-gray-400">
                            Active Players: <span className="text-gray-400">{activePlayerCount}</span>
                        </div>
                    </div>
                    {sortedPlayers.map((player) => {
                        const rating = computeRating1to10(player);
                        const ratingPercent = getPercentage(rating);

                        return (
                            <div
                                key={player.name}
                                className="flex items-center border-b border-gray-800 py-2"
                            >
                                {/* Active checkbox */}
                                <div className="mr-3">
                                    <input
                                        type="checkbox"
                                        className="mr-1"
                                        checked={player.active}
                                        onChange={(e) =>
                                            handlePlayerActiveToggle(player.name, e.target.checked)
                                        }
                                    />
                                </div>

                                {/* Player name */}
                                <div className="flex-grow">
                                    <div className="text-sm">
                                        {player.name}
                                    </div>

                                    {/* Rating bar - more subtle */}
                                    <div className="flex items-center mt-1">
                                        <div className="bg-gray-800 h-1 rounded flex-grow">
                                            <div
                                                className="bg-blue-500 h-1 rounded-l"
                                                style={{ width: `${ratingPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {rating.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}