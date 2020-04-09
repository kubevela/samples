# OAM KPT Demo

This demo function changes OAM manual scaler trait replica by annotation.

This example is written in `go` and uses the `kyaml` libraries for parsing the
input and writing the output.

## Build

You could build and push to your own image repo, in this example, we push it to `wonderflow/kpt-oam-demo` as example.

```
docker build -t wonderflow/kpt-oam-demo .
docker push wonderflow/kpt-oam-demo
```

## Use by kpt image

```
kpt fn run DIR/ --image wonderflow/kpt-oam-demo
```
