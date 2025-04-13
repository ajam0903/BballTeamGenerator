import React, { useState, useEffect } from "react";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc as firestoreSetDoc,
    getDocs
} from "firebase/firestore";
import { StyledButton } from "./components/UIComponents";
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import { DarkContainer } from "./components/UIComponents";
import EditPlayerModal from "./components/EditPlayerModal";
import LeagueLandingPage from "./components/LeagueLandingPage";
import UserMenu from "./components/UserMenu";
import { auth } from "./firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from "firebase/auth";

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
    const isRematch = (teamA, teamB) => {
        if (!matchHistory || matchHistory.length === 0) return false;

        // Convert teams to player name arrays for comparison
        const teamANames = teamA.map(p => p.name).sort();
        const teamBNames = teamB.map(p => p.name).sort();

        // Look through match history to find matching matchups
        return matchHistory.some(match => {
            const historyTeamA = match.teams[0].map(p => p.name).sort();
            const historyTeamB = match.teams[1].map(p => p.name).sort();

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
            const historyTeamA = match.teams[0].map(p => p.name).sort();
            const historyTeamB = match.teams[1].map(p => p.name).sort();

            // Check if this history match involves the same teams
            return (arraysEqual(teamANames, historyTeamA) && arraysEqual(teamBNames, historyTeamB)) ||
                (arraysEqual(teamANames, historyTeamB) && arraysEqual(teamBNames, historyTeamA));
        });
    };
    const calculateTeamStrength = (team) => {
        if (!team || team.length === 0) return 0;

        const totalScore = team.reduce((sum, player) => {
            return sum + calculatePlayerScore(player);
        }, 0);

        // Average score per player (to account for teams with different sizes)
        return totalScore / team.length;
    };

    // Fixed generateBalancedTeams function that prioritizes equal team size
    const generateBalancedTeams = async () => {
        if (!currentLeagueId) return;

        const activePlayers = players.filter((p) => p.active);

        // Reset isBench property for all players
        const cleanedPlayers = activePlayers.map(player => ({
            ...player,
            isBench: false
        }));

        // Shuffle players first for randomness
        const shuffledPlayers = [...cleanedPlayers].sort(() => Math.random() - 0.5);

        // Sort players by rating (highest to lowest)
        const sortedPlayers = [...shuffledPlayers].sort(
            (a, b) => calculatePlayerScore(b) - calculatePlayerScore(a)
        );

        const numTeams = Math.floor(sortedPlayers.length / teamSize);
        // Ensure at least 2 teams for matchups
        const finalNumTeams = Math.max(2, numTeams);

        // Initialize teams array
        const teams = Array.from({ length: finalNumTeams }, () => []);

        // First, identify how many regular players per team and how many extras
        const playersPerTeam = Math.floor(sortedPlayers.length / finalNumTeams);
        const extraPlayers = sortedPlayers.length % finalNumTeams;

        // Create a balanced snake draft order:
        // For example, with 4 teams: [0,1,2,3,3,2,1,0,0,1,2,3,...]
        let draftOrder = [];
        for (let round = 0; round < Math.ceil(playersPerTeam / 2); round++) {
            // Forward
            for (let i = 0; i < finalNumTeams; i++) {
                draftOrder.push(i);
            }
            // Backward
            for (let i = finalNumTeams - 1; i >= 0; i--) {
                draftOrder.push(i);
            }
        }

        // Trim to the exact number of regular players
        draftOrder = draftOrder.slice(0, sortedPlayers.length - extraPlayers);

        // Distribute regular players using snake draft order
        const regularPlayers = sortedPlayers.slice(0, sortedPlayers.length - extraPlayers);
        regularPlayers.forEach((player, index) => {
            const teamIndex = draftOrder[index];
            teams[teamIndex].push(player);
        });

        // Mark remaining players as bench and distribute them evenly
        if (extraPlayers > 0) {
            const benchPlayers = sortedPlayers.slice(-extraPlayers);
            benchPlayers.forEach(player => {
                player.isBench = true;
            });

            // Distribute bench players to teams with fewest players first
            benchPlayers.forEach(player => {
                const teamSizes = teams.map(team => team.length);
                const minSize = Math.min(...teamSizes);
                const teamIndex = teamSizes.indexOf(minSize);
                teams[teamIndex].push(player);
            });
        }

        // After distribution, perform a rebalancing step to improve team strength balance
        // We'll do this by swapping players between teams if it improves overall balance
        const getTeamStrengths = () => teams.map(team => calculateTeamStrength(team));

        // Perform a few iterations of improvement
        for (let iteration = 0; iteration < 10; iteration++) {
            const teamStrengths = getTeamStrengths();
            const avgStrength = teamStrengths.reduce((sum, str) => sum + str, 0) / teamStrengths.length;

            // Calculate standard deviation as a measure of imbalance
            const variance = teamStrengths.reduce((sum, str) => sum + Math.pow(str - avgStrength, 2), 0) / teamStrengths.length;
            const stdDev = Math.sqrt(variance);

            // If teams are already well-balanced, stop optimizing
            if (stdDev < 0.2) break;

            // Try to swap players between the strongest and weakest teams
            const strongestTeamIdx = teamStrengths.indexOf(Math.max(...teamStrengths));
            const weakestTeamIdx = teamStrengths.indexOf(Math.min(...teamStrengths));

            // Only swap non-bench players of similar position
            const strongTeamRegulars = teams[strongestTeamIdx].filter(p => !p.isBench);
            const weakTeamRegulars = teams[weakestTeamIdx].filter(p => !p.isBench);

            // Find the best swap that improves balance
            let bestSwap = null;
            let bestImprovement = 0;

            for (let i = 0; i < strongTeamRegulars.length; i++) {
                for (let j = 0; j < weakTeamRegulars.length; j++) {
                    // Temporarily swap players
                    const playerA = strongTeamRegulars[i];
                    const playerB = weakTeamRegulars[j];

                    // Find actual indices in the teams array
                    const idxA = teams[strongestTeamIdx].indexOf(playerA);
                    const idxB = teams[weakestTeamIdx].indexOf(playerB);

                    // Perform the swap
                    teams[strongestTeamIdx][idxA] = playerB;
                    teams[weakestTeamIdx][idxB] = playerA;

                    // Calculate new strengths
                    const newStrengths = getTeamStrengths();
                    const newAvg = newStrengths.reduce((sum, str) => sum + str, 0) / newStrengths.length;
                    const newVariance = newStrengths.reduce((sum, str) => sum + Math.pow(str - newAvg, 2), 0) / newStrengths.length;
                    const newStdDev = Math.sqrt(newVariance);

                    // Check if this swap improved balance
                    const improvement = stdDev - newStdDev;

                    if (improvement > bestImprovement) {
                        bestImprovement = improvement;
                        bestSwap = { idxA, idxB };
                    }

                    // Undo the swap for now
                    teams[strongestTeamIdx][idxA] = playerA;
                    teams[weakestTeamIdx][idxB] = playerB;
                }
            }

            // If we found a beneficial swap, apply it permanently
            if (bestSwap && bestImprovement > 0) {
                const { idxA, idxB } = bestSwap;
                const playerA = teams[strongestTeamIdx][idxA];
                const playerB = teams[weakestTeamIdx][idxB];

                teams[strongestTeamIdx][idxA] = playerB;
                teams[weakestTeamIdx][idxB] = playerA;
            } else {
                // If no beneficial swap was found, stop optimizing
                break;
            }
        }

        setTeams(teams);
        setHasGeneratedTeams(true);

        const newMatchups = [];
        for (let i = 0; i < teams.length - 1; i += 2) {
            newMatchups.push([teams[i], teams[i + 1] || []]);
        }

        // Update the path to include league ID
        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            setMatchups(newMatchups);

            const newMvpVotes = Array(newMatchups.length).fill("");
            const newScores = Array(newMatchups.length).fill({ a: "", b: "" });

            setMvpVotes(newMvpVotes);
            setScores(newScores);

            const firestoreData = prepareDataForFirestore({
                ...data,
                teams: teams,
                matchups: newMatchups,
                mvpVotes: newMvpVotes,
                scores: newScores,
                leaderboard: data.leaderboard || {}
            });
            await firestoreSetDoc(docRef, firestoreData);
        }
    };
    // Modified to use league structure
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
        return data;
    };

    const convertFirestoreDataToAppFormat = (data) => {
        if (data.matchups) {
            const matchupsArray = data.matchups.map(matchup => [
                matchup.teamA,
                matchup.teamB || []
            ]);
            data.matchups = matchupsArray;
        }

        if (data.teams) {
            const teamsArray = data.teams.map(team => team.players);
            data.teams = teamsArray;
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
            const updatedPlayers = data.players.filter(
                (p) => p.name.toLowerCase() !== playerName.toLowerCase()
            );
            await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });
            setPlayers(updatedPlayers);
            setToastMessage("🗑️ Player deleted!");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    // Modified to use league structure
    const saveMatchResults = async () => {
        if (!currentLeagueId) return;

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

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

            await firestoreSetDoc(docRef, firestoreData);
            await calculateLeaderboard();

            // Show rematch prompt after saving
            setShowRematchPrompt(true);
        }
    };

    const handleRematchYes = () => {
        // Reset scores and MVP votes for a rematch with the same teams
        const newScores = Array(matchups.length).fill({ a: "", b: "" });
        const newMvpVotes = Array(matchups.length).fill("");

        setScores(newScores);
        setMvpVotes(newMvpVotes);
        setShowRematchPrompt(false);

        // You might want to save this state to Firestore as well
        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firestoreData = prepareDataForFirestore({
                    ...data,
                    mvpVotes: newMvpVotes,
                    scores: newScores
                });
                firestoreSetDoc(docRef, firestoreData);
            }
        });
    };

    const handleRematchNo = () => {
        // Reset everything for new team generation
        setTeams([]);
        setMatchups([]);
        setScores([]);
        setMvpVotes([]);
        setHasGeneratedTeams(false);
        setShowRematchPrompt(false);
    };

    // Modified to use league structure
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

        await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });

        setPlayers(updatedPlayers.map(player => {
            // Calculate averages from submissions
            if (player.submissions && player.submissions.length > 0) {
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

                player.submissions.forEach((s) => {
                    avgStats.scoring += s.scoring || 0;
                    avgStats.defense += s.defense || 0;
                    avgStats.rebounding += s.rebounding || 0;
                    avgStats.playmaking += s.playmaking || 0;
                    avgStats.stamina += s.stamina || 0;
                    avgStats.physicality += s.physicality || 0;
                    avgStats.xfactor += s.xfactor || 0;
                });

                const len = player.submissions.length;
                Object.keys(avgStats).forEach((key) => {
                    if (typeof avgStats[key] === "number") {
                        avgStats[key] = parseFloat((avgStats[key] / len).toFixed(2));
                    }
                });

                avgStats.submissions = player.submissions;
                return avgStats;
            }
            return player;
        }));

        setToastMessage(message);
        setTimeout(() => setToastMessage(""), 3000);
    };

    // Modified to use league structure
    const archiveCompletedMatches = async () => {
        if (!currentLeagueId) return;

        const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

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

            const existingHistory = data.matchHistory || [];
            const updatedHistory = [...existingHistory, ...completedMatches];

            await firestoreSetDoc(docRef, {
                ...data,
                matchHistory: updatedHistory
            });

            // Update local state with the latest history
            setMatchHistory(updatedHistory);

            setMatchups([]);
            setScores([]);
            setMvpVotes([]);
            setTeams([]);

            alert("Matches have been archived and leaderboard has been updated!");
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
    };

    const openEditModal = (player, isEdit = true) => {
        // Store the original name as a separate property
        if (player && isEdit) {
            player.originalName = player.name;
        }
        setSelectedPlayerToEdit(player);
        setIsEditingExisting(isEdit);
        setEditPlayerModalOpen(true);
    };

    const closeEditModal = () => {
        setEditPlayerModalOpen(false);
        setSelectedPlayerToEdit(null);
    };

    const isAdmin = user?.email === "ajamali0903@gmail.com";

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

                await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });
                setPlayers(updatedPlayers);
                setLeaderboard(prevLeaderboard => ({ ...prevLeaderboard }));
                setToastMessage("✅ Player completely updated!");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };
    // Modified to use league structure
    useEffect(() => {
        if (!currentLeagueId) return;

        const loadMatchHistory = async () => {
            const docRef = doc(db, "leagues", currentLeagueId, "sets", currentSet);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.matchHistory) {
                    console.log("Loaded match history:", data.matchHistory.length, "matches");
                }
            }
        };

        loadMatchHistory();
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
        if (currentLeagueId) {
            calculateLeaderboard();
        }
    }, [currentLeagueId, matchups, scores, mvpVotes]);

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
                }
            } catch (error) {
                console.error("Error fetching league details:", error);
            }
        };

        fetchLeagueDetails();
    }, [currentLeagueId]);

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

    // Modified to use league structure
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

    // Rest of your function...

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
        } else {
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

        await firestoreSetDoc(docRef, { ...data, players: updatedPlayers });

        setPlayers(updatedPlayers);
        setToastMessage("✅ Player saved!");
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
                    <h1 className="text-2xl font-bold text-white">Squad Sync</h1>
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
        <DarkContainer>
            <div className="mb-8">
                {/* Top navigation bar */}
                <div className="mb-8">
                    {/* Replace the existing top navigation bar with this */}
                    <div className="flex items-center justify-between py-3 mb-6 border-b border-gray-800">
                        {/* Left side: League name */}
                        <div className="flex items-center">
                            <span className="text-sm text-white mr-2">{currentLeague?.name}</span>
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

                    {/* Navigation tabs - keep as is */}
                    <div className="flex items-center space-x-6 mb-8">
                        {/* ... existing tab buttons ... */}
                    </div>

                    {toastMessage && (
                        <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
                            {toastMessage}
                        </div>
                    )}
                </div>

                {/* Navigation tabs - also simplified */}
                <div className="flex items-center space-x-6 mb-8">
                    <button
                        onClick={() => setActiveTab("players")}
                        className={`text-sm transition-colors ${activeTab === "players"
                            ? "text-blue-400 border-b border-blue-400"
                            : "text-gray-400 hover:text-gray-200"}`}
                    >
                        Teams
                    </button>
                    <button
                        onClick={() => setActiveTab("rankings")}
                        className={`text-sm transition-colors ${activeTab === "rankings"
                            ? "text-blue-400 border-b border-blue-400"
                            : "text-gray-400 hover:text-gray-200"}`}
                    >
                        Players
                    </button>
                    <button
                        onClick={() => {
                            console.log("Switching to leaderboard tab");
                            setActiveTab("leaderboard");
                        }}
                        className={`text-sm transition-colors ${activeTab === "leaderboard"
                            ? "text-blue-400 border-b border-blue-400"
                            : "text-gray-400 hover:text-gray-200"}`}
                    >
                        Leaderboard
                    </button>
                </div>

            {toastMessage && (
                <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
                    {toastMessage}
                </div>
            )}
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
                        hasGeneratedTeams={hasGeneratedTeams}
                        isRematch={isRematch}
                        getPreviousResults={getPreviousResults}
                        showRematchPrompt={showRematchPrompt}
                        onRematchYes={handleRematchYes}
                        onRematchNo={handleRematchNo}
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
                    matchHistory={matchHistory}  // Pass match history for calculating trends and OVR
                    players={players}  // Pass players data to display abilities
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