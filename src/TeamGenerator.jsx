import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Make sure firebase.js exports your initialized db
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function TeamSetManager({ currentSet, setCurrentSet }) {
  const [sets, setSets] = useState([]);
  const [newSetName, setNewSetName] = useState("");

  useEffect(() => {
    const fetchSets = async () => {
      const querySnapshot = await getDocs(collection(db, "sets"));
      const allSets = querySnapshot.docs.map(doc => doc.id);
      setSets(allSets);
    };
    fetchSets();
  }, []);

  const handleCreateSet = async () => {
    if (!newSetName) return;
    const newSet = { players: [], mvpVotes: [], scores: [] };
    await setDoc(doc(db, "sets", newSetName), newSet);
    setSets(prev => [...prev, newSetName]);
    setCurrentSet(newSetName);
    setNewSetName("");
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label><strong>Active Set:</strong></label>
      <select
        value={currentSet}
        onChange={(e) => setCurrentSet(e.target.value)}
        style={{ marginLeft: "0.5rem" }}
      >
        {sets.map((set) => (
          <option key={set} value={set}>{set}</option>
        ))}
      </select>

      <div style={{ marginTop: "1rem" }}>
        <input
          placeholder="New Set Name"
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
        />
        <button onClick={handleCreateSet} style={{ marginLeft: "0.5rem" }}>Create Set</button>
      </div>
    </div>
  );
}

// TeamGenerator.jsx
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// CHILD COMPONENTS
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCOGeIQoPX7kNVIHUipxBlJIAYissB2AqM",
  authDomain: "bball-team-generator.firebaseapp.com",
  projectId: "bball-team-generator",
  storageBucket: "bball-team-generator.firebasestorage.app",
  messagingSenderId: "698253006350",
  appId: "1:698253006350:web:ddb9e7e799c034b61c8e5f",
  measurementId: "G-41WKPGWFMK",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function TeamGenerator() {
  // GLOBAL STATES
  const [activeTab, setActiveTab] = useState("rankings");

  // Player / Ranking states
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
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    name: "",
    scoring: 5,
    defense: 5,
    rebounding: 5,
    playmaking: 5,
    stamina: 5,
    physicality: 5,
    xfactor: 5,
  });

  // Teams / Matchups states
  const [teamSize, setTeamSize] = useState(3);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState({});

  // FETCH PLAYERS ON MOUNT
  useEffect(() => {
    const fetchPlayers = async () => {
      const docRef = doc(db, "sets", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPlayers(docSnap.data().players || []);
      }
    };
    fetchPlayers();
  }, []);

  // ========== PLAYER ACTIONS ==========

  // Toggle active/inactive
  const handlePlayerActiveToggle = async (playerName, isActive) => {
    try {
      const docRef = doc(db, "sets", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedPlayers = [...(data.players || [])];
        const idx = updatedPlayers.findIndex(
          (p) => p.name.toLowerCase() === playerName.toLowerCase()
        );
        if (idx > -1) {
          updatedPlayers[idx].active = isActive;
          await setDoc(docRef, { ...data, players: updatedPlayers });
          setPlayers(updatedPlayers);
        }
      }
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  // Delete Player
  const handleDeletePlayer = async (playerName) => {
    if (!window.confirm(`Are you sure you want to delete ${playerName}?`)) return;
    try {
      const docRef = doc(db, "sets", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedPlayers = (data.players || []).filter(
          (p) => p.name.toLowerCase() !== playerName.toLowerCase()
        );
        await setDoc(docRef, { ...data, players: updatedPlayers });
        setPlayers(updatedPlayers);
      }
    } catch (error) {
      console.error("Error deleting player:", error);
    }
  };

  // Start editing a player
  const startEditPlayer = (player) => {
    setEditingPlayer(player.name);
    setEditPlayerForm({
      name: player.name,
      scoring: player.scoring || 5,
      defense: player.defense || 5,
      rebounding: player.rebounding || 5,
      playmaking: player.playmaking || 5,
      stamina: player.stamina || 5,
      physicality: player.physicality || 5,
      xfactor: player.xfactor || 5,
    });
  };

  // Save edited player
  const saveEditedPlayer = async () => {
    try {
      const docRef = doc(db, "sets", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedPlayers = [...(data.players || [])];
        const idx = updatedPlayers.findIndex(
          (p) => p.name.toLowerCase() === editingPlayer.toLowerCase()
        );
        if (idx > -1) {
          // create a submission from the edited stats
          const newSubmission = {
            scoring: editPlayerForm.scoring,
            defense: editPlayerForm.defense,
            rebounding: editPlayerForm.rebounding,
            playmaking: editPlayerForm.playmaking,
            stamina: editPlayerForm.stamina,
            physicality: editPlayerForm.physicality,
            xfactor: editPlayerForm.xfactor,
          };
          // push to submissions
          if (!updatedPlayers[idx].submissions) {
            updatedPlayers[idx].submissions = [];
          }
          updatedPlayers[idx].submissions.push(newSubmission);

          // If name changed, update name
          if (
            editPlayerForm.name.toLowerCase() !==
            editingPlayer.toLowerCase()
          ) {
            updatedPlayers[idx].name = editPlayerForm.name;
          }

          // Save to Firestore
          await setDoc(docRef, { ...data, players: updatedPlayers });
          setPlayers(updatedPlayers);
          setEditingPlayer(null);
        }
      }
    } catch (error) {
      console.error("Error editing player:", error);
    }
  };

  // Submit a new rating
  const handleRatingSubmit = async () => {
    try {
      const docRef = doc(db, "sets", "default");
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : { players: [] };
      const updatedPlayers = [...(data.players || [])];
      const index = updatedPlayers.findIndex(
        (p) => p.name.toLowerCase() === newRating.name.toLowerCase()
      );
      if (index > -1) {
        // add new submission
        if (!updatedPlayers[index].submissions) {
          updatedPlayers[index].submissions = [];
        }
        updatedPlayers[index].submissions.push({ ...newRating });
      } else {
        // create new player with submissions
        updatedPlayers.push({
          name: newRating.name,
          active: true,
          submissions: [{ ...newRating }],
        });
      }
      await setDoc(docRef, { ...data, players: updatedPlayers });
      setPlayers(updatedPlayers);
      // reset form
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
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // ========== TEAM/MATCHUP ACTIONS ==========

  const generateTeams = () => {
    const activePlayers = players.filter((p) => p.active);
    // shuffle
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const newTeams = Array.from(
      { length: Math.ceil(shuffled.length / teamSize) },
      (_, i) => shuffled.slice(i * teamSize, (i + 1) * teamSize)
    );
    setTeams(newTeams);

    const matchupPairs = [];
    for (let i = 0; i < newTeams.length - 1; i += 2) {
      matchupPairs.push([newTeams[i], newTeams[i + 1] || []]);
    }
    setMatchups(matchupPairs);
    setMvpVotes(Array(matchupPairs.length).fill(""));
    setScores(Array(matchupPairs.length).fill({ a: "", b: "" }));
  };

  // ... Add your logic for MVP votes, scoreboard, etc. if you want

  return (
    <div style={{ padding: "1rem" }}>
      <nav style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Team Generator</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </nav>

      {activeTab === "rankings" && (
        <RankingTab
          players={players}
          setPlayers={setPlayers}
          newRating={newRating}
          setNewRating={setNewRating}
          handleRatingSubmit={handleRatingSubmit}
          editingPlayer={editingPlayer}
          setEditingPlayer={setEditingPlayer}
          editPlayerForm={editPlayerForm}
          setEditPlayerForm={setEditPlayerForm}
          saveEditedPlayer={saveEditedPlayer}
          handlePlayerActiveToggle={handlePlayerActiveToggle}
          handleDeletePlayer={handleDeletePlayer}
          startEditPlayer={startEditPlayer}
        />
      )}

      {activeTab === "teams" && (
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
          generateTeams={generateTeams}
        />
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab leaderboard={leaderboard} />
      )}
    </div>
  );
}
