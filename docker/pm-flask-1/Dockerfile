FROM 799617403160.dkr.ecr.us-east-1.amazonaws.com/pm-flask-0:latest
# This sucks, but relative path (e.g., '../../requirements.txt') not option:
RUN wget https://raw.githubusercontent.com/jaymell/photo_mapper/initial/requirements.txt
RUN pip install -r requirements.txt
