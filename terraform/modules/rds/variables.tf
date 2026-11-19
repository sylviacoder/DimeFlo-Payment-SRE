variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "allowed_security_group_id" {
  description = "Security group allowed to connect on 5432 (the EKS cluster security group)."
  type        = string
}

variable "engine_version" {
  type    = string
  default = "18"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "dimeflo"
}

variable "master_username" {
  type    = string
  default = "dimeflo_admin"
}

variable "multi_az" {
  description = "Enable a standby in a second AZ. Roughly doubles RDS cost; turn on for failover testing."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
