#!/bin/bash

uwsgi -s 0.0.0.0:5000 -w app:app 2>&1 | tee -a app.log
