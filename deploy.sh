#!/bin/bash

cd ~/server
echo pwd:`pwd`
echo node:`node --version`
pm2 ls
if pm2 info clip-sync-server > /dev/null 2>&1; then 
  pm2 restart clip-sync-server --update-env; 
else 
  pm2 start "node ./index.js" --name clip-sync-server; 
fi
