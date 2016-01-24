#!/bin/bash

uwsgi -s 127.0.0.1:5000 -w app:app 2>&1 | tee -a app.log

