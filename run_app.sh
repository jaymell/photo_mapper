#!/bin/bash

# this needs to read ports and such from config file!!!!!!1

uwsgi -p 2 --threads 10 -s 0.0.0.0:5000 -w app:app 2>&1 --stats 127.0.0.1:5001 | tee -a app.log
