import React from "react";
import { StyledButton } from "./UIComponents";

export default function LeaderboardTab({ leaderboard, resetLeaderboardData, isAdmin }) {
    console.log("LeaderboardTab received leaderboard:", leaderboard);


    // Sort players by win percentage first, then total wins, then MVPs
    const sortedPlayers = Object.keys(leaderboard).sort((a, b) => {
        // Check if leaderboard is empty
        const isEmpty = !leaderboard || Object.keys(leaderboard).length === 0;
        console.log("Is leaderboard empty?", isEmpty);

        const sortedPlayers = Object.keys(leaderboard || {}).sort((a, b) => {
            return ((leaderboard[b]?.MVPs || 0) - (leaderboard[a]?.MVPs || 0));
        });

        console.log("Sorted players:", sortedPlayers);
        const aWins = leaderboard[a]._w || 0;
        const aLosses = leaderboard[a]._l || 0;
        const aTotalGames = aWins + aLosses;
        const aWinPct = aTotalGames > 0 ? aWins / aTotalGames : 0;

        const bWins = leaderboard[b]._w || 0;
        const bLosses = leaderboard[b]._l || 0;
        const bTotalGames = bWins + bLosses;
        const bWinPct = bTotalGames > 0 ? bWins / bTotalGames : 0;

        // Sort by win percentage first
        if (aWinPct !== bWinPct) return bWinPct - aWinPct;

        // Then by total wins
        if (aWins !== bWins) return bWins - aWins;

        // Then by MVPs
        return (leaderboard[b].MVPs || 0) - (leaderboard[a].MVPs || 0);
    });

    return (
        <div className="p-6 space-y-6 bg-gray-900 text-gray-100 min-h-screen">
            <h2 className="text-2xl font-bold mb-4">🏆 Leaderboard</h2>
            {isAdmin && (
                <StyledButton
                    onClick={resetLeaderboardData}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow mb-4"
                >
                    Reset Leaderboard
                </StyledButton>
            )}

            {sortedPlayers.length === 0 ? (
                <p className="text-gray-400 italic">No results recorded yet.</p>
            ) : (
                <ul className="space-y-2">
                    {sortedPlayers.map((player) => {
                        const stats = leaderboard[player];
                        const totalGames = (stats._w || 0) + (stats._l || 0);
                        const winPercentage = totalGames > 0
                            ? ((stats._w || 0) / totalGames * 100).toFixed(1)
                            : "0.0";

                        return (
                            <li key={player} className="bg-gray-800 p-4 rounded shadow">
                                <strong className="text-white">{player}</strong>
                                <div className="text-sm text-gray-300 mt-1">
                                    <span className="text-green-500">Wins: {stats._w || 0}</span> |
                                    <span className="text-red-500"> Losses: {stats._l || 0}</span> |
                                    <span className="text-yellow-400"> MVPs: {stats.MVPs || 0}</span> |
                                    Win %: {winPercentage}%
                                </div>

                                {/* Win percentage bar */}
                                <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${winPercentage}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}