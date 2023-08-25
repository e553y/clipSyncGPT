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
echo pwd:`pwd`
echo node:`node --version`
pm2 ls
if pm2 info clip-sync-server > /dev/null 2>&1; then 
  pm2 restart clip-sync-server --update-env; 
else 
  pm2 start "node ./index.js" --name clip-sync-server; 
fi
