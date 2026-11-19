output "cluster_name" {
  value = module.eks.cluster_name
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.region}"
}

output "db_endpoint" {
  value = module.rds.endpoint
}

output "db_master_secret_arn" {
  value = module.rds.master_user_secret_arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.payments_api.repository_url
}
