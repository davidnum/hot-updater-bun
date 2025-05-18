FROM oven/bun AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install

COPY ./src ./src

# ENV NODE_ENV=production
# ENV PORT=9090
# ENV UPLOADS_DIR=external/uploads
# ENV DB_PATH=external/app.db

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	./src/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server

# ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 9090