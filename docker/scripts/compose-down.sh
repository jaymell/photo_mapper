#!/bin/bash -e

ENV=$1
[[ -z $ENV ]] && ENV="local"
pushd $ENV
docker-compose stop 
