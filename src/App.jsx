import React, { useState, useEffect, useRef } from "react";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc as firestoreSetDoc,
    getDocs
} from "firebase/firestore";
import { StyledButton } from "./components/UIComponents";
import { generateBalancedTeams as balanceTeams } from "./components/BalancedTeamGenerator";
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import { DarkContainer } from "./components/UIComponents";
import EditPlayerModal from "./components/EditPlayerModal";
import LeagueLandingPage from "./components/LeagueLandingPage";
import UserMenu from "./components/UserMenu";
import ConfirmationModal from "./components/ConfirmationModal";
import { auth } from "./firebase";
import MatchResultsModal from "./components/MatchResultsModal";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from "firebase/auth";
import ErrorBoundary from './components/ErrorBoundary';
import LogTab from "./components/LogTab";
import logActivity from "./utils/logActivity";
import { ensureSchemaExists } from "./utils/schemaMigration";

const db = getFirestore();
// This helps hide the default scrollbar while maintaining scroll functionality
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;
export default function App() {

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
    const [hasPendingMatchups, setHasPendingMatchups] = useState(false);
    const [pendingTabChange, setPendingTabChange] = useState(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
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
    const [teamRankings, setTeamRankings] = useState([]);
    const [currentLeagueId, setCurrentLeagueId] = useState(null);
    const pendingTabRef = useRef(null);
    const [currentLeague, setCurrentLeague] = useState(null);
    const weightings = {
        scoring: 0.25,
        defense: 0.2,
        rebounding: 0.15,
        playmaking: 0.15,
        stamina: 0.1,
        physicality: 0.1,
        xfactor: 0.05,
    };
    const [showRematchPrompt, setShowRematchPrompt] = useState(false);
    const [matchHistory, setMatchHistory] = useState([]);
    const [hasGeneratedTeams, setHasGeneratedTeams] = useState(false);
    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [isEditingLeagueName, setIsEditingLeagueName] = useState(false);
    const [editedLeagueName, setEditedLeagueName] = useState("");
    const handleLogin = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
            console.error("Login failed:", error);
        });
    };
    const [showMatchResultsModal, setShowMatchResultsModal] = useState(false);
    const [forceTabChange, setForceTabChange] = useState(false);
    const [completedMatchResults, setCompletedMatchResults] = useState([]);
    const isRematch = (teamA, teamB) => {
        if (!matchHistory || matchHistory.length === 0) return false;

        // Convert teams to player name arrays for comparison
        const teamANames = teamA.map(p => p.name).sort();
        const teamBNames = teamB.map(p => p.name).sort();

        // Look through match history to find matching matchups
        return matchHistory.some(match => {
            // Handle different data formats
            let historyTeamA = [];
            let historyTeamB = [];

            // Check if the match has teams array (app format) or teamA/teamB properties (Firestore format)
            if (Array.isArray(match.teams) && match.teams.length >= 2) {
                // App format
                historyTeamA = match.teams[0].map(p => p.name).sort();
                historyTeamB = match.teams[1].map(p => p.name).sort();
            } else if (match.teamA && match.teamB) {
                // Firestore format
                historyTeamA = match.teamA.map(p => p.name).sort();
                historyTeamB = match.teamB.map(p => p.name).sort();
            } else {
                // Unknown format, skip this match
                return false;
            }

            // Check if current matchup matches historical matchup (in either order)
            const matchesExactly =
                (arraysEqual(teamANames, historyTeamA) && arraysEqual(teamBNames, historyTeamB)) ||
                (arraysEqual(teamANames, historyTeamB) && arraysEqual(teamBNames, historyTeamA));

            return matchesExactly;
        });
    };

    const handleLogout = () => {
        signOut(auth);
    };
    // Helper function to check if arrays are equal
    const arraysEqual = (a, b) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
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
    const getPreviousResults = (teamA, teamB) => {
        if (!matchHistory || matchHistory.length === 0) return [];

        const teamANames = teamA.map(p => p.name).sort();
        const teamBNames = teamB.map(p => p.name).sort();

        return matchHistory.filter(match => {
            // Handle different data formats
            let historyTeamA = [];
            let historyTeamB = [];

            // Check if the match has teams array (app format) or teamA/teamB properties (Firestore format)
            if (Array.isArray(match.teams) && match.teams.length >= 2) {
                // App format
                historyTeamA = match.teams[0].map(p => p.name).sort();
                historyTeamB = match.teams[1].map(p => p.name).sort();
            } else if (match.teamA && match.teamB) {
                // Firestore format
                historyTeamA = match.teamA.map(p => p.name).sort();
                historyTeamB = match.teamB.map(p => p.name).sort();
            } else {
                // Unknown format, skip this match
                return false;
            }

            // Check if this history match involves the same teams
            return (arraysEqual(teamANames, historyTeamA) && arraysEqual(teamBNames, historyTeamB)) ||
                (arraysEqual(teamANames, historyTeamB) && arraysEqual(teamBNames, historyTeamA));
        }).map(match => {
            // Convert any Firestore format matches to the app format for consistency
            if (!match.teams && match.teamA && match.teamB) {
                return {
                    teams: [match.teamA, match.teamB],
                    score: match.score,
                    mvp: match.mvp || "",
                    date: match.date
                };
            }
            return match;
        });
    }

    const handleCancelTabChange = () => {
        setPendingTabChange(null);
        setShowUnsavedModal(false);
    };

    const calculateTeamStrength = (team) => {
        if (!team || team.length === 0) return 0;

        const totalScore = team.reduce((sum, player) => {
            return sum + calculatePlayerScore(player);
        }, 0);

        // Average score per player (to account for teams with different sizes)
        return totalScore / team.length;
    };


    const generateBalancedTeams = async () => {
        console.log("Starting generateBalancedTeams...");

        if (!currentLeagueId) {
            console.error("No currentLeagueId set");
            return;
        }

        // If there are pending matchups, show confirmation first
        if (hasPendingMatchups) {
            setPendingTabChange('generate-teams');
            setShowUnsavedModal(true);
            return;
        }

        await generateBalancedTeamsInternal();
    };

    const generateBalancedTeamsInternal = async () => {
        if (!currentLeagueId) {
            console.error("No currentLeagueId set");
            return;
        }

        try {
            console.log("Players:", players);
            console.log("Team size:", teamSize);

            // Use the imported function to generate teams and matchups
            const result = balanceTeams(players, teamSize, calculatePlayerScore);
            console.log("Balance teams result:", result);

            const generatedTeams = result.teams;  // Correctly declare the variable here
            const generatedMatchups = result.matchups;

            console.log("Generated teams:", generatedTeams);
            console.log("Generated matchups:", generatedMatchups);

            setTeams(generatedTeams);
            setMatchups(generatedMatchups);
            setHasPendingMatchups(false);
            setHasGeneratedTeams(true);

            // Create MVP votes and scores arrays based on matchup count
            const newMvpVotes = Array(generatedMatchups.length).fill("");
            const newScores = Array(generatedMatchups.length).fill({ a: "", b: "" });

            setMvpVotes(newMvpVotes);
            setScores(newScores);

            // Update Firestore
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreData = prepareDataForFirestore({
                    ...data,
                    teams: generatedTeams,
                    matchups: generatedMatchups,
                    mvpVotes: newMvpVotes,
                    scores: newScores,
                    leaderboard: data.leaderboard || {}
                });
                await firestoreSetDoc(docRef, firestoreData);
            }
        } catch (error) {
            console.error("Error in generateBalancedTeams:", error);
            alert("An error occurred while generating teams. Check the console for details.");
        }

        // Make sure to reference generatedTeams within this scope
        await logActivity(
            db,
            currentLeagueId,
            "teams_generated",
            {
                teamCount: teams.length,  // Use the state variable instead
                matchupCount: matchups.length,  // Use the state variable instead
                teamSize: teamSize
            },
            user,
            false
        );
    };

    const calculateLeaderboard = async () => {
        if (!currentLeagueId || !matchups || matchups.length === 0) {
            console.log("No matchups data to calculate leaderboard or no league selected");
            return;
        }

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        let existingLeaderboard = {};
        if (docSnap.exists() && docSnap.data().leaderboard) {
            existingLeaderboard = docSnap.data().leaderboard;
        }

        const currentTally = {};

        matchups.forEach(([teamA, teamB], i) => {
            if (!scores[i] || scores[i].processed) return;
            const score = scores[i];
            const mvp = mvpVotes[i] || "";

            if (!score?.a || !score?.b) return;

            const teamAPlayers = teamA.map((p) => p.name).filter(name => name && name.trim() !== "");
            const teamBPlayers = teamB.map((p) => p.name).filter(name => name && name.trim() !== "");

            const scoreA = parseInt(score?.a);
            const scoreB = parseInt(score?.b);

            if (!isNaN(scoreA) && !isNaN(scoreB)) {
                const winnerTeam = scoreA > scoreB ? teamAPlayers : teamBPlayers;
                const loserTeam = scoreA > scoreB ? teamBPlayers : teamAPlayers;

                [...teamAPlayers, ...teamBPlayers].forEach(name => {
                    if (name && name.trim() !== "" && !currentTally[name]) {
                        currentTally[name] = { _w: 0, _l: 0, MVPs: 0 };
                    }
                });

                winnerTeam.forEach((name) => {
                    if (name && name.trim() !== "") {
                        currentTally[name]._w += 1;
                    }
                });

                loserTeam.forEach((name) => {
                    if (name && name.trim() !== "") {
                        currentTally[name]._l += 1;
                    }
                });
            }

            if (mvp && mvp.trim() !== "") {
                if (!currentTally[mvp]) {
                    currentTally[mvp] = { _w: 0, _l: 0, MVPs: 0 };
                }
                currentTally[mvp].MVPs += 1;
            }

            scores[i].processed = true;
        });

        const updatedLeaderboard = { ...existingLeaderboard };

        Object.keys(currentTally).forEach(player => {
            if (!updatedLeaderboard[player]) {
                updatedLeaderboard[player] = { _w: 0, _l: 0, MVPs: 0 };
            }

            updatedLeaderboard[player]._w += currentTally[player]._w;
            updatedLeaderboard[player]._l += currentTally[player]._l;
            updatedLeaderboard[player].MVPs += currentTally[player].MVPs;
        });

        console.log("Final leaderboard to be saved:", updatedLeaderboard);
        setLeaderboard(updatedLeaderboard);

        if (docSnap.exists()) {
            const data = docSnap.data();
            await firestoreSetDoc(docRef, {
                ...data,
                leaderboard: updatedLeaderboard,
                scores: scores
            });
        }
    };

    const prepareDataForFirestore = (data) => {
        // Convert matchups for Firestore
        if (data.matchups) {
            data.matchups = data.matchups.map((matchup, index) => {
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
                        name: player.name || "",
                        active: player.active !== undefined ? player.active : true,
                        scoring: player.scoring || 0,
                        defense: player.defense || 0,
                        rebounding: player.rebounding || 0,
                        playmaking: player.playmaking || 0,
                        stamina: player.stamina || 0,
                        physicality: player.physicality || 0,
                        xfactor: player.xfactor || 0
                    })),
                    teamB: matchup[1] ? matchup[1].map(player => ({
                        name: player.name || "",
                        active: player.active !== undefined ? player.active : true,
                        scoring: player.scoring || 0,
                        defense: player.defense || 0,
                        rebounding: player.rebounding || 0,
                        playmaking: player.playmaking || 0,
                        stamina: player.stamina || 0,
                        physicality: player.physicality || 0,
                        xfactor: player.xfactor || 0
                    })) : []
                };
            });
        }

        // Convert teams for Firestore
        if (data.teams) {
            console.log("Teams data:", data.teams);
            data.teams = data.teams.map((team, index) => {
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

        // Convert matchHistory for Firestore
        if (data.matchHistory) {
            data.matchHistory = data.matchHistory.map((match, index) => {
                // Handle array format (from app state)
                if (Array.isArray(match.teams)) {
                    return {
                        id: index,
                        teamA: match.teams[0].map(player => ({
                            name: player.name || "",
                            active: player.active !== undefined ? player.active : true,
                            scoring: player.scoring || 0,
                            defense: player.defense || 0,
                            rebounding: player.rebounding || 0,
                            playmaking: player.playmaking || 0,
                            stamina: player.stamina || 0,
                            physicality: player.physicality || 0,
                            xfactor: player.xfactor || 0
                        })),
                        teamB: match.teams[1] ? match.teams[1].map(player => ({
                            name: player.name || "",
                            active: player.active !== undefined ? player.active : true,
                            scoring: player.scoring || 0,
                            defense: player.defense || 0,
                            rebounding: player.rebounding || 0,
                            playmaking: player.playmaking || 0,
                            stamina: player.stamina || 0,
                            physicality: player.physicality || 0,
                            xfactor: player.xfactor || 0
                        })) : [],
                        score: match.score,
                        mvp: match.mvp || "",
                        date: match.date
                    };
                }
                // Handle object format (already in Firestore format)
                return match;
            });
        }

        return data;
    };
    const handleBatchPlayerActiveToggle = async (updates) => {
        // Update local state
        const updatedPlayers = players.map((player) => {
            const update = updates.find(u => u.name === player.name);
            if (update) {
                return { ...player, active: update.active };
            }
            return player;
        });
        setPlayers(updatedPlayers);

        // Then save to Firestore
        if (currentLeagueId) {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreUpdatedPlayers = data.players.map((player) => {
                    const update = updates.find(u => u.name === player.name);
                    if (update) {
                        return { ...player, active: update.active };
                    }
                    return player;
                });

                await firestoreSetDoc(docRef, { ...data, players: firestoreUpdatedPlayers });
            }
        }
    };

    // Updated function that will save the active state to the database
    const handlePlayerActiveToggle = async (name, value) => {
        // Update local state
        const updatedPlayers = players.map((p) =>
            p.name === name ? { ...p, active: value } : p
        );
        setPlayers(updatedPlayers);

        // Then save to Firestore
        if (currentLeagueId) {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreUpdatedPlayers = data.players.map((p) =>
                    p.name === name ? { ...p, active: value } : p
                );

                // Update the database
                await firestoreSetDoc(docRef, { ...data, players: firestoreUpdatedPlayers });
            }
        }
    };
    const convertFirestoreDataToAppFormat = (data) => {
        // Handle matchups conversion (from Firestore object format to arrays)
        if (data.matchups) {
            const matchupsArray = data.matchups.map(matchup => [
                matchup.teamA || [],
                matchup.teamB || []
            ]);
            data.matchups = matchupsArray;
        }

        // Handle teams conversion
        if (data.teams) {
            const teamsArray = data.teams.map(team => team.players || []);
            data.teams = teamsArray;
        }

        // Handle matchHistory conversion from Firestore format to app format
        if (data.matchHistory) {
            data.matchHistory = data.matchHistory.map(match => {
                return {
                    teams: [
                        match.teamA || [],
                        match.teamB || []
                    ],
                    score: match.score,
                    mvp: match.mvp || "",
                    date: match.date
                };
            });
        }

        return data;
    };

    // Modified to use league structure
    const handleDeletePlayer = async (playerName) => {
        if (!currentLeagueId) return;

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const playerToDelete = data.players.find(
                (p) => p.name.toLowerCase() === playerName.toLowerCase()
            );

            const updatedPlayers = data.players.filter(
                (p) => p.name.toLowerCase() !== playerName.toLowerCase()
            );

            await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });

            // Log the player deletion
            await logActivity(
                db,
                currentLeagueId,
                "player_deleted",
                {
                    name: playerName,
                    playerData: playerToDelete
                },
                user,
                true // Undoable
            );

            setPlayers(updatedPlayers);
            setToastMessage("🗑️ Player deleted!");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    // Modified to use league structure
    const handleRematchNo = () => {
        // Get all matches that have scores (not just processed ones)
        // This captures the entire series including all rematches
        const completedMatchIndices = scores.map((score, idx) => {
            // Include a match if it has both scores filled out
            return (score && score.a && score.b) ? idx : null;
        }).filter(idx => idx !== null);

        // Prepare ALL completed match results for the celebration modal
        const matchResultsToShow = completedMatchIndices.map(idx => {
            return {
                teams: matchups[idx],
                score: scores[idx],
                mvp: mvpVotes[idx] || "",
                date: new Date().toISOString()
            };
        });

        // Save completed matches to show in the modal
        setCompletedMatchResults(matchResultsToShow);

        // Show the match results modal
        setShowMatchResultsModal(true);

        // If we have any completed matches, we want to archive just those
        if (completedMatchIndices.length > 0) {
            // First, archive the completed matches to match history
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Extract ALL the completed matches to archive
                    // Convert the nested arrays to a structure that Firestore can handle
                    const completedMatches = completedMatchIndices.map(idx => {
                        // Create a Firestore-compatible format for team data
                        return {
                            teamA: matchups[idx][0].map(player => ({
                                name: player.name,
                                active: player.active !== undefined ? player.active : true,
                                scoring: player.scoring || 0,
                                defense: player.defense || 0,
                                rebounding: player.rebounding || 0,
                                playmaking: player.playmaking || 0,
                                stamina: player.stamina || 0,
                                physicality: player.physicality || 0,
                                xfactor: player.xfactor || 0
                            })),
                            teamB: matchups[idx][1].map(player => ({
                                name: player.name,
                                active: player.active !== undefined ? player.active : true,
                                scoring: player.scoring || 0,
                                defense: player.defense || 0,
                                rebounding: player.rebounding || 0,
                                playmaking: player.playmaking || 0,
                                stamina: player.stamina || 0,
                                physicality: player.physicality || 0,
                                xfactor: player.xfactor || 0
                            })),
                            score: scores[idx],
                            mvp: mvpVotes[idx] || "",
                            date: new Date().toISOString(),
                            teamSize: teamSize
                        };
                    });
                    // Log completing matches
                    for (const match of completedMatches) {
                        logActivity(
                            db,
                            currentLeagueId,
                            "match_completed",
                            {
                                teamA: match.teamA.map(p => p.name),
                                teamB: match.teamB.map(p => p.name),
                                scoreA: match.score.a,
                                scoreB: match.score.b,
                                mvp: match.mvp || "",
                                teamSize: match.teamSize || teamSize,
                                date: match.date
                            },
                            user,
                            false
                        ).catch(err => console.warn("Error logging match completion:", err));
                    }
                    const existingHistory = data.matchHistory || [];
                    const updatedHistory = [...existingHistory, ...completedMatches];

                    // Now, filter out the completed matches from the current state
                    const remainingMatchups = matchups.filter((_, idx) => !completedMatchIndices.includes(idx));
                    const remainingScores = scores.filter((_, idx) => !completedMatchIndices.includes(idx));
                    const remainingMvpVotes = mvpVotes.filter((_, idx) => !completedMatchIndices.includes(idx));

                    // Update local state
                    setMatchups(remainingMatchups);
                    setScores(remainingScores);
                    setMvpVotes(remainingMvpVotes);
                    setMatchHistory(updatedHistory);

                    // If no matches left, reset teams too
                    if (remainingMatchups.length === 0) {
                        setTeams([]);
                        setHasGeneratedTeams(false);
                    }

                    // Update Firestore with the modified structure
                    firestoreSetDoc(docRef, {
                        ...data,
                        matchHistory: updatedHistory
                    }).then(() => {
                        // Clear the current matchups
                        return firestoreSetDoc(docRef, {
                            ...data,
                            matchHistory: updatedHistory,
                            matchups: [],
                            scores: [],
                            mvpVotes: []
                        });
                    }).then(() => {
                        // If there are remaining matchups, save them in the proper format
                        if (remainingMatchups.length > 0) {
                            const firestoreData = prepareDataForFirestore({
                                ...data,
                                matchHistory: updatedHistory,
                                matchups: remainingMatchups,
                                scores: remainingScores,
                                mvpVotes: remainingMvpVotes
                            });

                            return firestoreSetDoc(docRef, firestoreData);
                        }
                    });
                }
            });
        } else {
            // If all matches are unsaved, just clear the rematch prompt
            setToastMessage("No completed matches to archive");
            setTimeout(() => setToastMessage(""), 3000);
        }

        setShowRematchPrompt(false);
    };

    // In App.jsx, add this function after calculatePlayerScore
    const calculatePlayerOVR = (playerName) => {
        // Find player in players array to get their abilities
        const playerData = players.find(p => p.name === playerName) || {};
        const playerStats = leaderboard[playerName] || { _w: 0, _l: 0, MVPs: 0 };

        // Base rating from user submissions (weighted average)
        const baseRating = (
            (playerData.scoring || 5) * 0.25 +
            (playerData.defense || 5) * 0.2 +
            (playerData.rebounding || 5) * 0.15 +
            (playerData.playmaking || 5) * 0.15 +
            (playerData.stamina || 5) * 0.1 +
            (playerData.physicality || 5) * 0.1 +
            (playerData.xfactor || 5) * 0.05
        );

        // Performance metrics
        const wins = playerStats._w || 0;
        const losses = playerStats._l || 0;
        const totalGames = wins + losses;
        const winPct = totalGames > 0 ? wins / totalGames : 0.5;
        const mvps = playerStats.MVPs || 0;
        const mvpPerGame = totalGames > 0 ? mvps / totalGames : 0;

        // Performance adjustments (scale to be more subtle for 1-10 rating)
        // Win percentage adjustment: -0.3 to +0.3
        const winPctAdjustment = (winPct - 0.5) * 0.6;

        // MVP adjustment: 0 to +0.3 (based on MVP rate)
        const mvpAdjustment = Math.min(mvpPerGame * 0.8, 0.3);

        // For simplicity, we'll skip streak calculation here since it requires match history
        // You could pass matchHistory to this function if needed
        const streakAdjustment = 0;

        // Calculate final rating with adjustments
        const finalRating = baseRating + winPctAdjustment + mvpAdjustment + streakAdjustment;

        // Clamp to realistic range (1-10) and round to 1 decimal
        return parseFloat(Math.min(Math.max(finalRating, 1), 10).toFixed(1));
    };

    // Create a playerOVRs object to pass to components
    const playerOVRs = {};
    players.forEach(player => {
        playerOVRs[player.name] = calculatePlayerOVR(player.name);
    });

    const handleCloseMatchResultsModal = () => {
        setShowMatchResultsModal(false);
    };

    const calculateMatchLeaderboard = async (matchIndex) => {
        if (!currentLeagueId || !matchups || matchups.length === 0 || matchIndex >= matchups.length) {
            return;
        }

        // Check if this match has already been processed
        if (scores[matchIndex].processed) {
            console.log("Match already processed, skipping leaderboard calculation");
            return;
        }

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        let existingLeaderboard = {};
        if (docSnap.exists() && docSnap.data().leaderboard) {
            existingLeaderboard = docSnap.data().leaderboard;
        }

        // Process only the specified match
        const [teamA, teamB] = matchups[matchIndex];
        const score = scores[matchIndex];
        const mvp = mvpVotes[matchIndex] || "";

        if (!score?.a || !score?.b) return;

        const teamAPlayers = teamA.map((p) => p.name).filter(name => name && name.trim() !== "");
        const teamBPlayers = teamB.map((p) => p.name).filter(name => name && name.trim() !== "");

        const scoreA = parseInt(score?.a);
        const scoreB = parseInt(score?.b);

        if (!isNaN(scoreA) && !isNaN(scoreB)) {
            const winnerTeam = scoreA > scoreB ? teamAPlayers : teamBPlayers;
            const loserTeam = scoreA > scoreB ? teamBPlayers : teamAPlayers;

            // Create updated leaderboard
            const updatedLeaderboard = { ...existingLeaderboard };

            // Initialize players if they don't exist
            [...teamAPlayers, ...teamBPlayers].forEach(name => {
                if (name && name.trim() !== "" && !updatedLeaderboard[name]) {
                    updatedLeaderboard[name] = { _w: 0, _l: 0, MVPs: 0 };
                }
            });

            // Update wins for winners
            winnerTeam.forEach((name) => {
                if (name && name.trim() !== "") {
                    updatedLeaderboard[name]._w = (updatedLeaderboard[name]._w || 0) + 1;
                }
            });

            // Update losses for losers
            loserTeam.forEach((name) => {
                if (name && name.trim() !== "") {
                    updatedLeaderboard[name]._l = (updatedLeaderboard[name]._l || 0) + 1;
                }
            });

            // Update MVP
            if (mvp && mvp.trim() !== "" && updatedLeaderboard[mvp]) {
                updatedLeaderboard[mvp].MVPs = (updatedLeaderboard[mvp].MVPs || 0) + 1;
            }

            console.log("Updated leaderboard after match:", updatedLeaderboard);
            setLeaderboard(updatedLeaderboard);

            // Save to Firestore
            if (docSnap.exists()) {
                const data = docSnap.data();
                await firestoreSetDoc(docRef, {
                    ...data,
                    leaderboard: updatedLeaderboard
                });
            }
        }
    };

    const handleRematchYes = async () => {
        // Create a new match with the same teams
        const newMatchup = [matchups[matchups.length - 1]]; // Copy the last matchup
        const newScore = [{ a: "", b: "" }];
        const newMvpVote = [""];

        // Add the new match to existing matches
        setMatchups([...matchups, ...newMatchup]);
        setScores([...scores, ...newScore]);
        setMvpVotes([...mvpVotes, ...newMvpVote]);

        setShowRematchPrompt(false);

        // Save to Firestore
        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreData = prepareDataForFirestore({
                    ...data,
                    matchups: [...matchups, ...newMatchup],
                    scores: [...scores, ...newScore],
                    mvpVotes: [...mvpVotes, ...newMvpVote]
                });
                firestoreSetDoc(docRef, firestoreData);
            }
        });

        // Add this: Log rematch creation
        await logActivity(
            db,
            currentLeagueId,
            "rematch_created",
            {
                teamA: newMatchup[0][0].map(p => p.name),
                teamB: newMatchup[0][1].map(p => p.name),
                originalScoreA: scores[scores.length - 1]?.a,
                originalScoreB: scores[scores.length - 1]?.b,
                date: new Date().toISOString()
            },
            user,
            false
        );

        // Clear the rematch prompt
        setShowRematchPrompt(false);
        setToastMessage("🔄 Rematch created! Play again with the same teams.");
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleRatingSubmit = async () => {
        if (!user) {
            setToastMessage("⚠️ Please sign in to submit a rating.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        if (!currentLeagueId) {
            setToastMessage("⚠️ No league selected.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        // Get previous rating if it exists
        const playerData = players.find(p => p.name === newRating.name);
        let previousRatingValue = null;

        if (playerData) {
            // Use default values of 5 for any missing attributes
            const scoring = playerData.scoring || 5;
            const defense = playerData.defense || 5;
            const rebounding = playerData.rebounding || 5;
            const playmaking = playerData.playmaking || 5;
            const stamina = playerData.stamina || 5;
            const physicality = playerData.physicality || 5;
            const xfactor = playerData.xfactor || 5;

            previousRatingValue = (
                scoring * weightings.scoring +
                defense * weightings.defense +
                rebounding * weightings.rebounding +
                playmaking * weightings.playmaking +
                stamina * weightings.stamina +
                physicality * weightings.physicality +
                xfactor * weightings.xfactor
            ).toFixed(2);
        }

        // MAIN FUNCTIONALITY SECTION - Core rating submission
        try {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
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

            let isNewRating = false;
            let actionType = "player_rating_changed";

            // Store previous rating values for logging (if player exists)
            let previousRating = null;
            let previousSubmission = null;

            if (index > -1) {
                const existing = updatedPlayers[index];
                // Find user's previous submission if it exists
                previousSubmission = existing.submissions?.find(s => s.submittedBy === user.email);

                if (previousSubmission) {
                    // Store previous values for logging
                    previousRating = {
                        scoring: previousSubmission.scoring,
                        defense: previousSubmission.defense,
                        rebounding: previousSubmission.rebounding,
                        playmaking: previousSubmission.playmaking,
                        stamina: previousSubmission.stamina,
                        physicality: previousSubmission.physicality,
                        xfactor: previousSubmission.xfactor
                    };
                }

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
                    // Ensure individual stat properties are updated too
                    scoring: submission.scoring,
                    defense: submission.defense,
                    rebounding: submission.rebounding,
                    playmaking: submission.playmaking,
                    stamina: submission.stamina,
                    physicality: submission.physicality,
                    xfactor: submission.xfactor
                };

                actionType = wasUpdate ? "player_rating_updated" : "player_rating_added";
            } else {
                updatedPlayers.push({
                    name: newRating.name,
                    active: true,
                    submissions: [submission],
                    rating: (submission.scoring +
                        submission.defense +
                        submission.rebounding +
                        submission.playmaking +
                        submission.stamina +
                        submission.physicality +
                        submission.xfactor) / 7,
                    // Add individual stats explicitly
                    scoring: submission.scoring,
                    defense: submission.defense,
                    rebounding: submission.rebounding,
                    playmaking: submission.playmaking,
                    stamina: submission.stamina,
                    physicality: submission.physicality,
                    xfactor: submission.xfactor
                });
                isNewRating = true;
                actionType = "player_rating_added";
            }

            // Complete database update first
            await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });

            // Calculate the new rating after submission with safety checks
            const updatedPlayerData = updatedPlayers.find(p => p.name === newRating.name);
            let newRatingValue = null;

            if (updatedPlayerData) {
                // Use default values of 5 for any missing attributes
                const scoring = updatedPlayerData.scoring || 5;
                const defense = updatedPlayerData.defense || 5;
                const rebounding = updatedPlayerData.rebounding || 5;
                const playmaking = updatedPlayerData.playmaking || 5;
                const stamina = updatedPlayerData.stamina || 5;
                const physicality = updatedPlayerData.physicality || 5;
                const xfactor = updatedPlayerData.xfactor || 5;

                newRatingValue = (
                    scoring * weightings.scoring +
                    defense * weightings.defense +
                    rebounding * weightings.rebounding +
                    playmaking * weightings.playmaking +
                    stamina * weightings.stamina +
                    physicality * weightings.physicality +
                    xfactor * weightings.xfactor
                ).toFixed(2);
            }

            // ONLY SET ONE TOAST MESSAGE - with rating change info if available
            const messagePrefix = isNewRating ? "✅ Rating submitted!" : "✏️ Rating updated!";
            if (previousRatingValue && newRatingValue && !isNaN(parseFloat(newRatingValue))) {
                setToastMessage(`${messagePrefix} ${previousRatingValue} → ${newRatingValue}`);
            } else {
                setToastMessage(messagePrefix);
            }
            setTimeout(() => setToastMessage(""), 4000);

            // Update local state
            setPlayers(updatedPlayers.map(player => {
                // Check if player has valid structure
                if (!player) return {
                    name: "Unknown",
                    active: true,
                    submissions: [],
                    scoring: 5,
                    defense: 5,
                    rebounding: 5,
                    playmaking: 5,
                    stamina: 5,
                    physicality: 5,
                    xfactor: 5
                };

                // If player has submissions, calculate averages
                if (player.submissions && Array.isArray(player.submissions) && player.submissions.length > 0) {
                    const avgStats = {
                        name: player.name || "Unknown",
                        active: player.active !== undefined ? player.active : true,
                        scoring: 0,
                        defense: 0,
                        rebounding: 0,
                        playmaking: 0,
                        stamina: 0,
                        physicality: 0,
                        xfactor: 0,
                        submissions: player.submissions
                    };

                    // Safely calculate averages
                    player.submissions.forEach(sub => {
                        if (sub) {
                            avgStats.scoring += sub.scoring || 0;
                            avgStats.defense += sub.defense || 0;
                            avgStats.rebounding += sub.rebounding || 0;
                            avgStats.playmaking += sub.playmaking || 0;
                            avgStats.stamina += sub.stamina || 0;
                            avgStats.physicality += sub.physicality || 0;
                            avgStats.xfactor += sub.xfactor || 0;
                        }
                    });

                    const len = player.submissions.length;
                    Object.keys(avgStats).forEach(key => {
                        if (typeof avgStats[key] === "number") {
                            avgStats[key] = parseFloat((avgStats[key] / len).toFixed(2));
                        }
                    });

                    return avgStats;
                }

                // Return player with default values if no submissions
                return {
                    ...player,
                    name: player.name || "Unknown",
                    active: player.active !== undefined ? player.active : true,
                    scoring: player.scoring || 5,
                    defense: player.defense || 5,
                    rebounding: player.rebounding || 5,
                    playmaking: player.playmaking || 5,
                    stamina: player.stamina || 5,
                    physicality: player.physicality || 5,
                    xfactor: player.xfactor || 5,
                    submissions: player.submissions || []
                };
            }));

            // Now log the activity with comprehensive information
            setTimeout(() => {
                try {
                    console.log("Logging rating submission for player:", newRating.name);

                    // Current rating data
                    const ratingData = {
                        scoring: newRating.scoring,
                        defense: newRating.defense,
                        rebounding: newRating.rebounding,
                        playmaking: newRating.playmaking,
                        stamina: newRating.stamina,
                        physicality: newRating.physicality,
                        xfactor: newRating.xfactor
                    };

                    // Calculate overall rating
                    const overallRating = (
                        Object.values(ratingData).reduce((sum, val) => sum + val, 0) /
                        Object.values(ratingData).length
                    ).toFixed(1);

                    // Prepare log details with multiple ways to identify the player
                    const logDetails = {
                        playerName: newRating.name, // Primary field
                        name: newRating.name,       // Secondary field (for compatibility)
                        player: newRating.name,     // Tertiary field (for compatibility)
                        isNewSubmission: isNewRating,
                        ratingData: ratingData,
                        overallRating: overallRating
                    };

                    // If this was an update, include previous values
                    if (previousRating) {
                        logDetails.previousRating = previousRating;

                        // Also include what specific ratings changed
                        logDetails.changedValues = {};
                        Object.keys(ratingData).forEach(key => {
                            if (ratingData[key] !== previousRating[key]) {
                                logDetails.changedValues[key] = {
                                    from: previousRating[key],
                                    to: ratingData[key]
                                };
                            }
                        });
                    }

                    // Log the activity with explicit debugging
                    console.log("About to log activity with player name:", newRating.name);
                    console.log("Log details:", logDetails);

                    logActivity(
                        db,
                        currentLeagueId,
                        actionType,
                        logDetails,
                        user,
                        true
                    ).catch(err => {
                        console.warn("Non-critical logging error:", err);
                    });
                } catch (e) {
                    console.warn("Failed to log activity (non-critical):", e);
                }
            }, 100);

        } catch (error) {
            console.error("Error in handleRatingSubmit:", error);
            setToastMessage("❌ Error saving rating: " + error.message);
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    // Modified to use league structure
    const archiveCompletedMatches = async () => {
        if (!currentLeagueId) return;

        // Check for unsaved matches before archiving
        if (hasPendingMatchups) {
            setToastMessage("⚠️ Please save all match results before archiving!");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Prepare matches in Firestore-compatible format (without nested arrays)
            const completedMatches = matchups.map((matchup, index) => {
                if (scores[index] && scores[index].a && scores[index].b) {
                    return {
                        teamA: matchup[0].map(player => ({
                            name: player.name || "",
                            active: player.active !== undefined ? player.active : true,
                            scoring: player.scoring || 0,
                            defense: player.defense || 0,
                            rebounding: player.rebounding || 0,
                            playmaking: player.playmaking || 0,
                            stamina: player.stamina || 0,
                            physicality: player.physicality || 0,
                            xfactor: player.xfactor || 0
                        })),
                        teamB: matchup[1] ? matchup[1].map(player => ({
                            name: player.name || "",
                            active: player.active !== undefined ? player.active : true,
                            scoring: player.scoring || 0,
                            defense: player.defense || 0,
                            rebounding: player.rebounding || 0,
                            playmaking: player.playmaking || 0,
                            stamina: player.stamina || 0,
                            physicality: player.physicality || 0,
                            xfactor: player.xfactor || 0
                        })) : [],
                        score: scores[index],
                        mvp: mvpVotes[index] || "",
                        date: new Date().toISOString(),
                        teamSize: teamSize
                    };
                }
                return null;
            }).filter(match => match !== null);

            // Get existing history and merge with new completed matches
            const existingHistory = data.matchHistory || [];
            const updatedHistory = [...existingHistory, ...completedMatches];

            // Update Firestore with the new history
            await firestoreSetDoc(docRef, {
                ...data,
                matchHistory: updatedHistory,
                // Clear current data
                matchups: [],
                scores: [],
                mvpVotes: [],
                teams: []
            });

            // Add this: Log archiving matches
            for (const match of completedMatches) {
                await logActivity(
                    db,
                    currentLeagueId,
                    "match_completed",
                    {
                        teamA: match.teamA.map(p => p.name),
                        teamB: match.teamB.map(p => p.name),
                        scoreA: match.score.a,
                        scoreB: match.score.b,
                        mvp: match.mvp || "",
                        teamSize: match.teamSize || teamSize,
                        date: match.date
                    },
                    user,
                    false
                );
            }

            // Update local state with the converted format
            setMatchHistory(updatedHistory);
            setMatchups([]);
            setScores([]);
            setMvpVotes([]);
            setTeams([]);
            setHasPendingMatchups(false);
            setHasGeneratedTeams(false);

            setToastMessage("🏆 Matches have been archived successfully!");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    // Modified to use league structure
    const resetLeaderboardData = async () => {
        if (!currentLeagueId) return;

        if (confirm("Are you sure you want to reset the leaderboard? All match history will be lost.")) {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const clearedData = {
                    ...data,
                    mvpVotes: [],
                    scores: [],
                    matchups: [],
                    teams: [],
                    leaderboard: {},
                    matchHistory: []
                };
                await firestoreSetDoc(docRef, clearedData);

                setMvpVotes([]);
                setScores([]);
                setMatchups([]);
                setTeams([]);
                setLeaderboard({});

                alert("Leaderboard and match data have been reset.");
            }
        }
        await logActivity(
            db,
            currentLeagueId,
            "leaderboard_reset",
            {},
            user,
            false
        );
    };

    const openEditModal = (player, isEdit = true) => {
        // Store the original name as a separate property
        if (player && isEdit) {
            player.originalName = player.name;
        }
        setSelectedPlayerToEdit(player);
        setIsEditingExisting(isEdit);
        setEditPlayerModalOpen(true);

        // Log that we're opening the edit modal (optional - uncomment if you want to log openings)
        /*
        if (!isEdit) {
            // This is a new player being added
            logActivity(
                db,
                currentLeagueId,
                "edit_modal_opened_for_new_player",
                {
                    action: "Adding new player"
                },
                user,
                false // Not undoable
            ).catch(err => console.warn("Non-critical logging error:", err));
        }
        */
    };

    const closeEditModal = () => {
        setEditPlayerModalOpen(false);
        setSelectedPlayerToEdit(null);
    };

    const isAdmin = currentLeague && (
        currentLeague.createdBy === user?.uid ||
        (currentLeague.admins && currentLeague.admins.includes(user?.uid))
    );

    // Modified to use league structure
    const saveEditedPlayerFromModal = async (updatedPlayer, originalName) => {
        if (!currentLeagueId) return;

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedPlayers = [...data.players];

            // Find the player by the original name that was passed to the modal
            const index = updatedPlayers.findIndex(
                (p) => p.name.toLowerCase() === originalName.toLowerCase()
            );

            if (index > -1) {
                // Get existing submissions before replacing the player
                const existingSubmissions = updatedPlayers[index].submissions || [];

                // Create a completely new player object with the updated stats
                updatedPlayers[index] = {
                    name: updatedPlayer.name, // This can be different from the original name
                    active: updatedPlayer.active !== undefined ? updatedPlayer.active : true,
                    scoring: updatedPlayer.scoring,
                    defense: updatedPlayer.defense,
                    rebounding: updatedPlayer.rebounding,
                    playmaking: updatedPlayer.playmaking,
                    stamina: updatedPlayer.stamina,
                    physicality: updatedPlayer.physicality,
                    xfactor: updatedPlayer.xfactor,
                    submissions: existingSubmissions, // Preserve the existing submissions
                    rating: (
                        updatedPlayer.scoring +
                        updatedPlayer.defense +
                        updatedPlayer.rebounding +
                        updatedPlayer.playmaking +
                        updatedPlayer.stamina +
                        updatedPlayer.physicality +
                        updatedPlayer.xfactor
                    ) / 7
                };

                // Handle name change in leaderboard
                let updatedLeaderboard = { ...data.leaderboard };
                if (originalName !== updatedPlayer.name && updatedLeaderboard[originalName]) {
                    // Copy the stats to the new name
                    updatedLeaderboard[updatedPlayer.name] = { ...updatedLeaderboard[originalName] };
                    // Delete the old name entry
                    delete updatedLeaderboard[originalName];

                    console.log("Updated leaderboard after name change:", updatedLeaderboard);
                }

                // Save to Firestore
                await firestoreSetDoc(docRef, {
                    ...data,
                    players: updatedPlayers,
                    leaderboard: updatedLeaderboard
                });
                await logActivity(
                    db,
                    currentLeagueId,
                    isEditingExisting ? "player_updated" : "player_added",
                    {
                        name: updatedPlayer.name,
                        originalName: originalName,
                        playerData: updatedPlayer
                    },
                    user,
                    true
                );
                // Update local state
                setPlayers(updatedPlayers);
                setLeaderboard(updatedLeaderboard);

                setToastMessage("✅ Player completely updated!");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };

    // Modified to use league structure
    useEffect(() => {
        if (!currentLeagueId) return;

        const fetchMatchHistory = async () => {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.matchHistory && data.matchHistory.length > 0) {
                    console.log("Loaded match history:", data.matchHistory.length, "matches");

                    // Convert data to the app format (with teams array instead of teamA/teamB)
                    const convertedHistory = data.matchHistory.map(match => {
                        // Already in app format
                        if (match.teams) {
                            return match;
                        }

                        // Convert from Firestore format to app format
                        if (match.teamA || match.teamB) {
                            return {
                                teams: [match.teamA || [], match.teamB || []],
                                score: match.score,
                                mvp: match.mvp || "",
                                date: match.date
                            };
                        }

                        // Unknown format, return as is
                        return match;
                    });

                    setMatchHistory(convertedHistory);
                }
            }
        };

        fetchMatchHistory();
    }, [currentLeagueId, currentSet]);

    useEffect(() => {
        // Add the styles to the document
        const styleElement = document.createElement('style');
        styleElement.innerHTML = scrollbarHideStyles;
        document.head.appendChild(styleElement);

        // Clean up function to remove styles when component unmounts
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Fetch match history when the app loads
    useEffect(() => {
        if (!currentLeagueId) return;

        const fetchMatchHistory = async () => {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.matchHistory) {
                    console.log("Loaded match history:", data.matchHistory.length, "matches");
                    setMatchHistory(data.matchHistory);
                }
            }
        };

        fetchMatchHistory();
    }, [currentLeagueId, currentSet]);

    // Modified to use league structure
    useEffect(() => {
        if (!currentLeagueId) return;

        const autoSaveMatchData = async () => {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
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

                await firestoreSetDoc(docRef, firestoreData);
            }
        };

        if (matchups.length > 0 && scores.length > 0) {
            autoSaveMatchData();
        }
    }, [currentLeagueId, scores, mvpVotes, matchups]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("Auth change:", currentUser);
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Modified to use league structure
    useEffect(() => {
        if (!currentLeagueId) return;

        const fetchLeagueDetails = async () => {
            try {
                const leagueRef = doc(db, "leagues", currentLeagueId);
                const leagueDoc = await getDoc(leagueRef);

                if (leagueDoc.exists()) {
                    setCurrentLeague({
                        id: currentLeagueId,
                        ...leagueDoc.data()
                    });
                    await ensureSchemaExists(db, currentLeagueId);
                }
            } catch (error) {
                console.error("Error fetching league details:", error);
            }
        };

        fetchLeagueDetails();
    }, [currentLeagueId]);

    // Effect to detect unsaved matchups
    useEffect(() => {
        // Don't check for pending matchups if we're forcing a tab change
        if (forceTabChange) return;

        // Don't check for pending matchups if we're in the process of changing tabs
        if (pendingTabChange) return;

        if (matchups.length > 0) {
            const hasIncompleteScores = scores.some(score =>
                !score.processed && (!score.a || !score.b || score.a === "" || score.b === "")
            );
            setHasPendingMatchups(hasIncompleteScores);
        } else {
            setHasPendingMatchups(false);
        }
    }, [matchups, scores, pendingTabChange, forceTabChange]);

    // Modify the tab switching function to check for pending matchups
    const handleTabChange = (newTab) => {
        console.log("handleTabChange called:", { newTab, activeTab, hasPendingMatchups, forceTabChange });

        // If we're forcing a tab change, just do it
        if (forceTabChange) {
            setActiveTab(newTab);
            setForceTabChange(false);
            return;
        }

        // Check if we're leaving the teams tab with unsaved matches
        if (hasPendingMatchups && activeTab === "players" && newTab !== "players") {
            console.log("Showing modal");
            setPendingTabChange(newTab);
            setShowUnsavedModal(true);
        } else {
            console.log("Direct tab change");
            setActiveTab(newTab);
        }
    };

    // Replace the handleConfirmTabChange function:
    const handleConfirmTabChange = async () => {
        console.log("handleConfirmTabChange called:", { pendingTabChange });

        if (pendingTabChange === 'generate-teams') {
            // Special case for generating teams
            setShowUnsavedModal(false);
            setPendingTabChange(null);
            setHasPendingMatchups(false);
            await generateBalancedTeamsInternal();
        } else if (pendingTabChange) {
            // Normal tab change - user wants to leave anyway
            const targetTab = pendingTabChange;
            console.log("User confirmed tab change to:", targetTab);

            // Clear the modal and states
            setShowUnsavedModal(false);
            setPendingTabChange(null);
            setHasPendingMatchups(false);

            // Force the tab change
            setForceTabChange(true);

            // Use setTimeout to ensure the force flag is set before changing tabs
            setTimeout(() => {
                handleTabChange(targetTab);
            }, 0);
        } else {
            setShowUnsavedModal(false);
        }
    };

    // Modified to use league structure
    useEffect(() => {
        if (!currentLeagueId) return;

        const fetchSet = async () => {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = convertFirestoreDataToAppFormat(docSnap.data());
                console.log("Raw leaderboard data from Firestore:", data.leaderboard);
                const averagedPlayers = (data.players || []).map((player) => {
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

                if (data.leaderboard && Object.keys(data.leaderboard).length > 0) {
                    console.log("Setting leaderboard with data:", data.leaderboard);
                    setLeaderboard(data.leaderboard);
                } else if ((data.scores?.length || 0) > 0 && (data.matchups?.length || 0) > 0) {
                    console.log("No leaderboard data found, calculating from scores and matchups");
                    setTimeout(() => calculateLeaderboard(), 100);
                }
            }
        };

        fetchSet();
    }, [currentLeagueId, currentSet]);

    useEffect(() => {
        if (teams && teams.length > 0) {
            const rankings = teams.map((team, index) => {
                const strength = calculateTeamStrength(team);
                return {
                    teamIndex: index,
                    strength: strength,
                    players: team
                };
            });

            // Sort by team strength (highest to lowest)
            setTeamRankings(rankings.sort((a, b) => b.strength - a.strength));
        }
    }, [teams]);

    // Get team rank string showing position out of total
    const getTeamRankString = (teamIndex) => {
        if (!teamRankings || teamRankings.length === 0) return "";

        const rankObj = teamRankings.find(rank => rank.teamIndex === teamIndex);
        if (!rankObj) return "";

        const rankPosition = teamRankings.indexOf(rankObj) + 1;
        return `Rank: ${rankPosition}/${teamRankings.length}`;
    };

    // Get color class based on rank
    const getRankColorClass = (teamIndex) => {
        if (!teamRankings || teamRankings.length === 0) return "text-gray-400";

        const rankObj = teamRankings.find(rank => rank.teamIndex === teamIndex);
        if (!rankObj) return "text-gray-400";

        const rankPosition = teamRankings.indexOf(rankObj) + 1;

        // Top team gets gold, second gets silver, third gets bronze
        if (rankPosition === 1) return "text-yellow-400";
        if (rankPosition === 2) return "text-gray-300";
        if (rankPosition === 3) return "text-yellow-600";
        return "text-gray-400";
    };

    const handleManualLeaderboardUpdate = async (updatedLeaderboard) => {
        if (!currentLeagueId) return;

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            await firestoreSetDoc(docRef, {
                ...data,
                leaderboard: updatedLeaderboard
            });

            setLeaderboard(updatedLeaderboard);

            setToastMessage("✅ Player stats updated!");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handlePlayerSaveFromModal = async (playerData, originalName = "") => {
        if (!user) {
            setToastMessage("⚠️ Please sign in to submit a rating.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        if (!currentLeagueId) {
            setToastMessage("⚠️ No league selected.");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : { players: [] };
        const updatedPlayers = [...data.players];

        // Use the original name as lookup if provided, otherwise use the current name
        const nameToFind = originalName || playerData.name;

        const index = updatedPlayers.findIndex(
            (p) => p.name.toLowerCase() === nameToFind.toLowerCase()
        );

        // Determine if this is a new player or an update
        const isNewPlayer = index === -1;

        if (index > -1) {
            // For existing players
            const existingSubmissions = updatedPlayers[index].submissions || [];

            updatedPlayers[index] = {
                name: playerData.name, // This can be different from originalName
                active: playerData.active !== undefined ? playerData.active : true,
                scoring: playerData.scoring,
                defense: playerData.defense,
                rebounding: playerData.rebounding,
                playmaking: playerData.playmaking,
                stamina: playerData.stamina,
                physicality: playerData.physicality,
                xfactor: playerData.xfactor,
                submissions: existingSubmissions,
                rating: (
                    playerData.scoring +
                    playerData.defense +
                    playerData.rebounding +
                    playerData.playmaking +
                    playerData.stamina +
                    playerData.physicality +
                    playerData.xfactor
                ) / 7,
            };

            // Handle name change in leaderboard for regular player editing
            let updatedLeaderboard = { ...data.leaderboard };
            if (originalName && originalName !== playerData.name && updatedLeaderboard[originalName]) {
                // Copy the stats to the new name
                updatedLeaderboard[playerData.name] = { ...updatedLeaderboard[originalName] };
                // Delete the old name entry
                delete updatedLeaderboard[originalName];

                console.log("Updated leaderboard after name change:", updatedLeaderboard);
            }

            await firestoreSetDoc(docRef, {
                ...data,
                players: updatedPlayers,
                leaderboard: updatedLeaderboard
            });

            setPlayers(updatedPlayers);
            setLeaderboard(updatedLeaderboard);

            // ADD THIS: Log player update
            await logActivity(
                db,
                currentLeagueId,
                "player_updated",
                {
                    playerName: playerData.name,
                    originalName: originalName || playerData.name,
                    playerData: {
                        scoring: playerData.scoring,
                        defense: playerData.defense,
                        rebounding: playerData.rebounding,
                        playmaking: playerData.playmaking,
                        stamina: playerData.stamina,
                        physicality: playerData.physicality,
                        xfactor: playerData.xfactor
                    }
                },
                user,
                true // Undoable
            );
        } else {
            // New player creation
            const newPlayer = {
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
                scoring: playerData.scoring,
                defense: playerData.defense,
                rebounding: playerData.rebounding,
                playmaking: playerData.playmaking,
                stamina: playerData.stamina,
                physicality: playerData.physicality,
                xfactor: playerData.xfactor
            };

            updatedPlayers.push(newPlayer);

            await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });
            setPlayers(updatedPlayers);

            // ADD THIS: Log player addition
            await logActivity(
                db,
                currentLeagueId,
                "player_added",
                {
                    playerName: playerData.name,
                    name: playerData.name,
                    playerData: {
                        scoring: playerData.scoring,
                        defense: playerData.defense,
                        rebounding: playerData.rebounding,
                        playmaking: playerData.playmaking,
                        stamina: playerData.stamina,
                        physicality: playerData.physicality,
                        xfactor: playerData.xfactor
                    }
                },
                user,
                true // Undoable
            );
        }

        setToastMessage(isNewPlayer ? "✅ Player added!" : "✅ Player updated!");
        setTimeout(() => setToastMessage(""), 3000);
        closeEditModal();
    };

    // Function to handle selecting a league
    const handleLeagueSelect = (leagueId) => {
        setCurrentLeagueId(leagueId);
        // Reset the current tab to players
        setActiveTab("players");
    };
    // Function to handle going back to leagues page
    const handleBackToLeagues = () => {
        // Remove the league ID from localStorage first
        localStorage.removeItem("lastUsedLeagueId");
        // Then update the state
        setCurrentLeagueId(null);
        setCurrentLeague(null);
    };


    const saveMatchResults = async (matchIndex) => {
        if (!currentLeagueId) return;

        // Validate the match index exists and has score data
        if (matchIndex === undefined || !scores[matchIndex] || !scores[matchIndex].a || !scores[matchIndex].b) {
            setToastMessage("⚠️ Please enter scores for both teams!");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        // Check if this match has already been processed
        if (scores[matchIndex].processed) {
            setToastMessage("⚠️ This match has already been saved!");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Mark this specific match as processed
            const updatedScores = [...scores];
            updatedScores[matchIndex] = {
                ...updatedScores[matchIndex],
                processed: true,
                // Add team size information
                teamSize: teamSize
            };

            setScores(updatedScores);

            // Check if all matches with scores are processed now
            const allProcessed = updatedScores.every(score =>
                !score.a || !score.b || score.processed
            );

            if (allProcessed) {
                setHasPendingMatchups(false);
            }

            // Update Firestore with the updated scores FIRST
            const firestoreData = prepareDataForFirestore({
                ...data,
                mvpVotes: mvpVotes,
                scores: updatedScores
            });

            await firestoreSetDoc(docRef, firestoreData);

            // Calculate leaderboard updates from this match only AFTER saving the processed flag
            await calculateMatchLeaderboard(matchIndex);

            // Show toast message
            setToastMessage(`✅ Match ${matchIndex + 1} results saved!`);

            // Check if this is the last match in the current series
            const currentMatchupTeams = JSON.stringify(matchups[matchIndex].map(team => team.map(p => p.name).sort()));
            const allMatchesForTheseTeams = matchups
                .map((matchup, idx) => ({
                    index: idx,
                    teams: JSON.stringify(matchup.map(team => team.map(p => p.name).sort()))
                }))
                .filter(m => m.teams === currentMatchupTeams);

            // USE updatedScores INSTEAD OF scores state
            const allMatchesCompleted = allMatchesForTheseTeams.every(m =>
                updatedScores[m.index]?.processed
            );

            if (allMatchesCompleted) {
                setShowRematchPrompt(true);
            } else {
                setTimeout(() => setToastMessage(""), 3000);
            }
            await logActivity(
                db,
                currentLeagueId,
                "match_result_saved",
                {
                    matchIndex,
                    scoreA: scores[matchIndex].a,
                    scoreB: scores[matchIndex].b,
                    mvp: mvpVotes[matchIndex] || "",
                    teamSize: teamSize,
                    // Include full player lists for both teams
                    teamA: matchups[matchIndex][0].map(player => player.name),
                    teamB: matchups[matchIndex][1].map(player => player.name),
                    // Flatten the teams structure to avoid nested arrays
                    teamsFlat: {
                        team0: matchups[matchIndex][0].map(player => player.name),
                        team1: matchups[matchIndex][1].map(player => player.name)
                    },
                    date: new Date().toISOString()
                },
                user,
                true
            );
        }
    };

    // Function to copy invite code to clipboard
    const copyInviteCodeToClipboard = () => {
        if (currentLeague?.inviteCode) {
            navigator.clipboard.writeText(currentLeague.inviteCode)
                .then(() => {
                    setToastMessage("📋 Invite code copied to clipboard!");
                    setTimeout(() => setToastMessage(""), 3000);
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    setToastMessage("❌ Failed to copy invite code");
                    setTimeout(() => setToastMessage(""), 3000);
                });
        }
    };

    useEffect(() => {
        console.log("Current leaderboard data:", leaderboard);
    }, [leaderboard]);

    // If no league is selected, show the LeagueLandingPage
    if (!currentLeagueId) {
        return (
            <div className="bg-gray-900 min-h-screen">
                {/* Update this section to include Squad Sync text */}
                <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
                    <h1 className="text-2xl font-bold text-white">REC TRACKER</h1>
                    {user ? (
                        <UserMenu user={user} />
                    ) : (
                        <StyledButton onClick={handleLogin} className="bg-blue-600">Sign in with Google</StyledButton>
                    )}
                </div>

                <div className="p-6">
                    <LeagueLandingPage user={user} onSelectLeague={handleLeagueSelect} />
                </div>
            </div>
        );
    }

    // Otherwise show the team generator app
    return (
        <DarkContainer className="pt-1">
            <div className="mb-2">
                {/* Top navigation bar */}
                <div className="mb-4">
                    {/* League name and user menu */}
                    <div className="flex items-center justify-between py-1.5 mb-2 border-b border-gray-800">
                        {/* Left side: League name */}
                        <div className="flex items-center">
                            <div className="relative group">
                                <span className="text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                                    {currentLeague?.name}
                                </span>
                                <div className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-white-600 transition-all duration-300 group-hover:w-full"></div>
                            </div>
                        </div>

                        {/* Right side: User menu */}
                        <UserMenu
                            user={user}
                            currentLeague={currentLeague}
                            handleBackToLeagues={handleBackToLeagues}
                        />
                    </div>

                    {/* Rematch Prompt */}
                    {showRematchPrompt && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                            <div className="bg-gray-800 rounded-lg p-6 w-80 text-center">
                                <h3 className="text-white text-lg mb-4">Play Rematch?</h3>
                                <p className="text-gray-300 mb-6">Would you like to play again with the same teams?</p>
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={handleRematchNo}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        No, New Teams
                                    </button>
                                    <button
                                        onClick={handleRematchYes}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Yes, Rematch
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add the ConfirmationModal */}
                    <ConfirmationModal
                        isOpen={showUnsavedModal}
                        onClose={handleCancelTabChange}
                        onConfirm={handleConfirmTabChange}
                        title="Unsaved Match Results"
                        message="You have unsaved match results. Leaving this screen will discard your current matchups. Do you want to continue?"
                        confirmText="Leave Anyway"
                        cancelText="Stay Here"
                        isDestructive={true}
                    />

                    {toastMessage && (
                        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
                            <div className="bg-gray-800 text-white px-6 py-3 rounded shadow-lg pointer-events-auto">
                                {toastMessage}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main content area with bottom padding to prevent content being hidden behind nav */}
                <div className="pb-20">
                    {activeTab === "players" && (
                        <div className="mb-6">
                            <ErrorBoundary>
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
                                    handlePlayerActiveToggle={handlePlayerActiveToggle}
                                    handleBatchPlayerActiveToggle={handleBatchPlayerActiveToggle}
                                    weightings={weightings}
                                    saveMatchResults={saveMatchResults}
                                    archiveCompletedMatches={archiveCompletedMatches}
                                    hasGeneratedTeams={hasGeneratedTeams}
                                    setHasGeneratedTeams={setHasGeneratedTeams}
                                    isRematch={isRematch}
                                    getPreviousResults={getPreviousResults}
                                    hasPendingMatchups={hasPendingMatchups}
                                    playerOVRs={playerOVRs}
                                    calculatePlayerScore={calculatePlayerScore}
                                />
                            </ErrorBoundary>
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
                            matchHistory={matchHistory}
                            players={players}
                            playerOVRs={playerOVRs}
                            onUpdateLeaderboard={handleManualLeaderboardUpdate}
                        />
                    )}

                    {activeTab === "logs" && (
                        <LogTab
                            currentLeagueId={currentLeagueId}
                            currentSet={currentSet}
                            isAdmin={isAdmin}
                            db={db}
                            user={user}
                            updatePlayers={setPlayers}
                            setToastMessage={setToastMessage}
                        />
                    )}
                </div>

                {editPlayerModalOpen && (
                    <EditPlayerModal
                        player={selectedPlayerToEdit}
                        onSave={handlePlayerSaveFromModal}
                        onClose={closeEditModal}
                    />
                )}

                {showMatchResultsModal && (
                    <MatchResultsModal
                        isOpen={showMatchResultsModal}
                        onClose={handleCloseMatchResultsModal}
                        matchResults={completedMatchResults}
                        teams={teams}
                    />
                )}

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-10">
                    <div className="flex justify-between items-center px-4 py-3">
                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={() => handleTabChange("players")}
                        >
                            <div className={`text-${activeTab === "players" ? "blue-400" : "gray-400"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6.5V19c0 1 1 2 2 2h14c1 0 2-1 2-2V6.5" />
                                    <path d="m7.9 4.8 2.5-1.6a4 4 0 0 1 3.2 0l2.5 1.6" />
                                    <path d="m4.5 10.6 4.8-3" />
                                    <path d="m14.7 7.6 4.8 3" />
                                    <path d="M12 22v-8" />
                                    <path d="M12 14c-1.1 0-2-.9-2-2v-1h4v1c0 1.1-.9 2-2 2z" />
                                </svg>
                            </div>
                            <span className={`text-xs mt-1 text-${activeTab === "players" ? "blue-400" : "gray-400"}`}>
                                Teams
                            </span>
                            {hasPendingMatchups && (
                                <span className="absolute top-2 right-12 h-2 w-2 rounded-full bg-red-500"></span>
                            )}
                        </div>

                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={() => handleTabChange("rankings")}
                        >
                            <div className={`text-${activeTab === "rankings" ? "blue-400" : "gray-400"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <span className={`text-xs mt-1 text-${activeTab === "rankings" ? "blue-400" : "gray-400"}`}>
                                Players
                            </span>
                        </div>

                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={() => handleTabChange("leaderboard")}
                        >
                            <div className={`text-${activeTab === "leaderboard" ? "blue-400" : "gray-400"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <path d="M12 18v-6"></path>
                                    <path d="M8 18v-1"></path>
                                    <path d="M16 18v-3"></path>
                                </svg>
                            </div>
                            <span className={`text-xs mt-1 text-${activeTab === "leaderboard" ? "blue-400" : "gray-400"}`}>
                                Stats
                            </span>
                        </div>

                        <div
                            className="flex flex-col items-center cursor-pointer"
                            onClick={() => handleTabChange("logs")}
                        >
                            <div className={`text-${activeTab === "logs" ? "blue-400" : "gray-400"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                    <path d="M9 12h6"></path>
                                    <path d="M9 16h6"></path>
                                    <path d="M9 8h6"></path>
                                </svg>
                            </div>
                            <span className={`text-xs mt-1 text-${activeTab === "logs" ? "blue-400" : "gray-400"}`}>
                                Logs
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DarkContainer>
    );
}