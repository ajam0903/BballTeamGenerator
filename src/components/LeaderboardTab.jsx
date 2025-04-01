// src/components/LeaderboardTab.jsx
import React from "react";

export default function LeaderboardTab({ leaderboard }) {
  return (
    <div>
      <h2>Leaderboard</h2>
      <ul>
        {Object.keys(leaderboard)
          .filter(key => !key.includes("_w") && !key.includes("_l"))
          .map((player) => (
            <li key={player}>
              <strong>{player}</strong>:
              {leaderboard[player]} MVPs,
              {leaderboard[player + "_w"] || 0}W -
              {leaderboard[player + "_l"] || 0}L
            </li>
          ))}
      </ul>
    </div>
  );
}
