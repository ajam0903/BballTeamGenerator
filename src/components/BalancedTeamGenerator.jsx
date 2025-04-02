import React from "react";

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

export default function BalancedTeamGenerator({ players, teamSize, setTeams, setMatchups, setMvpVotes, setScores }) {
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

  return (
    <div style={{ marginBottom: "1rem" }}>
      <button onClick={generateBalancedTeams}>Generate Balanced Teams</button>
    </div>
  );
}
