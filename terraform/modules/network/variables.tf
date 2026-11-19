variable "name" {
  description = "Prefix for resource names, e.g. dimeflo-dev."
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name, used for subnet discovery tags."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across (min 2 for EKS and RDS)."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "EKS and RDS need at least two availability zones."
  }
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all AZs (cheaper, less resilient)."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to every resource."
  type        = map(string)
  default     = {}
}
