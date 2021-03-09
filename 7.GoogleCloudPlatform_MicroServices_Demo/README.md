# GoogleCloudPlatform-MicroServices-Demo with Kubevela

[MicroServices-Demo](https://github.com/GoogleCloudPlatform/microservices-demo) is a cloud-native microservices demo application.
This Demo will create a **Online Boutique** application. **Online Boutique** consists of a 10-tier microservices application. 
The application is a web-based e-commerce app where users can browse items, add them to the cart, and purchase them. 
In this example, we will deploy the demo in the local k8s cluster **kind**. 

## Prerequisites
* [istio](https://istio.io/)


## Deploy Application

### Apply WorkloadDefinition
In this demo, we abstracted out 2 types of workload: [microservice](./Definitions/workloads/micrioservice.yaml) and enhanced-worker(./Definitions/workloads/enhanced-worker.yaml).

1. microservice: microservice describe a workload component Deployment with Service.
2. enhanced-worker: enhanced-worker describe a long-running, scalable, containerized services that running at backend. They do NOT have network endpoint to receive external network traffic.

Application **boutique** is composed of 11 microservices and 1 worker. microservices provide shopping services, The worker continuously sends requests imitating realistic user shopping flows to the frontend.

![Architecture of microservices](./architecture-diagram.png)

```
kubectl apply -f Definitions/workloads
```

### Apply TraitDefinition

```shell
kubectl apply -f Definitions/traits
```

### Apply Application 

```shell
kubectl apply -f online-boutique.yaml
```

Please wait for a while until all deployments are ready.

```shell
$ kubectl get pods
NAME                                        READY   STATUS    RESTARTS   AGE
adservice-v1-5594467ccd-rkbt2               1/1     Running   0          113s
cartservice-v1-855885bc8d-598j5             1/1     Running   0          115s
checkoutservice-v1-66c96cc447-2hqw4         1/1     Running   0          114s
currencyservice-v1-7ff4d49f44-7g9qx         1/1     Running   0          114s
emailservice-v1-6b5bb7dd5b-8ptzw            1/1     Running   0          114s
frontend-v1-796df77f4d-cbx4m                1/1     Running   0          115s
loadgenerator-v1-558cddbbb9-9887w           1/1     Running   0          113s
paymentservice-v1-5978b7d6c5-8r6kv          1/1     Running   0          114s
productcatalogservice-v1-6574b89c6c-rcbd7   1/1     Running   0          115s
recommendationservice-v1-784888d964-9958l   1/1     Running   0          113s
redis-cart-v1-797f4579d4-2xt4l              1/1     Running   0          113s
shippingservice-v1-5bc9f577b7-kthts         1/1     Running   0          114s
```

### Access the web frontend in a browser

The microservice **fronted** expose a a service(LoadBalacer) to allow outside access.

```shell
$ kubectl get service frontend-external
NAME                TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
frontend-external   LoadBalancer   <your ip>       <pending>     80:31420/TCP   66s
```
Although kind does not support type=LoadBalancer currently but we can still access the fronted from local.

```shell
kubectl port-forward svc/frontend 8000:80
```

Then you can access **Online Boutique** through [http://localhots:8000/](http://localhost:8000/)

## Use istio for traffic management

### Create istio gateway and virtualservice

```
kubectl apply -f istio-manifests.yaml
```

### Access the web from istio gateway

```
kubectl get svc/istio-ingressgateway -n istio-system
NAME                   TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                                                                      AGE
istio-ingressgateway   LoadBalancer   10.96.191.204   <pending>     15021:30077/TCP,80:31791/TCP,443:32113/TCP,31400:31457/TCP,15443:32035/TCP   12m
```

We do port forwarding to the ingressgateway of istio.

```
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80
```
Then you can access the **Online Boutique** from [http://localhots:8080/](http://localhots:8080/).

### Traffic Management
In this section, we show the istio's traffic management capabilities. 

1. Create an Istio DestinationRule for productcatalogservice.
```
kubectl apply -f istio-canary/destinationrule.yaml
```

3. Deploy ProductCatalog v2. We need open [online-boutique.yaml](./online-boutique.yaml), then comment the Component productcatalogservice.

``` YAML
    # - name: productcatalogservice
    #   type: microservice
    #   settings:
    #     image: gcr.io/google-samples/microservices-demo/productcatalogservice:v0.1.3
    #     servicePort: 3550
    #     env:
    #       PORT: "3550"
    #     cpu: "100m"
    #     memory: "64Mi"
    #   traits:
    #     - name: patch-cmd-probe
    #       properties:
    #         readinessProbe:
    #           cmd: ["/bin/grpc_health_probe", "-addr=:3550"]
    #         livenessProbe:
    #           cmd: ["/bin/grpc_health_probe", "-addr=:3550"]
    #     - name: patch-container-resource
    #       properties:
    #         limitCPU: "200m"
    #         limitMemory: "128Mi"
```

4. Uncomment the Component productcatalogservice-v2.

``` YAML
    - name: productcatalogservice
      type: microservice
      settings:
        version: "v2"
        image: gcr.io/google-samples/microservices-demo/productcatalogservice:v0.1.3
        servicePort: 3550
        env:
          PORT: "3550"
          EXTRA_LATENCY: 3s
        cpu: "100m"
        memory: "64Mi"
      traits:
        - name: patch-cmd-probe
          properties:
            readinessProbe:
              cmd: ["/bin/grpc_health_probe", "-addr=:3550"]
            livenessProbe:
              cmd: ["/bin/grpc_health_probe", "-addr=:3550"]
        - name: patch-container-resource
          properties:
            limitCPU: "200m"
            limitMemory: "128Mi"
```

5. Deploy productcatalog v2.

```
kubectl apply -f online-boutique.yaml
```

6. Using kubectl get pods, verify that the v2 pod is Running.
```
kubectl get pod
NAME                                        READY   STATUS    RESTARTS   AGE
productcatalogservice-v2-7f7b6fd9d4-lcnd5   2/2     Running   0          73s
```

7. Create an Istio VirtualService to split incoming productcatalog traffic between v1 (75%) and v2 (25%).

```
kubectl apply -f istio-canary/vs-split-traffic.yaml
```

8. Open web browser, access again to the **Online Boutique**, productcatalogservice-v2 introduces a 3-second latency into all server requests. So refresh the homepage a few times. You should notice that periodically, the frontend is slower to load.

9. View traffic splitting in Kiali, this step you need install [Kiaki](https://istio.io/latest/docs/setup/getting-started/#dashboard).

```
istioctl dashboard kiali
```
Open the Kiali dashboard. Please navigate to Service Graph > namespace: default and select "Versioned App Graph."You should see that approximately 75% of productcatalog requests are going to v1.
![kiali](./kiali.png)

10. Return 100% of productcatalog traffic to v1:
```
kubectl apply -f istio-canary/rollback.yaml
```

