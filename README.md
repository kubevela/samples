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

### Deploying to Kubernetes

The Kubernetes cluster must have the Operator deployed. This can be found here: https://github.com/oam-dev/rudr 

1. Once rudr is installed in the cluster, first add the `ComponentSchematics`

    ```
    kubectl apply -f tracker-db-component.yaml
    kubectl apply -f tracker-api-components.yaml
    kubectl apply -f tracker-ui-component.yaml
    ```

2. Then install the `AppConfiguration`

    ```
    kubectl create -f tracker-app-config.yaml
    ```