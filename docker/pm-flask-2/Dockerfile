FROM 799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-1:latest
ENV BASE_DIR /app
WORKDIR $BASE_DIR
ARG BRANCH
RUN echo $RANDOM && git clone https://github.com/jaymell/photo_mapper -b $BRANCH .
WORKDIR $BASE_DIR/photo_mapper
RUN mkdir static/img
RUN wget https://raw.githubusercontent.com/jaymell/jpgps/master/jpgps.py 
EXPOSE 5000
CMD ["./run.sh"]
