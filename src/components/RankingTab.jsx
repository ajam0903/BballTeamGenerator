import React, { useState } from "react";
import {
  Section,
  StyledInput,
  StyledButton,
  StyledTable,
  TableHeader,
  TableCell,
  TableRow
} from "./UIComponents";

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

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
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
    <div className="p-4">
      <Section title="Player Rankings">
        <StyledTable>
          <TableHeader>
            <th onClick={() => handleSort("name")} className="cursor-pointer px-3 py-2">Name</th>
            <th onClick={() => handleSort("score")} className="cursor-pointer px-3 py-2">Overall Rating</th>
            <th className="px-3 py-2">Actions</th>
          </TableHeader>
          <tbody>
            {sortedPlayers.map((player) => (
              <TableRow key={player.name}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{calculateScore(player)}</TableCell>
                <TableCell>
                  <StyledButton
                    onClick={() => startEditPlayer(player)}
                    className="mr-2 bg-yellow-500 hover:bg-yellow-600"
                  >
                    {editingPlayer === player.name ? "Cancel" : "Edit"}
                  </StyledButton>
                  <StyledButton
                    onClick={() => handleDeletePlayer(player.name)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </StyledButton>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </StyledTable>
      </Section>

      {editingPlayer && (
        <Section title={`Edit Player: ${editingPlayer}`}>
          <label className="block mb-2">Name:</label>
          <StyledInput
            value={editPlayerForm.name}
            onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })}
          />

          {Object.keys(weightings).map((key) => (
            <div key={key} className="mt-2">
              <label className="block mb-1 capitalize">{key}</label>
              <StyledInput
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
          <div className="mt-4">
            <StyledButton onClick={saveEditedPlayer}>Save</StyledButton>
          </div>
        </Section>
      )}

      <Section title="Submit New Rating">
        <StyledInput
          placeholder="Name"
          value={newRating.name}
          onChange={(e) => setNewRating({ ...newRating, name: e.target.value })}
        />
        {Object.entries(newRating).map(
          ([key, value]) =>
            key !== "name" && (
              <div key={key} className="mt-2">
                <label className="block mb-1 capitalize">{key}</label>
                <StyledInput
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
        <div className="mt-4">
          <StyledButton onClick={handleRatingSubmit}>Submit Rating</StyledButton>
        </div>
      </Section>
    </div>
  );
}
