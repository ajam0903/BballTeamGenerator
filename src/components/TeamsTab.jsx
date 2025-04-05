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
}) {
    // Sort players so active ones appear on top
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.active === b.active) return 0;
        return a.active ? -1 : 1;
    });

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

        // clamp if you want to ensure 10 is max
        const rating = Math.min(raw, 10);
        return rating;
    };

    // For the percentage-based bar
    const getPercentage = (rating) => {
        // rating is from 0–10, so rating=5 => 50%
        return (rating / 10) * 100;
    };

    return (
        <div className="p-6 space-y-8 bg-gray-900 text-gray-100 min-h-screen">
            {/* Control Section */}
            <div className="flex items-center space-x-4">
                <label className="font-medium">Team Size:</label>
                <select
                    className="border border-gray-700 bg-gray-800 rounded px-3 py-2 text-gray-100"
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                >
                    {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                            {n}v{n}
                        </option>
                    ))}
                </select>
                <StyledButton
                    onClick={generateBalancedTeams}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Generate Teams
                </StyledButton>
            </div>

            {/* Teams List */}
            {teams.length === 0 && (
                <p className="text-gray-400 italic">
                    No teams generated yet. Select active players and click "Generate Teams".
                </p>
            )}

            {teams.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Teams</h2>
                    {teams.map((team, i) => (
                        <div key={i} className="bg-gray-800 p-4 rounded shadow-md">
                            <strong>Team {i + 1}:</strong>{" "}
                            {team.map((p) => p.name).join(", ")}
                        </div>
                    ))}
                </div>
            )}

            {/* Matchups Section */}
            {matchups.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Matchups</h2>
                    {matchups.map(([teamA, teamB], i) => (
                        <div key={i} className="bg-gray-800 shadow-md p-4 rounded">
                            <strong className="block mb-2">Match {i + 1}:</strong>
                            <p className="mb-2">
                                {teamA.map((p) => p.name).join(", ")} vs{" "}
                                {teamB.map((p) => p.name).join(", ")}
                            </p>
                            <div className="flex items-center space-x-2 mb-2">
                                <label className="font-medium">MVP:</label>
                                <select
                                    className="border border-gray-700 bg-gray-900 rounded px-2 py-1 text-gray-100"
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
                                <StyledButton
                                    onClick={saveMatchResults}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Save Match Results
                                </StyledButton>

                            </div>

                            <div className="flex items-center space-x-2">
                                <label className="font-medium">Score:</label>
                                <input
                                    type="number"
                                    placeholder="Team A"
                                    className="border border-gray-700 bg-gray-900 rounded px-2 py-1 w-20 text-gray-100"
                                    value={scores[i]?.a || ""}
                                    onChange={(e) => {
                                        const updated = [...scores];
                                        updated[i] = { ...updated[i], a: e.target.value };
                                        setScores(updated);
                                    }}
                                />
                                <span className="text-gray-400">vs</span>
                                <input
                                    type="number"
                                    placeholder="Team B"
                                    className="border border-gray-700 bg-gray-900 rounded px-2 py-1 w-20 text-gray-100"
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

            {/* Player List with percentage-based rating bar */}
            {sortedPlayers.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-xl font-bold">Player List</h2>
                    {sortedPlayers.map((player) => {
                        const rating = computeRating1to10(player);
                        // from 0-10 => 0-100%
                        const ratingPercent = (rating / 10) * 100;

                        return (
                            <div
                                key={player.name}
                                className="flex items-center bg-gray-800 shadow p-3 rounded mb-2"
                            >
                                {/* Active checkbox on the left */}
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

                                {/* Player name + rating bar */}
                                <div className="flex-grow">
                                    <div className="font-medium text-white text-sm sm:text-base">
                                        {player.name}
                                    </div>

                                    {/* Outer container for rating bar (responsive) */}
                                    <div className="bg-gray-700 h-4 mt-1 rounded relative w-full max-w-xs sm:max-w-sm">
                                        <div
                                            className="bg-red-500 h-4 rounded-l"
                                            style={{ width: `${ratingPercent}%` }}
                                        />
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        Rating: {rating.toFixed(1)} / 10
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
