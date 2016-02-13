#!/bin/bash
# testing68
uwsgi -p 2 --threads 10 -s 0.0.0.0:5000 --wsgi-file app.py --callable app 2>&1 | tee -a app.log
