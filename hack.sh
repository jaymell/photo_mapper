#!/bin/bash

sed -i $'s/$pswp__assets-path: \'\'/$pswp__assets-path: \'\/static\/img\/\'/' \
  node_modules/photoswipe/src/css/_main-settings.scss
