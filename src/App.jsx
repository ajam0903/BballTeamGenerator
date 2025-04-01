import React, { useState, useEffect } from "react";

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

  useEffect(() => {
    const savedPlayers = localStorage.getItem("players");
    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers));
    } else {
      setPlayers([
        {
          name: "",
          scoring: 5,
          defense: 5,
          rebounding: 5,
          playmaking: 5,
          stamina: 5,
          physicality: 5,
          xfactor: 5,
          active: true,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

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

  const updatePlayer = (index, field, value) => {
    const updated = [...players];
    updated[index][field] = field === "active" ? value : field === "name" ? value : parseFloat(value);
    setPlayers(updated);
  };

  const addPlayer = () => {
    setPlayers([
      ...players,
      {
        name: "",
        scoring: 5,
        defense: 5,
        rebounding: 5,
        playmaking: 5,
        stamina: 5,
        physicality: 5,
        xfactor: 5,
        active: true,
      },
    ]);
  };

  const generateTeams = () => {
    const activePlayers = players.filter((p) => p.active && p.name.trim() !== "");
    const enriched = activePlayers.map((p) => ({ ...p, rating: calculateRating(p) }));
    const teamSize = 3;
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
  };

  const downloadCSV = () => {
    let csv = "Team,Player,Rating\n";
    teams.forEach((team, i) => {
      team.forEach((p) => {
        csv += `Team ${i + 1},${p.name},${p.rating}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>3v3 Basketball Team Generator</h1>

      {players.map((p, i) => (
        <div key={i} style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}>
            <input
              placeholder="Player Name"
              value={p.name}
              onChange={(e) => updatePlayer(i, "name", e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #aaa" }}
            />
            {["scoring", "defense", "rebounding", "playmaking", "stamina", "physicality", "xfactor"].map((field) => (
              <input
                key={field}
                type="number"
                min={1}
                max={10}
                value={p[field]}
                onChange={(e) => updatePlayer(i, field, e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #aaa" }}
              />
            ))}
            <label style={{ gridColumn: "span 2" }}>
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => updatePlayer(i, "active", e.target.checked)}
              /> Active
            </label>
            <div style={{ gridColumn: "span 2" }}>Rating: {calculateRating(p)}</div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={addPlayer}>Add Player</button>
        <button onClick={generateTeams}>Generate Teams</button>
        <button onClick={downloadCSV}>Download CSV</button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
