// PlayerBeltIcons.jsx
import React from "react";
import { beltCategories } from "./BeltsSystem";

export default function PlayerBeltIcons({ playerName, currentBelts = {} }) {
    // Find all belts this player holds
    const playerBelts = Object.entries(currentBelts)
        .filter(([_, holder]) => holder?.playerName === playerName)
        .map(([beltId, _]) => ({ beltId, ...beltCategories[beltId] }));

    if (playerBelts.length === 0) return null;

    // Separate belts into positive and negative for styling
    const positiveBelts = playerBelts.filter(belt => !belt.isNegative);
    const negativeBelts = playerBelts.filter(belt => belt.isNegative);

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {/* Positive belts with green background */}
            {positiveBelts.map(belt => (
                <div 
                    key={belt.beltId}
                    className="bg-green-900 bg-opacity-30 text-white px-1.5 py-0.5 rounded flex items-center"
                    title={belt.description}
                >
                    <span className="mr-1">{belt.icon}</span>
                    <span className="text-xs font-medium">{belt.name}</span>
                </div>
            ))}
            
            {/* Negative belts with red background */}
            {negativeBelts.map(belt => (
                <div 
                    key={belt.beltId}
                    className="bg-red-900 bg-opacity-30 text-white px-1.5 py-0.5 rounded flex items-center"
                    title={belt.description}
                >
                    <span className="mr-1">{belt.icon}</span>
                    <span className="text-xs font-medium">{belt.name}</span>
                </div>
            ))}
        </div>
    );
}
