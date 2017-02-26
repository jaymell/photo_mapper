FROM ubuntu:16.04


RUN apt-get update && apt-get install -y python-dev \
		python-setuptools \
		libtiff5-dev \
		libjpeg-turbo8-dev \
		zlib1g-dev \
		libfreetype6-dev \
		liblcms2-dev \
		libwebp-dev \
		tcl8.6-dev \
		tk8.6-dev \
		python-tk \
		python-pip \
		git \
		wget \
		libmysqlclient-dev \
        jekyll

RUN wget -q https://deb.nodesource.com/setup_7.x -O - | bash -
RUN apt-get install -y nodejs
RUN apt-get clean
