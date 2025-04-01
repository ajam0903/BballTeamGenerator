import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">3v3 Basketball Team Generator</h1>

      {players.map((p, i) => (
        <Card key={i} className="p-4">
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input
              className="p-2 rounded border"
              placeholder="Player Name"
              value={p.name}
              onChange={(e) => updatePlayer(i, "name", e.target.value)}
            />
            {["scoring", "defense", "rebounding", "playmaking", "stamina", "physicality", "xfactor"].map((field) => (
              <input
                key={field}
                type="number"
                className="p-2 rounded border"
                min={1}
                max={10}
                value={p[field]}
                onChange={(e) => updatePlayer(i, field, e.target.value)}
              />
            ))}
            <label className="col-span-2 md:col-span-1">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => updatePlayer(i, "active", e.target.checked)}
              /> Active
            </label>
            <div className="col-span-2 md:col-span-1">Rating: {calculateRating(p)}</div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button onClick={addPlayer}>Add Player</Button>
        <Button onClick={generateTeams}>Generate Teams</Button>
        <Button onClick={downloadCSV}>Download CSV</Button>
      </div>

      {teams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mt-6">Teams</h2>
          {teams.map((team, i) => (
            <Card key={i} className="p-2">
              <CardContent>
                <p className="font-semibold">Team {i + 1}</p>
                {team.map((p) => (
                  <p key={p.name}>{p.name} - {p.rating}</p>
                ))}
              </CardContent>
            </Card>
          ))}

          <h2 className="text-xl font-bold mt-6">Matchups</h2>
          {matchups.map(([team1, team2], i) => (
            <Card key={i} className="p-2">
              <CardContent>
                <p className="font-semibold">Match {i + 1}</p>
                <p>{team1.map(p => p.name).join(", ")} vs {team2.map(p => p.name).join(", ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
