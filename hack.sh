#!/bin/bash

# set css path for photoswipe png -- there
# must be a smarter way to do this, but this
# currently working:
sed -i $'s/$pswp__assets-path:.*$/$pswp__assets-path: \'\/\./static\/lib\/img\/\';/' \
  node_modules/photoswipe/src/css/_main-settings.scss

sed -i 's_/static/_\./static/_g' \
  client/json.js


