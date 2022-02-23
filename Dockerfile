FROM node:16.13.2-bullseye-slim
RUN apt-get update -y
RUN apt-get install -y watchman make
RUN npm install -g pnpm

WORKDIR /app

COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
RUN pnpm fetch

COPY ./ /app
RUN pnpm install --offline

RUN pnpm build

ENV ASAP__INTERFACE="0.0.0.0"
ENV ASAP__PORT="8080"
ENTRYPOINT ["pnpm", "run", "start"]
