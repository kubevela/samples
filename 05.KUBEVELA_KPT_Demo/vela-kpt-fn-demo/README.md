# OAM KPT Demo

This demo function changes KubeVela scaler trait replica by annotation.

This example is written in `go` and uses the `kyaml` libraries for parsing the
input and writing the output.

## Build

You could build and push to your own image repo, in this example, we push it to
`captainroy1121/vela-kpt-fn-demo` docker image as example.

```
docker build -t captainroy1121/vela-kpt-fn-demo .
docker push captainroy1121/vela-kpt-fn-demo 
```

## Use by kpt image

```
kpt fn run DIR/ --image captainroy1121/vela-kpt-fn-demo
```
