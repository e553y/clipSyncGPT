#!/bin/bash

cd ~/server
pwd
pm2 ls
if pm2 info clip-sync-server > /dev/null 2>&1; then 
  pm2 restart clip-sync-server --update-env; 
else 
  pm2 start index.js --name clip-sync-server; 
fi
