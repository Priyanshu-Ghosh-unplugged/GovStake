Write-Host "===================================================="
Write-Host "Starting TokenScythe System"
Write-Host "===================================================="
Write-Host "Installing dependencies for all workspaces..."
npm install
Write-Host "`nStarting frontend and backend..."
npm run dev:all
