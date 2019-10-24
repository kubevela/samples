## Service Tracker Example

This is an example microservices application with a Javascript Web UI, a MongoDB database, and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed. 
The application being deployed is shown in the following diagram: 

![Application architecture diagram](service-tracker-diagram.jpg)

> Full application original source here: https://github.com/chzbrgr71/service-tracker 

In this example, there are various roles that handle each aspect of the OAM application.

* UI Developer
* API Microservices Developer
* MongoDB Admin
* App Operator / SRE (handles applicaiton deployment in Kubernetes)

## Quickstart: Deploy the sample to Rudr running on any Kubernetes cluster

### Pre-requisites 

* Follow the **Prerequisites** section in the [Rudr Installation guide](https://github.com/oam-dev/rudr/blob/master/docs/setup/install.md) to install Helm 3, kubectl and get a Kubernetes cluster up.  

### Set up the cluster

1. Install Rudr and an Ingress controller on your Kubernetes cluster. Follow instructions here: https://github.com/oam-dev/rudr/blob/master/docs/setup/install.md making sure to also install the NGINX Ingress Controller. 

### Install the application

1. Add the `ComponentSchematics` to the K8s cluster. 

    ```
    kubectl apply -f tracker-db-component.yaml
    kubectl apply -f tracker-data-component.yaml
    kubectl apply -f tracker-flights-component.yaml
    kubectl apply -f tracker-quakes-component.yaml
    kubectl apply -f tracker-weather-component.yaml
    kubectl apply -f tracker-ui-component.yaml
    ```

2. Install the `AppConfiguration`.

    ```
    kubectl create -f tracker-app-config.yaml
    ```

3. Run `kubectl get svc` to obtain the external IP to the NGINX controller. It will look like the below.    

  ```bash
  nginx-ingress-controller        LoadBalancer   10.0.253.208   13.64.241.76   80:32751/TCP,443:30402/TCP   28h
  ```

4. Add the following to your `/etc/hosts` file so you can access the endpoint using the host (servicetracker.oam.io). 

    ```
    13.64.241.76 servicetracker.oam.io
    ``` 

5. Visit your browser and type in `servicetracker.oam.io` for the Service Tracker Website. 

For instructions on how to demo this content with GitHub Actions please read the instructions on the [GitHub Actions Demo](./DEMO.md).