FROM node:22-bookworm-slim AS frontend
WORKDIR /app
RUN npm install --global pnpm@10.34.3
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts ./
COPY .figma/make/site.json ./.figma/make/site.json
COPY src ./src
ENV VITE_API_URL=/api
ARG VITE_PUBLIC_SUPPORT_EMAIL=""
ENV VITE_PUBLIC_SUPPORT_EMAIL=$VITE_PUBLIC_SUPPORT_EMAIL
RUN pnpm run build

FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/dist ./src/main/resources/static
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system research && useradd --system --gid research research
COPY --from=build /app/target/research-center-1.0.0.jar app.jar
USER research
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "app.jar"]

