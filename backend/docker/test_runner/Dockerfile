FROM node:18-alpine

# Optimisations pour la performance
RUN apk add --no-cache \
    openjdk17-jre \
    android-tools \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Copier et installer les dépendances en premier (cache Docker)
COPY package*.json ./
RUN npm install && npm cache clean --force

# Installer Appium globalement
RUN npm install -g appium@latest

# Créer les répertoires nécessaires
RUN mkdir -p /opt/resources /usr/src/app/screenshots

# Copier le code de l'application
COPY . .

# Script de démarrage optimisé
COPY start-test-server.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-test-server.sh

EXPOSE 3001

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["/usr/local/bin/start-test-server.sh"]
