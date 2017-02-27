#!/bin/bash -e

aws s3 cp s3://$CONFIG_BUCKET/$ENV/config ./
nproc_out=$(nproc)
num_cpus=${nproc_out-2}
#uwsgi -p $num_cpus --threads 10 -s 0.0.0.0:5000 --module photo_mapper --callable app 2>&1 | tee -a app.log
#uwsgi -p $num_cpus --threads 1000 --http-socket localhost:5000 --stats /tmp/stats.socket --module photo_mapper --callable app 2>&1 | tee -a app.log
uwsgi -p $num_cpus --threads 10 -s 0.0.0.0:5000 --module photo_mapper --callable app 2>&1
