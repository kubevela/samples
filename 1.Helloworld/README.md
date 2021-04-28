# Create Component from Scratch

In this tutorial, we will build a simple web app component written in Python
that you can use for testing.
It reads in an env variable TARGET and prints “Hello \${TARGET}!“.
If TARGET is not specified, it will use “World” as the TARGET.

## Prerequisites

* Follow the instructions in the
[installation](https://kubevela.io/docs/install) document to get KubeVela
installed.
* [Docker](https://www.docker.com/) installed and running on your local machine,
and a [Docker Hub](https://hub.docker.com) account configured (we’ll use it for
a container registry).

## Steps to build image

The following instructions will lead you to build an image from source, you can
get all the files mentioned here in the [app](./app) folder.

1. Create a new directory and cd into it:
    ```shell script
    mkdir app
    cd app
    ```
2. Create a file named `app.py` and copy the code from [`app/app.py`](./app/app.py)
3. Create a file named `Dockerfile` and copy the code from
   [`app/Dockerfile`](./app/Dockerfile), See [official Python docker
   image](https://hub.docker.com/_/python/) for more details.
4. Use Docker to build the sample code into a container. To build and push with
   Docker Hub, run these commands replacing `oamdev` with your Docker Hub
   username

```shell script
# Build the container on your local machine
docker build -t oamdev/helloworld-python:v1 .

# Push the container to docker registry
docker push oamdev/helloworld-python:v1
```
   
## Choose ComponentDefinition 

Now we have a docker image named `oamdev/helloworld-python:v1`, so we can choose a 
ComponentDefinition to use this image to setup an application.

KubeVela provides several built-in ComponentDefinitions which can cover most
common use cases.
`helloworld-python` is a very typical web application, which is stateless,
always running as a service, and can be replicated.
So we can choose built-in `webservice` capability to deploy the application. 

## (Optional) Create a ComponentDefinition

KubeVela provides high extensibility for users to fulfill arbitrary
capabilities.
You can follow [this
doc](https://kubevela.io/docs/platform-engineers/definition-and-templates) to
learn more about `ComponentDefinition` including how create a ComponentDefinition
satifying partifular schenarios from scratch.

## Write Application file

Once ComponentDefinition type is decided, we can write an Application file for
deploying the application.
Besides docker image, we also have two major environment variables, one is TARGET
and the other is PORT, we should fill them in the component's properties.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: first-app
spec:
  components:
    - name: helloworld
      type: webservice
      properties:
        image: oamdev/helloworld-python:v1
        env:
          - name: "TARGET"
            value: "KubeVela"
        port: 8080
```

### Add Ingress trait

In order to access the application from the outside of cluster, we can add a
built-in `Ingress` trait for it.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: first-app
spec:
  components:
    - name: helloworld
      type: webservice
      properties:
        image: oamdev/helloworld-python:v1
        env:
          - name: "TARGET"
            value: "KubeVela"
        port: 8080
```

Let's save it as file `app.yaml` and apply it to deploy.

```shell script
$ kubectl apply -f app.yaml
```

You can check if your component is OK with:

```shell script
$ kubectl get deploy
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
helloworld   1/1     1            1           54s

$ curl localhost
Hello KubeVela!
```

Yeah, we have successfully deploy an application from source now.

## Upgrade the application

If we want to upgrade an application, the easiest way is to modify the
application components' properties. 

### Change the code 

For example, we change the code from `Hello` to `Goodbye`.

```python
import os

from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    target = os.environ.get('TARGET', 'World')
-   return 'Hello {}!\n'.format(target)
+   return 'Goodbye {}!\n'.format(target)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', "8080")))
```

Build and create image with a new tag.

```shell script
docker build -t oamdev/helloworld-python:v2 .
docker push oamdev/helloworld-python:v2
``` 

### Change the component properties

Change the image tag to new one (v1 => v2).
```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: first-app
spec:
  components:
    - name: helloworld
      type: webservice
      properties:
        image: oamdev/helloworld-python:v2 # new image tag
        env:
          - name: "TARGET"
            value: "KubeVela"
        port: 8080
      traits:
        - type: ingress
          properties:
            domain: localhost 
            http:
              /: 8080
```

Apply the upgraded application:

```console
$ kubectl apply -f app-upgrade.yaml 
```

### Check the result

```shell script
$ curl localhost
Goodbye KubeVela!
```
