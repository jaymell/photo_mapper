#!/bin/bash

mysql -u root << EOF
CREATE DATABASE photo_mapper;
CREATE USER 'pm'@'localhost' IDENTIFIED BY 'ohsh7Shi';
GRANT ALL PRIVILEGES ON photo_mapper.* to 'pm'@'localhost';
EOF


