#!/bin/bash -e

REPO_URL=799617403160.dkr.ecr.us-east-1.amazonaws.com


# should match dir name:
TAG=$1
[[ -z $TAG ]] && echo "Enter the image to build -- should match subfolder name" && exit 69

[[ -n $2 ]] && TAG_VER=$2
[[ -z $TAG_VER ]] && TAG_VER="latest"

# log in to repo:
./docker-login.sh

# kinda dumb:
if [[ $TAG -eq "pm-flask-2" ]]
then
	cd ../$TAG && \
		docker build --no-cache -t $REPO_URL/$TAG:$TAG_VER .
else
	cd ../$TAG && \
        docker build -t $REPO_URL/$TAG:$TAG_VER .
fi

