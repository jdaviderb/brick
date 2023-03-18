#!/bin/bash

WORKDIR=$PWD
INDEXER="brick"

cd $WORKDIR && \

echo "NODE_ENV=production node indexer/${INDEXER}/node_modules/@aleph-indexer/core/dist/config.js setup"
ENVS=$(NODE_ENV=production node indexer/${INDEXER}/node_modules/@aleph-indexer/core/dist/config.js setup)

while IFS= read -r env; do
    export "${env//\"/}";
done <<< "$ENVS"

echo "NODE_ENV=production node $NODE_OPTIONS indexer/${INDEXER}/dist/run.js" 
cd $WORKDIR && NODE_ENV=production node $NODE_OPTIONS indexer/${INDEXER}/dist/run.js
