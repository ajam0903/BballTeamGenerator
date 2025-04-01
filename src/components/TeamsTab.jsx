// src/components/TeamsTab.jsx
import React from "react";

export default function TeamsTab({
  players,
  teams,
  matchups,
  generateTeams,
  mvpVotes,
  scores,
  setMvpVotes,
  setScores,
  teamSize,
  setTeamSize
}) {
  return (
    <div>
      <h2>Team Generator</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label>Team Size:</label>
        <select value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n}v{n}</option>
          ))}
        </select>
        <button onClick={generateTeams} style={{ marginLeft: "1rem" }}>
          Generate Teams
        </button>
      </div>

      {/* TEAMS & MATCHUPS */}
      {teams.length > 0 && (
        <>
          <h3>Teams</h3>
          {teams.map((team, i) => (
            <div key={i}>
              <strong>Team {i + 1}:</strong> {team.map(p => p.name).join(", ")}
            </div>
          ))}

          <h3>Matchups</h3>
          {matchups.map(([teamA, teamB], i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "0.5rem" }}>
              <strong>Match {i + 1}:</strong> {teamA.map(p => p.name).join(", ")} vs {teamB.map(p => p.name).join(", ")}
              <div>
                MVP:
                <select
                  value={mvpVotes[i] || ""}
                  onChange={(e) => {
                    const updated = [...mvpVotes];
                    updated[i] = e.target.value;
                    setMvpVotes(updated);
                  }}
                >
                  <option value="">-- Select MVP --</option>
                  {[...teamA, ...teamB].map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                Score:
                <input
                  type="number"
                  placeholder="Team A"
                  value={scores[i]?.a || ""}
                  onChange={(e) => {
                    const updated = [...scores];
                    updated[i] = { ...updated[i], a: e.target.value };
                    setScores(updated);
                  }}
                />
                vs
                <input
                  type="number"
                  placeholder="Team B"
                  value={scores[i]?.b || ""}
                  onChange={(e) => {
                    const updated = [...scores];
                    updated[i] = { ...updated[i], b: e.target.value };
                    setScores(updated);
                  }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
