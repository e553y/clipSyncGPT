# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

# Activate NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js 18.x
nvm install 18
nvm use 18

# Rest of your script
cd ~/server

# Output the current directory and node version for debugging
echo "pwd: $(pwd)"
echo "node: $(node --version)"

# Check if PM2 is running and list all applications
pm2 ls

# Check if clip-sync-server is already running, restart it if so, otherwise start it
if pm2 info clip-sync-server > /dev/null 2>&1; then 
  pm2 restart clip-sync-server --update-env; 
else 
  pm2 start "authbind --deep node ./index.js" --name clip-sync-server; 
fi
