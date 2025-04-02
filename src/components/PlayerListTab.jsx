import React from "react";

export default function PlayerListTab({ players, handleTogglePlayerActive }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2>Player List</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Overall Rating</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const rating = (
              player.scoring * 0.25 +
              player.defense * 0.2 +
              player.rebounding * 0.15 +
              player.playmaking * 0.15 +
              player.stamina * 0.1 +
              player.physicality * 0.1 +
              player.xfactor * 0.05
            ).toFixed(2);

            return (
              <tr key={player.name}>
                <td>{player.name}</td>
                <td>{rating}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={player.active}
                    onChange={(e) => handleTogglePlayerActive(player.name, e.target.checked)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
