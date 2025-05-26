// BeltsTab.jsx
import React, { useState } from "react";
import { beltCategories } from "./BeltsSystem";
import BeltVotingModal from "./BeltVotingModal";
import { StyledButton } from "./UIComponents";

export default function BeltsTab({ 
    players = [], 
    currentBelts = {}, 
    userVotes = {},
    onVote,
    user
}) {
    const [showVotingModal, setShowVotingModal] = useState(false);
    const [activeTab, setActiveTab] = useState("positive"); // "positive" or "negative"

    const positiveBelts = Object.entries(beltCategories)
        .filter(([_, belt]) => !belt.isNegative)
        .map(([id, belt]) => ({ id, ...belt }));

    const negativeBelts = Object.entries(beltCategories)
        .filter(([_, belt]) => belt.isNegative)
        .map(([id, belt]) => ({ id, ...belt }));

    const handleVote = (beltId, playerName) => {
        onVote(beltId, playerName);
        setShowVotingModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Championship Belts</h2>
                
                <StyledButton 
                    onClick={() => setShowVotingModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!user}
                >
                    {user ? "Vote for Belts" : "Sign in to Vote"}
                </StyledButton>
            </div>

            {/* Tabs */}
            <div className="flex mb-4 border-b border-gray-700">
                <button 
                    className={`px-4 py-2 ${activeTab === "positive" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"}`}
                    onClick={() => setActiveTab("positive")}
                >
                    Positive Belts
                </button>
                <button 
                    className={`px-4 py-2 ${activeTab === "negative" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"}`}
                    onClick={() => setActiveTab("negative")}
                >
                    Negative Belts
                </button>
            </div>

            {/* Belt cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === "positive" ? positiveBelts : negativeBelts).map(belt => {
                    const holder = currentBelts[belt.id];
                    
                    return (
                        <div 
                            key={belt.id} 
                            className={`border ${belt.isNegative ? 
                                'border-red-800 bg-red-900 bg-opacity-10' : 
                                'border-green-800 bg-green-900 bg-opacity-10'} 
                            rounded-lg p-4`}
                        >
                            <div className="flex items-center mb-3">
                                <span className="text-3xl mr-3">{belt.icon}</span>
                                <div>
                                    <h3 className="text-lg font-medium text-white">{belt.name}</h3>
                                    <p className="text-sm text-gray-400">{belt.description}</p>
                                </div>
                            </div>
                            
                            {holder ? (
                                <div className="bg-gray-800 bg-opacity-50 p-3 rounded">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-medium text-white">{holder.playerName}</span>
                                        <span className="text-sm bg-blue-900 bg-opacity-40 px-2 py-1 rounded text-blue-300">
                                            {holder.votes} votes
                                        </span>
                                    </div>
                                    
                                    {userVotes[belt.id] === holder.playerName && (
                                        <div className="text-xs text-yellow-400 mt-1">
                                            You voted for this player
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-800 bg-opacity-50 p-3 rounded text-center text-gray-400">
                                    No player currently holds this belt
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Voting modal */}
            <BeltVotingModal
                isOpen={showVotingModal}
                onClose={() => setShowVotingModal(false)}
                players={players}
                onVote={handleVote}
                currentBelts={currentBelts}
                userVotes={userVotes}
            />
        </div>
    );
}
