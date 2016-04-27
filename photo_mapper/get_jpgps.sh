#!/bin/bash

for i in jpgps.py*; do rm $i; done >/dev/null 2>&1
wget https://raw.githubusercontent.com/jaymell/jpgps/master/jpgps.py

