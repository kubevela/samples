#!/usr/bin/bash env

.PHONY: app

linux:
	GOOS=linux GOARCH=amd64 make app

app:
	go build -o bin/app ./app.go
