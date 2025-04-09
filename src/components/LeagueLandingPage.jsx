import React, { useState, useEffect } from "react";
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { DarkContainer, StyledButton, StyledInput } from "../components/UIComponents";
import { auth } from "../firebase";

const db = getFirestore();

export default function LeagueLandingPage({ user, onSelectLeague }) {
    const [leagues, setLeagues] = useState([]);
    const [newLeagueName, setNewLeagueName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Load user's leagues when component mounts or user changes
    useEffect(() => {
        if (!user) {
            setLeagues([]);
            setIsLoading(false);
            return;
        }

        const fetchUserLeagues = async () => {
            try {
                setIsLoading(true);

                // Get user document
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    // Create user document if it doesn't exist
                    await setDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        leagues: []
                    });
                    setLeagues([]);
                    setIsLoading(false);
                    return;
                }

                const userData = userDoc.data();
                const userLeagueIds = userData.leagues || [];

                // If user has no leagues, return empty array
                if (userLeagueIds.length === 0) {
                    setLeagues([]);
                    setIsLoading(false);
                    return;
                }

                // Fetch league details for each league ID
                const leagueDetails = await Promise.all(
                    userLeagueIds.map(async (leagueId) => {
                        const leagueDocRef = doc(db, "leagues", leagueId);
                        const leagueDoc = await getDoc(leagueDocRef);

                        if (leagueDoc.exists()) {
                            return {
                                id: leagueId,
                                ...leagueDoc.data()
                            };
                        }
                        return null;
                    })
                );

                // Filter out any null values (leagues that don't exist)
                setLeagues(leagueDetails.filter(league => league !== null));

                // Auto-select the last used league if available
                const lastUsedLeagueId = localStorage.getItem("lastUsedLeagueId");
                if (lastUsedLeagueId && leagueDetails.some(league => league?.id === lastUsedLeagueId)) {
                    onSelectLeague(lastUsedLeagueId);
                }
            } catch (error) {
                console.error("Error fetching leagues:", error);
                setErrorMessage("Failed to load your leagues. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserLeagues();
    }, [user, onSelectLeague]);

    const handleCreateLeague = async () => {
        if (!user) {
            setErrorMessage("You must be logged in to create a league");
            return;
        }

        if (!newLeagueName.trim()) {
            setErrorMessage("Please enter a league name");
            return;
        }

        try {
            setIsLoading(true);

            // Generate a unique invite code (6 characters, alphanumeric)
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Create a new league document
            const leaguesCollectionRef = collection(db, "leagues");
            const newLeagueRef = doc(leaguesCollectionRef);

            await setDoc(newLeagueRef, {
                name: newLeagueName.trim(),
                inviteCode: inviteCode,
                createdAt: new Date(),
                createdBy: user.uid,
                members: [user.uid],
                admins: [user.uid]
            });

            // Add league to user's leagues
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const updatedLeagues = [...(userData.leagues || []), newLeagueRef.id];

                await setDoc(userDocRef, {
                    ...userData,
                    leagues: updatedLeagues
                });

                // Create default set for this league
                const defaultSetDocRef = doc(db, "leagues", newLeagueRef.id, "sets", "default");
                await setDoc(defaultSetDocRef, {
                    players: [],
                    teams: [],
                    matchups: [],
                    scores: [],
                    mvpVotes: [],
                    leaderboard: {},
                    matchHistory: []
                });

                // Update leagues state
                const newLeague = {
                    id: newLeagueRef.id,
                    name: newLeagueName.trim(),
                    inviteCode: inviteCode
                };

                setLeagues([...leagues, newLeague]);
                setNewLeagueName("");
                setSuccessMessage("League created successfully!");

                // Auto-select the new league
                onSelectLeague(newLeagueRef.id);
                localStorage.setItem("lastUsedLeagueId", newLeagueRef.id);
            }
        } catch (error) {
            console.error("Error creating league:", error);
            setErrorMessage("Failed to create league. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinLeague = async () => {
        if (!user) {
            setErrorMessage("You must be logged in to join a league");
            return;
        }

        if (!joinCode.trim()) {
            setErrorMessage("Please enter an invite code");
            return;
        }

        try {
            setIsLoading(true);

            // Find league with matching invite code
            const leaguesCollectionRef = collection(db, "leagues");
            const leagueQuery = query(leaguesCollectionRef, where("inviteCode", "==", joinCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(leagueQuery);

            if (querySnapshot.empty) {
                setErrorMessage("Invalid invite code. Please check and try again.");
                return;
            }

            const leagueDoc = querySnapshot.docs[0];
            const leagueData = leagueDoc.data();
            const leagueId = leagueDoc.id;

            // Check if user is already a member
            if (leagueData.members.includes(user.uid)) {
                setErrorMessage("You are already a member of this league");
                return;
            }

            // Add user to league members
            await setDoc(doc(db, "leagues", leagueId), {
                ...leagueData,
                members: [...leagueData.members, user.uid]
            });

            // Add league to user's leagues
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userLeagues = userData.leagues || [];

                // Check if league is already in user's leagues
                if (!userLeagues.includes(leagueId)) {
                    const updatedLeagues = [...userLeagues, leagueId];

                    await setDoc(userDocRef, {
                        ...userData,
                        leagues: updatedLeagues
                    });
                }

                // Update leagues state
                const newLeague = {
                    id: leagueId,
                    name: leagueData.name,
                    inviteCode: leagueData.inviteCode
                };

                setLeagues([...leagues, newLeague]);
                setJoinCode("");
                setSuccessMessage("Successfully joined the league!");

                // Auto-select the joined league
                onSelectLeague(leagueId);
                localStorage.setItem("lastUsedLeagueId", leagueId);
            }
        } catch (error) {
            console.error("Error joining league:", error);
            setErrorMessage("Failed to join league. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectLeague = (leagueId) => {
        onSelectLeague(leagueId);
        localStorage.setItem("lastUsedLeagueId", leagueId);
    };

    return (
        <DarkContainer className="bg-gray-900">

            {successMessage && (
                <div className="bg-green-800 text-green-100 p-4 rounded mb-6">
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-800 text-red-100 p-4 rounded mb-6">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-800 text-green-100 p-4 rounded mb-6">
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-800 text-red-100 p-4 rounded mb-6">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create League Section */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">Create New League</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-300 mb-2">League Name</label>
                            <StyledInput
                                type="text"
                                value={newLeagueName}
                                onChange={(e) => setNewLeagueName(e.target.value)}
                                placeholder="Enter league name"
                                disabled={!user || isLoading}
                            />
                        </div>
                        <StyledButton
                            onClick={handleCreateLeague}
                            className={`w-full ${!user ? 'bg-gray-600' : 'bg-blue-600'}`}
                            disabled={!user || isLoading}
                        >
                            {isLoading ? "Creating..." : "Create League"}
                        </StyledButton>
                    </div>
                </div>

                {/* Join League Section */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">Join League</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-300 mb-2">Invite Code</label>
                            <StyledInput
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Enter invite code"
                                disabled={!user || isLoading}
                            />
                        </div>
                        <StyledButton
                            onClick={handleJoinLeague}
                            className={`w-full ${!user ? 'bg-gray-600' : 'bg-green-600'}`}
                            disabled={!user || isLoading}
                        >
                            {isLoading ? "Joining..." : "Join League"}
                        </StyledButton>
                    </div>
                </div>
            </div>

            {/* Your Leagues Section */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-4">Your Leagues</h2>
                {isLoading ? (
                    <div className="text-gray-400">Loading your leagues...</div>
                ) : leagues.length === 0 ? (
                    <div className="text-gray-400 p-4 bg-gray-800 rounded-lg">
                        {user ? "You haven't joined any leagues yet." : "Sign in to see your leagues."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {leagues.map((league) => (
                            <div
                                key={league.id}
                                className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition"
                                onClick={() => handleSelectLeague(league.id)}
                            >
                                <h3 className="text-lg font-medium text-white">{league.name}</h3>
                                <div className="text-sm text-gray-400 mt-2">
                                    Invite Code: <span className="text-gray-300">{league.inviteCode}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DarkContainer>
    );
}