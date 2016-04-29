#!/bin/bash

project_name=photo_mapper

image_dir="/var/lib/${project_name}"
rm -f $image_dir/*

db=$project_name
collection=$project_name
mongo $db  --eval "db.${collection}.drop();"
