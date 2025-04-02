import React, { useState } from "react";

export default function RankingTab({
  players,
  newRating,
  setNewRating,
  handleRatingSubmit,
  editingPlayer,
  setEditingPlayer,
  editPlayerForm,
  setEditPlayerForm,
  handleDeletePlayer,
  startEditPlayer,
  saveEditedPlayer,
}) {
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedPlayers = [...players]
    .filter((p) => (showActiveOnly ? p.active : true))
    .sort((a, b) => {
      const aValue = sortKey === "name" ? a.name.toLowerCase() : a[sortKey];
      const bValue = sortKey === "name" ? b.name.toLowerCase() : b[sortKey];
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const weightings = {
    scoring: 0.25,
    defense: 0.2,
    rebounding: 0.15,
    playmaking: 0.15,
    stamina: 0.1,
    physicality: 0.1,
    xfactor: 0.05,
  };

  const calculateScore = (player) => {
    return (
      player.scoring * weightings.scoring +
      player.defense * weightings.defense +
      player.rebounding * weightings.rebounding +
      player.playmaking * weightings.playmaking +
      player.stamina * weightings.stamina +
      player.physicality * weightings.physicality +
      player.xfactor * weightings.xfactor
    ).toFixed(2);
  };

  return (
    <div>
      <h2>Player Rankings</h2>
      <label>
        <input
          type="checkbox"
          checked={showActiveOnly}
          onChange={(e) => setShowActiveOnly(e.target.checked)}
        />
        Show Active Only
      </label>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("name")}>Name</th>
            <th onClick={() => handleSort("score")}>Overall Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.name}>
              <td>{player.name}</td>
              <td>{calculateScore(player)}</td>
              <td>
                <button onClick={() => startEditPlayer(player)}>
                  {editingPlayer === player.name ? "Cancel" : "Edit"}
                </button>
                <button onClick={() => handleDeletePlayer(player.name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingPlayer && (
        <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h3>Edit Player: {editingPlayer}</h3>
          <label>
            Name:
            <input
              value={editPlayerForm.name}
              onChange={(e) =>
                setEditPlayerForm({ ...editPlayerForm, name: e.target.value })
              }
            />
          </label>
          {Object.keys(weightings).map((key) => (
            <div key={key}>
              <label>{key}</label>
              <input
                type="number"
                min="1"
                max="10"
                value={editPlayerForm[key]}
                onChange={(e) =>
                  setEditPlayerForm({
                    ...editPlayerForm,
                    [key]: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          ))}
          <button onClick={saveEditedPlayer}>Save</button>
        </div>
      )}

      <h3>Submit New Rating</h3>
      <input
        placeholder="Name"
        value={newRating.name}
        onChange={(e) => setNewRating({ ...newRating, name: e.target.value })}
      />
      {Object.entries(newRating).map(
        ([key, value]) =>
          key !== "name" && (
            <div key={key}>
              <label>{key}</label>
              <input
                type="number"
                min="1"
                max="10"
                value={value}
                onChange={(e) =>
                  setNewRating({
                    ...newRating,
                    [key]: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          )
      )}
      <button onClick={handleRatingSubmit}>Submit Rating</button>
    </div>
  );
}
