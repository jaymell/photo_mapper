#!/bin/bash -e

export MONGODB_HOST=$(ip addr | grep docker0 | grep inet  | awk '{print $2}' | awk -F/ '{print $1}')
docker-compose up -d
