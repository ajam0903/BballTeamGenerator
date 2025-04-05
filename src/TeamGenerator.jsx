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

    const generateBalancedTeams = () => {
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

        const matchups = [];
        for (let i = 0; i < balanced.length - 1; i += 2) {
            matchups.push([balanced[i], balanced[i + 1] || []]);
        }
        setMatchups(matchups);
        setMvpVotes(Array(matchups.length).fill(""));
        setScores(Array(matchups.length).fill({ a: "", b: "" }));
    };

    const calculateLeaderboard = () => {
        const tally = {};

        matchups.forEach(([teamA, teamB], i) => {
            const score = scores[i];
            const mvp = mvpVotes[i];

            const teamAPlayers = teamA.map((p) => p.name);
            const teamBPlayers = teamB.map((p) => p.name);

            const scoreA = parseInt(score?.a);
            const scoreB = parseInt(score?.b);

            if (!isNaN(scoreA) && !isNaN(scoreB)) {
                const winnerTeam = scoreA > scoreB ? teamAPlayers : teamBPlayers;
                const loserTeam = scoreA > scoreB ? teamBPlayers : teamAPlayers;

                winnerTeam.forEach((name) => {
                    tally[name] = {
                        ...(tally[name] || {}),
                        _w: (tally[name]?._w || 0) + 1,
                        MVPs: tally[name]?.MVPs || 0,
                    };
                });

                loserTeam.forEach((name) => {
                    tally[name] = {
                        ...(tally[name] || {}),
                        _l: (tally[name]?._l || 0) + 1,
                        MVPs: tally[name]?.MVPs || 0,
                    };
                });
            }

            if (mvp) {
                tally[mvp] = {
                    ...(tally[mvp] || {}),
                    MVPs: (tally[mvp]?.MVPs || 0) + 1,
                    _w: tally[mvp]?._w || 0,
                    _l: tally[mvp]?._l || 0,
                };
            }
        });

        setLeaderboard(tally);
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
        }
    };

    const saveMatchResults = async () => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updated = {
                ...data,
                mvpVotes: mvpVotes,
                scores: scores
            };
            await setDoc(docRef, updated);
            alert("Match results saved!");
        }
    };

    const handleRatingSubmit = async () => {
        if (!user) {
            alert("Please sign in to submit ratings.");
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

        if (index > -1) {
            const existing = updatedPlayers[index];
            const alreadySubmitted = existing.submissions?.some(
                (s) => s.submittedBy === user.email
            );

            if (alreadySubmitted) {
                alert("You've already submitted a rating for this player.");
                return;
            }

            existing.submissions = [...(existing.submissions || []), submission];
        } else {
            updatedPlayers.push({
                name: newRating.name,
                active: true,
                submissions: [submission],
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
        alert("Rating submitted successfully!");
    };

    const resetLeaderboardData = async () => {
        const docRef = doc(db, "sets", currentSet);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const clearedData = {
                ...data,
                mvpVotes: [],
                scores: []
            };
            await setDoc(docRef, clearedData);
            setMvpVotes([]);
            setScores([]);
            alert("Leaderboard and match data have been reset.");
        }
    };

    const openEditModal = (player) => {
        setSelectedPlayerToEdit(player);
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
            }
        }
    };

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
                const data = docSnap.data();
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
            }
        };

        fetchSet();
    }, [currentSet]);

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
                    onClick={() => setActiveTab("leaderboard")}
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
                />

            )}

            {activeTab === "leaderboard" && (
                <LeaderboardTab
                    leaderboard={leaderboard}
                    resetLeaderboardData={resetLeaderboardData}
                    isAdmin={isAdmin}
                />

            )}

            {editPlayerModalOpen && selectedPlayerToEdit && (
                <EditPlayerModal
                    player={selectedPlayerToEdit}
                    onSave={saveEditedPlayerFromModal}
                    onClose={closeEditModal}
                />
            )}

        </DarkContainer>
    );
}
