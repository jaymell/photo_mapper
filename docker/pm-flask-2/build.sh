#!/bin/bash -e

TAG=$1
[[ -z $1 ]] && TAG=799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-2:latest
[[ -z $REGION ]] && export REGION="us-east-1"
[[ -z $BRANCH ]] && export BRANCH=master

login=$(aws ecr get-login --region $REGION)
bash -c "$login"

rsync -avP --exclude=.git --exclude=docker --exclude=node_modules ../../ ./artifacts/

docker build -t $TAG . --build-arg BRANCH=$BRANCH --no-cache

docker push $TAG

rm -rf ./artifacts/
