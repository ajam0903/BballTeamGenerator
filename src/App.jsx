import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOGeIQoPX7kNVIHUipxBlJIAYissB2AqM",
  authDomain: "bball-team-generator.firebaseapp.com",
  projectId: "bball-team-generator",
  storageBucket: "bball-team-generator.firebasestorage.app",
  messagingSenderId: "698253006350",
  appId: "1:698253006350:web:ddb9e7e799c034b61c8e5f",
  measurementId: "G-41WKPGWFMK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const weightings = {
  scoring: 0.25,
  defense: 0.2,
  rebounding: 0.15,
  playmaking: 0.15,
  stamina: 0.1,
  physicality: 0.1,
  xfactor: 0.05,
};

export default function TeamGenerator() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);
  const [sets, setSets] = useState({});
  const [currentSet, setCurrentSet] = useState("default");
  const [newSetName, setNewSetName] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [activeTab, setActiveTab] = useState("teams");
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
            active: player.active ?? true,
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
            if (typeof avgStats[key] === 'number') avgStats[key] = parseFloat((avgStats[key] / len).toFixed(2));
          });
          return avgStats;
        });
        setPlayers(averagedPlayers);
        setMvpVotes(data.mvpVotes || []);
        setScores(data.scores || []);
      } else {
        setPlayers([]);
      }
    };
    fetchSet();
  }, [currentSet]);

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Basketball Team Generator</h1>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("teams")}>Team Generator</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </div>

      {activeTab === "teams" && (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="team-size">Team Size:</label>
            <select
              id="team-size"
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              style={{ marginLeft: "0.5rem" }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}v{n}</option>
              ))}
            </select>
          </div>

          <button onClick={() => alert("Team generation logic not yet implemented")}>Generate Teams</button>

          {teams.length > 0 && (
            <>
              <h2 style={{ marginTop: "2rem" }}>Teams</h2>
              {teams.map((team, i) => (
                <div key={i} style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "0.5rem" }}>
                  <strong>Team {i + 1}</strong>
                  {team.map((player) => (
                    <div key={player.name}>{player.name} - Rating: {player.rating}</div>
                  ))}
                </div>
              ))}

              <h2 style={{ marginTop: "2rem" }}>Matchups</h2>
              {matchups.map(([team1, team2], i) => (
                <div key={i} style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "0.5rem" }}>
                  <strong>Match {i + 1}</strong>
                  <div>{team1.map(p => p.name).join(", ")} vs {team2.map(p => p.name).join(", ")}</div>
                  <div>
                    MVP: <select value={mvpVotes[i] || ""} onChange={(e) => {
                      const updated = [...mvpVotes];
                      updated[i] = e.target.value;
                      setMvpVotes(updated);
                    }}>
                      <option value="">-- Select MVP --</option>
                      {[...team1, ...team2].map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    Score: 
                    <input type="number" value={scores[i]?.a || ""} onChange={(e) => {
                      const updated = [...scores];
                      updated[i] = { ...updated[i], a: e.target.value };
                      setScores(updated);
                    }} />
                    vs
                    <input type="number" value={scores[i]?.b || ""} onChange={(e) => {
                      const updated = [...scores];
                      updated[i] = { ...updated[i], b: e.target.value };
                      setScores(updated);
                    }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {activeTab === "leaderboard" && (
        <div>
          <h2>Leaderboard</h2>
          <ul>
            {Object.keys(leaderboard)
              .filter((key) => !key.includes("_w") && !key.includes("_l"))
              .map((player) => (
                <li key={player}>
                  <strong>{player}</strong>: {leaderboard[player]} MVPs, {leaderboard[player + "_w"] || 0}W - {leaderboard[player + "_l"] || 0}L
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
