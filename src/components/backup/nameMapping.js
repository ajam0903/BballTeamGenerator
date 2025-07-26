// config/nameMapping.js
export const nameVariations = {
    'Shahzad Abbas': [
        'Hussain Abbas',
        'HUSSAIN ABBAS',
        'Hussain A',
        'HUSSAIN A',
        'Hussain A.',
        'Husain Abbas',],

    'Taha Salim': [

        'Taha S',

    ],

    'Husein Kapadia': [

        'Husain kapadia',

    ],

    'Hatim Sabir': [

        'Hatim S',

    ],

    'Hasan Abbasi': [

        'Hassan Abbasi',

    ],

    'Mohammed Nathani': [

        'Daniel Nathani', 'Daniel nathani',

    ],

    'Aliasghar Diwan': [

        'Aliasghar diwan',

    ],

    'Ali Jamali': [

        'Ali J',

    ],

    'Abizar Chawala': [

        'Abizar chawala',

    ],

    'Abeezer Rehmanji': [

        'Abeezer R',

    ]
    // Add all your other name mappings here from PlayerNameRecoveryTool.jsx
};

export const isPlayerMatch = (nameInMatch, targetName) => {
    if (!nameInMatch || !targetName) return false;
    if (nameInMatch === targetName) return true;
    const variations = nameVariations[targetName] || [];
    return variations.includes(nameInMatch);
};

export const getCanonicalName = (name) => {
    if (!name) return name;

    // Check if this name is already canonical (it's a key in nameVariations)
    if (nameVariations[name]) return name;

    // Check if it's a variation of a canonical name
    for (const [canonical, variations] of Object.entries(nameVariations)) {
        if (variations.includes(name)) return canonical;
    }

    return name;
};