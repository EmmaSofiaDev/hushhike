# Multi-stage production container for HushHike
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json next.config.ts ./
RUN npm ci
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/out ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
