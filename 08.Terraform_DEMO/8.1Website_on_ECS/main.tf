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
