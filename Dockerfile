FROM node:21-alpine AS build

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build

FROM nginx:1.27

COPY --from=build /app/dist/ /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
