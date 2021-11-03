FROM golang:1.17.0-alpine3.14 as builder
WORKDIR /app

COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

COPY static/index.html ./static/index.html
COPY app.go .
RUN go build -o kubevela-nocalhost-demo-app app.go

FROM alpine:3.10
WORKDIR /app
COPY static/index.html ./static/index.html
COPY --from=builder /app/kubevela-nocalhost-demo-app /app/kubevela-nocalhost-demo-app
ENV DB_HOST="host"
ENV DB_USER="user"
ENTRYPOINT ./kubevela-nocalhost-demo-app

EXPOSE 9080
