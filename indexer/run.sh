#!/bin/bash

WORKDIR=$PWD
INDEXER=$1

cd $WORKDIR && \

echo "NODE_ENV=production node node_modules/@aleph-indexer/core/dist/config.js setup"
ENVS=$(NODE_ENV=production node node_modules/@aleph-indexer/core/dist/config.js setup)

while IFS= read -r env; do
    export "${env//\"/}";
done <<< "$ENVS"

echo "NODE_ENV=production node $NODE_OPTIONS dist/run.js" 
cd $WORKDIR && NODE_ENV=production node $NODE_OPTIONS dist/run.js
