# Dockerfile
FROM golang:1.16-alpine as builder
WORKDIR /app

COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

COPY main.go .
RUN go build -o kubevela-demo-cicd-app main.go

FROM alpine:3.10
WORKDIR /app
COPY --from=builder /app/kubevela-demo-cicd-app /app/kubevela-demo-cicd-app
ENTRYPOINT ./kubevela-demo-cicd-app
EXPOSE 8088