# Developing microservices targeted for Hydra 

This section goes over how a two developers building separate but dependent microservices can work together to deliver the artifacts consumed by the application operator to deploy to the cloud environment (Hydra). 

The application built is the same one that is described in the `../README.md` folder in the root of the `fireworks` folder. 

## Assumptions 
* Each developer has their development machine set up with Visual Studio, Docker and Azure CLI. 
* The source code for both microservices will be in a Git repository and the developers will work off a single solution. 
* All assumptions in this document with respect to the specification and developer flow are based on assumptions as of 07/17/2019 and are subject to change

## Goals 
The goal of this document is to go over the following: 
* How the developers test their microservices locally
* Test dependencies on the other microservice
* How to author the component.yaml files and possibly test in cloud
* What and where they push their code to signal the handoff 

## Building and testing individual service 

1. Clone `fireworks` GitHub repository down to your local machine from master or whatever feature branch 

2. Checkout to your own dev branch 

3. Open the solution in Visual Studio or in VSCode

4. Whether you are a developer working on the `web` or `worker` services, you can modify the code and build the solution to test it locally 

5. The developer is responsible for authoring a Dockerfile for their component using Docker images from a trusted source repository

6. The developer can test the solution with containers locally as well once they have built the Docker image

At this stage, the developer has tested their individual micorservice locally and are ready to test in the cloud. 

## Testing dependencies & testing in the cloud 

Both services have a dependency on the other to ensure functionality. The `worker` service uses a passed in DNS name (via an environment variable) to communicate with the `web` service. There are multiple ways to test their application in a cloud environment. The first one involves extensive developer knowledge of Hydra and the second one is more hands off because operations has built up a pipeline for developers to test. 

![Development Flow](../media/developer_flow.PNG)

1. Developer authors the **Component** and **OperationalConfigs** and tests in the cloud on their subscriptions. Caveats: 

* Any ingress endpoints might have to be on the internal VNET if the organization doesn't want to expose testing endpoints to the public internet 
* Developer will need tools via VSCode to actually author these configs 
* We are exposing the developer to **OperationalConfigs**
* The developer will have to check-in these configs into Git repositories, add them to .gitignore files or delete them entirely. There will be an ACR Task hooked up to the GitHub rpeo to build the Docker image.

2. Developer authors the **Component** file for their components (with the assumption the other component has a file written by that team) and submits this to a Git repository. There would be an **OperationalConfig** in the root folder that would be used by a GitHub Action to deploy to an environment. Caveats: 

* Requires a GitHub Action extension which can build container image from the Dockerfile and then trigger a deployment to a specified Hydra environment 
* Developers need to be able to have a swift turn around time if any issuees are found by the GitHub Action
* OperationalConfigs would either have to be in the repository or the GitHub Action would have to pick it up from a separate repository 

## Creating the Hydra Components

Regardless of how the organization is set up, the developer will be responsible for some portion of the component.yaml files. 

### Developer Concerns 
This deployment consists of two components. A `fireworks-web` component which is the frontend and a single worker component called `fireworks-worker`. The component manifests can be found in the `src/web/manifests` and `src/worker/manifests` folders. These files describe developer concerns such as environment variables required for the container, the container image, the port. 

Both components run as a replicated service to allow the app operator to scale the components as required. 

## Hand off to operations for staging & production 
Once the inner loop testing is done for their feature, the developer signs off on the branch which contains their source code, their component.yaml and Dockerfiles. At this point, the onus is on the app operator to kick off the builds (or have it automated) for staging/production environments. 