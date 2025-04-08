import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { StyledButton, /* If you want more from UIComponents, import them here */ } from "./components/UIComponents";
import RankingTab from "./components/RankingTab";
import PlayerListTab from "./components/PlayerListTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import TeamSetManager from "./components/TeamSetManager";
import BalancedTeamGenerator from "./components/BalancedTeamGenerator";
import { DarkContainer } from "./components/UIComponents";
import EditPlayerModal from "./components/EditPlayerModal";
import { auth } from "./firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from "firebase/auth";



const db = getFirestore();

export default function TeamGenerator() {
    const [activeTab, setActiveTab] = useState("players");
    const [players, setPlayers] = useState([]);
    const [newRating, setNewRating] = useState({
        name: "",
        scoring: 5,
        defense: 5,
        rebounding: 5,
        playmaking: 5,
        stamina: 5,
        physicality: 5,
        xfactor: 5,
    });
    const [editPlayerModalOpen, setEditPlayerModalOpen] = useState(false);
    const [selectedPlayerToEdit, setSelectedPlayerToEdit] = useState(null);
    const [teamSize, setTeamSize] = useState(3);
    const [teams, setTeams] = useState([]);
    const [matchups, setMatchups] = useState([]);
    const [mvpVotes, setMvpVotes] = useState([]);
    const [scores, setScores] = useState([]);
    const [leaderboard, setLeaderboard] = useState({});
    const [currentSet, setCurrentSet] = useState("default");
    const [user, setUser] = useState(null);
    const [toastMessage, setToastMessage] = useState("");


    const weightings = {
        scoring: 0.25,
        defense: 0.2,
        rebounding: 0.15,
        playmaking: 0.15,
        stamina: 0.1,
        physicality: 0.1,
        xfactor: 0.05,
    };

    const handleLogin = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
            console.error("Login failed:", error);
        });
    };

    const handleLogout = () => {
        signOut(auth);
    };

    const calculatePlayerScore = (player) => {
        return (
            player.scoring * weightings.scoring +
            player.defense * weightings.defense +
            player.rebounding * weightings.rebounding +
            player.playmaking * weightings.playmaking +
            player.stamina * weightings.stamina +
            player.physicality * weightings.physicality +
            player.xfactor * weightings.xfactor
        );
    };

    const generateBalancedTeams = async () => {
        const activePlayers = players.filter((p) => p.active);
        const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5);
        const sortedPlayers = [...shuffledPlayers].sort(
            (a, b) => calculatePlayerScore(b) - calculatePlayerScore(a)
        );
        const numTeams = Math.ceil(sortedPlayers.length / teamSize);
        const balanced = Array.from({ length: numTeams }, () => []);

        sortedPlayers.forEach((player, index) => {
            const teamIndex = index % numTeams;
            balanced[teamIndex].push(player);
        });

        setTeams(balanced);

        const newMatchups = [];
        for (let i = 0; i < balanced.length - 1; i += 2) {
            newMatchups.push([balanced[i], balanced[i + 1] || []]);
        }

        // Get the existing data first
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Save the new matchups without overwriting history or leaderboard
            setMatchups(newMatchups);

            // Initialize new MVP votes and scores for these matchups only
            const newMvpVotes = Array(newMatchups.length).fill("");
            const newScores = Array(newMatchups.length).fill({ a: "", b: "" });

            setMvpVotes(newMvpVotes);
            setScores(newScores);

            // Save to Firestore - preserve existing leaderboard
            const firestoreData = prepareDataForFirestore({
                ...data,
                teams: balanced,
                matchups: newMatchups,
                mvpVotes: newMvpVotes,
                scores: newScores,
                // Keep existing leaderboard
                leaderboard: data.leaderboard || {}
            });
            await setDoc(docRef, firestoreData);
        }
    };

    const [isEditingExisting, setIsEditingExisting] = useState(false);

    const calculateLeaderboard = async () => {
        // Only proceed if we have matchups data
        if (!matchups || matchups.length === 0) {
            console.log("No matchups data to calculate leaderboard");
            return;
        }

        // Fetch the current leaderboard data from Firestore to maintain history
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        // Start with existing leaderboard data or empty object if none exists
        let existingLeaderboard = {};
        if (docSnap.exists() && docSnap.data().leaderboard) {
            existingLeaderboard = docSnap.data().leaderboard;
        }

        // Create a tally just for the current matches
        const currentTally = {};

        // Process all matches and their scores
        matchups.forEach(([teamA, teamB], i) => {
            // Only process matches that have scores and haven't been processed before
            if (!scores[i] || scores[i].processed) return;
            const score = scores[i];
            const mvp = mvpVotes[i] || "";

            // Skip if either score is missing
            if (!score?.a || !score?.b) return;

            const teamAPlayers = teamA.map((p) => p.name).filter(name => name && name.trim() !== "");
            const teamBPlayers = teamB.map((p) => p.name).filter(name => name && name.trim() !== "");

            const scoreA = parseInt(score?.a);
            const scoreB = parseInt(score?.b);

            if (!isNaN(scoreA) && !isNaN(scoreB)) {
                const winnerTeam = scoreA > scoreB ? teamAPlayers : teamBPlayers;
                const loserTeam = scoreA > scoreB ? teamBPlayers : teamAPlayers;

                // Initialize player records in current tally
                [...teamAPlayers, ...teamBPlayers].forEach(name => {
                    if (name && name.trim() !== "" && !currentTally[name]) {
                        currentTally[name] = { _w: 0, _l: 0, MVPs: 0 };
                    }
                });

                // Add wins for current match
                winnerTeam.forEach((name) => {
                    if (name && name.trim() !== "") {
                        currentTally[name]._w += 1;
                    }
                });

                // Add losses for current match
                loserTeam.forEach((name) => {
                    if (name && name.trim() !== "") {
                        currentTally[name]._l += 1;
                    }
                });
            }

            // Process MVP vote
            if (mvp && mvp.trim() !== "") {
                if (!currentTally[mvp]) {
                    currentTally[mvp] = { _w: 0, _l: 0, MVPs: 0 };
                }
                currentTally[mvp].MVPs += 1;
            }

            // Mark this match as processed to avoid counting it multiple times
            scores[i].processed = true;
        });

        // Merge current tally with existing leaderboard
        const updatedLeaderboard = { ...existingLeaderboard };

        Object.keys(currentTally).forEach(player => {
            if (!updatedLeaderboard[player]) {
                updatedLeaderboard[player] = { _w: 0, _l: 0, MVPs: 0 };
            }

            // Add current match statistics to historical data
            updatedLeaderboard[player]._w += currentTally[player]._w;
            updatedLeaderboard[player]._l += currentTally[player]._l;
            updatedLeaderboard[player].MVPs += currentTally[player].MVPs;
        });
        // Log the final leaderboard before saving
        console.log("Final leaderboard to be saved:", updatedLeaderboard);
        // Update the leaderboard state
        setLeaderboard(updatedLeaderboard);

        // Save updated leaderboard to Firestore
        if (docSnap.exists()) {
            const data = docSnap.data();
            await setDoc(docRef, {
                ...data,
                leaderboard: updatedLeaderboard,
                // Update scores to include processed flag
                scores: scores
            });
        }
    };
    const prepareDataForFirestore = (data) => {
        // Convert matchups from nested arrays to objects
        if (data.matchups) {
            data.matchups = data.matchups.map((matchup, index) => {
                // Add this check to ensure matchup[0] exists
                if (!matchup || !matchup[0]) {
                    return {
                        id: index,
                        teamA: [],
                        teamB: []
                    };
                }
                return {
                    id: index,
                    teamA: matchup[0].map(player => ({
                        name: player.name,
                        active: player.active,
                        scoring: player.scoring,
                        defense: player.defense,
                        rebounding: player.rebounding,
                        playmaking: player.playmaking,
                        stamina: player.stamina,
                        physicality: player.physicality,
                        xfactor: player.xfactor
                    })),
                    teamB: matchup[1] ? matchup[1].map(player => ({
                        name: player.name,
                        active: player.active,
                        scoring: player.scoring,
                        defense: player.defense,
                        rebounding: player.rebounding,
                        playmaking: player.playmaking,
                        stamina: player.stamina,
                        physicality: player.physicality,
                        xfactor: player.xfactor
                    })) : []
                };
            });
        }
        // Convert teams from nested arrays to objects
        if (data.teams) {
            console.log("Teams data:", data.teams);
            data.teams = data.teams.map((team, index) => {
                // Check if team exists and is an array
                if (!team || !Array.isArray(team)) {
                    return {
                        id: index,
                        players: []
                    };
                }
                return {
                    id: index,
                    players: team.map(player => {
                        if (!player) return {};
                        return {
                            name: player.name || "",
                            active: player.active !== undefined ? player.active : true,
                            scoring: player.scoring || 0,
                            defense: player.defense || 0,
                            rebounding: player.rebounding || 0,
                            playmaking: player.playmaking || 0,
                            stamina: player.stamina || 0,
                            physicality: player.physicality || 0,
                            xfactor: player.xfactor || 0
                        };
                    })
                };
            });
        }
        return data;
    };

    const convertFirestoreDataToAppFormat = (data) => {
        // Convert matchups from objects back to arrays
        if (data.matchups) {
            const matchupsArray = data.matchups.map(matchup => [
                matchup.teamA,
                matchup.teamB || []
            ]);
            data.matchups = matchupsArray;
        }

        // Convert teams from objects back to arrays
        if (data.teams) {
            const teamsArray = data.teams.map(team => team.players);
            data.teams = teamsArray;
        }

        return data;
    };

    const handleDeletePlayer = async (playerName) => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedPlayers = data.players.filter(
                (p) => p.name.toLowerCase() !== playerName.toLowerCase()
            );
            await setDoc(docRef, { ...data, players: updatedPlayers });
            setPlayers(updatedPlayers);
            setToastMessage("🗑️ Player deleted!");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const saveMatchResults = async () => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Mark each match with a valid score as ready to be processed
            const updatedScores = scores.map((score, index) => {
                if (score && score.a && score.b) {
                    return { ...score, readyToProcess: true };
                }
                return score;
            });

            setScores(updatedScores);

            const firestoreData = prepareDataForFirestore({
                ...data,
                mvpVotes: mvpVotes,
                scores: updatedScores
            });

            await setDoc(docRef, firestoreData);

            // Calculate leaderboard after saving match results
            await calculateLeaderboard();

            alert("Match results saved!");
        }
    };

    const handleRatingSubmit = async () => {
        if (!user) {
            setToastMessage("⚠️ Please sign in to submit a rating.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : { players: [] };
        const updatedPlayers = [...data.players];
        const index = updatedPlayers.findIndex(
            (p) => p.name.toLowerCase() === newRating.name.toLowerCase()
        );

        const submission = {
            ...newRating,
            submittedBy: user.email,
        };

        let message = "✅ Rating submitted!";

        if (index > -1) {
            const existing = updatedPlayers[index];
            const updatedSubmissions = (existing.submissions || []).filter(
                (s) => s.submittedBy !== user.email
            );

            const wasUpdate = updatedSubmissions.length < (existing.submissions?.length || 0);

            updatedSubmissions.push(submission);

            const total = updatedSubmissions.reduce((sum, sub) => {
                const { name, submittedBy, ...scores } = sub;
                const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
                return sum + avg;
            }, 0);
            const newAvg = total / updatedSubmissions.length;

            updatedPlayers[index] = {
                ...existing,
                submissions: updatedSubmissions,
                rating: newAvg,
            };

            message = wasUpdate ? "✏️ Rating updated!" : "✅ Rating submitted!";
        } else {
            updatedPlayers.push({
                name: newRating.name,
                active: true,
                submissions: [submission],
                rating:
                    (submission.scoring +
                        submission.defense +
                        submission.rebounding +
                        submission.playmaking +
                        submission.stamina +
                        submission.physicality +
                        submission.xfactor) /
                    7,
            });
        }

        await setDoc(docRef, { ...data, players: updatedPlayers });

        setNewRating({
            name: "",
            scoring: 5,
            defense: 5,
            rebounding: 5,
            playmaking: 5,
            stamina: 5,
            physicality: 5,
            xfactor: 5,
        });

        setToastMessage(message);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const archiveCompletedMatches = async () => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Find matches that have scores and are ready to be archived
            const completedMatches = matchups.map((matchup, index) => {
                if (scores[index] && scores[index].a && scores[index].b) {
                    return {
                        teams: matchup,
                        score: scores[index],
                        mvp: mvpVotes[index] || "",
                        date: new Date().toISOString()
                    };
                }
                return null;
            }).filter(match => match !== null);

            // Get existing match history or create a new array
            const existingHistory = data.matchHistory || [];

            // Merge new completed matches with existing history
            const updatedHistory = [...existingHistory, ...completedMatches];

            // Save the updated match history
            await setDoc(docRef, {
                ...data,
                matchHistory: updatedHistory
            });

            // Now that matches are archived, we can start fresh with new matches
            // but keep the leaderboard intact
            setMatchups([]);
            setScores([]);
            setMvpVotes([]);
            setTeams([]);

            alert("Matches have been archived and leaderboard has been updated!");
        }
    };

    const resetLeaderboardData = async () => {
        if (confirm("Are you sure you want to reset the leaderboard? All match history will be lost.")) {
            const docRef = doc(db, "sets", currentSet);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const clearedData = {
                    ...data,
                    mvpVotes: [],
                    scores: [],
                    matchups: [], // Clear matchups
                    teams: [],    // Clear teams
                    leaderboard: {}, // Clear leaderboard explicitly
                    matchHistory: [] // Clear match history
                };
                await setDoc(docRef, clearedData);

                // Update all relevant state variables
                setMvpVotes([]);
                setScores([]);
                setMatchups([]);  // Clear local matchups state
                setTeams([]);     // Clear local teams state
                setLeaderboard({}); // Clear local leaderboard state

                alert("Leaderboard and match data have been reset.");
            }
        }
    };
    const openEditModal = (player, isEdit = true) => {
        setSelectedPlayerToEdit(player);
        setIsEditingExisting(isEdit);
        setEditPlayerModalOpen(true);
    };

    const closeEditModal = () => {
        setEditPlayerModalOpen(false);
        setSelectedPlayerToEdit(null);
    };

    const isAdmin = user?.email === "ajamali0903@gmail.com";

    const saveEditedPlayerFromModal = async (updatedPlayer) => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedPlayers = [...data.players];
            const index = updatedPlayers.findIndex(
                (p) => p.name.toLowerCase() === updatedPlayer.name.toLowerCase()
            );

            if (index > -1) {
                updatedPlayers[index] = {
                    ...updatedPlayers[index],
                    ...updatedPlayer,
                };
                await setDoc(docRef, { ...data, players: updatedPlayers });
                setPlayers(updatedPlayers);
                setToastMessage("✅ Rating submitted!");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };
    useEffect(() => {
        const loadMatchHistory = async () => {
            const docRef = doc(db, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.matchHistory) {
                    console.log("Loaded match history:", data.matchHistory.length, "matches");
                }
            }
        };

        loadMatchHistory();
    }, [currentSet]);

        useEffect(() => {
        const autoSaveMatchData = async () => {
            const docRef = doc(db, "sets", currentSet);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreData = prepareDataForFirestore({
                    ...data,
                    mvpVotes,
                    scores,
                    matchups,
                    teams
                });

                await setDoc(docRef, firestoreData);
            }
        };

        // Only run if we have matchups and scores
        if (matchups.length > 0 && scores.length > 0) {
            autoSaveMatchData();
        }
    }, [scores, mvpVotes, matchups]);

    useEffect(() => {
        calculateLeaderboard();
    }, [matchups, scores, mvpVotes]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("Auth change:", currentUser);
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchSet = async () => {
            const docRef = doc(db, "sets", currentSet);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = convertFirestoreDataToAppFormat(docSnap.data());
                // Log the raw leaderboard data
                console.log("Raw leaderboard data from Firestore:", data.leaderboard);
                const averagedPlayers = (data.players || []).map((player) => {
                    // Your existing player processing code...
                    const submissions = player.submissions || [];
                    const avgStats = {
                        name: player.name,
                        active: player.active !== undefined ? player.active : true,
                        scoring: 0,
                        defense: 0,
                        rebounding: 0,
                        playmaking: 0,
                        stamina: 0,
                        physicality: 0,
                        xfactor: 0,
                    };
                    submissions.forEach((s) => {
                        avgStats.scoring += s.scoring;
                        avgStats.defense += s.defense;
                        avgStats.rebounding += s.rebounding;
                        avgStats.playmaking += s.playmaking;
                        avgStats.stamina += s.stamina;
                        avgStats.physicality += s.physicality;
                        avgStats.xfactor += s.xfactor;
                    });
                    const len = submissions.length || 1;
                    Object.keys(avgStats).forEach((key) => {
                        if (typeof avgStats[key] === "number") {
                            avgStats[key] = parseFloat((avgStats[key] / len).toFixed(2));
                        }
                    });
                    avgStats.submissions = submissions;
                    return avgStats;
                });

                setPlayers(averagedPlayers);
                setMvpVotes(data.mvpVotes || []);
                setScores(data.scores || []);

                // Also load matchups from the database
                if (data.matchups && data.matchups.length > 0) {
                    setMatchups(data.matchups);
                    setTeams(data.teams || []);
                }

                // Set leaderboard after all data is loaded
                if (data.leaderboard && Object.keys(data.leaderboard).length > 0) {
                    console.log("Setting leaderboard with data:", data.leaderboard);
                    setLeaderboard(data.leaderboard);
                } else if ((data.scores?.length || 0) > 0 && (data.matchups?.length || 0) > 0) {
                    console.log("No leaderboard data found, calculating from scores and matchups");
                    // Only recalculate if we have both scores and matchups
                    setTimeout(() => calculateLeaderboard(), 100);
                }
            }
        };

        fetchSet();
    }, [currentSet]);


    const handlePlayerSaveFromModal = async (playerData) => {
        if (!user) {
            setToastMessage("⚠️ Please sign in to submit a rating.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : { players: [] };

        const updatedPlayers = [...data.players];
        const index = updatedPlayers.findIndex(
            (p) => p.name.toLowerCase() === playerData.name.toLowerCase()
        );

        if (index > -1) {
            // Edit existing player
            updatedPlayers[index] = {
                ...updatedPlayers[index],
                ...playerData,
            };
        } else {
            // Add new player
            updatedPlayers.push({
                name: playerData.name,
                active: true,
                submissions: [
                    {
                        submittedBy: user.email,
                        ...playerData,
                    }
                ],
                rating:
                    (playerData.scoring +
                        playerData.defense +
                        playerData.rebounding +
                        playerData.playmaking +
                        playerData.stamina +
                        playerData.physicality +
                        playerData.xfactor) / 7,
            });
        }

        await setDoc(docRef, { ...data, players: updatedPlayers });

        setPlayers(updatedPlayers); // update local list
        setToastMessage("✅ Player saved!");
        setTimeout(() => setToastMessage(""), 3000);
        closeEditModal();
    };

    useEffect(() => {
        console.log("Current leaderboard data:", leaderboard);
    }, [leaderboard]);

    return (
        <DarkContainer>
            <div className="flex items-center justify-between mb-4">
                {user ? (
                    <div className="text-sm text-gray-300">
                        Signed in as <strong>{user.displayName}</strong>
                        <StyledButton className="ml-4 bg-red-600" onClick={handleLogout}>Log out</StyledButton>
                    </div>
                ) : (
                    <StyledButton onClick={handleLogin} className="bg-blue-600">Sign in with Google</StyledButton>
                )}
            </div>

            {/* Navigation row for tabs */}
            <div className="flex items-center space-x-4 mb-6">
                <StyledButton
                    onClick={() => setActiveTab("players")}
                    className={activeTab === "players" ? "bg-blue-600" : "bg-gray-700"}
                >
                    Teams
                </StyledButton>
                <StyledButton
                    onClick={() => setActiveTab("rankings")}
                    className={activeTab === "rankings" ? "bg-blue-600" : "bg-gray-700"}
                >
                    Player Rankings
                </StyledButton>
                <StyledButton
                    onClick={() => {
                        console.log("Switching to leaderboard tab");
                        setActiveTab("leaderboard");
                    }}
                    className={activeTab === "leaderboard" ? "bg-blue-600" : "bg-gray-700"}
                >
                    Leaderboard
                </StyledButton>
            </div>

            {activeTab === "players" && (
                <div className="mb-6">
                    
                    <TeamsTab
                        players={players}
                        teams={teams}
                        setTeams={setTeams}
                        matchups={matchups}
                        setMatchups={setMatchups}
                        mvpVotes={mvpVotes}
                        setMvpVotes={setMvpVotes}
                        scores={scores}
                        setScores={setScores}
                        teamSize={teamSize}
                        setTeamSize={setTeamSize}
                        generateBalancedTeams={generateBalancedTeams}
                        handlePlayerActiveToggle={(name, value) => {
                            const updated = players.map((p) =>
                                p.name === name ? { ...p, active: value } : p
                            );
                            setPlayers(updated);
                        }}
                        weightings={weightings}
                        saveMatchResults={saveMatchResults}
                        archiveCompletedMatches={archiveCompletedMatches}
                    />
                </div>
            )}

            {activeTab === "rankings" && (
                <RankingTab
                    players={players}
                    newRating={newRating}
                    setNewRating={setNewRating}
                    handleRatingSubmit={handleRatingSubmit}
                    handleDeletePlayer={handleDeletePlayer}
                    openEditModal={openEditModal}
                    isAdmin={isAdmin}
                    user={user}
                    toastMessage={toastMessage}
                    setToastMessage={setToastMessage}
                />

            )}

            {activeTab === "leaderboard" && (
                <LeaderboardTab
                    leaderboard={leaderboard}
                    resetLeaderboardData={resetLeaderboardData}
                    isAdmin={isAdmin}
                />

            )}

            {editPlayerModalOpen && (
                <EditPlayerModal
                    player={selectedPlayerToEdit}
                    onSave={handlePlayerSaveFromModal}
                    onClose={closeEditModal}
                />
            )}

        </DarkContainer>
    );
}
