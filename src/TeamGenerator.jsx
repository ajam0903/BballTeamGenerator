import React, { useState } from "react";
import RankingTab from "./components/RankingTab";
import TeamsTab from "./components/TeamsTab";
import LeaderboardTab from "./components/LeaderboardTab";

export default function App() {
  // All your global states
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [mvpVotes, setMvpVotes] = useState([]);
  const [scores, setScores] = useState([]);
  const [teamSize, setTeamSize] = useState(3);
  const [leaderboard, setLeaderboard] = useState({});
  const [activeTab, setActiveTab] = useState("rankings");

  // All your logic (fetching, generating teams, toggles, etc.)

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab("rankings")}>Player Rankings</button>
        <button onClick={() => setActiveTab("teams")}>Teams</button>
        <button onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
      </nav>

      {activeTab === "rankings" && (
        <RankingTab
          players={players}
          setPlayers={setPlayers}
          // pass down editing callbacks, etc.
          // e.g. handleDeletePlayer, handleRatingSubmit
        />
      )}

      {activeTab === "teams" && (
        <TeamsTab
          players={players}
          teams={teams}
          matchups={matchups}
          mvpVotes={mvpVotes}
          scores={scores}
          setMvpVotes={setMvpVotes}
          setScores={setScores}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          // pass down the function that generates teams
        />
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab
          leaderboard={leaderboard}
        />
      )}
    </div>
  );
}
