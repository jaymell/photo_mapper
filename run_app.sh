#!/bin/bash

uwsgi -p 2 --threads 10 --http-socket :5000 --wsgi-file app.py --callable app 2>&1 | tee -a app.log
