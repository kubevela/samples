# Hydra Examples 

This repository contains examples of how developers and app operators can work together to build an application and then deploy it to a Hydra implementation. 

## Table of Contents 

1. Fireworks - The fireworks is the simplest example containing a single web frontend that is polled by the worker components. The worker components provide the color of the firework and the web frontend is responsible for displaying this. This example goes over how two separate developers can independently work on these microservices and then the application operator can deploy the whole application into an existing VNET, provide public ingress and define autoscaling rules independent of the developers getting involved. 

    There is a focus on how developers build microservices, test and then hand off the package to the app operators. The application operators are in charge of their CI/CD pipelines using existing Hydra APIs.
