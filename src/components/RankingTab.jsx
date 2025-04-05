// RankingTab.jsx
import React, { useState } from "react";
import {
    StyledButton,
    // Remove or adjust default StyledInput if it was causing white BG:
    // We'll do custom classes directly below.
} from "./UIComponents";

export default function RankingTab({
    players,
    newRating,
    setNewRating,
    handleRatingSubmit,
    handleDeletePlayer,
    openEditModal,
    isAdmin,
}) {
    const [sortKey, setSortKey] = useState("name");

    const computeRating = (p) => {
        return (
            (p.scoring || 5) * 0.25 +
            (p.defense || 5) * 0.2 +
            (p.rebounding || 5) * 0.15 +
            (p.playmaking || 5) * 0.15 +
            (p.stamina || 5) * 0.1 +
            (p.physicality || 5) * 0.1 +
            (p.xfactor || 5) * 0.05
        ).toFixed(2);
    };

    const sortedPlayers = [...players].sort((a, b) => {
        if (sortKey === "name") {
            return a.name.localeCompare(b.name);
        } else {
            // rating desc
            return computeRating(b) - computeRating(a);
        }
    });

    return (
        <div className="p-6 space-y-8 bg-gray-900 text-gray-100 min-h-screen">
            <h2 className="text-2xl font-bold">Player Rankings</h2>

            {/* Rating Criteria Card */}
            <div className="bg-gray-800 p-4 rounded shadow space-y-2">
                <h3 className="text-xl font-bold">Rating Criteria</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm sm:text-base text-gray-200">
                    <li>
                        <strong>Scoring Ability</strong> – Can they create and finish?
                    </li>
                    <li>
                        <strong>Defense</strong> – On-ball defense, help defense, lateral movement.
                    </li>
                    <li>
                        <strong>Rebounding</strong> – Positioning, effort, box-out ability.
                    </li>
                    <li>
                        <strong>Playmaking / IQ</strong> – Passing, decision-making, court vision.
                    </li>
                    <li>
                        <strong>Stamina / Speed</strong> – Hustle, quickness, movement without the ball.
                    </li>
                    <li>
                        <strong>Size / Physicality</strong> – Height, strength, ability to guard bigger players.
                    </li>
                    <li>
                        <strong>X-Factor (Optional)</strong> – Leadership, clutch play, hustle, or consistency.
                    </li>
                </ul>
            </div>

            {/* Sort & Filter Controls */}
            <div className="flex items-center space-x-4 mb-4">
                <label className="font-medium">Sort By:</label>
                <select
                    className="border border-gray-700 bg-gray-800 rounded px-3 py-2 text-gray-100"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                >
                    <option value="name">Name</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            {/* Player List */}
            <div className="space-y-2">
                {sortedPlayers.map((player) => {
                    const rating = computeRating(player);
                    return (
                        <div
                            key={player.name}
                            className="flex items-center bg-gray-800 shadow p-3 rounded justify-between"
                        >
                            <div>
                                <span className="font-medium text-white">{player.name}</span>
                                <span className="ml-2 text-sm text-gray-400">(Rating: {rating})</span>
                                <p className="text-xs text-gray-400">Ratings submitted: {player.submissions?.length || 0}</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                {isAdmin && (
                                    <StyledButton
                                        onClick={() => openEditModal(player)}
                                        className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                        Edit
                                    </StyledButton>
                                )}
                               
                                {isAdmin && (
                                    <StyledButton
                                        onClick={() => handleDeletePlayer(player.name)}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Delete
                                    </StyledButton>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Submit New Rating */}
            <div className="bg-gray-800 p-4 rounded shadow space-y-2">
                <h3 className="text-xl font-bold text-gray-100">Submit New Rating</h3>
                <input
                    placeholder="Name"
                    className="border border-gray-700 bg-gray-700 text-gray-100 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRating.name}
                    onChange={(e) => setNewRating({ ...newRating, name: e.target.value })}
                />
                {Object.entries(newRating).map(([key, value]) => {
                    if (key === "name") return null;
                    return (
                        <div key={key}>
                            <label className="block font-medium mb-1 capitalize text-gray-200">
                                {key}
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                className="border border-gray-700 bg-gray-700 text-gray-100 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={value}
                                onChange={(e) =>
                                    setNewRating({
                                        ...newRating,
                                        [key]: parseInt(e.target.value) || 1,
                                    })
                                }
                            />
                        </div>
                    );
                })}
                <StyledButton
                    onClick={handleRatingSubmit}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Submit Rating
                </StyledButton>
            </div>
        </div>
    );
}
