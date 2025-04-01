import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

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
            if (typeof avgStats[key] === 'number') avgStats[key] = parseFloat((avgStats[key] / len).toFixed(2));
          });
          avgStats.submissions = submissions;
          return avgStats;
        });
        setPlayers(averagedPlayers);
        setMvpVotes(data.mvpVotes || []);
        setScores(data.scores || []);
      } else {
        console.warn(`No Firestore document found for set: ${currentSet}. Keeping existing data.`);
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

  const generateTeams = () => {
    const activePlayers = players.filter((p) => p.active);
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const newTeams = Array.from({ length: Math.ceil(shuffled.length / teamSize) }, (_, i) =>
      shuffled.slice(i * teamSize, (i + 1) * teamSize)
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

  const handleRatingSubmit = async () => {
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
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Basketball Team Generator</h1>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Team Generator</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </div>

      {activeTab === "rankings" && (
        <div>
          <h2>Player Rankings</h2>
          <ul>
            {players.map((player) => (
              <li key={player.name}>
                {player.name} - Rating: {(
                  player.scoring * weightings.scoring +
                  player.defense * weightings.defense +
                  player.rebounding * weightings.rebounding +
                  player.playmaking * weightings.playmaking +
                  player.stamina * weightings.stamina +
                  player.physicality * weightings.physicality +
                  player.xfactor * weightings.xfactor
                ).toFixed(2)}
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: "2rem" }}>Player Ratings & Status</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Name</th>
                <th>Rating</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.name}>
                  <td>{player.name}</td>
                  <td>{(
                    player.scoring * weightings.scoring +
                    player.defense * weightings.defense +
                    player.rebounding * weightings.rebounding +
                    player.playmaking * weightings.playmaking +
                    player.stamina * weightings.stamina +
                    player.physicality * weightings.physicality +
                    player.xfactor * weightings.xfactor
                  ).toFixed(2)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={player.active}
                      onChange={async (e) => {
                        const docRef = doc(db, "sets", currentSet);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                          const data = docSnap.data();
                          const updatedPlayers = [...data.players];
                          const index = updatedPlayers.findIndex(p => p.name.toLowerCase() === player.name.toLowerCase());
                          if (index > -1) {
                            updatedPlayers[index].active = e.target.checked;
                            await setDoc(docRef, { ...data, players: updatedPlayers });
                            setPlayers((prev) =>
                              prev.map(p =>
                                p.name === player.name ? { ...p, active: e.target.checked } : p
                              )
                            );
                          }
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: "2rem" }}>Submit a New Rating</h3>
          <input placeholder="Name" value={newRating.name} onChange={(e) => setNewRating({ ...newRating, name: e.target.value })} />
          {Object.keys(weightings).map((key) => (
            <div key={key}>
              <label>{key}: </label>
              <input
                type="number"
                min="1"
                max="10"
                value={newRating[key]}
                onChange={(e) => setNewRating({ ...newRating, [key]: parseInt(e.target.value) })}
              />
            </div>
          ))}
          <button onClick={handleRatingSubmit}>Submit Rating</button>
        </div>
      )}

      {activeTab === "teams" && (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <label>Team Size:</label>
            <select value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}v{n}</option>
              ))}
            </select>
            <button onClick={generateTeams} style={{ marginLeft: "1rem" }}>Generate Teams</button>
          </div>

          {teams.length > 0 && (
            <>
              <h2>Teams</h2>
              {teams.map((team, i) => (
                <div key={i} style={{ marginBottom: "0.5rem" }}>
                  <strong>Team {i + 1}:</strong> {team.map(p => p.name).join(", ")}
                </div>
              ))}

              <h2>Matchups</h2>
              {matchups.map(([teamA, teamB], i) => (
                <div key={i} style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "0.5rem" }}>
                  <strong>Match {i + 1}:</strong> {teamA.map(p => p.name).join(", ")} vs {teamB.map(p => p.name).join(", ")}
                  <div>
                    MVP:
                    <select value={mvpVotes[i] || ""} onChange={(e) => {
                      const updated = [...mvpVotes];
                      updated[i] = e.target.value;
                      setMvpVotes(updated);
                    }}>
                      <option value="">-- Select MVP --</option>
                      {[...teamA, ...teamB].map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    Score:
                    <input type="number" placeholder="Team A" value={scores[i]?.a || ""} onChange={(e) => {
                      const updated = [...scores];
                      updated[i] = { ...updated[i], a: e.target.value };
                      setScores(updated);
                    }} />
                    vs
                    <input type="number" placeholder="Team B" value={scores[i]?.b || ""} onChange={(e) => {
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
