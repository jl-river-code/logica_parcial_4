FROM node:24-bookworm-slim

WORKDIR /app

# El proyecto no requiere dependencias externas por ahora.
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node examples ./examples

USER node

ENTRYPOINT ["node"]
CMD ["src/cli/main.js"]
