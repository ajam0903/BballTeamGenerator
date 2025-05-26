// BeltsSystem.js
export const beltCategories = {
  // Negative belts
  snowflake: {
    name: "Snowflake",
    icon: "❄️",
    description: "For a player that doesn't show up to play",
    isNegative: true
  },
  toiletPaper: {
    name: "Toilet Paper",
    icon: "🧻",
    description: "For a player who plays soft",
    isNegative: true
  },
  hog: {
    name: "Hog",
    icon: "🐷",
    description: "For a player who hogs the ball",
    isNegative: true
  },
  
  // Positive belts
  bullseye: {
    name: "Bullseye",
    icon: "🎯",
    description: "Player who shows great shooting skills",
    isNegative: false
  },
  lock: {
    name: "Lock",
    icon: "🔒",
    description: "Player who plays lockdown defense",
    isNegative: false
  },
  motor: {
    name: "Motor",
    icon: "⚡",
    description: "Player who shows the most hustle",
    isNegative: false
  },
  infinityGauntlet: {
    name: "Infinity Gauntlet",
    icon: "🧤",
    description: "The best all-around player",
    isNegative: false
  }
};

// Helper function to update belt standings based on votes
export const calculateBeltStandings = (allVotes) => {
  if (!allVotes) return {};
  
  // Track vote counts for each belt for each player
  const beltVotes = {};
  
  // Initialize structure for all belt categories
  Object.keys(beltCategories).forEach(beltId => {
    beltVotes[beltId] = {};
  });
  
  // Count votes
  Object.values(allVotes).forEach(userVotesObj => {
    Object.entries(userVotesObj).forEach(([beltId, playerName]) => {
      if (!beltVotes[beltId][playerName]) {
        beltVotes[beltId][playerName] = 0;
      }
      beltVotes[beltId][playerName]++;
    });
  });
  
  // Determine belt holders
  const beltHolders = {};
  
  Object.entries(beltVotes).forEach(([beltId, playerVotes]) => {
    let maxVotes = 0;
    let topPlayer = null;
    
    Object.entries(playerVotes).forEach(([player, voteCount]) => {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        topPlayer = player;
      }
    });
    
    if (topPlayer && maxVotes > 0) {
      beltHolders[beltId] = {
        playerName: topPlayer,
        votes: maxVotes
      };
    }
  });
  
  return beltHolders;
};
