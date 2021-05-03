# Terraform samples powered by Terraform component

## Prerequisites

Please refer to [Terraform for Platform team](https://kubevela.io/docs/platform-engineers/terraform) to configure Terraform.


## Sample 8.1: Website on ECS

Create a Terraform application to create an ECS, install Nginx and deploy a website in it.

- Apply ComponentDefinition [alibaba-website](./8.1Website_on_ECS/ComponentDefinition-alibaba-website.yaml)

```yaml
apiVersion: core.oam.dev/v1alpha2
kind: ComponentDefinition
metadata:
  name: alibaba-website
  annotations:
    definition.oam.dev/description: Terraform Configuration to create an ECS, install Nginx and deploy a website in it.
    type: terraform
spec:
  workload:
    definition:
      apiVersion: terraform.core.oam.dev/v1beta1
      kind: Configuration
  schematic:
    terraform:
      configuration: |
        module "website" {
          source = "github.com/zzxwill/nginx-web-on-ecs"

          zone_id = var.zone_id
          password = "PasefjsfdY123!"
        }

        variable "zone_id" {
          description = "Zone ID"
          type = string
          default = "cn-beijing-i"
        }

        variable "password" {
          description = "ECS instance password for root user"
          type = string
          default = "PasefjsfdY123!"
        }

        output "URL" {
          value = module.website.console_url
        }

```

- Apply application [terraform-webapp](./8.1Website_on_ECS/application.yaml)

Run `vela show` to get all properties for the Terraform component.

```shell
$ vela show alibaba-website
# Properties
+----------------------------+-------------------------------------------------------------------+-----------------------------------------------------------+----------+---------+
|            NAME            |                            DESCRIPTION                            |                           TYPE                            | REQUIRED | DEFAULT |
+----------------------------+-------------------------------------------------------------------+-----------------------------------------------------------+----------+---------+
| zone_id                    | Zone ID                                                           | string                                                    | true     |         |
| password                   | ECS instance password for root user                               | string                                                    | true     |         |
| writeConnectionSecretToRef | The secret which the cloud resource connection will be written to | [writeConnectionSecretToRef](#writeConnectionSecretToRef) | false    |         |
+----------------------------+-------------------------------------------------------------------+-----------------------------------------------------------+----------+---------+


## writeConnectionSecretToRef
+-----------+-----------------------------------------------------------------------------+--------+----------+---------+
|   NAME    |                                 DESCRIPTION                                 |  TYPE  | REQUIRED | DEFAULT |
+-----------+-----------------------------------------------------------------------------+--------+----------+---------+
| name      | The secret name which the cloud resource connection will be written to      | string | true     |         |
| namespace | The secret namespace which the cloud resource connection will be written to | string | false    |         |
+-----------+-----------------------------------------------------------------------------+--------+----------+---------+
```

Apply the application.

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: terraform-webapp
spec:
  components:
    - name: website
      type: alibaba-website
      properties:
        zone_id: cn-beijing-i
        password: PasefjsfdY123!
```

- Check the application

```shell
$ kubectl get application
NAME               COMPONENT   TYPE              PHASE            HEALTHY   STATUS   AGE
terraform-webapp   website     alibaba-website   healthChecking                      27m

$ kubectl get components
NAME      WORKLOAD-KIND   AGE
website   Configuration   27m

$ kubectl get Configuration website -o yaml
apiVersion: terraform.core.oam.dev/v1beta1
kind: Configuration
metadata:
  annotations:
    app.oam.dev/generation: "0"
    ...
status:
  outputs:
    URL:
      type: string
      value: http://123.57.214.251
  state: provisioned
```

Visit `http://123.57.214.251`.

![](./8.1Website_on_ECS/snapshot.jpg)



