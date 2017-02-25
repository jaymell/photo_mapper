#!/bin/bash -e

REGION=$1
login=$(aws ecr get-login --region $REGION)
$login
