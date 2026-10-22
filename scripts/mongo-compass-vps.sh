#!/bin/bash

set -e

VPS="root@109.122.247.171"
LOCAL_PORT=27018

echo "Starting MongoDB SSH tunnel..."

ssh -f -N \
  -o ExitOnForwardFailure=yes \
  -L "${LOCAL_PORT}:127.0.0.1:27017" \
  "$VPS"

echo "Opening MongoDB Compass..."

open -a "MongoDB Compass"

echo "MongoDB tunnel ready on localhost:${LOCAL_PORT}"