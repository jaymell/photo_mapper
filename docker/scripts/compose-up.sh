#!/bin/bash -e

ENV=$1
[[ -z $ENV ]] && ENV="local"
[[ -z $NGINX_TAG ]] && export NGINX_TAG=latest
[[ -z $PM_TAG ]] && export PM_TAG=latest
[[ -z $CONFIG_BUCKET ]] && echo "export Bucket name" && exit 1

export CONFIG_BUCKET
pushd $ENV
export MYSQL_HOST=$(ip addr | grep docker0 | grep inet  | awk '{print $2}' | awk -F/ '{print $1}')
docker-compose up -d --force-recreate
