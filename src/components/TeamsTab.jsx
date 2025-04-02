import React from "react";

export default function TeamsTab({
  players = [],
  teams = [],
  setTeams,
  matchups = [],
  setMatchups,
  mvpVotes = [],
  setMvpVotes,
  scores = [],
  setScores,
  teamSize,
  setTeamSize,
  handlePlayerActiveToggle,
  weightings,
  generateBalancedTeams
}) {
  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label>Team Size:</label>
        <select
          value={teamSize}
          onChange={(e) => setTeamSize(parseInt(e.target.value))}
          style={{ marginLeft: "0.5rem" }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}v{n}
            </option>
          ))}
        </select>
        <button onClick={generateBalancedTeams} style={{ marginLeft: "1rem" }}>
          Generate Teams
        </button>
      </div>

      {/* DEBUG SECTION */}
      <div style={{ marginBottom: "2rem", background: "#f9f9f9", padding: "1rem", border: "1px solid #ccc" }}>
        <h3>Debug Info</h3>
        <p>Players: {players.length}</p>
        <p>Teams: {teams.length}</p>
        <p>Matchups: {matchups.length}</p>
      </div>

      {teams.length === 0 && (
        <p style={{ color: "#888", fontStyle: "italic" }}>No teams generated yet. Select active players and click "Generate Teams".</p>
      )}

      {teams.length > 0 && (
        <>
          <h2>Teams</h2>
          {teams.map((team, i) => (
            <div key={i} style={{ marginBottom: "0.5rem" }}>
              <strong>Team {i + 1}:</strong> {team.map((p) => p.name).join(", ")}
            </div>
          ))}

          <h2>Matchups</h2>
          {matchups.map(([teamA, teamB], i) => (
            <div
              key={i}
              style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "1rem" }}
            >
              <strong>Match {i + 1}:</strong> {teamA.map((p) => p.name).join(", ")} vs {teamB.map((p) => p.name).join(", ")}
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
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
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

      {players.length > 0 && (
        <>
          <h2>Player List</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Name</th>
                <th>Overall Rating</th>
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
                      onChange={(e) => handlePlayerActiveToggle(player.name, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
