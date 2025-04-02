import React from "react";

export default function PlayerListTab({
  players,
  handleTogglePlayerActive,
  startEditPlayer,
  handleDeletePlayer,
  editingPlayer,
  setEditingPlayer,
  editPlayerForm,
  setEditPlayerForm,
  showEditForm,
  setShowEditForm
}) {
  return (
    <div>
      <h2>Player List</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.name}>
              <td>{player.name}</td>
              <td>
                <input
                  type="checkbox"
                  checked={player.active}
                  onChange={(e) => handleTogglePlayerActive(player.name, e.target.checked)}
                />
              </td>
              <td>
                <button onClick={() => startEditPlayer(player)}>Edit</button>
                <button onClick={() => handleDeletePlayer(player.name)} style={{ marginLeft: "0.5rem" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showEditForm && editingPlayer && (
        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}>
          <h3>Edit Player: {editingPlayer}</h3>
          {Object.keys(editPlayerForm).map((key) =>
            key !== "name" ? (
              <div key={key} style={{ marginBottom: "8px" }}>
                <label>{key}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editPlayerForm[key]}
                  onChange={(e) =>
                    setEditPlayerForm({
                      ...editPlayerForm,
                      [key]: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
