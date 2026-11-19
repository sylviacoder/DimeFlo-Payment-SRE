locals {
  name         = "dimeflo-${var.environment}"
  cluster_name = "dimeflo-${var.environment}"

  tags = {
    Project     = "dimeflo"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "network" {
  source = "../../modules/network"

  name               = local.name
  cluster_name       = local.cluster_name
  vpc_cidr           = var.vpc_cidr
  single_nat_gateway = true
  tags               = local.tags
}

module "eks" {
  source = "../../modules/eks"

  cluster_name       = local.cluster_name
  private_subnet_ids = module.network.private_subnet_ids
  api_allowed_cidrs  = var.api_allowed_cidrs
  tags               = local.tags
}

module "rds" {
  source = "../../modules/rds"

  name                      = local.name
  vpc_id                    = module.network.vpc_id
  private_subnet_ids        = module.network.private_subnet_ids
  allowed_security_group_id = module.eks.cluster_security_group_id
  multi_az                  = var.db_multi_az
  tags                      = local.tags
}

resource "aws_ecr_repository" "payments_api" {
  name                 = "dimeflo/payments-api"
  image_tag_mutability = "IMMUTABLE" # a tag always means the same image, so rollbacks are exact

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "payments_api" {
  repository = aws_ecr_repository.payments_api.name
  policy     = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 20 most recent images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }
      action       = { type = "expire" }
    }]
  })
}
