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
        setPlayers(data.players || []);
        setMvpVotes(data.mvpVotes || []);
        setScores(data.scores || []);
      } else {
        setPlayers([]);
      }
    };
    fetchSet();
  }, [currentSet]);

  useEffect(() => {
    const saveToFirebase = async () => {
      await setDoc(doc(db, "sets", currentSet), {
        players,
        mvpVotes,
        scores,
      });
    };
    saveToFirebase();
  }, [players, mvpVotes, scores]);

  useEffect(() => {
    const tally = {};
    mvpVotes.forEach((name) => {
      if (name) {
        tally[name] = (tally[name] || 0) + 1;
      }
    });

    scores.forEach(({ a, b }, i) => {
      if (a !== "" && b !== "") {
        const teamA = matchups[i]?.[0] || [];
        const teamB = matchups[i]?.[1] || [];
        const teamAWon = parseInt(a) > parseInt(b);

        teamA.forEach((p) => {
          const key = p.name;
          if (!tally[key]) tally[key] = 0;
          tally[key + "_w"] = (tally[key + "_w"] || 0) + (teamAWon ? 1 : 0);
          tally[key + "_l"] = (tally[key + "_l"] || 0) + (!teamAWon ? 1 : 0);
        });
        teamB.forEach((p) => {
          const key = p.name;
          if (!tally[key]) tally[key] = 0;
          tally[key + "_w"] = (tally[key + "_w"] || 0) + (!teamAWon ? 1 : 0);
          tally[key + "_l"] = (tally[key + "_l"] || 0) + (teamAWon ? 1 : 0);
        });
      }
    });

    setLeaderboard(tally);
  }, [mvpVotes, scores, matchups]);

  const calculateRating = (player) => {
    return parseFloat(
      (
        player.scoring * weightings.scoring +
        player.defense * weightings.defense +
        player.rebounding * weightings.rebounding +
        player.playmaking * weightings.playmaking +
        player.stamina * weightings.stamina +
        player.physicality * weightings.physicality +
        player.xfactor * weightings.xfactor
      ).toFixed(2)
    );
  };

  const generateTeams = () => {
    const activePlayers = players.filter((p) => p.active && p.name.trim() !== "");
    const enriched = activePlayers.map((p) => ({ ...p, rating: calculateRating(p) }));
    const teamCount = Math.ceil(enriched.length / teamSize);

    let bestTeams = [];
    let smallestSpread = Infinity;

    for (let i = 0; i < 100; i++) {
      const shuffled = [...enriched].sort(() => Math.random() - 0.5);
      const testTeams = Array.from({ length: teamCount }, () => []);
      shuffled.forEach((p, idx) => {
        testTeams[idx % teamCount].push(p);
      });

      const totals = testTeams.map((team) => team.reduce((sum, p) => sum + p.rating, 0));
      const spread = Math.max(...totals) - Math.min(...totals);

      if (spread < smallestSpread) {
        bestTeams = testTeams;
        smallestSpread = spread;
      }
    }

    setTeams(bestTeams);

    const shuffledTeams = [...bestTeams].sort(() => Math.random() - 0.5);
    const matchups = [];
    for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
      matchups.push([shuffledTeams[i], shuffledTeams[i + 1] || []]);
    }
    setMatchups(matchups);
    setMvpVotes(Array(matchups.length).fill(""));
    setScores(Array(matchups.length).fill({ a: "", b: "" }));
  };

  const handleMvpChange = (matchIndex, name) => {
    const updated = [...mvpVotes];
    updated[matchIndex] = name;
    setMvpVotes(updated);
  };

  const handleScoreChange = (matchIndex, team, value) => {
    const updated = [...scores];
    updated[matchIndex] = { ...updated[matchIndex], [team]: value };
    setScores(updated);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Basketball Team Generator</h1>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
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

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button onClick={generateTeams}>Generate Teams</button>
            <button onClick={() => alert("CSV download coming soon")}>Download CSV</button>
          </div>

          {teams.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "2rem" }}>Teams</h2>
              {teams.map((team, i) => (
                <div key={i} style={{ padding: "0.5rem", border: "1px solid #ddd", marginBottom: "0.5rem" }}>
                  <p style={{ fontWeight: "bold" }}>Team {i + 1}</p>
                  {team.map((p) => (
                    <p key={p.name}>{p.name} - {p.rating}</p>
                  ))}
                </div>
              ))}

              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "2rem" }}>Matchups</h2>
              {matchups.map(([team1, team2], i) => (
                <div key={i} style={{ padding: "0.5rem", border: "1px solid #ddd", marginBottom: "0.5rem" }}>
                  <p style={{ fontWeight: "bold" }}>Match {i + 1}</p>
                  <p>{team1.map(p => p.name).join(", ")} vs {team2.map(p => p.name).join(", ")}</p>

                  <div style={{ marginTop: "0.5rem" }}>
                    <label>MVP: </label>
                    <select
                      value={mvpVotes[i] || ""}
                      onChange={(e) => handleMvpChange(i, e.target.value)}
                    >
                      <option value="">-- Select MVP --</option>
                      {[...team1, ...team2].map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: "0.5rem" }}>
                    <label>Score: </label>
                    <input
                      type="number"
                      placeholder="Team A"
                      style={{ width: "60px", marginRight: "0.5rem" }}
                      value={scores[i]?.a || ""}
                      onChange={(e) => handleScoreChange(i, "a", e.target.value)}
                    />
                    vs
                    <input
                      type="number"
                      placeholder="Team B"
                      style={{ width: "60px", marginLeft: "0.5rem" }}
                      value={scores[i]?.b || ""}
                      onChange={(e) => handleScoreChange(i, "b", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "leaderboard" && (
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Leaderboard</h2>
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
