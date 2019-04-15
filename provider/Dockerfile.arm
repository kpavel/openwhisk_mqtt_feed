FROM resin/raspberry-pi-node

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ADD . .

RUN npm install --production

EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
