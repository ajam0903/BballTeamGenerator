import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import RankingTab from "./components/RankingTab";
import PlayerListTab from "./components/PlayerListTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import TeamSetManager from "./components/TeamSetManager";
import BalancedTeamGenerator from "./components/BalancedTeamGenerator";

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
  const [showEditForm, setShowEditForm] = useState(false);

  const [teamSize, setTeamSize] = useState(3);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);

  const [leaderboard, setLeaderboard] = useState({});

  const [currentSet, setCurrentSet] = useState("default");

  const weightings = {
    scoring: 0.25,
    defense: 0.2,
    rebounding: 0.15,
    playmaking: 0.15,
    stamina: 0.1,
    physicality: 0.1,
    xfactor: 0.05,
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
    const activePlayers = players.filter(p => p.active);
    const sortedPlayers = [...activePlayers].sort((a, b) => calculatePlayerScore(b) - calculatePlayerScore(a));
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

  const handleTogglePlayerActive = async (playerName, newStatus) => {
    const docRef = doc(db, "sets", currentSet);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const updatedPlayers = data.players.map((p) =>
      p.name.toLowerCase() === playerName.toLowerCase() ? { ...p, active: newStatus } : p
    );

    await setDoc(docRef, { ...data, players: updatedPlayers });

    // Refresh UI
    const refreshed = updatedPlayers.map((player) => {
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

    setPlayers(refreshed);
  };

  const startEditPlayer = (player) => {
    if (editingPlayer === player.name && showEditForm) {
      setShowEditForm(false);
      setEditingPlayer(null);
    } else {
      setEditingPlayer(player.name);
      setEditPlayerForm({ ...player });
      setShowEditForm(true);
    }
  };

  const handleDeletePlayer = async (playerName) => {
    if (!window.confirm(`Are you sure you want to delete ${playerName}?`)) return;
    const docRef = doc(db, "sets", currentSet);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const updatedPlayers = data.players.filter(
      (p) => p.name.toLowerCase() !== playerName.toLowerCase()
    );

    await setDoc(docRef, { ...data, players: updatedPlayers });

    const refreshed = updatedPlayers.map((player) => {
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

    setPlayers(refreshed);
  };

  const handleRatingSubmit = async () => {
    if (!newRating.name) return alert("Player name is required");

    const docRef = doc(db, "sets", currentSet);
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : { players: [] };
    const updatedPlayers = [...data.players];
    const index = updatedPlayers.findIndex((p) => p.name.toLowerCase() === newRating.name.toLowerCase());

    if (index > -1) {
      updatedPlayers[index].submissions = [...(updatedPlayers[index].submissions || []), { ...newRating }];
    } else {
      updatedPlayers.push({ name: newRating.name, active: true, submissions: [{ ...newRating }] });
    }

    await setDoc(docRef, { ...data, players: updatedPlayers });
    setNewRating({ name: "", scoring: 5, defense: 5, rebounding: 5, playmaking: 5, stamina: 5, physicality: 5, xfactor: 5 });
    alert("Rating submitted successfully!");

    const updatedDocSnap = await getDoc(docRef);
    if (updatedDocSnap.exists()) {
      const newData = updatedDocSnap.data();
      const averagedPlayers = (newData.players || []).map((player) => {
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
    }
  };

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
    <div>
      <TeamSetManager currentSet={currentSet} setCurrentSet={setCurrentSet} />

      <nav>
        <button onClick={() => setActiveTab("players")}>Player List</button>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Teams</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </nav>

      {activeTab === "players" && (
        <PlayerListTab
          players={players}
          handleTogglePlayerActive={handleTogglePlayerActive}
          startEditPlayer={startEditPlayer}
          handleDeletePlayer={handleDeletePlayer}
          editingPlayer={editingPlayer}
          setEditingPlayer={setEditingPlayer}
          editPlayerForm={editPlayerForm}
          setEditPlayerForm={setEditPlayerForm}
          showEditForm={showEditForm}
          setShowEditForm={setShowEditForm}
          currentSet={currentSet}
        />
      )}

      {activeTab === "rankings" && (
        <RankingTab
          players={players}
          newRating={newRating}
          setNewRating={setNewRating}
          handleRatingSubmit={handleRatingSubmit}
        />
      )}

      {activeTab === "teams" && (
        <>
          <BalancedTeamGenerator onGenerate={generateBalancedTeams} />
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
          />
        </>
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab leaderboard={leaderboard} />
      )}
    </div>
  );
}
