# Integrate Knative into KubeVela

These demonstrations show how KubeVela integrates Knative Configuration/Route to
deploy and manage applications.
We will deploy an application with Knative Serving Workload, then interact with
it using cURL requests.

> The demonstrations are verified in Alibaba Kubernetes Cluster v1.18.8 of
> Hongkong region.

## Prerequisites

* Follow the instructions in the
[installation](https://kubevela.io/docs/install) document to get KubeVela
installed.
  
* Knative Serving v0.21.
Refer to [Install
Knative](https://knative.dev/docs/install/any-kubernetes-cluster/) to install
Knative. Remember to:
    * pick `Istio` as the networking layer 
    * choose `Magic DNS (xip.io)` to configure DNS.

## Quick Start

### Prepare ComponentDefinition and Application

We need an ComponentDefinition capable of renderring a `Service` of Knative
`serving.knative.dev/v1`.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: ComponentDefinition
metadata:
  name: knative-serving
  annotations:
    definition.oam.dev/description: "Knative serving."
spec:
  workload:
    definition:
      apiVersion: serving.knative.dev/v1
      kind: Service
  schematic:
    cue:
      template: |
        output: {
        	apiVersion: "serving.knative.dev/v1"
        	kind:       "Service"
        	spec: {
        		template:
        			spec:
        				containers: [{
        					image: parameter.image
        					env:   parameter.env
        				}]
        	}
        }
        parameter: {
        	image: string
        	env?: [...{
        		// +usage=Environment variable name
        		name: string
        		// +usage=The value of the environment variable
        		value?: string
        		// +usage=Specifies a source the value of this var should come from
        		valueFrom?: {
        			// +usage=Selects a key of a secret in the pod's namespace
        			secretKeyRef: {
        				// +usage=The name of the secret in the pod's namespace to select from
        				name: string
        				// +usage=The key of the secret to select from. Must be a valid secret key
        				key: string
        			}
        		}
        	}]
        }
```

```shell
$ kubectl apply -f ./componentdefinition-knative-serving.yaml
```

Then we write an application with the newly created ComponentDefinition.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: webapp
spec:
  components:
    - name: backend
      type: knative-serving
      properties:
        image: gcr.io/knative-samples/helloworld-go
        env:
          - name: TARGET
            value: "Go Sample v1"
```

```shell
$ kubectl apply -f ./app.yaml
```

### Verify the application

```shell
$ kubectl get application
NAME     AGE
webapp   24m

$ kubectl get ksvc
NAME            URL                                                 LATESTCREATED         LATESTREADY           READY   REASON
backend-v1      http://backend-v1.default.47.242.55.215.xip.io      backend-v1-00001      backend-v1-00001      True

$ curl http://backend-v1.default.47.242.55.215.xip.io
Hello Go Sample v1!
```

Have fun with KubeVela and Knative.
