#!/bin/bash

[[ -z $1 ]] && echo "Specify tag" && exit 1
[[ -z $REGION ]] && export REGION="us-east-1"

export TAG=$1

login=$(aws ecr get-login --region $REGION)
bash -c "$login"

docker build -t $TAG . 

docker push $TAG

