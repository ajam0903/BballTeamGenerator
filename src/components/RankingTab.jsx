// RankingTab.jsx
import React, { useState } from "react";

export default function RankingTab({
  players,
  setPlayers,
  newRating,
  setNewRating,
  handleRatingSubmit,
  editingPlayer,
  setEditingPlayer,
  editPlayerForm,
  setEditPlayerForm,
  saveEditedPlayer,
  handlePlayerActiveToggle,
  handleDeletePlayer,
  startEditPlayer,
}) {
  // Sorting & Filtering states
  const [sortBy, setSortBy] = useState("name");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Derived array
  const displayedPlayers = [...players]
    .filter((p) => !showActiveOnly || p.active)
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        // sort by scoring desc if you want
        const rA = a.scoring || 0;
        const rB = b.scoring || 0;
        return rB - rA;
      }
    });

  return (
    <div>
      <h2>Player Rankings</h2>
      {/* SORT & FILTER */}
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

      {/* TABLE OF PLAYERS */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Name</th>
            <th>Rating</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayedPlayers.map((player) => {
            // You might want to do an actual rating formula
            // or store rating in Firestore
            // If you store average rating, do player.rating
            const rating = player.scoring || 5;

            return (
              <tr key={player.name}>
                <td>{player.name}</td>
                <td>{rating}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={player.active}
                    onChange={(e) =>
                      handlePlayerActiveToggle(player.name, e.target.checked)
                    }
                  />
                </td>
                <td>
                  <button
                    style={{ marginRight: "8px" }}
                    onClick={() => startEditPlayer(player)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ backgroundColor: "#ff6b6b" }}
                    onClick={() => handleDeletePlayer(player.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* EDIT PLAYER FORM */}
      {editingPlayer && (
        <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h3>Edit Player: {editingPlayer}</h3>
          <div style={{ marginBottom: "8px" }}>
            <label>Name: </label>
            <input
              value={editPlayerForm.name}
              onChange={(e) =>
                setEditPlayerForm({
                  ...editPlayerForm,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* Example editing each skill */}
          {["scoring","defense","rebounding","playmaking","stamina","physicality","xfactor"]
            .map((skill) => (
              <div key={skill} style={{ marginBottom: "8px" }}>
                <label>{skill}: </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editPlayerForm[skill]}
                  onChange={(e) =>
                    setEditPlayerForm({
                      ...editPlayerForm,
                      [skill]: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
          ))}
          <button style={{ marginRight: "8px" }} onClick={() => setEditingPlayer(null)}>
            Cancel
          </button>
          <button onClick={saveEditedPlayer}>Save Changes</button>
        </div>
      )}

      {/* SUBMIT NEW RATING */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Submit a New Rating</h3>
        <input
          placeholder="Name"
          value={newRating.name}
          onChange={(e) => setNewRating({ ...newRating, name: e.target.value })}
          style={{ display: "block", marginBottom: "8px" }}
        />
        {["scoring","defense","rebounding","playmaking","stamina","physicality","xfactor"]
          .map((skill) => (
            <div key={skill} style={{ marginBottom: "8px" }}>
              <label>{skill}: </label>
              <input
                type="number"
                min="1"
                max="10"
                value={newRating[skill]}
                onChange={(e) =>
                  setNewRating({
                    ...newRating,
                    [skill]: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
        ))}
        <button onClick={handleRatingSubmit}>Submit Rating</button>
      </div>
    </div>
  );
}
