#!/bin/bash -e

TAG=$1
[[ -z $1 ]] && TAG=799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-1:latest
[[ -z $REGION ]] && export REGION="us-east-1"

login=$(aws ecr get-login --region $REGION)
bash -c "$login"

# copy requirements.txt from top-level:
cp ../../requirements.txt ./

docker build -t $TAG .

docker push $TAG

