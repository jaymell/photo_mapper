#!/bin/bash -e

[[ -n $1 ]] && login=$(aws ecr get-login --region $REGION) || login=$(aws ecr get-login)
$login
