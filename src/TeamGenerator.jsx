import React, { useState, useEffect } from "react";
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";
import TeamSetManager from "./components/TeamSetManager";
import BalancedTeamGenerator from "./components/BalancedTeamGenerator";

export default function TeamGenerator() {
  const [activeTab, setActiveTab] = useState("rankings");

  // Player / Ranking states
  const [players, setPlayers] = useState([]);
  const [newRating, setNewRating] = useState({
    name: "",
    scoring: 5,
    defense: 5,
    rebounding: 5,
    playmaking: 5,
    stamina: 5,
    physicality: 5,
    xfactor: 5,
  });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    name: "",
    scoring: 5,
    defense: 5,
    rebounding: 5,
    playmaking: 5,
    stamina: 5,
    physicality: 5,
    xfactor: 5,
  });

  // Teams / Matchups states
  const [teamSize, setTeamSize] = useState(3);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState({});

  // Team Set Management
  const [currentSet, setCurrentSet] = useState("default");

  return (
    <div>
      <TeamSetManager currentSet={currentSet} setCurrentSet={setCurrentSet} />

      <nav>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Teams</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </nav>

      {activeTab === "rankings" && (
        <RankingTab
          players={players}
          setPlayers={setPlayers}
          newRating={newRating}
          setNewRating={setNewRating}
          editingPlayer={editingPlayer}
          setEditingPlayer={setEditingPlayer}
          editPlayerForm={editPlayerForm}
          setEditPlayerForm={setEditPlayerForm}
          currentSet={currentSet}
        />
      )}

      {activeTab === "teams" && (
        <>
          <BalancedTeamGenerator
            players={players}
            teamSize={teamSize}
            setTeams={setTeams}
            setMatchups={setMatchups}
            setMvpVotes={setMvpVotes}
            setScores={setScores}
          />
          <TeamsTab
            players={players}
            teams={teams}
            setTeams={setTeams}
            matchups={matchups}
            setMatchups={setMatchups}
            mvpVotes={mvpVotes}
            setMvpVotes={setMvpVotes}
            scores={scores}
            setScores={setScores}
            teamSize={teamSize}
            setTeamSize={setTeamSize}
          />
        </>
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab leaderboard={leaderboard} />
      )}
    </div>
  );
}
