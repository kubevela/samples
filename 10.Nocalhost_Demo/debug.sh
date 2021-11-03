#!/bin/sh

export GOPROXY=https://goproxy.cn
dlv --headless --log --listen :9009 --api-version 2 --accept-multiclient debug app.go
