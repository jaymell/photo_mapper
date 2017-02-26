FROM 799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-1:latest
ADD ./artifacts /app/
ENV BASE_DIR /app
WORKDIR $BASE_DIR/photo_mapper
RUN mkdir -p static/img
RUN wget https://raw.githubusercontent.com/jaymell/jpgps/master/jpgps.py 
EXPOSE 5000
WORKDIR $BASE_DIR
RUN node_modules/grunt/bin/grunt 
CMD ["./run.sh"]
