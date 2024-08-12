const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function main() {
  const artifactsPath = path.join(__dirname, 'artifacts', 'contracts');
  
  // Function to recursively read files from a directory
  const readFiles = dir => 
    fs.readdirSync(dir).reduce((files, file) =>
      fs.statSync(path.join(dir, file)).isDirectory() ?
        files.concat(readFiles(path.join(dir, file))) :
        files.concat(path.join(dir, file)), []);
  
  // Get all .json files from the artifacts/contracts directory
  const files = readFiles(artifactsPath).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (content.deployedBytecode) {
      const bytecode = content.deployedBytecode;
      const bytecodeSize = bytecode.length / 2 - 1; // Each byte is represented by 2 hex characters
      console.log(`${path.basename(file, '.json')}: ${bytecodeSize} bytes`);
    }
  }
}

main().catch(console.error);