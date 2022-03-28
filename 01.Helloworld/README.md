# Build & Ship An Application From Scratch

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

## Build Docker Image

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

Now we have a docker image tagged `oamdev/helloworld-python:v1`. 

## Determine Component Type 

Next setp is to determine the type of your component, namely, the runtime
workload inside which you expect your containerized application runs.

According to our sample application, we need a container runtime that can accept
an ENV parameter named `TARGET` and is capable of exposing a port for external
to access the service.
Furthermore, the application is stateless and can be replicated.

Currently, KubeVela provides several out-of-box types of component,
`webservice`, `worker` and `task`,
After checking the usage of each type through KubeVela cli `vela
components`, we can figure out that, `webservice` matches our requirements to
deploy the application.

```shell
vela components
```

```console
NAME      	NAMESPACE  	WORKLOAD        	DESCRIPTION
...
webservice	vela-system	deployments.apps	Describes long-running, scalable, containerized services
          	           	                	that have a stable network endpoint to receive external
          	           	                	network traffic from customers.
...
```

Now we have determined to use `webservice` as our component's type.

> As an end-user, you are supposed to know how to check the component types
> supported by the platform and the usage of each.
> However, if you find no one can satisfy your requirement, you are encouraged
> to contact platform administrators to ask for solution.  

> :warning: End-users are not allowed to create new component types.

## Choose Traits For Each Component

Once component type is decided, you may need to append specific operational
characteristics (Traits) to your components.
In this sample, we need to expose the service of our python app to outside of
Kubernetes cluster. 
Let's check which traits can help here.

```shell
vela traits
```

```console
NAME       	NAMESPACE  	APPLIES-TO       	CONFLICTS-WITH	POD-DISRUPTIVE	DESCRIPTION
annotations	vela-system	webservice,worker	              	false         	Add annotations for your Workload.
cpuscaler  	vela-system	webservice,worker	              	false         	configure k8s HPA with CPU metrics for Deployment
ingress    	vela-system	webservice,worker	              	false         	Configures K8s ingress and service to enable web traffic for
           	           	                 	              	              	your service. Please use route trait in cap center for
           	           	                 	              	              	advanced usage.
labels     	vela-system	webservice,worker	              	false         	Add labels for your Workload.
scaler     	vela-system	webservice,worker	              	false         	Configures replicas for your service by patch replicas
           	           	                 	              	              	field.
sidecar    	vela-system	webservice,worker	              	false         	inject a sidecar container into your app

```

Apparently, `ingress` is exactly what we need.

> Again, as an end-user, you are also supposed to know how to check the traits
> already installed on the platform and the usage of each.
> If you find no one can satisfy your requirement, you are encouraged to contact
> platform administrators to ask for solutions. 

> :warning: End-users are not allowed to create new traits.


## Assemble Components & Traits In Application

Once component type and trait are both choosen, we can assemble them in
an Application entity.
To author an Application file, you must know the configurable points of the
component type as well as traits, then you can fulfill their `properties` fields
according to your needs.

Check the configurable points (properties) of a component type
```shell
vela show webservice
```

<details>
<summary>click to show properties of webservice</summary>

```console
# Properties
+------------------+----------------------------------------------------------------------------------+-----------------------+----------+---------+
|       NAME       |                                   DESCRIPTION                                    |         TYPE          | REQUIRED | DEFAULT |
+------------------+----------------------------------------------------------------------------------+-----------------------+----------+---------+
| cmd              | Commands to run in the container                                                 | []string              | false    |         |
| env              | Define arguments by using environment variables                                  | [[]env](#env)         | false    |         |
| addRevisionLabel |                                                                                  | bool                  | true     | false   |
| image            | Which image would you like to use for your service                               | string                | true     |         |
| port             | Which port do you want customer traffic sent to                                  | int                   | true     |      80 |
| cpu              | Number of CPU units for the service, like `0.5` (0.5 CPU core), `1` (1 CPU core) | string                | false    |         |
| volumes          | Declare volumes and volumeMounts                                                 | [[]volumes](#volumes) | false    |         |
+------------------+----------------------------------------------------------------------------------+-----------------------+----------+---------+


##### volumes
+-----------+---------------------------------------------------------------------+--------+----------+---------+
|   NAME    |                             DESCRIPTION                             |  TYPE  | REQUIRED | DEFAULT |
+-----------+---------------------------------------------------------------------+--------+----------+---------+
| name      |                                                                     | string | true     |         |
| mountPath |                                                                     | string | true     |         |
| type      | Specify volume type, options: "pvc","configMap","secret","emptyDir" | string | true     |         |
+-----------+---------------------------------------------------------------------+--------+----------+---------+


## env
+-----------+-----------------------------------------------------------+-------------------------+----------+---------+
|   NAME    |                        DESCRIPTION                        |          TYPE           | REQUIRED | DEFAULT |
+-----------+-----------------------------------------------------------+-------------------------+----------+---------+
| name      | Environment variable name                                 | string                  | true     |         |
| value     | The value of the environment variable                     | string                  | false    |         |
| valueFrom | Specifies a source the value of this var should come from | [valueFrom](#valueFrom) | false    |         |
+-----------+-----------------------------------------------------------+-------------------------+----------+---------+


### valueFrom
+--------------+--------------------------------------------------+-------------------------------+----------+---------+
|     NAME     |                   DESCRIPTION                    |             TYPE              | REQUIRED | DEFAULT |
+--------------+--------------------------------------------------+-------------------------------+----------+---------+
| secretKeyRef | Selects a key of a secret in the pod's namespace | [secretKeyRef](#secretKeyRef) | true     |         |
+--------------+--------------------------------------------------+-------------------------------+----------+---------+


#### secretKeyRef
+------+------------------------------------------------------------------+--------+----------+---------+
| NAME |                           DESCRIPTION                            |  TYPE  | REQUIRED | DEFAULT |
+------+------------------------------------------------------------------+--------+----------+---------+
| name | The name of the secret in the pod's namespace to select from     | string | true     |         |
| key  | The key of the secret to select from. Must be a valid secret key | string | true     |         |
+------+------------------------------------------------------------------+--------+----------+---------+
```

</details>

<br/>

Check the configurable points (properties) of a trait
```shell
vela show ingress
```

<details>
<summary>click to show properties of ingress trait</summary>

```console
# Properties
+--------+------------------------------------------------------------------------------+----------------+----------+---------+
|  NAME  |                                 DESCRIPTION                                  |      TYPE      | REQUIRED | DEFAULT |
+--------+------------------------------------------------------------------------------+----------------+----------+---------+
| http   | Specify the mapping relationship between the http path and the workload port | map[string]int | true     |         |
| domain | Specify the domain you want to expose                                        | string         | true     |         |
+--------+------------------------------------------------------------------------------+----------------+----------+---------+
```

</details>

<br/>

Pick up the properties we need and fulfill them in Application file as below.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: first-app
spec:
  components:
    - name: helloworld
      type: webservice # <=== component type
      properties: # <=== component properties
        image: oamdev/helloworld-python:v1
        env:
          - name: "TARGET"
            value: "KubeVela"
        port: 8080
      traits:
        - type: ingress # <=== trait type
          properties: # <=== trait properties
            domain: localhost 
            http:
              /: 8080
```

Let's save it as file `app.yaml` and apply to deploy.

```shell script
kubectl apply -f app.yaml
```

## Verify 

We can check the application through KuveVela cli.

```shell script
vela ls
```

```console
APP             COMPONENT       TYPE            TRAITS  PHASE   HEALTHY STATUS  CREATED-TIME
first-app       helloworld      webservice      ingress running healthy         2021-05-18 15:40:02 +0900 KST
```

And call the service by cURL tool

```shell script
curl localhost
```

```console
Hello KubeVela!
```

Yeah, we have successfully deploy an application from source now.

> :warning: ingress trait replies on the ingress controller, such as nginx-ingress, installed in your cluster.
> If you cannot access the domain, you may check the network or ingress
> configuration of your cluster.

## Upgrade Application

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

Apply the upgraded application

```console
kubectl apply -f app-upgrade.yaml 
```

### Verify

Call the service to check the response has changed.

```shell script
curl localhost
```

```console
Goodbye KubeVela!
```
