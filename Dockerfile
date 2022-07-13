FROM node:17

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
COPY . .

ENV NODE_ENV=prod
CMD ["npm", "run", "start"]