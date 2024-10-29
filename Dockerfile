FROM node:21-alpine AS build

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .
RUN npx vite build && npx vite optimize

FROM nginx:1.27

COPY --link --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
