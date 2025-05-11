// Create a new component: MatchHistoryTab.jsx
import React, { useState } from "react";

export default function MatchHistoryTab({ matchHistory, calculatePlayerScore, weightings }) {
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Calculate player rating from stats
    const calculatePlayerRating = (player) => {
        return (
            player.scoring * weightings.scoring +
            player.defense * weightings.defense +
            player.rebounding * weightings.rebounding +
            player.playmaking * weightings.playmaking +
            player.stamina * weightings.stamina +
            player.physicality * weightings.physicality +
            player.xfactor * weightings.xfactor
        ).toFixed(1);
    };

    // Sort history by date (most recent first)
    const sortedHistory = [...(matchHistory || [])].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    // Filter history based on search term
    const filteredHistory = sortedHistory.filter(match => {
        if (!searchTerm) return true;

        // Search in player names
        const allPlayers = [...match.teams[0], ...match.teams[1]].map(p => p.name.toLowerCase());
        const searchLower = searchTerm.toLowerCase();

        // Return matches that contain the search term in any player name
        return allPlayers.some(name => name.includes(searchLower));
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h2 className="text-xl font-bold text-white">Match History</h2>

                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search player name..."
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <select
                        className="bg-gray-800 border border-gray-700 rounded text-white px-2 py-1 text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Matches</option>
                        <option value="recent">Last 10</option>
                        <option value="thisMonth">This Month</option>
                    </select>
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    {searchTerm ? "No matches found for your search." : "No match history available."}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredHistory.map((match, index) => {
                        const teamA = match.teams[0];
                        const teamB = match.teams[1];
                        const scoreA = parseInt(match.score?.a);
                        const scoreB = parseInt(match.score?.b);
                        const teamAWon = scoreA > scoreB;
                        const matchDate = new Date(match.date);

                        return (
                            <div key={index} className="border border-gray-800 rounded-lg overflow-hidden">
                                {/* Match header */}
                                <div className="bg-gray-800 p-3 flex justify-between items-center">
                                    <div className="text-sm text-gray-300">
                                        <span className="font-medium">{matchDate.toLocaleDateString()}</span>
                                        <span className="text-xs ml-2 text-gray-400">
                                            {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="text-sm">
                                        <span className="font-bold text-white mr-1">
                                            {scoreA} - {scoreB}
                                        </span>
                                    </div>
                                </div>

                                {/* Match details */}
                                <div className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Team A */}
                                        <div className={`p-3 rounded ${teamAWon ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-300">Team A</span>
                                                <span className={`text-sm font-bold ${teamAWon ? 'text-green-400' : 'text-red-400'}`}>
                                                    {teamAWon ? 'WIN' : 'LOSS'}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {teamA.map((player, playerIndex) => (
                                                    <div key={playerIndex} className="flex justify-between items-center">
                                                        <span className="text-sm text-white">
                                                            {player.name}
                                                            {match.mvp === player.name && (
                                                                <span className="ml-2 text-xs text-yellow-400">MVP</span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-blue-400">
                                                            {calculatePlayerRating(player)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Team B */}
                                        <div className={`p-3 rounded ${!teamAWon ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-300">Team B</span>
                                                <span className={`text-sm font-bold ${!teamAWon ? 'text-green-400' : 'text-red-400'}`}>
                                                    {!teamAWon ? 'WIN' : 'LOSS'}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {teamB.map((player, playerIndex) => (
                                                    <div key={playerIndex} className="flex justify-between items-center">
                                                        <span className="text-sm text-white">
                                                            {player.name}
                                                            {match.mvp === player.name && (
                                                                <span className="ml-2 text-xs text-yellow-400">MVP</span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-blue-400">
                                                            {calculatePlayerRating(player)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
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