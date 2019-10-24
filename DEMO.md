# Demo: Service Tracker Demo on Azure

This document contains instructions to fork this repository and leverage the pre-configured GitHub Actions for a demo.  

## Prerequisities 

* Follow the **Prerequisites** section in the [Rudr Installation guide](https://github.com/oam-dev/rudr/blob/master/docs/setup/install.md) to install Helm 3, kubectl and get a Kubernetes cluster up. 
* Have a container registry to push images to 

## Step-by-step instructions

1. Fork this repository 

2. Configure the following secrets in the GitHub repository. This can be done by accessing the Settings tab at the top **Settings -> Secrets**. 

  | Secret | Description |
  |--------|-------------|
  | REGISTRY_NAME | The hostname of the Docker registry |
  | REGISTRY_USERID | The user ID for authenticating with the Docker registry |
  | REGISTRY_PASSWORD | The password for authenticating with the Docker registry |
  | AZURE_CREDENTIALS | The credentials used to authenticate with the AKS cluster (see the [aks-set-context](https://github.com/Azure/k8s-actions/tree/master/aks-set-context#azure-credentials) GitHub action guide for details) |
  | AKS_CLUSTER_NAME | The name of the AKS cluster |
  | AKS_CLUSTER_RESOURCE_GROUP | The resource group in which the AKS cluster resides |


3. The GitHub Actions creates a Kubernetes secret called `rudrimagepullsecret` containing the Container Registry details. Add the `imagePullSecret` property to each of the `data`/`flights`/`quakes`/`weather`/`ui` component YAML files:

  ```yaml
    containers:
    - name: <existing name>
      image: <existing image>
      imagePullSecret: rudrimagepullsecret
  ```

  4. Push the changes to the YAML files to your fork. 

  5. This triggers the GitHub Action to build the containers using the **Dockerfiles** for each microservice, push them to your container registry, create a K8s secret and then deploy the OAM specs to your cluster. 

  6. Run `kubectl get svc` to obtain the external IP to the NGINX controller. It will look like the below.    

  ```bash
  nginx-ingress-controller        LoadBalancer   10.0.253.208   13.64.241.76   80:32751/TCP,443:30402/TCP   28h
  ```

7. Add the following to your `/etc/hosts` file so you can access the endpoint using the host (servicetracker.oam.io). 

    ```
    13.64.241.76 servicetracker.oam.io
    ``` 

8. Visit your browser and type in `servicetracker.oam.io` for the Service Tracker Website. 