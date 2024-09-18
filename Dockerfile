FROM node:21-alpine as build

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build

FROM nginx:latest

COPY --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
