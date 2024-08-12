function findNextBlind(currentBigBlind) {
    const increasedBlind = currentBigBlind * 1.4;
    let exponent = Math.floor(Math.log10(increasedBlind));
    let significantPart = increasedBlind / Math.pow(10, exponent);
    if (significantPart <= 1) {
        significantPart = 1;
    } else if (significantPart <= 2) {
        significantPart = 2;
    } else if (significantPart <= 5) {
        significantPart = 5;
    } else {
        significantPart = 10;
    }
    return significantPart * Math.pow(10, exponent);
}

function generateBlindLevels(initialBigBlind) {
    const numberOfLevels = 10;
    let levels = [];
    let currentBigBlind = initialBigBlind;

    for (let i = 0; i < numberOfLevels; i++) {
        levels.push(currentBigBlind);
        currentBigBlind = findNextBlind(currentBigBlind);
    }

    return levels;
}

// Example usage:
let initialBigBlind = 20;
let blindLevels = generateBlindLevels(initialBigBlind);

console.log(blindLevels);

console.log(findNextBlind(20));