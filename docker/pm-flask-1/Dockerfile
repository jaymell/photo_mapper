FROM 799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-0:latest
ADD ./artifacts/* /app/
WORKDIR /app
RUN pip install -r requirements.txt
RUN npm i
