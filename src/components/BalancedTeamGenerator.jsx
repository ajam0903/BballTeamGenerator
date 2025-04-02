import React from "react";

export default function BalancedTeamGenerator({ onGenerate }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <button onClick={onGenerate}>Generate Balanced Teams</button>
    </div>
  );
}
