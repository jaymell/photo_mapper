#!/bin/bash -e

# to build dev: BRANCH=dev ./build.sh pm-flask-2 dev
REPO_URL=799617403160.dkr.ecr.us-east-1.amazonaws.com
REPO_BUCKET=jaymell-docker

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
		# get the config file first:
		aws s3 cp s3://$REPO_BUCKET/config .
		# export branch as env var if you want branch other than master built:
		[[ -z $BRANCH ]] && BRANCH=dev
		[[ $BRANCH -eq "dev" ]] && TAG_VER="dev"
		echo Building branch $BRANCH
		docker build --no-cache --build-arg BRANCH=$BRANCH -t $REPO_URL/$TAG:$TAG_VER .
else
	cd ../$TAG && \
        docker build -t $REPO_URL/$TAG:$TAG_VER .
fi

docker push $REPO_URL/$TAG:$TAG_VER
