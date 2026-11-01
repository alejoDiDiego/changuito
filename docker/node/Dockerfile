FROM node:24.15.0-bookworm
# Local tool prefix, not a global npm installation.
RUN npm install --prefix /opt/npm --save-exact --ignore-scripts --no-fund --no-audit npm@12.0.2
ENV PATH="/opt/npm/node_modules/.bin:${PATH}"
WORKDIR /app
