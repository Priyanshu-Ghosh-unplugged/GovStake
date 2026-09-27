const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Current working directory:", process.cwd());
console.log("Listing contents of current directory:");
console.log(fs.readdirSync('.').join(', '));

console.log("Running npm build for frontend...");
try {
    execSync('npm run build --workspace=frontend', { stdio: 'inherit' });
} catch (e) {
    console.error("Build failed:", e);
    process.exit(1);
}

console.log("Build finished. Checking for output...");
const sourceDist = path.join('frontend', 'dist');
const targetDist = path.join(__dirname, 'dist');

if (fs.existsSync(sourceDist)) {
    console.log(`Found ${sourceDist}! Copying to ${targetDist}...`);
    // Remove existing dist if any
    if (fs.existsSync(targetDist)) {
        fs.rmSync(targetDist, { recursive: true, force: true });
    }
    // Copy the directory
    fs.cpSync(sourceDist, targetDist, { recursive: true });
    console.log("Copy complete. Files in dist:");
    console.log(fs.readdirSync(targetDist).join(', '));
} else {
    console.error(`ERROR: ${sourceDist} not found!`);
    console.log("Listing contents of frontend/:");
    if (fs.existsSync('frontend')) {
        console.log(fs.readdirSync('frontend').join(', '));
    }
    process.exit(1);
}
