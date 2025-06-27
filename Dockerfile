# Pasul 1: Pornim de la o imagine Node.js stabila, bazata pe Debian
FROM node:18-slim

# Pasul 2: Setam directorul de lucru in interiorul containerului
WORKDIR /usr/src/app

# Pasul 3: Instalam o dependinta necesara pentru Oracle
RUN apt-get update && apt-get install -y libaio1

# Pasul 4: Copiem doar fisierele de pachete pentru a beneficia de cache-ul Docker
COPY back-end/package*.json ./
RUN npm install

# Pasul 5: Acum copiem tot restul proiectului in container
COPY . .

# Pasul 6: Setam calea catre driverele Oracle din interiorul containerului
ENV LD_LIBRARY_PATH=/usr/src/app/back-end/instantclient

# Pasul 7: Expunem portul aplicatiei
EXPOSE 3000

# Pasul 8: Comanda finala care porneste serverul
CMD [ "node", "back-end/server.js" ]