import React from "react";

export default function LeaderboardTab({ leaderboard, resetLeaderboardData }) {
    const sortedPlayers = Object.keys(leaderboard).sort((a, b) => {
        return (leaderboard[b].MVPs || 0) - (leaderboard[a].MVPs || 0);
    });

    return (
        <div className="p-6 space-y-6 bg-gray-900 text-gray-100 min-h-screen">
            <h2 className="text-2xl font-bold mb-4">🏆 Leaderboard</h2>
            <button
                onClick={resetLeaderboardData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow mb-4"
            >
                Reset Leaderboard
            </button>

            {sortedPlayers.length === 0 ? (
                <p className="text-gray-400 italic">No results recorded yet.</p>
            ) : (
                <ul className="space-y-2">
                    {sortedPlayers.map((player) => {
                        const stats = leaderboard[player];
                        return (
                            <li key={player} className="bg-gray-800 p-4 rounded shadow">
                                <strong className="text-white">{player}</strong>
                                <div className="text-sm text-gray-300 mt-1">
                                    MVPs: <span className="font-medium">{stats.MVPs}</span> |{" "}
                                    Wins: <span className="font-medium">{stats._w || 0}</span> |{" "}
                                    Losses: <span className="font-medium">{stats._l || 0}</span> |{" "}
                                    Win %:{" "}
                                    <span className="font-medium">
                                        {(stats._w || 0) + (stats._l || 0) > 0
                                            ? (((stats._w || 0) / ((stats._w || 0) + (stats._l || 0))) * 100).toFixed(1)
                                            : "0.0"}
                                        %
                                    </span>
                                </div>

                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
