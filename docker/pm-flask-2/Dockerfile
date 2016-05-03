FROM 799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-1:latest
ENV BASE_DIR /app
WORKDIR $BASE_DIR
RUN git clone https://github.com/jaymell/photo_mapper .
WORKDIR $BASE_DIR/photo_mapper
#RUN mkdir static/img
RUN wget https://raw.githubusercontent.com/jaymell/jpgps/master/jpgps.py 
ADD config ./
EXPOSE 5000
CMD ["./run_app.sh"]
