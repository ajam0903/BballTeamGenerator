﻿// /src/components/TeamsTab.jsx
import React from "react";
import { StyledButton } from "./UIComponents";
import { useEffect, useState, useRef } from "react";
import { StyledSelect } from "./UIComponents";

export default function TeamsTab({
    players = [],
    teams = [],
    setTeams,
    matchups = [],
    setMatchups,
    mvpVotes = [],
    setMvpVotes,
    scores = [],
    setScores,
    teamSize,
    setTeamSize,
    generateBalancedTeams,
    handlePlayerActiveToggle,
    weightings,
    saveMatchResults,
    archiveCompletedMatches,
    hasGeneratedTeams,
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showTeamSelector, setShowTeamSelector] = useState(false);
    const [manualTeams, setManualTeams] = useState([[], []]);
    const dropdownRef = useRef(null);

    // Sort players so active ones appear on top
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.active === b.active) return 0;
        return a.active ? -1 : 1;
    });

    // Count active players
    const activePlayerCount = players.filter(player => player.active).length;
    const [teamRankings, setTeamRankings] = useState([]);
    // Compute rating 1–10 based on your skill weighting
    const computeRating1to10 = (player) => {
        const {
            scoring = 5,
            defense = 5,
            rebounding = 5,
            playmaking = 5,
            stamina = 5,
            physicality = 5,
            xfactor = 5,
        } = player;

        const raw =
            scoring * weightings.scoring +
            defense * weightings.defense +
            rebounding * weightings.rebounding +
            playmaking * weightings.playmaking +
            stamina * weightings.stamina +
            physicality * weightings.physicality +
            xfactor * weightings.xfactor;

        // clamp rating to 10
        const rating = Math.min(raw, 10);
        return rating;
    };

    // For the percentage-based bar
    const getPercentage = (rating) => {
        // rating is from 0–10, so rating=5 => 50%
        return (rating / 10) * 100;
    };

    // Calculate team strength based on player ratings
    const calculateTeamStrength = (team) => {
        if (!team || team.length === 0) return 0;

        const totalRating = team.reduce((sum, player) => {
            return sum + computeRating1to10(player);
        }, 0);

        // Average rating per player (to account for teams with different sizes)
        return totalRating / team.length;
    };

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Initialize manual teams when team size changes
    useEffect(() => {
        const numTeams = Math.ceil(activePlayerCount / teamSize);
        setManualTeams(Array.from({ length: numTeams }, () => []));
    }, [teamSize, activePlayerCount]);

    // Handle adding a player to a specific team
    const addPlayerToTeam = (player, teamIndex) => {
        // Check if player is already on any team
        let playerExistsOnTeam = false;
        const updatedTeams = manualTeams.map((team, idx) => {
            if (team.some(p => p.name === player.name)) {
                playerExistsOnTeam = true;
                return team.filter(p => p.name !== player.name);
            }
            return team;
        });

        // Add player to the selected team if not already there
        if (!playerExistsOnTeam || updatedTeams[teamIndex].length < teamSize) {
            updatedTeams[teamIndex] = [...updatedTeams[teamIndex], player];
        }

        setManualTeams(updatedTeams);
    };

    // Update team rankings whenever teams change
    useEffect(() => {
        if (teams && teams.length > 0) {
            const rankings = teams.map((team, index) => {
                const strength = calculateTeamStrength(team);
                return {
                    teamIndex: index,
                    strength: strength,
                    players: team
                };
            });

            // Sort by team strength (highest to lowest)
            setTeamRankings(rankings.sort((a, b) => b.strength - a.strength));
        }
    }, [teams]);

    // Generate matchups from manual teams
    const generateMatchupsFromManualTeams = () => {
        // Create matchups from the manual teams
        const newMatchups = [];
        for (let i = 0; i < manualTeams.length - 1; i += 2) {
            newMatchups.push([manualTeams[i], manualTeams[i + 1] || []]);
        }

        setTeams(manualTeams);
        setMatchups(newMatchups);
        setMvpVotes(Array(newMatchups.length).fill(""));
        setScores(Array(newMatchups.length).fill({ a: "", b: "" }));
        setShowTeamSelector(false);
    };

    // Check if an active player is not assigned to any team
    const getUnassignedPlayers = () => {
        const assignedPlayerNames = manualTeams.flat().map(p => p.name);
        return sortedPlayers.filter(p => p.active && !assignedPlayerNames.includes(p.name));
    };

    // Check if teams are valid based on team size
    const areTeamsValid = () => {
        const unassignedCount = getUnassignedPlayers().length;
        const teamsWithCorrectSize = manualTeams.filter(team => team.length === teamSize).length;

        // All active players should be assigned and most teams should have the correct size
        return unassignedCount === 0 && teamsWithCorrectSize >= manualTeams.length - 1;
    };

    // Get team rank string showing position out of total
    const getTeamRankString = (teamIndex) => {
        if (!teamRankings || teamRankings.length === 0) return "";

        const rankObj = teamRankings.find(rank => rank.teamIndex === teamIndex);
        if (!rankObj) return "";

        const rankPosition = teamRankings.indexOf(rankObj) + 1;
        return `Rank: ${rankPosition}/${teamRankings.length}`;
    };

    // Get color class based on rank
    const getRankColorClass = (teamIndex) => {
        if (!teamRankings || teamRankings.length === 0) return "text-gray-400";

        const rankObj = teamRankings.find(rank => rank.teamIndex === teamIndex);
        if (!rankObj) return "text-gray-400";

        const rankPosition = teamRankings.indexOf(rankObj) + 1;

        // Top team gets gold, second gets silver, third gets bronze
        if (rankPosition === 1) return "text-yellow-400";
        if (rankPosition === 2) return "text-gray-300";
        if (rankPosition === 3) return "text-yellow-600";
        return "text-gray-400";
    };

    return (
        <div className="space-y-8">
            {/* Control Section with Dropdown */}
            <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-400">Team Size:</label>
                <StyledSelect
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                >
                    {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                            {n}v{n}
                        </option>
                    ))}
                </StyledSelect>

                {/* Generate Teams Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                    >
                        Generate Teams
                        <svg
                            className="ml-1 w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute mt-2 w-48 bg-gray-800 rounded shadow-lg z-10">
                            <ul className="py-1">
                                <li>
                                    <button
                                        onClick={() => {
                                            generateBalancedTeams();
                                            setDropdownOpen(false);
                                        }}
                                        className="block px-4 py-2 text-sm text-white hover:bg-gray-700 w-full text-left"
                                    >
                                        Balanced Randomize
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => {
                                            setShowTeamSelector(true);
                                            setDropdownOpen(false);
                                        }}
                                        className="block px-4 py-2 text-sm text-white hover:bg-gray-700 w-full text-left"
                                    >
                                        Choose Teams
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Team Selector UI */}
            {showTeamSelector && (
                <div className="space-y-4 border border-gray-700 rounded p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium text-white">Choose Teams</h3>
                        <button
                            onClick={() => setShowTeamSelector(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team containers */}
                        {manualTeams.map((team, teamIndex) => (
                            <div key={teamIndex} className="border border-gray-700 rounded p-3">
                                <div className="text-sm font-medium text-gray-300 mb-2">Team {teamIndex + 1}</div>

                                {/* Selected players */}
                                <div className="space-y-2 min-h-20 mb-3">
                                    {team.map((player, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-700 rounded px-2 py-1">
                                            <span className="text-sm text-white">{player.name}</span>
                                            <button
                                                onClick={() => {
                                                    const updatedTeams = [...manualTeams];
                                                    updatedTeams[teamIndex] = team.filter((_, i) => i !== idx);
                                                    setManualTeams(updatedTeams);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-xs"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}

                                    {team.length === 0 && (
                                        <div className="text-sm text-gray-500 italic">No players selected</div>
                                    )}
                                </div>

                                {/* Player count indicator */}
                                <div className="text-xs text-gray-400 mb-2">
                                    {team.length}/{teamSize} players
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Available players */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Available Players</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {getUnassignedPlayers().map((player) => (
                                <div key={player.name} className="bg-gray-800 rounded p-2">
                                    <div className="text-sm text-white mb-1">{player.name}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {manualTeams.map((_, teamIndex) => (
                                            <button
                                                key={teamIndex}
                                                onClick={() => addPlayerToTeam(player, teamIndex)}
                                                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                                                disabled={manualTeams[teamIndex].length >= teamSize}
                                            >
                                                Team {teamIndex + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {getUnassignedPlayers().length === 0 && (
                                <div className="text-sm text-gray-500 italic col-span-full">All active players assigned</div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={() => {
                                // Reset the manual teams
                                const numTeams = Math.ceil(activePlayerCount / teamSize);
                                setManualTeams(Array.from({ length: numTeams }, () => []));
                            }}
                            className="px-3 py-1 text-sm text-gray-300 hover:text-white border border-gray-700 rounded"
                        >
                            Reset
                        </button>
                        <button
                            onClick={generateMatchupsFromManualTeams}
                            disabled={!areTeamsValid()}
                            className={`px-3 py-1 text-sm text-white bg-blue-600 rounded ${areTeamsValid() ? 'hover:bg-blue-500' : 'opacity-50 cursor-not-allowed'
                                }`}
                        >
                            Create Matchups
                        </button>
                    </div>
                </div>
            )}

            {/* Teams List */}
            {hasGeneratedTeams && teams.length > 0 && !showTeamSelector && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Teams</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teams.map((team, i) => {
                            const teamStrength = calculateTeamStrength(team).toFixed(1);
                            return (
                                <div key={i} className="border border-gray-800 p-3 rounded">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">Team {i + 1}</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-blue-400">
                                                Strength: {teamStrength}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-sm mt-1">
                                        {team.filter(p => !p.isBench).map((p) => p.name).join(", ")}
                                    </div>
                                    {team.some(p => p.isBench) && (
                                        <div className="mt-1">
                                            <span className="text-xs text-yellow-500">Bench: </span>
                                            <span className="text-xs text-gray-400">
                                                {team.filter(p => p.isBench).map(p => p.name).join(", ")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Matchups Section */}
            {hasGeneratedTeams && matchups.length > 0 && !showTeamSelector && (
                <div className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Matchups</h2>
                    {matchups.map(([teamA, teamB], i) => {
                        const teamAIndex = teams.findIndex(team =>
                            JSON.stringify(team.map(p => p.name)) === JSON.stringify(teamA.map(p => p.name))
                        );
                        const teamBIndex = teams.findIndex(team =>
                            JSON.stringify(team.map(p => p.name)) === JSON.stringify(teamB.map(p => p.name))
                        );

                        const teamAStrength = calculateTeamStrength(teamA).toFixed(1);
                        const teamBStrength = calculateTeamStrength(teamB).toFixed(1);

                        return (
                            <div key={i} className="border border-gray-800 p-3 rounded">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400">Match {i + 1}</span>
                                    <button
                                        onClick={saveMatchResults}
                                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                                    >
                                        Save Result
                                    </button>
                                </div>

                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <span className="text-xs text-blue-400">(Str: {teamAStrength})</span>
                                        </div>
                                        <p className="text-sm">
                                            {teamA.filter(p => !p.isBench).map((p) => p.name).join(", ")}
                                            {teamA.some(p => p.isBench) && (
                                                <span className="text-yellow-500 text-xs ml-1">
                                                    (Bench: {teamA.filter(p => p.isBench).map(p => p.name).join(", ")})
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <span className="mx-2 text-gray-500">vs</span>

                                    <div className="flex-1 text-right">
                                        <div className="flex items-center justify-end">
                                            <span className="text-xs text-blue-400 mr-1">(Str: {teamBStrength})</span>
                                        </div>
                                        <p className="text-sm">
                                            {teamB.filter(p => !p.isBench).map((p) => p.name).join(", ")}
                                            {teamB.some(p => p.isBench) && (
                                                <span className="text-yellow-500 text-xs ml-1">
                                                    (Bench: {teamB.filter(p => p.isBench).map(p => p.name).join(", ")})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 mb-3">
                                    <label className="text-xs text-gray-400">MVP:</label>
                                    <StyledSelect
                                        value={mvpVotes[i] || ""}
                                        onChange={(e) => {
                                            const updated = [...mvpVotes];
                                            updated[i] = e.target.value;
                                            setMvpVotes(updated);
                                        }}
                                        className="flex-grow"
                                    >
                                        <option value="">-- Select MVP --</option>
                                        {[...teamA, ...teamB].map((p) => (
                                            <option key={p.name} value={p.name}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </StyledSelect>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <label className="text-xs text-gray-400">Score:</label>
                                    <input
                                        type="number"
                                        placeholder="Team A"
                                        className="border-b border-gray-700 bg-transparent rounded-none px-2 py-1 w-16 text-sm text-white focus:outline-none focus:border-blue-500"
                                        value={scores[i]?.a || ""}
                                        onChange={(e) => {
                                            const updated = [...scores];
                                            updated[i] = { ...updated[i], a: e.target.value };
                                            setScores(updated);
                                        }}
                                    />
                                    <span className="text-xs text-gray-400">vs</span>
                                    <input
                                        type="number"
                                        placeholder="Team B"
                                        className="border-b border-gray-700 bg-transparent rounded-none px-2 py-1 w-16 text-sm text-white focus:outline-none focus:border-blue-500"
                                        value={scores[i]?.b || ""}
                                        onChange={(e) => {
                                            const updated = [...scores];
                                            updated[i] = { ...updated[i], b: e.target.value };
                                            setScores(updated);
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Player List */}
            {sortedPlayers.length > 0 && !showTeamSelector && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Player List</h2>
                        <div className="text-xs text-gray-400">
                            Active Players: <span className="text-gray-400">{activePlayerCount}</span>
                        </div>
                    </div>
                    {sortedPlayers.map((player) => {
                        const rating = computeRating1to10(player);
                        const ratingPercent = getPercentage(rating);

                        return (
                            <div
                                key={player.name}
                                className="flex items-center border-b border-gray-800 py-2"
                            >
                                {/* Active checkbox */}
                                <div className="mr-3">
                                    <input
                                        type="checkbox"
                                        className="mr-1"
                                        checked={player.active}
                                        onChange={(e) =>
                                            handlePlayerActiveToggle(player.name, e.target.checked)
                                        }
                                    />
                                </div>

                                {/* Player name */}
                                <div className="flex-grow">
                                    <div className="text-sm">
                                        {player.name}
                                    </div>

                                    {/* Rating bar - more subtle */}
                                    <div className="flex items-center mt-1">
                                        <div className="bg-gray-800 h-1 rounded flex-grow">
                                            <div
                                                className="bg-blue-500 h-1 rounded-l"
                                                style={{ width: `${ratingPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {rating.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}