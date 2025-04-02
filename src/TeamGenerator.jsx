import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import TeamSetManager from "./components/TeamSetManager";

const firebaseConfig = {
  apiKey: "AIzaSyCOGeIQoPX7kNVIHUipxBlJIAYissB2AqM",
  authDomain: "bball-team-generator.firebaseapp.com",
  projectId: "bball-team-generator",
  storageBucket: "bball-team-generator.appspot.com",
  messagingSenderId: "698253006350",
  appId: "1:698253006350:web:ddb9e7e799c034b61c8e5f",
  measurementId: "G-41WKPGWFMK",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function TeamGenerator() {
  const [activeTab, setActiveTab] = useState("rankings");
  const [currentSet, setCurrentSet] = useState("default");

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
  const [editPlayerForm, setEditPlayerForm] = useState({ ...newRating });

  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);
  const [teamSize, setTeamSize] = useState(3);
  const [leaderboard, setLeaderboard] = useState({});

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

  useEffect(() => {
    const tally = {};
    mvpVotes.forEach((name) => {
      if (name) tally[name] = (tally[name] || 0) + 1;
    });

    scores.forEach(({ a, b }, i) => {
      if (a !== "" && b !== "") {
        const teamA = matchups[i]?.[0] || [];
        const teamB = matchups[i]?.[1] || [];
        const teamAWon = parseInt(a) > parseInt(b);

        teamA.forEach((p) => {
          tally[p.name + "_w"] = (tally[p.name + "_w"] || 0) + (teamAWon ? 1 : 0);
          tally[p.name + "_l"] = (tally[p.name + "_l"] || 0) + (!teamAWon ? 1 : 0);
        });

        teamB.forEach((p) => {
          tally[p.name + "_w"] = (tally[p.name + "_w"] || 0) + (!teamAWon ? 1 : 0);
          tally[p.name + "_l"] = (tally[p.name + "_l"] || 0) + (teamAWon ? 1 : 0);
        });
      }
    });

    setLeaderboard(tally);
  }, [mvpVotes, scores, matchups]);

  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Basketball Team Generator</h1>
      <TeamSetManager currentSet={currentSet} setCurrentSet={setCurrentSet} />

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Teams</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </div>

      {activeTab === "rankings" && (
        <RankingTab
          players={players}
          setPlayers={setPlayers}
          newRating={newRating}
          setNewRating={setNewRating}
          editingPlayer={editingPlayer}
          setEditingPlayer={setEditingPlayer}
          editPlayerForm={editPlayerForm}
          setEditPlayerForm={setEditPlayerForm}
          currentSet={currentSet}
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
        />
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab leaderboard={leaderboard} />
      )}
    </div>
  );
}
