// Add this component temporarily to your admin interface
// You can add it to AdminNotifications.jsx or create a separate component

import React, { useState } from 'react';
import { collection, getDocs, setDoc } from 'firebase/firestore';
import { StyledButton } from './UIComponents';

export default function PlayerNameRecoveryTool({ 
    currentLeagueId, 
    db, 
    isAdmin 
}) {
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryLog, setRecoveryLog] = useState([]);
    const [showTool, setShowTool] = useState(false);

    // Define the mapping of old names to new names
    // UPDATE THIS ARRAY with your actual name changes
    const nameChanges = [
        { oldName: "Mansoor Poonwala", newName: "Mansoor Poonawala" },
        { oldName: "Hussain Abbas", newName: "Shahzad Abbas" },
        // Add more mappings as needed
        // Example:
        // { oldName: "Hussain Abbas", newName: "Shahzad Abbas" },
        // { oldName: "Mansoor Poonwala", newName: "Mansoor Poonawala" },
    ];

    const runRecovery = async () => {
        if (!currentLeagueId || nameChanges.length === 0) {
            setRecoveryLog(prev => [...prev, "❌ No league ID or no name changes defined"]);
            return;
        }

        setIsRecovering(true);
        setRecoveryLog(["🔄 Starting recovery process..."]);

        try {
            // Get all users
            const allUsersSnapshot = await getDocs(collection(db, "users"));
            let totalUpdates = 0;
            let usersUpdated = 0;

            for (const userDoc of allUsersSnapshot.docs) {
                const userData = userDoc.data();
                const claimedPlayers = userData.claimedPlayers || [];
                let userHasUpdates = false;

                // Check each name change mapping
                const updatedClaimedPlayers = claimedPlayers.map(claim => {
                    if (claim.leagueId === currentLeagueId) {
                        // Find if this claim matches any of our old names
                        const nameChange = nameChanges.find(change => 
                            change.oldName.toLowerCase() === claim.playerName.toLowerCase()
                        );

                        if (nameChange) {
                            setRecoveryLog(prev => [...prev, 
                                `✅ Found claim for "${nameChange.oldName}" by ${userData.displayName || userData.email}, updating to "${nameChange.newName}"`
                            ]);
                            userHasUpdates = true;
                            totalUpdates++;
                            return { ...claim, playerName: nameChange.newName };
                        }
                    }
                    return claim;
                });

                // Only update if there were changes
                if (userHasUpdates) {
                    await setDoc(userDoc.ref, {
                        ...userData,
                        claimedPlayers: updatedClaimedPlayers
                    });
                    usersUpdated++;
                    setRecoveryLog(prev => [...prev, 
                        `💾 Updated claims for user: ${userData.displayName || userData.email}`
                    ]);
                }
            }

            // Also update notifications
            const notificationsRef = collection(db, "leagues", currentLeagueId, "notifications");
            const notificationsSnapshot = await getDocs(notificationsRef);
            let notificationsUpdated = 0;

            for (const notificationDoc of notificationsSnapshot.docs) {
                const notificationData = notificationDoc.data();
                
                if (notificationData.type === 'player_claim_request') {
                    const nameChange = nameChanges.find(change => 
                        change.oldName.toLowerCase() === notificationData.playerName.toLowerCase()
                    );

                    if (nameChange) {
                        await setDoc(notificationDoc.ref, {
                            ...notificationData,
                            playerName: nameChange.newName
                        });
                        notificationsUpdated++;
                        setRecoveryLog(prev => [...prev, 
                            `🔔 Updated notification for "${nameChange.oldName}" to "${nameChange.newName}"`
                        ]);
                    }
                }
            }

            setRecoveryLog(prev => [...prev, 
                "",
                "🎉 Recovery completed!",
                `📊 Summary:`,
                `   • ${totalUpdates} player claims updated`,
                `   • ${usersUpdated} users affected`,
                `   • ${notificationsUpdated} notifications updated`,
                "",
                "⚠️ You can now remove this recovery tool from your code."
            ]);

        } catch (error) {
            console.error("Error during recovery:", error);
            setRecoveryLog(prev => [...prev, `❌ Error: ${error.message}`]);
        } finally {
            setIsRecovering(false);
        }
    };

    // Preview what would be recovered
    const previewRecovery = async () => {
        if (!currentLeagueId || nameChanges.length === 0) {
            setRecoveryLog(["❌ No league ID or no name changes defined"]);
            return;
        }

        setRecoveryLog(["🔍 Previewing what would be recovered..."]);

        try {
            const allUsersSnapshot = await getDocs(collection(db, "users"));
            let foundClaims = 0;

            for (const userDoc of allUsersSnapshot.docs) {
                const userData = userDoc.data();
                const claimedPlayers = userData.claimedPlayers || [];

                claimedPlayers.forEach(claim => {
                    if (claim.leagueId === currentLeagueId) {
                        const nameChange = nameChanges.find(change => 
                            change.oldName.toLowerCase() === claim.playerName.toLowerCase()
                        );

                        if (nameChange) {
                            foundClaims++;
                            setRecoveryLog(prev => [...prev, 
                                `📋 Would update: "${nameChange.oldName}" → "${nameChange.newName}" (claimed by ${userData.displayName || userData.email})`
                            ]);
                        }
                    }
                });
            }

            setRecoveryLog(prev => [...prev, 
                "",
                `📊 Found ${foundClaims} claims that would be updated`,
                foundClaims > 0 ? "✅ Ready to run recovery" : "❌ No matching claims found"
            ]);

        } catch (error) {
            console.error("Error during preview:", error);
            setRecoveryLog(prev => [...prev, `❌ Error: ${error.message}`]);
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-red-400 flex items-center">
                    <span className="mr-2">🔧</span>
                    Player Name Recovery Tool (One-Time Use)
                </h3>
                <StyledButton
                    onClick={() => setShowTool(!showTool)}
                    className="bg-red-600 hover:bg-red-700 text-xs"
                >
                    {showTool ? 'Hide' : 'Show'} Tool
                </StyledButton>
            </div>

            {showTool && (
                <>
                    <div className="bg-gray-800 p-3 rounded-lg mb-4">
                        <h4 className="text-white mb-2">Instructions:</h4>
                        <ol className="text-sm text-gray-300 list-decimal list-inside space-y-1">
                            <li>Update the <code>nameChanges</code> array in the code with your actual old → new name mappings</li>
                            <li>Click "Preview" to see what would be recovered</li>
                            <li>Click "Run Recovery" to execute the changes</li>
                            <li>Remove this component from your code after use</li>
                        </ol>
                    </div>

                    <div className="bg-gray-800 p-3 rounded-lg mb-4">
                        <h4 className="text-white mb-2">Current Name Mappings:</h4>
                        {nameChanges.length === 0 ? (
                            <p className="text-yellow-400 text-sm">❌ No name changes defined. Update the nameChanges array in the code.</p>
                        ) : (
                            <ul className="text-sm text-gray-300 space-y-1">
                                {nameChanges.map((change, index) => (
                                    <li key={index}>
                                        <code>"{change.oldName}"</code> → <code>"{change.newName}"</code>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex space-x-3 mb-4">
                        <StyledButton
                            onClick={previewRecovery}
                            disabled={isRecovering || nameChanges.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            🔍 Preview Recovery
                        </StyledButton>
                        <StyledButton
                            onClick={runRecovery}
                            disabled={isRecovering || nameChanges.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isRecovering ? '🔄 Running...' : '🚀 Run Recovery'}
                        </StyledButton>
                    </div>

                    {recoveryLog.length > 0 && (
                        <div className="bg-gray-900 p-3 rounded-lg max-h-60 overflow-y-auto">
                            <h4 className="text-white mb-2">Recovery Log:</h4>
                            <div className="text-sm font-mono space-y-1">
                                {recoveryLog.map((line, index) => (
                                    <div key={index} className="text-gray-300">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}