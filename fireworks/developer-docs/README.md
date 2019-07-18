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

## Testing dependencies & testing in the cloud 

## Creating the Hydra Components

### Developer Concerns 
This deployment consists of two components. A `fireworks-web` component which is the frontend and a single worker component called `fireworks-worker`. The component manifests can be found in the `src/web/manifests` and `src/worker/manifests` folders. These files describe developer concerns such as environment variables required for the container, the container image, the port. 

Both components run as a replicated service to allow the app operator to scale the components as required. 