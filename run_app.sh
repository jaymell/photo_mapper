#!/bin/bash

python app.py 2>&1 | tee -a app.log
