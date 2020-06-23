FROM python:3.8

RUN python3 -m pip install flask uwsgi

RUN mkdir /opt/webapp/
WORKDIR /opt/webapp/
COPY templates .
COPY . .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
