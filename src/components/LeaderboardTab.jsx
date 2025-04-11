// Updated LeaderboardTab.jsx with just number values for abilities
import React, { useState, useEffect } from "react";
import { StyledButton } from "./UIComponents";

export default function LeaderboardTab({ leaderboard, resetLeaderboardData, isAdmin, matchHistory, players }) {
    const [sortBy, setSortBy] = useState("ovr");
    const [sortDirection, setSortDirection] = useState("desc");
    const [scrollPosition, setScrollPosition] = useState(0);

    // Calculate OVR based on player stats and recent performance
    const calculateOVR = (player, playerName) => {
        // Find player in players array to get their abilities
        const playerData = players.find(p => p.name === playerName) || {};

        // Base stats from player abilities
        const baseStats = {
            scoring: playerData.scoring || 5,
            defense: playerData.defense || 5,
            rebounding: playerData.rebounding || 5,
            playmaking: playerData.playmaking || 5,
            stamina: playerData.stamina || 5,
            physicality: playerData.physicality || 5,
            xfactor: playerData.xfactor || 5
        };

        // Performance metrics
        const wins = player._w || 0;
        const losses = player._l || 0;
        const totalGames = wins + losses;
        const winPct = totalGames > 0 ? wins / totalGames : 0;
        const mvps = player.MVPs || 0;
        const mvpPerGame = totalGames > 0 ? mvps / totalGames : 0;

        // Recent form (last 5 games)
        const recentForm = getRecentForm(playerName);
        const streakBonus = getStreakBonus(recentForm);

        // Calculate OVR (NBA 2K style)
        // Base calculation using player attributes
        const baseOVR = (
            baseStats.scoring * 0.25 +
            baseStats.defense * 0.2 +
            baseStats.rebounding * 0.15 +
            baseStats.playmaking * 0.15 +
            baseStats.stamina * 0.1 +
            baseStats.physicality * 0.1 +
            baseStats.xfactor * 0.05
        ) * 10; // Scale to 50-99 range

        // Performance boost (max +5 for 100% win rate, max +5 for MVPs)
        const performanceBoost = (winPct * 5) + (mvpPerGame * 15);

        // Streak adjustment (+2 for hot streak, -1 for cold streak)
        const finalOVR = Math.round(baseOVR + performanceBoost + streakBonus);

        // Clamp to realistic range (50-99)
        return Math.min(Math.max(finalOVR, 50), 99);
    };

    // Get recent performance over the last 5 games
    const getRecentForm = (playerName) => {
        if (!matchHistory || matchHistory.length === 0) return [];

        // Sort by most recent
        const sortedHistory = [...matchHistory].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Get last 5 games where this player participated
        const playerGames = [];

        for (const match of sortedHistory) {
            const teamA = match.teams[0].map(p => p.name);
            const teamB = match.teams[1].map(p => p.name);
            const playerTeam = teamA.includes(playerName) ? 'A' :
                teamB.includes(playerName) ? 'B' : null;

            if (playerTeam) {
                const scoreA = parseInt(match.score?.a) || 0;
                const scoreB = parseInt(match.score?.b) || 0;
                const won = (playerTeam === 'A' && scoreA > scoreB) ||
                    (playerTeam === 'B' && scoreB > scoreA);
                const isMVP = match.mvp === playerName;

                playerGames.push({ won, isMVP });

                if (playerGames.length >= 5) break;
            }
        }

        return playerGames;
    };

    // Calculate streak bonus based on recent form
    const getStreakBonus = (recentForm) => {
        if (recentForm.length < 3) return 0;

        // Check for a winning or losing streak in the last 3 games
        const last3Games = recentForm.slice(0, 3);
        const allWins = last3Games.every(game => game.won);
        const allLosses = last3Games.every(game => !game.won);

        if (allWins) return 2; // Hot streak bonus
        if (allLosses) return -1; // Cold streak penalty

        return 0;
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
            ovr: calculateOVR(stats, name),
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
                <p>The Overall Rating (OVR) is calculated similar to NBA 2K:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Base attributes (scoring, defense, playmaking, etc.)</li>
                    <li>Win/Loss performance (up to +5 for 100% win rate)</li>
                    <li>MVP recognition (significant boost for consistent MVPs)</li>
                    <li>Hot/Cold streak adjustments (+2 for 3 wins in a row, -1 for 3 losses)</li>
                </ul>
                <p className="mt-2">Performance trend (+/-) reflects improvement or decline in recent games.</p>
            </div>
        </div>
    );
}