// src/components/RankingTab.jsx
import React, { useState } from "react";

export default function RankingTab({
  players,
  setPlayers,
  handlePlayerActiveToggle,
  handleDeletePlayer,
  startEditPlayer,
  editingPlayer,
  editPlayerForm,
  setEditPlayerForm,
  saveEditedPlayer,
  setEditingPlayer,
  handleRatingSubmit,
  newRating,
  setNewRating,
}) {
  // Local state for sorting/filter
  const [sortBy, setSortBy] = useState("name");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Derived array for display
  const displayedPlayers = [...players]
    .filter((p) => !showActiveOnly || p.active)
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        // sort by rating descending if you store it or calculate it
        const ratingA = a.scoring || 0; 
        const ratingB = b.scoring || 0;
        return ratingB - ratingA;
      }
    });

  return (
    <div>
      <h2>Player Rankings</h2>

      {/* SORT & FILTER CONTROLS */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "8px" }}>Sort By:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ marginRight: "16px" }}
        >
          <option value="name">Name</option>
          <option value="rating">Rating</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
          />
          Show Active Only
        </label>
      </div>

      {/* TABLE OR LIST */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Name</th>
            <th>Rating</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayedPlayers.map((player) => (
            <tr key={player.name}>
              <td>{player.name}</td>
              <td>{/* compute or display player rating here */}</td>
              <td>
                <input
                  type="checkbox"
                  checked={player.active}
                  onChange={(e) => handlePlayerActiveToggle(player.name, e.target.checked)}
                />
              </td>
              <td>
                <button onClick={() => startEditPlayer(player)}>Edit</button>
                <button onClick={() => handleDeletePlayer(player.name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EDIT PLAYER FORM */}
      {editingPlayer && (
        <div style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h3>Edit Player: {editingPlayer}</h3>
          {/* inputs for editing stats, name, etc. */}
          {/* call saveEditedPlayer on 'Save' */}
        </div>
      )}

      {/* SUBMIT A NEW RATING */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Submit a New Rating</h3>
        {/* your new rating form, then call handleRatingSubmit */}
      </div>
    </div>
  );
}
