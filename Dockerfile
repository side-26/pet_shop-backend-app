FROM node:24.19.0-alpine

RUN mkdir /app

COPY package*.json ./

RUN npm ci

COPY . .

LABEL maintainer="Mahdi Rashidi <mahdirashidi462@gmail.com>"\
    version="1.0.0"

CMD [ "npm", "start" ]