// Updated LeaderboardTab.jsx with just number values for abilities
import React, { useState, useEffect } from "react";
import { StyledButton } from "./UIComponents";

export default function LeaderboardTab({ leaderboard, resetLeaderboardData, isAdmin, matchHistory, players, playerOVRs }) {
    const [sortBy, setSortBy] = useState("ovr");
    const [sortDirection, setSortDirection] = useState("desc");
    const [scrollPosition, setScrollPosition] = useState(0);


    // Calculate streak bonus based on recent form
    const getStreakBonus = (recentForm) => {
        if (recentForm.length === 0) return 0;

        // Get different game ranges
        const last3Games = recentForm.slice(0, 3);
        const last5Games = recentForm.slice(0, 5);
        const last10Games = recentForm.slice(0, 10);

        // Calculate wins and MVPs for different ranges
        const winsInLast3 = last3Games.filter(game => game.won).length;
        const winsInLast5 = last5Games.filter(game => game.won).length;
        const winsInLast10 = last10Games.filter(game => game.won).length;

        const mvpsInLast3 = last3Games.filter(game => game.isMVP).length;
        const mvpsInLast5 = last5Games.filter(game => game.isMVP).length;
        const mvpsInLast10 = last10Games.filter(game => game.isMVP).length;

        // Maximum bonus: +5 for exceptional performance
        // Hot streak: perfect last 5 games
        if (winsInLast5 === 5 && last5Games.length === 5) return 5;

        // Elite form: 9+ wins in last 10 games
        if (winsInLast10 >= 9 && last10Games.length >= 9) return 4;

        // Hot streak: 3 wins in last 3 games
        if (winsInLast3 === 3 && last3Games.length === 3) return 3;

        // Great form: 8 wins in last 10 games OR 4 wins in last 5
        if ((winsInLast10 >= 8 && last10Games.length >= 8) || (winsInLast5 >= 4 && last5Games.length >= 4)) return 2;

        // MVP streak: 3+ MVPs in last 5 games
        if (mvpsInLast5 >= 3 && last5Games.length >= 3) return 2;

        // Good form: 7 wins in last 10 games OR 3 wins in last 5
        if ((winsInLast10 >= 7 && last10Games.length >= 7) || (winsInLast5 >= 3 && last5Games.length >= 3)) return 1;

        // MVP presence: 2+ MVPs in last 10 games
        if (mvpsInLast10 >= 2 && last10Games.length >= 5) return 1;

        // Neutral performance: 5-6 wins in last 10 games
        if (winsInLast10 >= 5 && winsInLast10 <= 6 && last10Games.length >= 8) return 0;

        // Poor form: 3-4 wins in last 10 games
        if (winsInLast10 >= 3 && winsInLast10 <= 4 && last10Games.length >= 8) return -1;

        // Cold streak: 0 wins in last 3 games
        if (winsInLast3 === 0 && last3Games.length === 3) return -2;

        // Very poor form: 2 or fewer wins in last 10 games
        if (winsInLast10 <= 2 && last10Games.length >= 5) return -3;

        // Terrible form: 0-1 wins in last 5 games
        if (winsInLast5 <= 1 && last5Games.length >= 4) return -3;

        return 0;
    };

    // Update getRecentForm to get last 10 games instead of 5
    const getRecentForm = (playerName) => {
        if (!matchHistory || matchHistory.length === 0) return [];

        // Sort by most recent
        const sortedHistory = [...matchHistory].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Get last 10 games where this player participated
        const playerGames = [];

        for (const match of sortedHistory) {
            // Check if match has teams data in either format
            let teamA = [];
            let teamB = [];

            if (match.teams && Array.isArray(match.teams) && match.teams.length >= 2) {
                // App format: teams[0] and teams[1]
                teamA = match.teams[0].map(p => p.name);
                teamB = match.teams[1].map(p => p.name);
            } else if (match.teamA && match.teamB) {
                // Firestore format: teamA and teamB
                teamA = match.teamA.map(p => p.name);
                teamB = match.teamB.map(p => p.name);
            } else {
                // Skip if no valid team data
                continue;
            }

            const playerTeam = teamA.includes(playerName) ? 'A' :
                teamB.includes(playerName) ? 'B' : null;

            if (playerTeam) {
                const scoreA = parseInt(match.score?.a) || 0;
                const scoreB = parseInt(match.score?.b) || 0;
                const won = (playerTeam === 'A' && scoreA > scoreB) ||
                    (playerTeam === 'B' && scoreB > scoreA);
                const isMVP = match.mvp === playerName;

                playerGames.push({ won, isMVP });

                if (playerGames.length >= 10) break; // Changed from 5 to 10
            }
        }

        return playerGames;
    };

    // Get trend (+1, -1, 0) based on recent games
    const getTrend = (playerName) => {
        const recentForm = getRecentForm(playerName);

        if (recentForm.length < 2) return 0;

        // Compare last 2 games to previous 2 games
        const recent = recentForm.slice(0, 2);
        const earlier = recentForm.slice(2, 4);

        if (recent.length < 2 || earlier.length < 2) return 0;

        const recentWins = recent.filter(game => game.won).length;
        const earlierWins = earlier.filter(game => game.won).length;

        if (recentWins > earlierWins) return +2;
        if (recentWins < earlierWins) return +1;

        const recentMVPs = recent.filter(game => game.isMVP).length;
        const earlierMVPs = earlier.filter(game => game.isMVP).length;

        if (recentMVPs > earlierMVPs) return +2;
        if (recentMVPs < earlierMVPs) return -1;

        return 0;
    };

    // Process leaderboard data for display
    const processedData = Object.entries(leaderboard || {}).map(([name, stats]) => {
        // Find player data in players array
        const playerData = players.find(p => p.name === name) || {};

        return {
            name,
            ovr: playerOVRs[name] || 5,  // Use pre-calculated OVR
            trend: getTrend(name),
            wins: stats._w || 0,
            losses: stats._l || 0,
            mvps: stats.MVPs || 0,
            pct: stats._w + stats._l > 0 ? ((stats._w / (stats._w + stats._l)) * 100).toFixed(1) : "0.0",
            // Player abilities
            scoring: playerData.scoring || 5,
            defense: playerData.defense || 5,
            rebounding: playerData.rebounding || 5,
            playmaking: playerData.playmaking || 5,
            stamina: playerData.stamina || 5,
            physicality: playerData.physicality || 5,
            xfactor: playerData.xfactor || 5
        };
    });

    // Sort the data
    const sortedData = [...processedData].sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        if (sortBy === "name") {
            return sortDirection === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "string") aValue = parseFloat(aValue);
        if (typeof bValue === "string") bValue = parseFloat(bValue);

        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Handle sorting change
    const handleSort = (column) => {
        if (sortBy === column) {
            // Toggle direction if clicking the same column
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Default to descending for new column
            setSortBy(column);
            setSortDirection("desc");
        }
    };

    // Handle horizontal scrolling
    const handleScroll = (direction) => {
        const scrollContainer = document.getElementById('stats-table-container');
        if (scrollContainer) {
            const scrollAmount = direction === 'left' ? -200 : 200;
            scrollContainer.scrollLeft += scrollAmount;
            setScrollPosition(scrollContainer.scrollLeft);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Player Ratings</h2>
                {isAdmin && (
                    <StyledButton
                        onClick={resetLeaderboardData}
                        className="bg-red-600"
                    >
                        Reset Stats
                    </StyledButton>
                )}
            </div>

            {Object.keys(leaderboard || {}).length === 0 ? (
                <p className="text-gray-400 text-center py-8">No leaderboard data available yet.</p>
            ) : (
                <div className="relative">
                    {/* Scroll buttons */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
                        <button
                            onClick={() => handleScroll('left')}
                            className="bg-gray-800 p-2 rounded-r text-white opacity-80 hover:opacity-100 disabled:opacity-30"
                            disabled={scrollPosition <= 0}
                        >
                            ◀
                        </button>
                    </div>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10">
                        <button
                            onClick={() => handleScroll('right')}
                            className="bg-gray-800 p-2 rounded-l text-white opacity-80 hover:opacity-100"
                        >
                            ▶
                        </button>
                    </div>

                    {/* Scrollable stats table */}
                    <div
                        id="stats-table-container"
                        className="overflow-x-auto scrollbar-hide pb-2"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-800 sticky top-0 z-10">
                                <tr>
                                    {/* Fixed columns */}
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-800 cursor-pointer"
                                        onClick={() => handleSort("name")}
                                    >
                                        Player {sortBy === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("ovr")}
                                    >
                                        OVR {sortBy === "ovr" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        +/-
                                    </th>

                                    {/* Record columns */}
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("wins")}
                                    >
                                        W {sortBy === "wins" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("losses")}
                                    >
                                        L {sortBy === "losses" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("pct")}
                                    >
                                        W% {sortBy === "pct" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("mvps")}
                                    >
                                        MVPs {sortBy === "mvps" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>

                                    {/* Player abilities columns - just number values */}
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("scoring")}
                                    >
                                        Scoring {sortBy === "scoring" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("defense")}
                                    >
                                        Defense {sortBy === "defense" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("rebounding")}
                                    >
                                        Rebounding {sortBy === "rebounding" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("playmaking")}
                                    >
                                        Playmaking {sortBy === "playmaking" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("stamina")}
                                    >
                                        Stamina {sortBy === "stamina" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("physicality")}
                                    >
                                        Physicality {sortBy === "physicality" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort("xfactor")}
                                    >
                                        X-Factor {sortBy === "xfactor" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-gray-900">
                                {sortedData.map((player, index) => (
                                    <tr key={player.name} className={index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}>
                                        {/* Fixed column */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white sticky left-0 z-5 bg-inherit">
                                            {player.name}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-white">
                                            {player.ovr}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                                            <span className={
                                                player.trend > 0 ? "text-green-400" :
                                                    player.trend < 0 ? "text-red-400" : "text-gray-400"
                                            }>
                                                {player.trend > 0 ? `+${player.trend}` : player.trend < 0 ? player.trend : "0"}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-green-400">
                                            {player.wins}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-red-400">
                                            {player.losses}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-blue-400">
                                            {player.pct}%
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-yellow-400">
                                            {player.mvps}
                                        </td>

                                        {/* Player abilities - just number values, each in its own column */}
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.scoring}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.defense}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.rebounding}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.playmaking}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.stamina}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.physicality}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                            {player.xfactor}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-gray-800 rounded text-sm text-gray-300">
                <h3 className="font-bold text-white mb-2">OVR Rating Explanation</h3>
                <p>The Overall Rating (OVR) is the weighted average of player attributes (1-10 scale):</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Scoring: 25%</li>
                    <li>Defense: 20%</li>
                    <li>Rebounding: 15%</li>
                    <li>Playmaking: 15%</li>
                    <li>Stamina: 10%</li>
                    <li>Physicality: 10%</li>
                    <li>X-Factor: 5%</li>
                </ul>
                <p className="mt-2">Performance trend (+/-) reflects improvement or decline in recent games.</p>
            </div>
        </div>
    );
}