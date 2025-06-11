import React, { useEffect, useState, useRef, useMemo } from "react";
import { StyledButton } from "./UIComponents";
import { StyledSelect } from "./UIComponents";
import PlayerBeltIcons from "./PlayerBeltIcons";
import PlayerBadges from "./playerBadges";
import { badgeCategories } from "./badgeSystem.jsx";

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
    handleBatchPlayerActiveToggle,
    weightings,
    saveMatchResults,
    archiveCompletedMatches,
    hasGeneratedTeams,
    setHasGeneratedTeams,
    isRematch = () => false,
    getPreviousResults = () => [],
    hasPendingMatchups = false,
    playerOVRs = {},
    calculatePlayerScore,
    currentBelts = {},
    leaderboard = {},
    matchHistory = [],

}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showTeamSelector, setShowTeamSelector] = useState(false);
    const [manualTeams, setManualTeams] = useState([[], []]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const dropdownRef = useRef(null);
    const [playerSortBy, setPlayerSortBy] = useState("active");
    const [playerSortDirection, setPlayerSortDirection] = useState("desc");
    const [selectAll, setSelectAll] = useState(false);

    // Check for unsaved changes
    useEffect(() => {
        if (matchups.length > 0) {
            const hasIncompleteScores = scores.some(score =>
                !score.processed && (!score.a || !score.b || score.a === "" || score.b === "")
            );
            setUnsavedChanges(hasIncompleteScores);
        } else {
            setUnsavedChanges(false);
        }
    }, [matchups, scores]);

    // Function to get player's first name and last initial
    const getFormattedPlayerName = (fullName) => {
        if (!fullName) return "Team";

        // Clean up the name first
        const cleanedName = fullName.trim().replace(/\s+/g, ' ');
        const nameParts = cleanedName.split(' ');

        // If only one name (or empty), return it
        if (nameParts.length <= 1) return cleanedName;

        // Special handling for very short or hyphenated names
        const firstName = nameParts[0];

        // Get last name - handle hyphenated names properly
        let lastName = nameParts[nameParts.length - 1];
        let lastInitial = lastName[0] || '';

        // Add a period to the initial
        return `${firstName} ${lastInitial}.`;
    };

    // Function to find the best player on a team based on rating
    const findBestPlayer = (team, calculatePlayerScore) => {
        // Check for null or empty team
        if (!team || !Array.isArray(team) || team.length === 0) return null;

        // Filter out any invalid player objects
        const validPlayers = team.filter(p => p && typeof p === 'object' && p.name);
        if (validPlayers.length === 0) return null;

        // Only consider starters (non-bench players) if there are any
        const starters = validPlayers.filter(p => !p.isBench);
        const playersToConsider = starters.length > 0 ? starters : validPlayers;

        return playersToConsider.reduce((best, current) => {
            if (!best) return current;

            // Safely calculate scores, defaulting to computeRating1to10 if calculatePlayerScore is missing
            let bestScore = 0, currentScore = 0;
            try {
                bestScore = calculatePlayerScore ? calculatePlayerScore(best) : computeRating1to10(best);
                currentScore = calculatePlayerScore ? calculatePlayerScore(current) : computeRating1to10(current);
            } catch (e) {
                console.error("Error calculating player score:", e);
                // Fallback to internal rating
                bestScore = computeRating1to10(best);
                currentScore = computeRating1to10(current);
            }

            return currentScore > bestScore ? current : best;
        }, playersToConsider[0]);
    };

    const teamNameCache = new Map();

    const getTeamNameCached = (team, calculatePlayerScore) => {
        if (!team || team.length === 0) return "Team";

        // Create a unique key for this team (JSON string of player names)
        const teamKey = JSON.stringify(team.map(p => p.name).sort());

        // Return cached value if exists
        if (teamNameCache.has(teamKey)) {
            return teamNameCache.get(teamKey);
        }

        // Calculate name and cache it
        const teamName = getTeamName(team, calculatePlayerScore);
        teamNameCache.set(teamKey, teamName);

        return teamName;
    };

    const getTeamName = (team, calculatePlayerScore) => {
        if (!team || team.length === 0) return "Team";

        // For 1v1 matches, just return the player's name directly
        if (team.length === 1) {
            return team[0].name || "Player";
        }

        const bestPlayer = findBestPlayer(team, calculatePlayerScore);
        if (!bestPlayer) return "Team";

        return getFormattedPlayerName(bestPlayer.name);
    };

    // Input handlers that mark changes as unsaved
    const handleScoreChange = (index, team, value) => {
        const updated = [...scores];
        if (!updated[index]) {
            updated[index] = { a: "", b: "" };
        }
        updated[index] = {
            ...updated[index],
            [team]: value,
            processed: false // Mark as unprocessed when changed
        };
        setScores(updated);
    };

    const handleMvpChange = (index, value) => {
        const updated = [...mvpVotes];
        updated[index] = value;
        setMvpVotes(updated);
    };

    const handlePlayerSort = (column) => {
        if (playerSortBy === column) {
            setPlayerSortDirection(playerSortDirection === "asc" ? "desc" : "asc");
        } else {
            setPlayerSortBy(column);
            setPlayerSortDirection("desc");
        }
    };

    const handleSelectAll = () => {
        const newSelectAllState = !selectAll;
        setSelectAll(newSelectAllState);

        // Create updates for all players
        const updates = players.map(player => ({
            name: player.name,
            active: newSelectAllState
        }));

        // Use batch update if available, otherwise fall back to individual updates
        if (handleBatchPlayerActiveToggle) {
            handleBatchPlayerActiveToggle(updates);
        } else {
            players.forEach(player => {
                handlePlayerActiveToggle(player.name, newSelectAllState);
            });
        }
    };

    // Helper function to get player OVR from leaderboard
    const getPlayerOVR = (playerName) => {
        // Since leaderboard isn't passed as a prop, we'll just use the playerOVRs prop
        const playerOVR = playerOVRs[playerName];

        // If we don't have an OVR, compute it
        if (!playerOVR) {
            const player = players.find(p => p.name === playerName);
            return player ? computeRating1to10(player) : 5; // default to 5 if player not found
        }

        return playerOVR;
    };

    // Rematch indicator component
    const RematchIndicator = ({ teamA, teamB, previousMatches }) => {
        if (!previousMatches || previousMatches.length === 0) return null;

        // Calculate the win-loss record between these teams
        let teamAWins = 0;
        let teamBWins = 0;

        previousMatches.forEach(match => {
            const matchTeamA = match.teams[0].map(p => p.name).sort().join(',');
            const matchTeamB = match.teams[1].map(p => p.name).sort().join(',');
            const currentTeamA = teamA.map(p => p.name).sort().join(',');
            const currentTeamB = teamB.map(p => p.name).sort().join(',');

            // Figure out which historical team corresponds to current teamA
            const isTeamAMatchesHistoryTeamA = matchTeamA === currentTeamA;

            if (match.score) {
                const scoreA = parseInt(match.score.a);
                const scoreB = parseInt(match.score.b);

                if (!isNaN(scoreA) && !isNaN(scoreB)) {
                    if (scoreA > scoreB) {
                        // History Team A won
                        isTeamAMatchesHistoryTeamA ? teamAWins++ : teamBWins++;
                    } else if (scoreB > scoreA) {
                        // History Team B won
                        isTeamAMatchesHistoryTeamA ? teamBWins++ : teamAWins++;
                    }
                }
            }
        });

        // Format date of last match
        const lastMatchDate = new Date(previousMatches[previousMatches.length - 1].date);
        const formattedDate = lastMatchDate.toLocaleDateString();

        return (
            <div className="bg-yellow-800 bg-opacity-30 p-2 rounded-md mb-3">
                <div className="flex items-center mb-1">
                    <span className="text-yellow-400 text-xs font-bold mr-2">⟳ REMATCH</span>
                    <span className="text-xs text-gray-300">
                        {previousMatches.length} previous {previousMatches.length === 1 ? 'game' : 'games'}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-300">
                        Record: <span className="text-green-400">{teamAWins}</span>-<span className="text-red-400">{teamBWins}</span>
                    </span>
                    <span className="text-gray-400">Last played: {formattedDate}</span>
                </div>
            </div>
        );
    };

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

    // Calculate team strength based on player ratings
    const calculateTeamStrength = (team) => {
        if (!team || team.length === 0) return 0;

        const totalRating = team.reduce((sum, player) => {
            return sum + computeRating1to10(player);
        }, 0);

        // Average rating per player (to account for teams with different sizes)
        return totalRating / team.length;
    };

    const memoizedTeamStrength = useMemo(() => {
        return teams.map(team => calculateTeamStrength(team));
    }, [teams, calculatePlayerScore]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            if (a.active !== b.active) {
                return a.active ? -1 : 1;
            }

            let aValue, bValue;

            switch (playerSortBy) {
                case "name":
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case "ovr":
                    aValue = playerOVRs[a.name] || computeRating1to10(a);
                    bValue = playerOVRs[b.name] || computeRating1to10(b);
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (typeof aValue === 'string') {
                return playerSortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return playerSortDirection === "asc" ? aValue - bValue : bValue - aValue;
        });
    }, [players, playerSortBy, playerSortDirection, playerOVRs]);
    
    // Count active players
    const activePlayerCount = players.filter(player => player.active).length;
    const [teamRankings, setTeamRankings] = useState([]);



    // For the percentage-based bar
    const getPercentage = (rating) => {
        // rating is from 0–10, so rating=5 => 50%
        return (rating / 10) * 100;
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

    useEffect(() => {
        const allActive = players.every(p => p.active);
        const allInactive = players.every(p => !p.active);

        if (allActive) {
            setSelectAll(true);
        } else if (allInactive) {
            setSelectAll(false);
        }
    }, [players]);

    // Initialize manual teams when team size changes
    useEffect(() => {
        // Calculate required number of teams to fit all active players
        // For 2v2, we need a team for every 2 players
        const numTeams = Math.floor(activePlayerCount / teamSize);

        // Always ensure we have at least 2 teams for matchup creation
        const finalNumTeams = Math.max(2, numTeams);

        setManualTeams(Array.from({ length: finalNumTeams }, () => []));
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

        // Add player to the selected team
        if (!playerExistsOnTeam) {
            // If team already has the required players, add as bench
            if (updatedTeams[teamIndex].filter(p => !p.isBench).length >= teamSize) {
                player.isBench = true;
            } else {
                player.isBench = false;
            }
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
        // If there are pending matchups with unsaved results, use browser confirm
        if (hasPendingMatchups) {
            if (confirm) {
                if (!confirm("You have unsaved match results. Creating new teams will discard these results. Continue?")) {
                    return;
                }
            }
        }

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
        setHasGeneratedTeams(true);
    };

    // Check if an active player is not assigned to any team
    const getUnassignedPlayers = () => {
        const assignedPlayerNames = manualTeams.flat().map(p => p.name);
        return sortedPlayers.filter(p => p.active && !assignedPlayerNames.includes(p.name));
    };

    // Check if teams are valid based on team size
    const areTeamsValid = () => {
        const unassignedCount = getUnassignedPlayers().length;
        const teamsWithCorrectSize = manualTeams.filter(team =>
            team.filter(p => !p.isBench).length === teamSize
        ).length;

        // All active players should be assigned and most teams should have the correct size
        return unassignedCount === 0 && teamsWithCorrectSize >= manualTeams.length - 1;
    };

    const usedTeamNames = new Set();

    // Modified function to ensure unique names
    const getUniqueTeamName = (team, index, calculatePlayerScore) => {
        // Get the base name
        const baseName = getTeamName(team, calculatePlayerScore);

        // If this is the first use, just return the name
        if (!usedTeamNames.has(baseName)) {
            usedTeamNames.add(baseName);
            return baseName;
        }

        // Otherwise, add a suffix
        return `${baseName} (${index + 1})`;
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
                                            setShowTeamSelector(false);
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
                        {manualTeams.map((team, teamIndex) => {
                            // Define an array of team colors
                            const teamColors = [
                                { border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-600", hover: "bg-blue-500" },
                                { border: "border-green-500", text: "text-green-400", bg: "bg-green-600", hover: "bg-green-500" },
                                { border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-600", hover: "bg-purple-500" },
                                { border: "border-yellow-500", text: "text-yellow-400", bg: "bg-yellow-600", hover: "bg-yellow-500" },
                                { border: "border-red-500", text: "text-red-400", bg: "bg-red-600", hover: "bg-red-500" },
                                { border: "border-pink-500", text: "text-pink-400", bg: "bg-pink-600", hover: "bg-pink-500" },
                            ];

                            // Get color for current team (cycle through colors if more teams than colors)
                            const colorIndex = teamIndex % teamColors.length;
                            const teamColor = teamColors[colorIndex];

                            return (
                                <div key={teamIndex} className={`border ${teamColor.border} rounded-lg p-3 bg-gray-800`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`font-medium ${teamColor.text}`}>Team {teamIndex + 1}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${team.filter(p => !p.isBench).length === teamSize
                                                ? "bg-green-900 text-green-400"
                                                : "bg-yellow-900 text-yellow-400"
                                            }`}>
                                            {team.filter(p => !p.isBench).length}/{teamSize} players
                                        </span>
                                    </div>

                                    {/* Selected players */}
                                    <div className="space-y-2 min-h-20 mb-3">
                                        {/* Regular players (non-bench) */}
                                        {team.filter(p => !p.isBench).map((player, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-700 rounded px-2 py-1">
                                                <span className="text-sm text-white">{player.name}</span>
                                                <button
                                                    onClick={() => {
                                                        const updatedTeams = [...manualTeams];
                                                        updatedTeams[teamIndex] = team.filter((_, i) => i !== team.indexOf(player));
                                                        setManualTeams(updatedTeams);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}

                                        {/* Bench players */}
                                        {team.filter(p => p.isBench).map((player, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-600 rounded px-2 py-1 border-l-2 border-yellow-500">
                                                <span className="text-sm text-gray-300">
                                                    <span className="text-yellow-500 text-xs mr-1">Bench:</span>
                                                    {player.name}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const updatedTeams = [...manualTeams];
                                                        updatedTeams[teamIndex] = team.filter((_, i) => i !== team.indexOf(player));
                                                        setManualTeams(updatedTeams);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}

                                        {/* No players message */}
                                        {team.length === 0 && (
                                            <div className="text-sm text-gray-500 italic">No players selected</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Available players */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Available Players</h4>
                        {getUnassignedPlayers().length === 0 ? (
                            <div className="text-sm text-gray-500 italic text-center py-4">All active players assigned</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {getUnassignedPlayers().map((player) => (
                                    <div key={player.name} className="bg-gray-800 rounded p-2">
                                        <div className="text-sm text-white mb-1">{player.name}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {manualTeams.map((team, teamIndex) => {
                                                const wouldBeBench = team.filter(p => !p.isBench).length >= teamSize;

                                                // Get color for current team (cycle through colors if more teams than colors)
                                                const teamColors = [
                                                    { bg: "bg-blue-600", hover: "bg-blue-500" },
                                                    { bg: "bg-green-600", hover: "bg-green-500" },
                                                    { bg: "bg-purple-600", hover: "bg-purple-500" },
                                                    { bg: "bg-yellow-600", hover: "bg-yellow-500" },
                                                    { bg: "bg-red-600", hover: "bg-red-500" },
                                                    { bg: "bg-pink-600", hover: "bg-pink-500" },
                                                ];
                                                const colorIndex = teamIndex % teamColors.length;
                                                const teamColor = teamColors[colorIndex];

                                                return (
                                                    <button
                                                        key={teamIndex}
                                                        onClick={() => addPlayerToTeam(player, teamIndex)}
                                                        className={`text-xs px-2 py-1 rounded ${wouldBeBench
                                                                ? 'bg-amber-600 hover:bg-amber-500'  // Bench styling
                                                                : `${teamColor.bg} hover:${teamColor.hover}`  // Regular styling with team color
                                                            }`}
                                                    >
                                                        {wouldBeBench
                                                            ? `Bench ${teamIndex + 1}`
                                                            : `Team ${teamIndex + 1}`
                                                        }
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={() => {
                                // Calculate required number of teams to fit all active players
                                const numTeams = Math.floor(activePlayerCount / teamSize);
                                // Always ensure we have at least 2 teams for matchup creation  
                                const finalNumTeams = Math.max(2, numTeams);
                                setManualTeams(Array.from({ length: finalNumTeams }, () => []));
                            }}
                            className="px-3 py-1 text-sm text-gray-300 hover:text-white border border-gray-700 rounded"
                        >
                            Reset
                        </button>
                        <button
                            onClick={generateMatchupsFromManualTeams}
                            disabled={!areTeamsValid()}
                            className={`px-3 py-1 text-sm text-white rounded ${areTeamsValid()
                                    ? "bg-blue-600 hover:bg-blue-500"
                                    : "bg-gray-600 cursor-not-allowed opacity-50"
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
                            // For 1v1, use "Player 1", "Player 2", etc. instead of player name
                            const teamName = team.length === 1 ? `Player ${i + 1}` : getTeamName(team, calculatePlayerScore || computeRating1to10);

                            return (
                                <div key={i} className="border border-gray-800 p-3 rounded">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                            {team.length === 1 ? teamName : `Team ${teamName}`}
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-blue-400">
                                                Strength: {teamStrength}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {team.filter(p => !p.isBench).map((p) => (
                                            <div
                                                key={p.name}
                                                className="bg-gray-800 text-gray-100 px-3 py-1 rounded-md text-xs font-medium border border-gray-600 flex items-center"
                                            >
                                                <span>{p.name}</span>
                                                <PlayerBeltIcons playerName={p.name} currentBelts={currentBelts} size="xs" />
                                                <PlayerBadges
                                                    playerName={p.name}
                                                    leaderboard={leaderboard}
                                                    matchHistory={matchHistory}
                                                    size="xs"
                                                    maxDisplay={1}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* For bench players */}
                                    {team.some(p => p.isBench) && (
                                        <div className="mt-1">
                                            <span className="text-xs text-yellow-500 mb-1">Bench: </span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {team.filter(p => p.isBench).map(p => (
                                                    <div
                                                        key={p.name}
                                                        className="bg-gray-800 text-yellow-500 px-3 py-1 rounded-md text-xs font-sm border border-gray-600 flex items-center"
                                                    >
                                                        <span>{p.name}</span>
                                                        <PlayerBeltIcons playerName={p.name} currentBelts={currentBelts} size="xs" />
                                                        <PlayerBadges
                                                            playerName={p.name}
                                                            leaderboard={leaderboard}
                                                            matchHistory={matchHistory}
                                                            size="xs"
                                                            maxDisplay={1}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Matchups Section */}
            {hasGeneratedTeams && matchups.length > 0 && !showTeamSelector && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Matchups</h2>
                        {unsavedChanges && (
                            <div className="text-yellow-400 text-xs flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Unsaved match results
                            </div>
                        )}
                    </div>

                    {matchups.map(([teamA, teamB], i) => {
                        // For 1v1, use player names directly, otherwise use team names
                        const teamAName = teamA.length === 1 ? teamA[0].name : getTeamName(teamA, calculatePlayerScore || computeRating1to10);
                        const teamBName = teamB.length === 1 ? teamB[0].name : getTeamName(teamB, calculatePlayerScore || computeRating1to10);

                        const teamAStrength = calculateTeamStrength(teamA).toFixed(1);
                        const teamBStrength = calculateTeamStrength(teamB).toFixed(1);

                        // Check if this match has unsaved/incomplete data
                        const matchIncomplete = !scores[i]?.processed && (!scores[i]?.a || !scores[i]?.b || scores[i]?.a === "" || scores[i]?.b === "");

                        return (
                            <div
                                key={i}
                                className={`border ${matchIncomplete ? 'border-yellow-600' : 'border-gray-800'} p-3 rounded`}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400">Match {i + 1}</span>
                                    {matchIncomplete && (
                                        <span className="text-xs text-yellow-400">Results not saved</span>
                                    )}
                                </div>

                                {/* Only show team names and strengths for unsaved matches */}
                                {!scores[i]?.processed && (
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center">
                                            <span className="text-lg font-medium text-white">
                                                {teamA.length === 1 ? teamAName : `Team ${teamAName}`}
                                            </span>
                                            <span className="text-xs text-blue-400 ml-2">(Str: {teamAStrength})</span>
                                        </div>

                                        <span className="mx-4 text-gray-500">vs</span>

                                        <div className="flex items-center">
                                            <span className="text-lg font-medium text-white">
                                                {teamB.length === 1 ? teamBName : `Team ${teamBName}`}
                                            </span>
                                            <span className="text-xs text-blue-400 ml-2">(Str: {teamBStrength})</span>
                                        </div>
                                    </div>
                                )}

                                {/* MVP section - only for unsaved matches */}
                                {!scores[i]?.processed && (
                                    <div className="flex items-center space-x-3 mb-3">
                                        <label className="text-xs text-gray-400">MVP:</label>
                                        {teamA.length === 1 && teamB.length === 1 ? (
                                            // 1v1 MVP logic
                                            (() => {
                                                const playerA = teamA[0];
                                                const playerB = teamB[0];
                                                const ovrA = playerOVRs[playerA.name] || computeRating1to10(playerA);
                                                const ovrB = playerOVRs[playerB.name] || computeRating1to10(playerB);
                                                const scoreA = parseInt(scores[i]?.a) || 0;
                                                const scoreB = parseInt(scores[i]?.b) || 0;

                                                // Determine MVP eligibility based purely on OVR difference
                                                let eligibleMvp = null;
                                                let eligibilityMessage = "";

                                                const ovrDifference = Math.abs(ovrA - ovrB);

                                                if (ovrDifference <= 1) {
                                                    eligibilityMessage = "Neither player eligible for MVP (OVR within 1 point)";
                                                } else {
                                                    // The lower-rated player is eligible for MVP if they win
                                                    if (ovrA < ovrB) {
                                                        eligibleMvp = playerA.name;
                                                        eligibilityMessage = `${playerA.name} eligible for MVP if wins (${ovrA.toFixed(1)} vs ${ovrB.toFixed(1)})`;
                                                    } else {
                                                        eligibleMvp = playerB.name;
                                                        eligibilityMessage = `${playerB.name} eligible for MVP if wins (${ovrB.toFixed(1)} vs ${ovrA.toFixed(1)})`;
                                                    }
                                                }

                                                // Only auto-set MVP if eligible player actually wins
                                                if (eligibleMvp && scoreA && scoreB && scoreA !== scoreB) {
                                                    const eligiblePlayerWon =
                                                        (eligibleMvp === playerA.name && scoreA > scoreB) ||
                                                        (eligibleMvp === playerB.name && scoreB > scoreA);

                                                    if (eligiblePlayerWon && mvpVotes[i] !== eligibleMvp) {
                                                        setTimeout(() => handleMvpChange(i, eligibleMvp), 0);
                                                    } else if (!eligiblePlayerWon && mvpVotes[i]) {
                                                        setTimeout(() => handleMvpChange(i, ""), 0);
                                                    }
                                                }

                                                return (
                                                    <div className="flex-grow">
                                                        <div className={`px-3 py-2 rounded text-sm ${eligibleMvp
                                                                ? 'bg-blue-900 bg-opacity-30 text-blue-400'
                                                                : 'bg-gray-700 text-gray-400'
                                                            }`}>
                                                            {eligibilityMessage}
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            // Regular multi-player MVP selection
                                            <StyledSelect
                                                value={mvpVotes[i] || ""}
                                                onChange={(e) => handleMvpChange(i, e.target.value)}
                                                className="flex-grow"
                                            >
                                                <option value="">-- Select MVP --</option>
                                                {[...teamA, ...teamB].map((p) => (
                                                    <option key={p.name} value={p.name}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </StyledSelect>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    {scores[i]?.processed ? (
                                        // Read-only view for saved matches
                                        <div className="bg-gray-700 rounded-lg p-4 w-full">
                                            <div className="flex items-center justify-between">
                                                {/* Team A Score */}
                                                <div className="text-center flex-1">
                                                    <div className="text-sm text-gray-300 mb-1">
                                                        {teamA.length === 1 ? teamAName : `Team ${teamAName}`}
                                                    </div>
                                                    <div className="text-3xl font-bold text-white">{scores[i]?.a || 0}</div>
                                                </div>

                                                {/* VS separator */}
                                                <div className="text-gray-500 font-medium px-4">VS</div>

                                                {/* Team B Score */}
                                                <div className="text-center flex-1">
                                                    <div className="text-sm text-gray-300 mb-1">
                                                        {teamB.length === 1 ? teamBName : `Team ${teamBName}`}
                                                    </div>
                                                    <div className="text-3xl font-bold text-white">{scores[i]?.b || 0}</div>
                                                </div>
                                            </div>

                                            {/* MVP section */}
                                            {mvpVotes[i] && (
                                                <div className="mt-4 pt-3 border-t border-gray-600 text-center">
                                                    <span className="text-sm text-gray-400">MVP: </span>
                                                    <span className="text-yellow-400 font-medium">{mvpVotes[i]}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Editable view for unsaved matches
                                        <>
                                                <div className="flex items-center space-x-3">
                                                    <label className="text-xs text-gray-400">Score:</label>
                                                    <input
                                                        type="number"
                                                        placeholder={teamA.length === 1 ? teamAName : `Team ${teamAName}`}
                                                        className={`border-b ${matchIncomplete ? 'border-yellow-600' : 'border-gray-700'} bg-transparent rounded-none px-2 py-1 w-20 text-sm text-white focus:outline-none focus:border-blue-500`}
                                                        value={scores[i]?.a || ""}
                                                        onChange={(e) => handleScoreChange(i, 'a', e.target.value)}
                                                    />
                                                    <span className="text-xs text-gray-400">vs</span>
                                                    <input
                                                        type="number"
                                                        placeholder={teamB.length === 1 ? teamBName : `Team ${teamBName}`}
                                                        className={`border-b ${matchIncomplete ? 'border-yellow-600' : 'border-gray-700'} bg-transparent rounded-none px-2 py-1 w-20 text-sm text-white focus:outline-none focus:border-blue-500`}
                                                        value={scores[i]?.b || ""}
                                                        onChange={(e) => handleScoreChange(i, 'b', e.target.value)}
                                                    />
                                                </div>
                                            <button
                                                onClick={() => saveMatchResults(i)}
                                                className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-500 font-medium transition-colors"
                                            >
                                                Save Result
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {unsavedChanges && (
                        <div className="bg-yellow-800 bg-opacity-20 border border-yellow-700 rounded p-3 mt-2">
                            <p className="text-yellow-400 text-sm">
                                Make sure to save match results before leaving this tab or generating new teams.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Player List */}
            {sortedPlayers.length > 0 && !showTeamSelector && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Player List</h2>
                        <div className="text-xs text-gray-400">
                            Active Players: <span className="text-gray-400">{activePlayerCount}</span>
                        </div>
                    </div>

                    {/* Column headers with sort controls */}
                    <div className="flex items-center mb-2 border-b border-gray-800 pb-2">
                        <div className="w-8 flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="form-checkbox h-4 w-4 text-blue-600"
                            />
                        </div>

                        <div className="flex-grow flex justify-between items-center ml-3">
                            <button
                                onClick={() => handlePlayerSort("name")}
                                className={`text-xs font-medium flex items-center ${playerSortBy === "name" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                                    }`}
                            >
                                Name
                                {playerSortBy === "Name" && (
                                    <span className="ml-1">
                                        {playerSortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => handlePlayerSort("ovr")}
                                className={`text-xs font-medium flex items-center ${playerSortBy === "ovr" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                                    }`}
                            >
                                OVR
                                {playerSortBy === "ovr" && (
                                    <span className="ml-1">
                                        {playerSortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {sortedPlayers.map((player) => {
                        const ovrRating = playerOVRs[player.name] || computeRating1to10(player);
                        const ratingPercent = getPercentage(ovrRating);

                        return (
                            <div
                                key={player.name}
                                className="flex items-center border-b border-gray-800 py-2"
                            >
                                {/* Active checkbox */}
                                <div className="w-8 flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                        checked={player.active}
                                        onChange={(e) => {
                                            handlePlayerActiveToggle(player.name, e.target.checked);

                                            // Check if we need to update selectAll
                                            const updatedPlayers = players.map(p =>
                                                p.name === player.name ? { ...p, active: e.target.checked } : p
                                            );

                                            const allActive = updatedPlayers.every(p => p.active);
                                            const allInactive = updatedPlayers.every(p => !p.active);

                                            if (allActive && !selectAll) {
                                                setSelectAll(true);
                                            } else if (allInactive && selectAll) {
                                                setSelectAll(false);
                                            } else if (!allActive && !allInactive) {
                                                setSelectAll(false);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Player name and OVR */}
                                <div className="flex-grow ml-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center text-sm text-white">
                                            <span>{player.name}</span>
                                            <PlayerBeltIcons playerName={player.name} currentBelts={currentBelts} size="xs" />
                                            <PlayerBadges
                                                playerName={player.name}
                                                leaderboard={leaderboard}
                                                matchHistory={matchHistory}
                                                size="xs"
                                                maxDisplay={10}
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-blue-400">
                                            {ovrRating.toFixed(1)}
                                        </div>
                                    </div>

                                    {/* OVR bar visual */}
                                    <div className="flex items-center mt-1">
                                        <div className="bg-gray-800 h-1 rounded flex-grow">
                                            <div
                                                className="bg-blue-500 h-1 rounded"
                                                style={{ width: `${ratingPercent}%` }}
                                            />
                                        </div>
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