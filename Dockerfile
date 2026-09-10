FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the application source, owned by the built-in unprivileged `node` user.
COPY --chown=node:node . .

# Drop root privileges for the running container.
USER node

EXPOSE 3000

# Probe the /health endpoint using Node itself (no curl/wget in the base image).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "api/server.js"]
