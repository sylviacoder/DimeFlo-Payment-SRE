variable "cluster_name" {
  type = string
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Check supported versions with: aws eks describe-cluster-versions"
  type        = string
  default     = "1.36"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "api_allowed_cidrs" {
  description = "CIDRs allowed to reach the public Kubernetes API. Restrict to your own IP."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_types" {
  type    = list(string)
  default = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "tags" {
  type    = map(string)
  default = {}
}
