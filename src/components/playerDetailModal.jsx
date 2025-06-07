// PlayerDetailModal.jsx
import React, { useState } from "react";
import { getPlayerBadges, getBadgeProgress, badgeCategories, calculatePlayerStats } from "./badgeSystem.jsx";
import Badge from "./Badge";

function getCategoryIcon(categoryName) {
    const iconMap = {
        "Vet": "gamesPlayed",
        "Winner": "wins",
        "MVP": "mvps",
        "Win Streak": "winStreaks"
    };
    return iconMap[categoryName] || "gamesPlayed"; // default fallback
}

export default function PlayerDetailModal({ 
    isOpen, 
    onClose, 
    player, 
    leaderboard = {}, 
    matchHistory = [],
    playerOVRs = {}
}) {
    const [activeTab, setActiveTab] = useState("overview");

    if (!isOpen || !player) return null;

    const playerStats = calculatePlayerStats(player.name, leaderboard, matchHistory);
    const badges = getPlayerBadges(player.name, leaderboard, matchHistory);
    const progress = getBadgeProgress(player.name, leaderboard, matchHistory);
    const playerLeaderboardStats = leaderboard[player.name] || { _w: 0, _l: 0, MVPs: 0 };
    const overallRating = playerOVRs[player.name] || 5;

    const winPercentage = playerStats.gamesPlayed > 0 ? 
        ((playerStats.wins / playerStats.gamesPlayed) * 100).toFixed(1) : "0.0";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <div className="flex items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                            <div className="flex items-center mt-1">
                                <span className="text-blue-400 text-lg font-medium">
                                    {overallRating.toFixed(1)} OVR
                                </span>
                                <div className="ml-4 text-sm text-gray-300">
                                    {playerStats.gamesPlayed} games • {winPercentage}% win rate
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-700 bg-gray-800">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-6 py-3 text-sm font-medium ${
                            activeTab === "overview"
                                ? "text-blue-400 border-b-2 border-blue-400 bg-gray-750"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("awards")}
                        className={`px-6 py-3 text-sm font-medium ${
                            activeTab === "awards"
                                ? "text-blue-400 border-b-2 border-blue-400 bg-gray-750"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        Awards & Badges
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Player Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-700 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-white">{playerStats.gamesPlayed}</div>
                                    <div className="text-sm text-gray-400">Games Played</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-400">{playerStats.wins}</div>
                                    <div className="text-sm text-gray-400">Wins</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-400">{playerLeaderboardStats._l}</div>
                                    <div className="text-sm text-gray-400">Losses</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{playerStats.mvps}</div>
                                    <div className="text-sm text-gray-400">MVPs</div>
                                </div>
                            </div>

                            {/* Player Abilities */}
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-white mb-4">Player Abilities</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {["scoring", "defense", "rebounding", "playmaking", "stamina", "physicality", "xfactor"].map((ability) => (
                                        <div key={ability} className="flex justify-between items-center">
                                            <span className="text-gray-300 capitalize">{ability}:</span>
                                            <div className="flex items-center">
                                                <div className="w-20 h-2 bg-gray-600 rounded-full mr-2">
                                                    <div 
                                                        className="h-2 bg-blue-500 rounded-full"
                                                        style={{ width: `${((player[ability] || 5) / 10) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-white font-medium w-6 text-right">
                                                    {player[ability] || 5}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Badges */}
                            {Object.keys(badges).length > 0 && (
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-white mb-3">Recent Achievements</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.values(badges).slice(0, 4).map((badge, index) => {
                                            const categoryIcon = getCategoryIcon(badge.categoryName);

                                            return (
                                                <div key={index} className="flex items-center bg-gray-600 p-3 rounded">
                                                    <Badge
                                                        badge={badge}
                                                        categoryId={getCategoryIcon(badge.categoryName)}
                                                        size="normal"
                                                        showTooltip={false}
                                                    />
                                                    <div className="ml-4">
                                                        <div className={`text-white font-medium ${badge.color}`}>
                                                            {badge.name}
                                                        </div>
                                                        <div className="text-xs text-gray-400">{badge.categoryName}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "awards" && (
                        <div className="space-y-6">
                            {/* Earned Badges */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Earned Badges ({Object.keys(badges).length})
                                </h3>
                                {Object.keys(badges).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(badges).map(([categoryId, badge]) => {
                                            const categoryIcon = getCategoryIcon(badge.categoryName);

                                            return (
                                                <div key={categoryId} className="bg-gray-700 p-4 rounded-lg">
                                                    <div className="flex items-center mb-2">
                                                        <Badge
                                                            badge={badge}
                                                            categoryId={getCategoryIcon(badge.categoryName)}
                                                            size="normal"
                                                            showTooltip={false}
                                                        />
                                                        <div className="ml-4">
                                                            <div className={`text-white font-medium ${badge.color}`}>
                                                                {badge.name}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                {badge.currentValue} {badge.categoryName.toLowerCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        No badges earned yet. Keep playing to unlock achievements!
                                    </div>
                                )}
                            </div>

                            {/* Progress Towards Next Badges */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Progress Towards Next Badges</h3>
                                <div className="space-y-4">
                                    {Object.entries(progress).map(([categoryId, prog]) => {
                                        if (!prog.nextTier) return null; // Already at max tier
                                        
                                        return (
                                            <div key={categoryId} className="bg-gray-700 p-4 rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center">
                                                        <span className="text-xl mr-2">
                                                            {badgeCategories[categoryId].icon}
                                                        </span>
                                                        <div>
                                                            <div className="text-white font-medium">
                                                                {prog.nextTier.name} {prog.categoryName}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                {prog.currentValue} / {prog.nextTier.threshold}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`text-lg ${prog.nextTier.color}`}>
                                                        {prog.nextTier.icon}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-600 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${prog.progressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {(prog.nextTier.threshold - prog.currentValue)} more needed
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}