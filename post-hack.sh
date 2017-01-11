#!/bin/bash

sed -i 's_/static/_\./photo\_mapper/static/_g' \
  photo_mapper/static/js/bundle.js
