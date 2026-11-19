variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "api_allowed_cidrs" {
  description = "Your public IP as x.x.x.x/32, so only you can reach the Kubernetes API."
  type        = list(string)
}

variable "db_multi_az" {
  description = "Turn on before running the database failover chaos test."
  type        = bool
  default     = false
}
