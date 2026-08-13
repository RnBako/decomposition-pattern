FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/uploads
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
RUN mkdir -p /data/uploads
VOLUME ["/data/uploads"]
EXPOSE 3002
CMD ["node", "dist/server.js"]
