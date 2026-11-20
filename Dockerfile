FROM node:24-bookworm-slim

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
COPY --chown=node:node examples ./examples

USER node

ENTRYPOINT ["node"]
CMD ["src/cli/main.js"]
