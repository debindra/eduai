# DocGen rendering service — fonts-noto-core required for Devanagari.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY dist ./dist
COPY node_modules ./node_modules

ENV DOCGEN_PORT=3002
EXPOSE 3002
CMD ["node", "dist/main.js"]
