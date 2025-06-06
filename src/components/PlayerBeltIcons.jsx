// PlayerBeltIcons.jsx
import React, { useState } from "react";
import { beltCategories } from "./BeltsSystem";

export default React.memo(function PlayerBeltIcons({ playerName, currentBelts, size }) {
    const [showTooltip, setShowTooltip] = useState(null);

    // Find all belts this player holds
    const playerBelts = Object.entries(currentBelts)
        .filter(([_, holder]) => holder?.playerName === playerName)
        .map(([beltId, _]) => ({ beltId, ...beltCategories[beltId] }));

    if (playerBelts.length === 0) return null;

    // Size configurations
    const sizeConfig = {
        small: {
            container: "w-5 h-5",
            icon: "text-xs",
            gap: "gap-0.5"
        },
        normal: {
            container: "w-7 h-7",
            icon: "text-sm",
            gap: "gap-1"
        }
    };

    const config = sizeConfig[size] || sizeConfig.normal;

    const handleIconClick = (beltId) => {
        // Toggle tooltip on mobile click
        setShowTooltip(showTooltip === beltId ? null : beltId);
    };

    const handleMouseEnter = (beltId) => {
        // Show tooltip on desktop hover
        setShowTooltip(beltId);
    };

    const handleMouseLeave = () => {
        // Hide tooltip when mouse leaves
        setShowTooltip(null);
    };

    return (
        <div className={`flex items-center ${config.gap} ml-2`}>
            {playerBelts.map(belt => (
                <div
                    key={belt.beltId}
                    className="relative inline-block"
                >
                    <div
                        className={`${config.container} rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 border ${belt.isNegative
                                ? 'bg-red-900 bg-opacity-20 border-red-500 hover:bg-opacity-30'
                                : 'bg-green-900 bg-opacity-20 border-green-500 hover:bg-opacity-30'
                            }`}
                        onClick={() => handleIconClick(belt.beltId)}
                        onMouseEnter={() => handleMouseEnter(belt.beltId)}
                        onMouseLeave={handleMouseLeave}
                        role="button"
                        tabIndex={0}
                    >
                        <span className={config.icon}>
                            {belt.icon}
                        </span>
                    </div>

                    {/* Tooltip */}
                    {showTooltip === belt.beltId && (
                        <div className={`absolute z-50 px-2 py-1 text-xs font-medium text-white rounded shadow-lg pointer-events-none
                            ${belt.isNegative ? 'bg-red-800' : 'bg-green-800'}
                            bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap
                        `}>
                            {belt.name}
                            {/* Arrow pointing down */}
                            <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
                                border-l-4 border-r-4 border-transparent
                                ${belt.isNegative ? 'border-t-4 border-t-red-800' : 'border-t-4 border-t-green-800'}
                            `}></div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.playerName === nextProps.playerName &&
        prevProps.size === nextProps.size &&
        JSON.stringify(prevProps.currentBelts) === JSON.stringify(nextProps.currentBelts);
});