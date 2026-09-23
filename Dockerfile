FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
# ADMIN_USER ve ADMIN_PASS ortam değişkenleriyle admin hesabı belirlenir:
#   docker run -e ADMIN_USER=alperen -e ADMIN_PASS='gizli-sifre' -p 3000:3000 site
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
